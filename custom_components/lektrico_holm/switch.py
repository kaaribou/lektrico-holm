"""Interrupteurs HOLM Lektrico (réglages App_config)."""
from __future__ import annotations

from homeassistant.components.switch import SwitchEntity
from homeassistant.const import EntityCategory

from .coordinator import LektricoCoordinator
from .entity import LektricoEntity

CFG = EntityCategory.CONFIG
APP = "App_config.Get"

# (clé, suffixe, clé App_config, inversé, catégorie, activé par défaut, icône)
SWITCHES = (
    ("authentication", "authentification", "headless", True, None, True, "mdi:card-account-details-outline"),
    ("lock", "verrou", "charger_locked", False, None, True, "mdi:lock"),
    ("charging_schedule", "programme_de_charge", "charging_schedule_enabled", False, None, True, "mdi:calendar-clock"),
    ("auto_update", "mise_a_jour_automatique", "auto_update", False, CFG, True, "mdi:update"),
    ("buzzer", "buzzer", "buzzer_enabled", False, CFG, True, "mdi:volume-high"),
    ("reset_on_wifi_loss", "redemarrage_si_wifi_perdu", "reset_on_sta_fail", False, CFG, True, "mdi:wifi-refresh"),
    ("mqtt", "mqtt", "mqtt_com_en", False, CFG, False, "mdi:lan-connect"),
    ("energy_management", "gestion_d_energie", "energy_management_enabled", False, CFG, False, "mdi:transmission-tower"),
    ("led_template", "couleurs_led_personnalisees", "led_template_enabled", False, CFG, False, "mdi:palette"),
    ("precise_pwm", "pwm_precis", "precise_pwm_mode", False, CFG, False, "mdi:sine-wave"),
)


async def async_setup_entry(hass, entry, async_add_entities):
    c: LektricoCoordinator = entry.runtime_data
    async_add_entities(LektricoSwitch(c, *s) for s in SWITCHES)


class LektricoSwitch(LektricoEntity, SwitchEntity):
    def __init__(self, c, key, suffix, cfg_key, inverted, cat, on, icon) -> None:
        super().__init__(c, "switch", key, suffix)
        self._cfg, self._inv = cfg_key, inverted
        self._attr_entity_category, self._attr_entity_registry_enabled_default, self._attr_icon = cat, on, icon

    def _raw(self):
        c = self.coordinator
        if self._cfg == "headless" and c.value("headless") is not None:
            return c.value("headless")          # présent dans Charger_info (lu à chaque cycle)
        v = c.value(self._cfg, APP)
        if v is None and self._cfg == "charger_locked":
            return str(c.value("extended_charger_state")) == "LOCKED"
        return v

    @property
    def available(self) -> bool:
        return super().available and self._raw() is not None

    @property
    def is_on(self):
        v = self._raw()
        if v is None:
            return None
        v = v if isinstance(v, bool) else str(v).lower() in ("1", "true")
        return (not v) if self._inv else v

    async def _set(self, on: bool) -> None:
        raw = (not on) if self._inv else on
        await self.coordinator.command(self.coordinator.client.set_config(self._cfg, raw))
        self.coordinator.patch(APP, self._cfg, raw)
        if self._cfg == "headless":
            self.coordinator.patch("info", "headless", raw)

    async def async_turn_on(self, **kwargs) -> None:
        await self._set(True)

    async def async_turn_off(self, **kwargs) -> None:
        await self._set(False)
