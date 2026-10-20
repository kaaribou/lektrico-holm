"""Boutons HOLM Lektrico."""
from __future__ import annotations

from homeassistant.components.button import ButtonDeviceClass, ButtonEntity
from homeassistant.const import EntityCategory

from .coordinator import LektricoCoordinator
from .entity import LektricoEntity

CFG = EntityCategory.CONFIG

# (clé, suffixe, méthode, paramètres, classe, catégorie, activé, icône)
BUTTONS = (
    ("charge_start", "demarrer_la_recharge", "Charge.Start", {"tag": "HOLM"}, None, None, True, "mdi:play-circle-outline"),
    ("charge_stop", "arreter_la_recharge", "Charge.Stop", None, None, None, True, "mdi:stop-circle-outline"),
    ("charge_pause", "mettre_en_pause", "Charge.Pause", None, None, None, True, "mdi:pause-circle-outline"),
    ("charge_resume", "reprendre_la_recharge", "Charge.Resume", None, None, None, True, "mdi:play-pause"),
    ("charging_schedule_override", "derogation_du_programme_de_charge", "Charging_schedule.Override", None, None, None, True, "mdi:calendar-fast"),
    ("session_energy_reset", "remise_a_zero_energie_session", "Session_energy.Reset", None, None, CFG, False, "mdi:counter"),
    ("reboot", "redemarrer", "Device.Reset", None, ButtonDeviceClass.RESTART, CFG, True, None),
)


async def async_setup_entry(hass, entry, async_add_entities):
    c: LektricoCoordinator = entry.runtime_data
    async_add_entities(LektricoButton(c, *b) for b in BUTTONS)


class LektricoButton(LektricoEntity, ButtonEntity):
    def __init__(self, c, key, suffix, method, params, dc, cat, on, icon) -> None:
        super().__init__(c, "button", key, suffix)
        self._method, self._params = method, params
        self._attr_device_class, self._attr_entity_category = dc, cat
        self._attr_entity_registry_enabled_default, self._attr_icon = on, icon

    async def async_press(self) -> None:
        await self.coordinator.command(self.coordinator.client.call(self._method, self._params),
                                       refresh_after=20 if self._method == "Device.Reset" else 1.5)
