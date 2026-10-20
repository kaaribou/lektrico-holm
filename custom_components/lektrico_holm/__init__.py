"""HOLM Lektrico : borne Lektrico en local, avec une interrogation économe qui ménage la borne."""
from __future__ import annotations

import hashlib
import logging
import os

from homeassistant.components.frontend import add_extra_js_url
from homeassistant.components.http import StaticPathConfig
from homeassistant.config_entries import ConfigEntry
from homeassistant.const import CONF_HOST, Platform
from homeassistant.core import HomeAssistant
from homeassistant.exceptions import ConfigEntryNotReady

from .api import LektricoClient, LektricoError
from .const import CARD_NAME, CARD_URL, CONF_PILOT, DOMAIN, STATIC_PATH, VERSION
from .controller import ChargeController
from .coordinator import LektricoCoordinator

_LOGGER = logging.getLogger(__name__)
PLATFORMS = [Platform.SENSOR, Platform.BINARY_SENSOR, Platform.SWITCH, Platform.NUMBER, Platform.BUTTON, Platform.SELECT]


async def async_setup_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    await _async_setup_card(hass)
    client = LektricoClient(entry.data[CONF_HOST])
    try:
        ident = await client.identify()
    except LektricoError as err:
        await client.close()
        raise ConfigEntryNotReady(f"Borne injoignable : {err}") from err
    coordinator = LektricoCoordinator(hass, entry, client, ident)
    await coordinator.async_config_entry_first_refresh()
    coordinator.pilot = ChargeController(hass, coordinator, dict(entry.options)) if entry.options.get(CONF_PILOT) else None
    entry.runtime_data = coordinator
    await hass.config_entries.async_forward_entry_setups(entry, PLATFORMS)
    if coordinator.pilot:
        coordinator.pilot.start()
        entry.async_on_unload(coordinator.pilot.stop)
    entry.async_on_unload(entry.add_update_listener(_reload))
    return True


async def _async_setup_card(hass: HomeAssistant) -> None:
    """Sert la carte HOLM Borne fournie avec l'intégration et la déclare une seule fois.

    Si une ressource holm-borne-card.js existe déjà (installée à la main ou par HACS),
    on la laisse telle quelle : pas de doublon.
    """
    data = hass.data.setdefault(DOMAIN, {})
    if data.get("card"):
        return
    data["card"] = True
    try:
        www = os.path.join(os.path.dirname(__file__), "www")
        await hass.http.async_register_static_paths([StaticPathConfig(STATIC_PATH, www, False)])
        digest = await hass.async_add_executor_job(_file_hash, os.path.join(www, CARD_NAME))
        url = f"{CARD_URL}?v={VERSION}-{digest}"
        if not await _register_resource(hass, url):
            add_extra_js_url(hass, url)
    except Exception as err:  # noqa: BLE001 — la carte est un bonus, l'intégration doit démarrer
        _LOGGER.warning("Carte HOLM Borne non déclarée : %s", err)


async def _register_resource(hass: HomeAssistant, url: str) -> bool:
    """Ressource Lovelace (mode stockage). Renvoie False en mode YAML (repli extra_js_url)."""
    try:
        lovelace = hass.data.get("lovelace")
        resources = getattr(lovelace, "resources", None) or (lovelace.get("resources") if isinstance(lovelace, dict) else None)
        if resources is None or not hasattr(resources, "async_create_item"):
            return False
        if not getattr(resources, "loaded", True):
            await resources.async_load()
            resources.loaded = True
        items = list(resources.async_items())
        mine = [r for r in items if str(r.get("url", "")).split("?")[0] == CARD_URL]
        other = [r for r in items if CARD_NAME in str(r.get("url", "")) and r not in mine]
        if other and not mine:
            return True   # carte déjà installée ailleurs : on ne touche à rien
        if not mine:
            await resources.async_create_item({"res_type": "module", "url": url})
        elif mine[0].get("url") != url:
            await resources.async_update_item(mine[0]["id"], {"res_type": "module", "url": url})
        return True
    except Exception as err:  # noqa: BLE001
        _LOGGER.debug("Ressource Lovelace non enregistrée (%s), chargement par extra_js_url", err)
        return False


def _file_hash(path: str) -> str:
    try:
        with open(path, "rb") as f:
            return hashlib.sha1(f.read()).hexdigest()[:8]
    except OSError:
        return "0"


async def _reload(hass: HomeAssistant, entry: ConfigEntry) -> None:
    await hass.config_entries.async_reload(entry.entry_id)


async def async_unload_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    ok = await hass.config_entries.async_unload_platforms(entry, PLATFORMS)
    if ok:
        await entry.runtime_data.client.close()
    return ok
