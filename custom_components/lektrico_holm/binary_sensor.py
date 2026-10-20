"""Capteurs binaires HOLM Lektrico (défauts, état)."""
from __future__ import annotations

from homeassistant.components.binary_sensor import BinarySensorDeviceClass, BinarySensorEntity
from homeassistant.const import EntityCategory

from .coordinator import LektricoCoordinator
from .entity import LektricoEntity

PB, DIAG = BinarySensorDeviceClass.PROBLEM, EntityCategory.DIAGNOSTIC

# (clé de traduction, suffixe d'entité, champ d'Active_errors.Get, activé par défaut)
ERRORS = (
    ("state_e_activated", "erreur_ev", "state_e_activated", True),
    ("overtemp", "limitation_thermique", "overtemp", True),
    ("critical_temp", "surchauffe", "critical_temp", True),
    ("overcurrent", "surintensite", "overcurrent", True),
    ("meter_fault", "erreur_de_comptage", "meter_fault", True),
    ("undervoltage", "sous_tension", "undervoltage_error", True),
    ("overvoltage", "surtension", "overvoltage_error", True),
    ("rcd_error", "erreur_du_differentiel_rcd", "rcd_error", True),
    ("cp_diode_failure", "court_circuit_de_la_diode_ev", "cp_diode_failure", True),
    ("contactor_failure", "contacts_du_relais_soudes", "contactor_failure", True),
    ("voltage_error", "erreur_de_tension", "voltage_error", True),
    ("rcd_test_error", "echec_du_test_differentiel", "rcd_test_error", True),
    ("state_f_activated", "erreur_etat_f", "state_f_activated", True),
    ("state_machine_error", "erreur_automate", "state_machine_na_error", False),
)


async def async_setup_entry(hass, entry, async_add_entities):
    c: LektricoCoordinator = entry.runtime_data
    ents = [LektricoError(c, *e) for e in ERRORS]
    ents += [LektricoFlag(c, "active_errors", "erreurs_actives", lambda c: bool(c.value("has_active_errors")), PB, None),
             LektricoFlag(c, "paused", "en_pause", lambda c: bool(c.value("charger_is_paused")), None, None),
             LektricoFlag(c, "vehicle_connected", "vehicule_branche",
                          lambda c: str(c.value("charger_state")) in ("B", "C", "D"), BinarySensorDeviceClass.PLUG, None),
             LektricoFlag(c, "charging", "en_charge", lambda c: str(c.value("charger_state")) in ("C", "D"),
                          BinarySensorDeviceClass.BATTERY_CHARGING, None),
             LektricoFlag(c, "schedule_override", "derogation_active", lambda c: c.value("schedule_override_active"), None, None),
             LektricoFlag(c, "wifi_connected", "wifi_connecte", lambda c: c.value("connected", "Wifi_status.Get"),
                          BinarySensorDeviceClass.CONNECTIVITY, DIAG, "Wifi_status.Get")]
    async_add_entities(ents)


class LektricoError(LektricoEntity, BinarySensorEntity):
    _attr_device_class = PB
    _attr_entity_category = DIAG

    def __init__(self, c, key, suffix, field, on) -> None:
        super().__init__(c, "binary_sensor", key, suffix)
        self._field = field
        self._attr_entity_registry_enabled_default = on

    @property
    def is_on(self) -> bool:
        return bool(self.coordinator.errors.get(self._field))


class LektricoFlag(LektricoEntity, BinarySensorEntity):
    def __init__(self, c, key, suffix, fn, dc, cat, group="info") -> None:
        super().__init__(c, "binary_sensor", key, suffix)
        self._fn, self._group = fn, group
        self._attr_device_class, self._attr_entity_category = dc, cat

    @property
    def available(self) -> bool:
        if self._group != "info" and (self._group in self.coordinator.unsupported or self._group not in self.coordinator.slow):
            return False
        return super().available

    @property
    def is_on(self):
        v = self._fn(self.coordinator)
        return None if v is None else bool(v)
