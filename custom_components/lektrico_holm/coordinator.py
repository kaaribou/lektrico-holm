"""Coordinateur HOLM Lektrico : interrogation espacée, données lentes en tourniquet, recul automatique."""
from __future__ import annotations

import asyncio
import logging
import time
from datetime import timedelta
from typing import Any

from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant
from homeassistant.helpers.update_coordinator import DataUpdateCoordinator, UpdateFailed

from .api import LektricoClient, LektricoError, LektricoUnsupported
from .const import APP_EVERY, CONF_SCAN, CURRENTS_METHOD, DEFAULT_SCAN, DOMAIN, ERROR_KEYS, MAX_BACKOFF, SLOW_EVERY, SLOW_METHODS

_LOGGER = logging.getLogger(__name__)


class LektricoCoordinator(DataUpdateCoordinator[dict[str, Any]]):
    """À chaque cycle : Charger_info.Get (+ Active_errors.Get si erreur active), puis au plus UNE autre
    lecture : les courants système un cycle sur deux (limite dynamique), sinon une donnée lente
    (configuration, Wi-Fi, compteurs), chacune relue toutes les 5 min.
    En cas d'échec, l'intervalle double jusqu'à 5 min, puis revient à la normale au premier succès."""

    config_entry: ConfigEntry

    def __init__(self, hass: HomeAssistant, entry: ConfigEntry, client: LektricoClient, ident: dict) -> None:
        self.base_interval = int(entry.options.get(CONF_SCAN, DEFAULT_SCAN))
        super().__init__(hass, _LOGGER, config_entry=entry, name=f"{DOMAIN}_{ident.get('serial')}",
                         update_interval=timedelta(seconds=self.base_interval))
        self.client = client
        self.ident = ident
        self.slow: dict[str, dict[str, Any]] = {}
        self._slow_ts: dict[str, float] = {}
        self.unsupported: set[str] = set()
        self._rr = 0
        self._cycle = 0
        self.fails = 0
        self.info: dict[str, Any] = dict(ident.get("info") or {})
        self.errors: dict[str, bool] = dict.fromkeys(ERROR_KEYS, False)
        self.last_success: float | None = None

    def _next_slow(self) -> str | None:
        now = time.monotonic()
        for i in range(len(SLOW_METHODS)):
            m = SLOW_METHODS[(self._rr + i) % len(SLOW_METHODS)]
            if m in self.unsupported:
                continue
            every = APP_EVERY if m == "App_config.Get" else SLOW_EVERY
            if now - self._slow_ts.get(m, 0) >= every or m not in self.slow:
                self._rr = (self._rr + i + 1) % len(SLOW_METHODS)
                return m
        return None

    async def _async_update_data(self) -> dict[str, Any]:
        try:
            self.info = await self.client.get("Charger_info.Get")
            if self.info.get("has_active_errors"):
                try:
                    err = await self.client.get("Active_errors.Get")
                    self.errors = {k: bool(err.get(k, False)) for k in ERROR_KEYS}
                except LektricoUnsupported:
                    pass
            else:
                self.errors = dict.fromkeys(ERROR_KEYS, False)
                self._cycle += 1
                # un cycle sur deux : courants système (limite dynamique…), sinon une donnée lente due
                slow = None
                if CURRENTS_METHOD not in self.unsupported and (self._cycle % 2 == 1 or CURRENTS_METHOD not in self.slow):
                    slow = CURRENTS_METHOD
                if slow is None:
                    slow = self._next_slow()
                if slow:
                    try:
                        self.slow[slow] = await self.client.get(slow)
                        self._slow_ts[slow] = time.monotonic()
                    except LektricoUnsupported:
                        _LOGGER.info("%s non pris en charge par ce micrologiciel : ignoré", slow)
                        self.unsupported.add(slow)
        except LektricoError as err:
            self.fails += 1
            delay = min(MAX_BACKOFF, self.base_interval * (2 ** min(self.fails, 5)))
            self.update_interval = timedelta(seconds=delay)
            _LOGGER.warning("Borne injoignable (%s) : nouvel essai dans %s s", err, delay)
            raise UpdateFailed(str(err)) from err
        if self.fails:
            _LOGGER.info("Borne de nouveau joignable après %s échec(s)", self.fails)
        self.fails = 0
        self.update_interval = timedelta(seconds=self.base_interval)
        self.last_success = time.time()
        return {"info": self.info, "errors": self.errors, "slow": self.slow}

    def value(self, key: str, group: str = "info") -> Any:
        if group == "info":
            return self.info.get(key)
        if group == "errors":
            return self.errors.get(key)
        return (self.slow.get(group) or {}).get(key)

    async def command(self, coro, refresh_after: float = 1.5) -> Any:
        """Exécute une commande puis relit l'état une seule fois, un peu plus tard."""
        try:
            res = await coro
        except LektricoError as err:
            from homeassistant.exceptions import HomeAssistantError
            raise HomeAssistantError(f"La borne n'a pas répondu : {err}") from err
        await asyncio.sleep(refresh_after)
        await self.async_request_refresh()
        return res

    def patch(self, group: str, key: str, value: Any) -> None:
        """Mise à jour optimiste après une commande réussie."""
        if group == "info":
            self.info[key] = value
        else:
            self.slow.setdefault(group, {})[key] = value
        self.async_update_listeners()
