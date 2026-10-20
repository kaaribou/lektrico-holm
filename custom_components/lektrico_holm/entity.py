"""Entité de base HOLM Lektrico."""
from __future__ import annotations

from homeassistant.helpers.device_registry import DeviceInfo
from homeassistant.helpers.update_coordinator import CoordinatorEntity

from .const import CONF_PREFIX, DEFAULT_PREFIX, DOMAIN
from .coordinator import LektricoCoordinator


class LektricoEntity(CoordinatorEntity[LektricoCoordinator]):
    _attr_has_entity_name = True

    def __init__(self, coordinator: LektricoCoordinator, domain: str, key: str, suffix: str) -> None:
        super().__init__(coordinator)
        ident = coordinator.ident
        entry = coordinator.config_entry
        prefix = entry.data.get(CONF_PREFIX) or DEFAULT_PREFIX
        self._attr_translation_key = key
        self._attr_unique_id = f"{ident['serial']}_{key}"
        # identifiants d'entités identiques à ceux de l'intégration officielle :
        # la carte HOLM Borne et l'automatisation de délestage continuent de fonctionner telles quelles
        self.entity_id = f"{domain}.{prefix}_{suffix}"
        self._attr_device_info = DeviceInfo(
            identifiers={(DOMAIN, ident["serial"])},
            manufacturer="Lektrico",
            model=ident["type"].upper(),
            name=entry.title,
            serial_number=ident["serial"],
            hw_version=ident.get("board") or None,
            sw_version=coordinator.info.get("fw_version") or ident.get("fw") or None,
            configuration_url=f"http://{coordinator.client.host}/",
        )
