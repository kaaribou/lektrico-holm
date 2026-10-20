"""Réglages numériques HOLM Lektrico."""
from __future__ import annotations

from homeassistant.components.number import NumberDeviceClass, NumberEntity, NumberMode
from homeassistant.const import EntityCategory, PERCENTAGE, UnitOfElectricCurrent, UnitOfPower, UnitOfTime

from .coordinator import LektricoCoordinator
from .entity import LektricoEntity

A, CFG, APP = UnitOfElectricCurrent.AMPERE, EntityCategory.CONFIG, "App_config.Get"

# (clé, suffixe, lecture (champ, groupe), min, max, pas, unité, classe, catégorie, activé, mode d'écriture, icône)
NUMBERS = (
    ("dynamic_limit", "limite_dynamique", ("dynamic_current", "System_currents.Get"), 0, 32, 1, A, NumberDeviceClass.CURRENT, None, True, "dynamic", "mdi:speedometer"),
    ("user_limit", "limite_utilisateur", ("user_current", APP), 6, 32, 1, A, NumberDeviceClass.CURRENT, None, True, "user_current", "mdi:account-cog"),
    ("user_power", "puissance_maximale", ("user_power", APP), 1380, 7360, 10, UnitOfPower.WATT, NumberDeviceClass.POWER, CFG, True, "user_power", "mdi:flash"),
    ("led_max_brightness", "luminosite_de_la_led", ("led_max_brightness", "info"), 10, 100, 5, PERCENTAGE, None, CFG, True, "led_max_brightness", "mdi:brightness-6"),
    ("car_minimum_current", "courant_minimal_vehicule", ("car_minimum_current", APP), 6, 16, 1, A, NumberDeviceClass.CURRENT, CFG, False, "car_minimum_current", "mdi:car-electric"),
    ("led_dimming_delay", "delai_d_attenuation_de_la_led", ("led_dimming_delay", APP), 0, 3600, 5, UnitOfTime.SECONDS, None, CFG, True, "led_dimming_delay", "mdi:timer-outline"),
    ("install_current", "courant_d_installation_reglage", ("install_current", "info"), 6, 32, 1, A, NumberDeviceClass.CURRENT, CFG, False, "install", "mdi:home-lightning-bolt"),
)


async def async_setup_entry(hass, entry, async_add_entities):
    c: LektricoCoordinator = entry.runtime_data
    async_add_entities(LektricoNumber(c, *n) for n in NUMBERS)


class LektricoNumber(LektricoEntity, NumberEntity):
    _attr_mode = NumberMode.SLIDER

    def __init__(self, c, key, suffix, read, mn, mx, step, unit, dc, cat, on, write, icon) -> None:
        super().__init__(c, "number", key, suffix)
        self._read, self._write = read, write
        self._attr_native_min_value, self._attr_native_max_value, self._attr_native_step = mn, mx, step
        self._attr_native_unit_of_measurement, self._attr_device_class = unit, dc
        self._attr_entity_category, self._attr_entity_registry_enabled_default, self._attr_icon = cat, on, icon
        if key in ("user_power", "led_dimming_delay"):
            self._attr_mode = NumberMode.BOX

    def _raw(self):
        f, grp = self._read
        v = self.coordinator.value(f, grp)
        if v is None:
            v = self.coordinator.value(f, "info")
        if v is None and grp != APP:
            v = self.coordinator.value(f, APP)
        return v

    @property
    def available(self) -> bool:
        return super().available and self._raw() is not None

    @property
    def native_value(self):
        try:
            return float(self._raw())
        except (TypeError, ValueError):
            return None

    async def async_set_native_value(self, value: float) -> None:
        v = int(round(value))
        cl = self.coordinator.client
        if self._write == "dynamic":
            coro = cl.call("Dynamic_current.Set", {"dynamic_current": v})
        elif self._write == "install":
            coro = cl.call("Install_current.Set", {"install_current": v})
        else:
            coro = cl.set_config(self._write, v)
        await self.coordinator.command(coro)
        f, grp = self._read
        self.coordinator.patch(grp, f, v)
