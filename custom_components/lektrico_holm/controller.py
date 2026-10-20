"""Pilotage de la charge : mode (heures creuses / maintenant / arrêt) et délestage, sans automatisation.

Une seule valeur est calculée puis écrite dans la borne (limite dynamique) :
    limite = min(cible du mode, plafond de délestage)
- Heures creuses : courant maximal pendant les heures creuses, pause (0 A) en dehors.
- Maintenant     : courant maximal tout de suite (repasse en Heures creuses au débranchement).
- Arrêt          : pause (0 A).
- Délestage      : pendant une session, la limite suit la puissance mesurée au compteur pour ne pas
  dépasser la puissance maximale ; baisse immédiate, hausse au plus toutes les 60 s, pause sous
  6 A et reprise à partir de 7 A, plafond de 16 A si le compteur ne répond plus depuis 5 min.
"""
from __future__ import annotations

import asyncio
import logging
import math
import time
from collections.abc import Callable
from datetime import timedelta

from homeassistant.core import Event, HomeAssistant, callback
from homeassistant.helpers.event import async_track_state_change_event, async_track_time_interval
from homeassistant.util import dt as dt_util

from .api import LektricoError
from .const import (CONF_HC_ENTITY, CONF_HC_VALUES, CONF_MAX_CURRENT, CONF_MAX_POWER, CONF_METER, DEFAULT_MAX_CURRENT,
                    DEFAULT_MAX_POWER, MODE_HC, MODE_NOW, MODE_STOP, SESSION_STATES, STATE_MAP)

_LOGGER = logging.getLogger(__name__)
MIN_A, RESUME_A, STALE_CAP_A = 6, 7, 16
STALE_S, RAISE_EVERY_S = 300, 60


def _num(v):
    try:
        return float(v)
    except (TypeError, ValueError):
        return None


class ChargeController:
    def __init__(self, hass: HomeAssistant, coordinator, options: dict) -> None:
        self.hass, self.c = hass, coordinator
        self.meter = options.get(CONF_METER) or None
        self.hc_entity = options.get(CONF_HC_ENTITY) or None
        self.hc_values = [x.strip() for x in str(options.get(CONF_HC_VALUES, "")).split(",") if x.strip()]
        self.max_power = float(options.get(CONF_MAX_POWER, DEFAULT_MAX_POWER))
        self.max_a = int(options.get(CONF_MAX_CURRENT, DEFAULT_MAX_CURRENT))
        self.mode = MODE_HC
        self.delestage = True
        self.charge_a = self.max_a        # courant souhaité (réglable depuis la carte), plafonné par le délestage
        self.status: dict = {"state": "init"}
        self._listeners: list[Callable[[], None]] = []
        self._unsubs: list[Callable[[], None]] = []
        self._lock = asyncio.Lock()
        self._last_write = 0.0
        self._last_target: int | None = None
        self._prev_state: str | None = None
        self.writes = 0

    # ---- cycle de vie ----
    def start(self) -> None:
        ids = [e for e in (self.meter, self.hc_entity) if e]
        if ids:
            self._unsubs.append(async_track_state_change_event(self.hass, ids, self._on_event))
        self._unsubs.append(self.c.async_add_listener(self._on_coordinator))
        self._unsubs.append(async_track_time_interval(self.hass, self._on_tick, timedelta(seconds=60)))
        self.schedule("démarrage")

    def stop(self) -> None:
        for u in self._unsubs:
            u()
        self._unsubs.clear()

    def add_listener(self, cb: Callable[[], None]) -> Callable[[], None]:
        self._listeners.append(cb)
        return lambda: self._listeners.remove(cb)

    def _notify(self) -> None:
        for cb in list(self._listeners):
            cb()

    # ---- commandes des entités ----
    def set_mode(self, mode: str, evaluate: bool = True) -> None:
        self.mode = mode
        self._last_target = None          # un changement de mode s'applique immédiatement
        self._notify()
        if evaluate:
            self.schedule("mode")

    def set_charge_current(self, amps: float, evaluate: bool = True) -> None:
        self.charge_a = max(MIN_A, min(self.max_a, int(round(amps))))
        self._last_target = None
        self._notify()
        if evaluate:
            self.schedule("courant")

    def set_delestage(self, on: bool, evaluate: bool = True) -> None:
        self.delestage = on
        self._last_target = None          # couper le délestage rend la puissance tout de suite
        self._notify()
        if evaluate:
            self.schedule("délestage")

    # ---- déclencheurs ----
    @callback
    def _on_event(self, event: Event) -> None:
        self.schedule("mesure")

    @callback
    def _on_coordinator(self) -> None:
        self.schedule("borne")

    @callback
    def _on_tick(self, now) -> None:
        self.schedule("minute")

    @callback
    def schedule(self, why: str) -> None:
        if self._lock.locked():
            return
        self.hass.async_create_task(self.evaluate(why))

    # ---- lectures ----
    def charger_state(self) -> str | None:
        ext = self.c.value("extended_charger_state") or self.c.value("charger_state")
        return STATE_MAP.get(ext, ext) if ext else None

    def hc_active(self) -> bool | None:
        if not self.hc_entity:
            return None
        st = self.hass.states.get(self.hc_entity)
        if st is None or st.state in ("unknown", "unavailable"):
            return None
        for want in self.hc_values or ["on"]:
            a, b = _num(st.state), _num(want)
            if a is not None and b is not None:
                if abs(a - b) < 1e-6:
                    return True
            elif st.state.strip().casefold() == want.casefold():
                return True
        return False

    def _current(self) -> float:
        cur = self.c.value("currents")
        if isinstance(cur, list) and cur:
            return _num(cur[0]) or 0.0
        return _num(self.c.value("current")) or 0.0

    def _voltage(self) -> float:
        v = self.c.value("voltages")
        v = _num(v[0]) if isinstance(v, list) and v else _num(self.c.value("voltage"))
        return v if v and 180 < v < 260 else 230.0

    def _limit(self) -> int | None:
        v = _num(self.c.value("dynamic_current", "System_currents.Get"))
        if v is None:
            v = _num(self.c.value("dynamic_current"))
        return int(v) if v is not None else None

    # ---- calcul ----
    def compute(self) -> dict:
        state = self.charger_state()
        session = state in SESSION_STATES
        hc = self.hc_active()
        actuel = self._limit()
        if self.mode == MODE_STOP:
            target, why = 0, "Arrêt"
        elif self.mode == MODE_NOW:
            target, why = self.charge_a, "Maintenant"
        elif hc is None:
            target, why = self.charge_a, "Heures creuses inconnues : charge autorisée"
        elif hc:
            target, why = self.charge_a, "Heures creuses"
        else:
            target, why = 0, "En attente des heures creuses"
        desired, cap, limited = target, None, False
        if self.delestage and session and target > 0 and self.meter:
            st = self.hass.states.get(self.meter)
            p = _num(st.state) if st else None
            fresh = st is not None and p is not None and (dt_util.utcnow() - st.last_reported).total_seconds() < STALE_S
            if not fresh:
                cap = STALE_CAP_A
                note = "compteur muet"
            else:
                i_borne = min(self._current(), actuel) if actuel else 0.0
                cap = math.floor(i_borne + (self.max_power - p) / self._voltage())
                note = f"{int(p)} W au compteur"
            if cap < desired:
                desired, limited = max(cap, 0), True
                why = f"{why} · délestage ({note})"
        if 0 < desired < MIN_A:
            desired = 0
        if limited and actuel == 0 and desired < RESUME_A:
            desired = 0
        return {"state": state, "session": session, "hc": hc, "target": target, "cap": cap, "limited": limited,
                "desired": int(desired), "actuel": actuel, "why": why}

    async def evaluate(self, why: str = "") -> None:
        async with self._lock:
            r = self.compute()
            state = r["state"]
            # débranchement : « Maintenant » repasse en « Heures creuses »
            if self._prev_state in SESSION_STATES and state == "available" and self.mode == MODE_NOW:
                _LOGGER.info("Voiture débranchée : retour au mode Heures creuses")
                self.mode = MODE_HC
                self._last_target = None
                self._notify()
                r = self.compute()
            self._prev_state = state
            desired, actuel = r["desired"], r["actuel"]
            write = desired != actuel             # limite encore inconnue : on l'impose
            # hausse à cible inchangée (fin de délestage) : au plus toutes les 60 s (pas d'effet yo-yo) ;
            # un changement de mode ou le début des heures creuses s'appliquent tout de suite
            if write and desired > (actuel or 0) and self._last_target == r["target"] \
                    and time.monotonic() - self._last_write < RAISE_EVERY_S:
                write = False
            if write:
                try:
                    await self.c.client.call("Dynamic_current.Set", {"dynamic_current": desired})
                    self.c.patch("System_currents.Get", "dynamic_current", desired)
                    self._last_write = time.monotonic()
                    self.writes += 1
                    _LOGGER.debug("Limite dynamique %s → %s A (%s ; %s)", actuel, desired, r["why"], why)
                except LektricoError as err:
                    _LOGGER.warning("Limite dynamique non appliquée : %s", err)
            self._last_target = r["target"]
            self.status = {**r, "mode": self.mode, "delestage": self.delestage, "applied": desired if write else actuel}
            self._notify()
