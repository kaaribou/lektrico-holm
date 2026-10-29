"""Tests HOLM Lektrico contre une borne simulée (serveur HTTP local)."""
import asyncio
from datetime import timedelta

import pytest
from aiohttp import web
from pytest_homeassistant_custom_component.common import MockConfigEntry, async_fire_time_changed
from homeassistant.util import dt as dt_util

from custom_components.lektrico_holm.const import DOMAIN

INFO = {"charger_state": "C", "extended_charger_state": "C", "session_energy": 4210.5, "charging_time": 3600,
        "session_id": 13, "instant_power": 7120.0, "currents": [30.9, 0, 0], "voltages": [231.4, 0, 0],
        "voltages": [231.4, 0, 0], "temperature": 41.2, "energy_index": 0.0, "total_charged_energy": 152,
        "headless": True, "led_max_brightness": 20, "install_current": 32, "dynamic_current": 32, "em_current": 32,
        "fw_version": "1.20.0", "current_limit_reason": 3, "has_active_errors": False, "charger_is_paused": False,
        "heap_free": 81234, "pwm_current": 31}


class FakeCharger:
    def __init__(self):
        self.calls, self.posts, self.down = [], [], False
        self.unsupported = {"counters_config.get"}
        self.app = {"charger_locked": False, "auto_update": True, "user_current": 32, "user_power": 7360,
                    "charging_schedule_enabled": False, "led_dimming_delay": 0, "headless": True}

    async def get(self, request):
        m = request.match_info["m"]
        if self.down:
            raise ConnectionResetError
        self.calls.append(m)
        if m.lower() in self.unsupported:
            return web.Response(status=404)
        data = {"device_id.get": {"device_id": "1p7k_100825"},
                "charger_config.get": {"serial_number": 100825, "board_revision": "E"},
                "charger_info.get": INFO, "app_config.get": self.app,
                "system_currents.get": {"dynamic_current": INFO["dynamic_current"], "charging_current": 32, "system_max_current": 32,
                                        "schedule_current": 32, "temperature_current": 32, "user_power_current": 32},
                "active_errors.get": getattr(self, "active", {}),
                "wifi_status.get": {"connected": True, "sta_ip": "192.168.31.246", "rssi": -54, "bssid": "aa"}}.get(m.lower())
        if data is None:
            return web.Response(status=404)
        return web.json_response(data, headers={"Connection": "close"})

    async def post(self, request):
        body = await request.json()
        self.posts.append(body)
        if body["method"] == "Dynamic_current.Set":
            INFO["dynamic_current"] = body["params"]["dynamic_current"]
            self.dyn = body["params"]["dynamic_current"]
        if body["method"] == "App_config.Set":
            self.app[body["params"]["config_key"]] = body["params"]["config_value"]
            if body["params"]["config_key"] == "headless":
                INFO["headless"] = body["params"]["config_value"]
        return web.json_response({"id": body["id"], "result": True})


@pytest.fixture
async def charger(socket_enabled, aiohttp_server):
    fc = FakeCharger()
    app = web.Application()
    app.router.add_get("/rpc/{m}", fc.get)
    app.router.add_post("/rpc", fc.post)
    srv = await aiohttp_server(app)
    fc.host = f"127.0.0.1:{srv.port}"
    return fc


async def _setup(hass, fc):
    entry = MockConfigEntry(domain=DOMAIN, title="Borne de recharge", unique_id="100825",
                            data={"host": fc.host, "prefix": "garage_borne_de_recharge"})
    entry.add_to_hass(hass)
    assert await hass.config_entries.async_setup(entry.entry_id)
    await hass.async_block_till_done()
    return entry


async def test_entities_and_ids(hass, charger):
    await _setup(hass, charger)
    s = lambda e: hass.states.get(e)
    assert s("sensor.garage_borne_de_recharge_etat").state == "charging"
    assert float(s("sensor.garage_borne_de_recharge_puissance").state) == 7.12
    assert float(s("sensor.garage_borne_de_recharge_energie").state) == 4.21
    assert float(s("sensor.garage_borne_de_recharge_courant").state) == 30.9
    assert float(s("sensor.garage_borne_de_recharge_tension").state) == 231.4
    assert s("sensor.garage_borne_de_recharge_raison_de_la_limite").state == "dynamic_limit"
    assert s("number.garage_borne_de_recharge_limite_dynamique").state == "32.0"
    assert s("switch.garage_borne_de_recharge_authentification").state == "off"   # headless = pas d'authentification
    assert s("binary_sensor.garage_borne_de_recharge_erreur_ev").state == "off"
    assert s("button.garage_borne_de_recharge_demarrer_la_recharge") is not None
    assert s("sensor.garage_borne_de_recharge_courant_l1") is None  # monophasé
    # setup: identify (3) + premier cycle (2 au plus)
    assert len(charger.calls) <= 5, charger.calls


async def test_max_two_requests_per_cycle_and_slow_rotation(hass, charger):
    entry = await _setup(hass, charger)
    c = entry.runtime_data
    for _ in range(6):
        n = len(charger.calls)
        await c.async_refresh()
        await hass.async_block_till_done()
        assert len(charger.calls) - n <= 2
    got = set(c.lower() for c in charger.calls)
    assert {"app_config.get", "system_currents.get", "wifi_status.get"} <= got
    # méthode non prise en charge : demandée une seule fois, puis ignorée
    assert sum(1 for c in charger.calls if c.lower() == "counters_config.get") == 1
    assert hass.states.get("sensor.garage_borne_de_recharge_nombre_de_sessions").state == "unavailable"
    assert hass.states.get("sensor.garage_borne_de_recharge_signal_wifi").state == "-54"


async def test_backoff_when_down(hass, charger):
    entry = await _setup(hass, charger)
    c = entry.runtime_data
    charger.down = True
    seen = []
    for i in range(5):
        await c.async_refresh()
        await hass.async_block_till_done()
        seen.append(c.update_interval.total_seconds())
    assert seen == [60, 120, 240, 300, 300], seen
    assert hass.states.get("sensor.garage_borne_de_recharge_etat").state == "unavailable"
    charger.down = False
    await c.async_refresh()
    await hass.async_block_till_done()
    assert c.update_interval == timedelta(seconds=30)
    assert hass.states.get("sensor.garage_borne_de_recharge_etat").state == "charging"


async def test_commands(hass, charger):
    await _setup(hass, charger)
    await hass.services.async_call("number", "set_value", {"entity_id": "number.garage_borne_de_recharge_limite_dynamique", "value": 12}, blocking=True)
    assert charger.posts[-1]["method"] == "Dynamic_current.Set" and charger.posts[-1]["params"] == {"dynamic_current": 12}
    assert hass.states.get("number.garage_borne_de_recharge_limite_dynamique").state == "12.0"
    await hass.services.async_call("switch", "turn_on", {"entity_id": "switch.garage_borne_de_recharge_authentification"}, blocking=True)
    assert charger.posts[-1]["params"] == {"config_key": "headless", "config_value": False}
    await hass.services.async_call("button", "press", {"entity_id": "button.garage_borne_de_recharge_arreter_la_recharge"}, blocking=True)
    assert charger.posts[-1]["method"] == "Charge.Stop"


async def test_config_flow(hass, charger):
    r = await hass.config_entries.flow.async_init(DOMAIN, context={"source": "user"})
    r = await hass.config_entries.flow.async_configure(r["flow_id"], {"host": charger.host, "name": "Borne", "prefix": "garage_borne_de_recharge"})
    assert r["type"] == "create_entry" and r["result"].unique_id == "100825"
    r = await hass.config_entries.flow.async_init(DOMAIN, context={"source": "user"})
    r = await hass.config_entries.flow.async_configure(r["flow_id"], {"host": "127.0.0.1:1", "name": "x", "prefix": "x"})
    assert r["errors"] == {"base": "cannot_connect"}


class FakeResources:
    loaded = True

    def __init__(self, items):
        self.items = items

    def async_items(self):
        return self.items

    async def async_create_item(self, d):
        self.items.append({"id": "n", **d})

    async def async_update_item(self, i, d):
        next(r for r in self.items if r["id"] == i).update(d)


async def test_card_resource(hass):
    from types import SimpleNamespace
    from custom_components.lektrico_holm import _register_resource
    url = "/lektrico_holm/holm-borne-card.js?v=1.0.0-abc"
    # rien : la ressource est créée
    res = FakeResources([])
    hass.data["lovelace"] = SimpleNamespace(resources=res)
    assert await _register_resource(hass, url) and res.items[0]["url"] == url
    # ancienne version : mise à jour
    res.items[0]["url"] = "/lektrico_holm/holm-borne-card.js?v=0.9"
    assert await _register_resource(hass, url) and res.items[0]["url"] == url and len(res.items) == 1
    # carte déjà installée ailleurs : aucun doublon
    res2 = FakeResources([{"id": "a", "url": "/local/community/holm-cards/holm-borne-card.js?v=2.2.0", "res_type": "module"}])
    hass.data["lovelace"] = SimpleNamespace(resources=res2)
    assert await _register_resource(hass, url) and len(res2.items) == 1


async def _setup_pilot(hass, fc, **extra):
    hass.states.async_set("input_boolean.hc", "off")
    hass.states.async_set("sensor.compteur", "2000", {"unit_of_measurement": "W", "device_class": "power"})
    opts = {"pilot": True, "hc_entity": "input_boolean.hc", "hc_values": "on", "meter_entity": "sensor.compteur",
            "max_power": 11500, "max_current": 32, **extra}
    entry = MockConfigEntry(domain=DOMAIN, title="Borne de recharge", unique_id="100825",
                            data={"host": fc.host, "prefix": "garage_borne_de_recharge"}, options=opts)
    entry.add_to_hass(hass)
    assert await hass.config_entries.async_setup(entry.entry_id)
    await hass.async_block_till_done()
    return entry


def _dyn(fc):
    return [p["params"]["dynamic_current"] for p in fc.posts if p["method"] == "Dynamic_current.Set"]


@pytest.fixture
def info_reset():
    saved = dict(INFO)
    yield INFO
    INFO.clear()
    INFO.update(saved)


async def test_pilot_off_peak(hass, charger, info_reset):
    INFO["dynamic_current"] = 32
    entry = await _setup_pilot(hass, charger)
    st = hass.states
    assert st.get("select.garage_borne_de_recharge_mode_de_charge").state == "heures_creuses"
    assert st.get("switch.garage_borne_de_recharge_delestage").state == "on"
    assert _dyn(charger)[-1] == 0                          # heures pleines : pause
    assert "attente des heures creuses" in st.get("sensor.garage_borne_de_recharge_pilotage").state
    # la carte retrouve l'entité heures creuses du pilotage (décompte HOLM HP/HC)
    assert st.get("sensor.garage_borne_de_recharge_pilotage").attributes["entite_heures_creuses"] == "input_boolean.hc"
    hass.states.async_set("input_boolean.hc", "on")
    await hass.async_block_till_done()
    assert _dyn(charger)[-1] == 32                         # heures creuses : pleine puissance
    # délestage : la maison consomme beaucoup
    hass.states.async_set("sensor.compteur", "13000", {"unit_of_measurement": "W"})
    await hass.async_block_till_done()
    assert _dyn(charger)[-1] == 24                         # 30.9 + (11500-13000)/231.4 = 24.4
    assert "délestage" in st.get("sensor.garage_borne_de_recharge_pilotage").state
    # hausse limitée à une par minute
    hass.states.async_set("sensor.compteur", "5000", {"unit_of_measurement": "W"})
    await hass.async_block_till_done()
    assert _dyn(charger)[-1] == 24
    # délestage coupé : le plafond disparaît
    await hass.services.async_call("switch", "turn_off", {"entity_id": "switch.garage_borne_de_recharge_delestage"}, blocking=True)
    await hass.async_block_till_done()
    assert _dyn(charger)[-1] == 32


async def test_pilot_now_and_unplug(hass, charger, info_reset):
    INFO["dynamic_current"] = 32
    entry = await _setup_pilot(hass, charger)
    assert _dyn(charger)[-1] == 0
    await hass.services.async_call("select", "select_option", {"entity_id": "select.garage_borne_de_recharge_mode_de_charge", "option": "maintenant"}, blocking=True)
    await hass.async_block_till_done()
    assert _dyn(charger)[-1] == 32                         # heures pleines mais « Maintenant »
    INFO["extended_charger_state"] = "A"                   # voiture débranchée
    await entry.runtime_data.async_refresh()
    await hass.async_block_till_done()
    assert hass.states.get("select.garage_borne_de_recharge_mode_de_charge").state == "heures_creuses"
    assert _dyn(charger)[-1] == 0
    await hass.services.async_call("select", "select_option", {"entity_id": "select.garage_borne_de_recharge_mode_de_charge", "option": "arret"}, blocking=True)
    hass.states.async_set("input_boolean.hc", "on")
    await hass.async_block_till_done()
    assert _dyn(charger)[-1] == 0                          # arrêt, même en heures creuses


async def test_pilot_numeric_tariff_and_options_flow(hass, charger, info_reset):
    INFO["dynamic_current"] = 0
    hass.states.async_set("sensor.tarif", "0.1589")
    entry = await _setup_pilot(hass, charger, hc_entity="sensor.tarif", hc_values="0.1589")
    assert _dyn(charger) == [32]                           # 0.1589 = heures creuses
    hass.states.async_set("sensor.tarif", "0.2142")
    await hass.async_block_till_done()
    assert _dyn(charger)[-1] == 0
    r = await hass.config_entries.options.async_init(entry.entry_id)
    assert r["type"] == "menu"
    r = await hass.config_entries.options.async_configure(r["flow_id"], {"next_step_id": "pilot"})
    r = await hass.config_entries.options.async_configure(r["flow_id"], {"pilot": True, "max_power": 8500, "max_current": 32})
    assert r["errors"] == {"hc_entity": "hc_required"}


async def test_no_pilot_entities_by_default(hass, charger):
    await _setup(hass, charger)
    assert hass.states.get("select.garage_borne_de_recharge_mode_de_charge") is None
    assert hass.states.get("switch.garage_borne_de_recharge_delestage") is None


async def test_pilot_charge_current(hass, charger, info_reset):
    INFO["dynamic_current"] = 32
    await _setup_pilot(hass, charger)
    hass.states.async_set("input_boolean.hc", "on")
    await hass.async_block_till_done()
    await hass.services.async_call("number", "set_value", {"entity_id": "number.garage_borne_de_recharge_courant_de_charge", "value": 16}, blocking=True)
    await hass.async_block_till_done()
    assert _dyn(charger)[-1] == 16
    assert hass.states.get("number.garage_borne_de_recharge_courant_de_charge").state == "16.0"



async def test_active_errors_do_not_starve_slow_reads(hass, charger, info_reset):
    INFO["has_active_errors"] = True                       # erreur signalée sans clé connue
    charger.active = {"some_new_error": True}
    entry = await _setup(hass, charger)
    c = entry.runtime_data
    for _ in range(8):
        await c.async_refresh()
    assert "System_currents.Get" in c.slow and "App_config.Get" in c.slow
    assert hass.states.get("number.garage_borne_de_recharge_limite_dynamique").state != "unavailable"
    assert hass.states.get("binary_sensor.garage_borne_de_recharge_erreurs_actives").attributes["erreurs"] == ["some_new_error"]



async def test_active_flag_without_detail_is_not_an_error(hass, charger, info_reset):
    INFO["has_active_errors"] = True
    charger.active = {"overtemp": False, "current_leak_detected": False}
    entry = await _setup(hass, charger)
    for _ in range(3):
        await entry.runtime_data.async_refresh()
    await hass.async_block_till_done()
    assert hass.states.get("binary_sensor.garage_borne_de_recharge_erreurs_actives").state == "off"
