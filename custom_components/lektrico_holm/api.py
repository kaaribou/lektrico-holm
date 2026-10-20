"""Client local de la borne Lektrico (API JSON-RPC du micrologiciel), volontairement économe.

- une seule requête à la fois (verrou) ;
- chaque connexion est refermée après la réponse (pas de connexion maintenue ouverte) ;
- délai court, aucune nouvelle tentative immédiate : c'est le coordinateur qui espace les essais.
"""
from __future__ import annotations

import asyncio
import json
import logging
import random
from typing import Any

import aiohttp

from .const import REQUEST_TIMEOUT

_LOGGER = logging.getLogger(__name__)


class LektricoError(Exception):
    """Erreur de communication avec la borne."""


class LektricoUnsupported(LektricoError):
    """Méthode non prise en charge par ce micrologiciel."""


class LektricoClient:
    def __init__(self, host: str) -> None:
        self.host = host.strip().rstrip("/").replace("http://", "").replace("https://", "")
        self._lock = asyncio.Lock()
        self._session: aiohttp.ClientSession | None = None
        self.requests = 0      # compteur de requêtes (diagnostic)
        self.failures = 0

    def _sess(self) -> aiohttp.ClientSession:
        if self._session is None or self._session.closed:
            self._session = aiohttp.ClientSession(
                connector=aiohttp.TCPConnector(force_close=True, limit=1),
                headers={"Connection": "close", "User-Agent": "HOLM-Lektrico/1.0"},
                timeout=aiohttp.ClientTimeout(total=REQUEST_TIMEOUT),
            )
        return self._session

    async def close(self) -> None:
        if self._session and not self._session.closed:
            await self._session.close()

    async def _do(self, method: str, url: str, payload: dict | None = None) -> Any:
        async with self._lock:
            self.requests += 1
            try:
                async with self._sess().request(method, url, json=payload) as resp:
                    if resp.status == 404:
                        raise LektricoUnsupported(url)
                    if resp.status != 200:
                        raise LektricoError(f"HTTP {resp.status}")
                    text = await resp.text()
            except LektricoError:
                self.failures += 1
                raise
            except (aiohttp.ClientError, asyncio.TimeoutError, OSError) as err:
                self.failures += 1
                raise LektricoError(f"borne injoignable ({type(err).__name__})") from err
            # petit temps de repos entre deux requêtes pour ménager la borne
            await asyncio.sleep(0.3)
        try:
            data = json.loads(text) if text else {}
        except ValueError as err:
            raise LektricoUnsupported(f"réponse illisible pour {url}") from err
        if isinstance(data, dict) and "error" in data and len(data) <= 3:
            raise LektricoUnsupported(str(data.get("error")))
        if isinstance(data, dict) and "result" in data and "id" in data:
            return data["result"]
        return data

    async def get(self, rpc: str) -> dict[str, Any]:
        data = await self._do("GET", f"http://{self.host}/rpc/{rpc}")
        if not isinstance(data, dict):
            raise LektricoUnsupported(rpc)
        # le micrologiciel renvoie parfois des clés avec un espace final (« dynamic_current  »)
        return {str(k).strip(): v for k, v in data.items()}

    async def call(self, rpc: str, params: dict | None = None) -> Any:
        body: dict[str, Any] = {"src": "HOLM", "id": random.randint(10000000, 99999999), "method": rpc}
        if params is not None:
            body["params"] = params
        return await self._do("POST", f"http://{self.host}/rpc", body)

    async def set_config(self, key: str, value: Any) -> Any:
        return await self.call("App_config.Set", {"config_key": key, "config_value": value})

    async def identify(self) -> dict[str, Any]:
        """Identité de la borne (3 requêtes, uniquement à l'ajout et au démarrage)."""
        dev = await self.get("Device_id.Get")
        device_id = str(dev.get("device_id", ""))
        cfg = await self.get("Charger_config.Get")
        info = await self.get("Charger_info.Get")
        dtype = "3p22k" if device_id.startswith("3p22k") else "1p7k"
        return {"device_id": device_id, "type": dtype, "serial": str(cfg.get("serial_number", "")),
                "board": str(cfg.get("board_revision", "")), "fw": str(info.get("fw_version", "")), "info": info}
