"""Capteurs HOLM Lektrico."""
from __future__ import annotations

from collections.abc import Callable
from dataclasses import dataclass
from typing import Any

from homeassistant.components.sensor import SensorDeviceClass, SensorEntity, SensorStateClass
from homeassistant.const import (EntityCategory, SIGNAL_STRENGTH_DECIBELS_MILLIWATT, UnitOfElectricCurrent,
                                 UnitOfElectricPotential, UnitOfEnergy, UnitOfInformation, UnitOfPower,
                                 UnitOfTemperature, UnitOfTime)

from .const import LIMIT_REASONS, STATE_MAP, STATE_OPTIONS
from .coordinator import LektricoCoordinator
from .entity import LektricoEntity

A, V, DIAG = UnitOfElectricCurrent.AMPERE, UnitOfElectricPotential.VOLT, EntityCategory.DIAGNOSTIC
MEAS, INC = SensorStateClass.MEASUREMENT, SensorStateClass.TOTAL_INCREASING


def _num(v, div=1, nd=None):
    try:
        x = float(v) / div
    except (TypeError, ValueError):
        return None
    if nd is not None:
        return round(x, nd)
    return int(x) if x.is_integer() else x


def _state(c: LektricoCoordinator):
    ext = c.value("extended_charger_state") or c.value("charger_state")
    return STATE_MAP.get(str(ext), None)


def _reason(c: LektricoCoordinator):
    r = c.value("current_limit_reason")
    try:
        return LIMIT_REASONS[int(r)] if r is not None else "no_limit"
    except (ValueError, IndexError):
        return None


def _single(lst_key, scalar_key, nd):
    """Monophasé : le micrologiciel 1.20 ne fournit que les tableaux « currents » / « voltages »."""
    def f(c):
        v = c.value(scalar_key)
        if v is None:
            lst = c.value(lst_key)
            v = lst[0] if isinstance(lst, list) and lst else None
        return _num(v, 1, nd)
    return f


def _phase(key, i, div=1):
    def f(c):
        lst = c.value(key)
        return _num(lst[i], div, 2) if isinstance(lst, list) and len(lst) > i else None
    return f


@dataclass(frozen=True)
class S:
    key: str
    suffix: str
    fn: Callable[[LektricoCoordinator], Any]
    unit: str | None = None
    dc: SensorDeviceClass | None = None
    sc: SensorStateClass | None = None
    cat: EntityCategory | None = None
    on: bool = True
    options: list[str] | None = None
    phases3: bool = False
    group: str = "info"


def g(field, group="info", div=1, nd=None):
    return lambda c: _num(c.value(field, group), div, nd)


SENSORS: tuple[S, ...] = (
    S("state", "etat", _state, dc=SensorDeviceClass.ENUM, options=STATE_OPTIONS),
    S("power", "puissance", g("instant_power", div=1000, nd=3), UnitOfPower.KILO_WATT, SensorDeviceClass.POWER, MEAS),
    S("energy", "energie", g("session_energy", div=1000, nd=3), UnitOfEnergy.KILO_WATT_HOUR, SensorDeviceClass.ENERGY, INC),
    S("lifetime_energy", "energie_totale", g("total_charged_energy", nd=2), UnitOfEnergy.KILO_WATT_HOUR, SensorDeviceClass.ENERGY, INC),
    S("charging_time", "temps_de_charge", g("charging_time"), UnitOfTime.SECONDS, SensorDeviceClass.DURATION, MEAS),
    S("temperature", "temperature", g("temperature", nd=0), UnitOfTemperature.CELSIUS, SensorDeviceClass.TEMPERATURE, MEAS),
    S("current", "courant", _single("currents", "current", 2), A, SensorDeviceClass.CURRENT, MEAS),
    S("voltage", "tension", _single("voltages", "voltage", 1), V, SensorDeviceClass.VOLTAGE, MEAS),
    S("installation_current", "courant_de_l_installation", g("install_current"), A, SensorDeviceClass.CURRENT),
    S("limit_reason", "raison_de_la_limite", _reason, dc=SensorDeviceClass.ENUM, options=LIMIT_REASONS),
    S("iec_state", "etat_iec", lambda c: c.value("charger_state"), cat=DIAG),
    S("pwm_current", "courant_pwm", g("pwm_current"), A, SensorDeviceClass.CURRENT, MEAS, DIAG),
    S("session_id", "numero_de_session", g("session_id"), cat=DIAG, on=False),
    S("heap_free", "memoire_libre", g("heap_free", div=1024, nd=1), UnitOfInformation.KIBIBYTES, SensorDeviceClass.DATA_SIZE, MEAS, DIAG),
    S("em_current", "courant_gestion_energie", g("em_current"), A, SensorDeviceClass.CURRENT, None, DIAG, False),
    S("uptime", "temps_de_fonctionnement", g("uptime", div=3600, nd=2), UnitOfTime.HOURS, SensorDeviceClass.DURATION, MEAS, DIAG),
    S("energy_index", "index_d_energie", g("energy_index", nd=2), UnitOfEnergy.KILO_WATT_HOUR, SensorDeviceClass.ENERGY, INC, DIAG, False),
    S("main_task_lwm", "pile_tache_principale", g("main_task_lwm"), None, None, MEAS, DIAG, False),
    # triphasé uniquement
    S("current_l1", "courant_l1", _phase("currents", 0), A, SensorDeviceClass.CURRENT, MEAS, phases3=True),
    S("current_l2", "courant_l2", _phase("currents", 1), A, SensorDeviceClass.CURRENT, MEAS, phases3=True),
    S("current_l3", "courant_l3", _phase("currents", 2), A, SensorDeviceClass.CURRENT, MEAS, phases3=True),
    S("voltage_l1", "tension_l1", _phase("voltages", 0), V, SensorDeviceClass.VOLTAGE, MEAS, phases3=True),
    S("voltage_l2", "tension_l2", _phase("voltages", 1), V, SensorDeviceClass.VOLTAGE, MEAS, phases3=True),
    S("voltage_l3", "tension_l3", _phase("voltages", 2), V, SensorDeviceClass.VOLTAGE, MEAS, phases3=True),
    # courants système (lus toutes les 5 min)
    S("charging_current", "courant_de_charge_autorise", g("charging_current", "System_currents.Get"), A, SensorDeviceClass.CURRENT, None, DIAG, group="System_currents.Get"),
    S("system_max_current", "courant_maximal_systeme", g("system_max_current", "System_currents.Get"), A, SensorDeviceClass.CURRENT, None, DIAG, group="System_currents.Get"),
    S("schedule_current", "courant_du_programme", g("schedule_current", "System_currents.Get"), A, SensorDeviceClass.CURRENT, None, DIAG, group="System_currents.Get"),
    S("temperature_current", "courant_limite_temperature", g("temperature_current", "System_currents.Get"), A, SensorDeviceClass.CURRENT, None, DIAG, group="System_currents.Get"),
    S("user_power_current", "courant_puissance_utilisateur", g("user_power_current", "System_currents.Get"), A, SensorDeviceClass.CURRENT, None, DIAG, group="System_currents.Get"),
    S("ocpp_current", "courant_ocpp", g("ocpp_current", "System_currents.Get"), A, SensorDeviceClass.CURRENT, None, DIAG, False, group="System_currents.Get"),
    # Wi-Fi
    S("wifi_rssi", "signal_wifi", g("rssi", "Wifi_status.Get"), SIGNAL_STRENGTH_DECIBELS_MILLIWATT, SensorDeviceClass.SIGNAL_STRENGTH, MEAS, DIAG, group="Wifi_status.Get"),
    S("wifi_reconnects", "reconnexions_wifi", g("sta_reconnect_count", "Wifi_status.Get"), None, None, INC, DIAG, group="Wifi_status.Get"),
    S("wifi_ip", "adresse_ip", lambda c: c.value("sta_ip", "Wifi_status.Get"), cat=DIAG, group="Wifi_status.Get"),
    # compteurs
    S("total_sessions", "nombre_de_sessions", g("total_charged_sessions", "Counters_config.Get"), None, None, INC, group="Counters_config.Get"),
    S("total_time", "temps_de_charge_total", g("total_charged_time", "Counters_config.Get", 60, 1), UnitOfTime.HOURS, SensorDeviceClass.DURATION, INC, group="Counters_config.Get"),
    S("last_session_energy", "energie_derniere_session", g("last_session_energy", "Counters_config.Get", 1000, 3), UnitOfEnergy.KILO_WATT_HOUR, SensorDeviceClass.ENERGY, None, group="Counters_config.Get"),
    # santé de la liaison (pour suivre la charge imposée à la borne)
    S("requests", "requetes_envoyees", lambda c: c.client.requests, None, None, INC, DIAG),
    S("failures", "echecs_de_communication", lambda c: c.client.failures, None, None, INC, DIAG),
)


async def async_setup_entry(hass, entry, async_add_entities):
    c: LektricoCoordinator = entry.runtime_data
    three = c.ident["type"] == "3p22k"
    entities = [LektricoSensor(c, d) for d in SENSORS if three or not d.phases3]
    if getattr(c, "pilot", None):
        entities.append(PilotSensor(c))
    async_add_entities(entities)


class LektricoSensor(LektricoEntity, SensorEntity):
    def __init__(self, c: LektricoCoordinator, d: S) -> None:
        super().__init__(c, "sensor", d.key, d.suffix)
        self.d = d
        self._attr_native_unit_of_measurement = d.unit
        self._attr_device_class = d.dc
        self._attr_state_class = d.sc
        self._attr_entity_category = d.cat
        self._attr_entity_registry_enabled_default = d.on
        if d.options:
            self._attr_options = d.options
        if d.key in ("requests", "failures"):
            self._attr_icon = "mdi:swap-vertical" if d.key == "requests" else "mdi:lan-disconnect"

    @property
    def available(self) -> bool:
        if self.d.key in ("requests", "failures"):
            return True
        if self.d.group != "info" and self.d.group in self.coordinator.unsupported:
            return False
        return super().available

    @property
    def native_value(self):
        return self.d.fn(self.coordinator)

    @property
    def extra_state_attributes(self):
        if self.d.key == "state":
            return {"code": self.coordinator.value("extended_charger_state"),
                    "derniere_reponse": self.coordinator.last_success}
        if self.d.key == "wifi_rssi":
            w = self.coordinator.slow.get("Wifi_status.Get") or {}
            return {"bssid": w.get("bssid"), "reseau": w.get("sta_name")}
        return None


class PilotSensor(LektricoEntity, SensorEntity):
    """Ce que fait le pilotage en ce moment (texte), détails en attributs."""
    _attr_icon = "mdi:robot-outline"

    def __init__(self, c) -> None:
        super().__init__(c, "sensor", "pilot", "pilotage")
        self._pilot = c.pilot

    async def async_added_to_hass(self) -> None:
        await super().async_added_to_hass()
        self.async_on_remove(self._pilot.add_listener(self.async_write_ha_state))

    @property
    def available(self) -> bool:
        return True

    @property
    def native_value(self):
        st = self._pilot.status
        if st.get("state") == "init":
            return None
        return st.get("why")

    @property
    def extra_state_attributes(self):
        st = self._pilot.status
        return {"mode": st.get("mode"), "heures_creuses": st.get("hc"), "cible": st.get("target"),
                "plafond_delestage": st.get("cap"), "limite": st.get("applied"), "delestage": st.get("delestage"),
                "ecritures": self._pilot.writes}
