"""Sélecteur « Mode de charge » (pilotage intégré)."""
from __future__ import annotations

from homeassistant.components.select import SelectEntity
from homeassistant.helpers.restore_state import RestoreEntity

from .const import MODE_HC, MODES
from .entity import LektricoEntity


async def async_setup_entry(hass, entry, async_add_entities):
    c = entry.runtime_data
    if getattr(c, "pilot", None):
        async_add_entities([ChargeModeSelect(c)])


class ChargeModeSelect(LektricoEntity, SelectEntity, RestoreEntity):
    _attr_options = MODES
    _attr_icon = "mdi:ev-plug-type2"

    def __init__(self, c) -> None:
        super().__init__(c, "select", "charge_mode", "mode_de_charge")
        self._pilot = c.pilot

    async def async_added_to_hass(self) -> None:
        await super().async_added_to_hass()
        last = await self.async_get_last_state()
        self._pilot.set_mode(last.state if last and last.state in MODES else MODE_HC, evaluate=False)
        self.async_on_remove(self._pilot.add_listener(self.async_write_ha_state))
        self._pilot.schedule("restauration")

    @property
    def current_option(self) -> str:
        return self._pilot.mode

    async def async_select_option(self, option: str) -> None:
        self._pilot.set_mode(option)
