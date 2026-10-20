"""Constantes de HOLM Lektrico."""
from __future__ import annotations

DOMAIN = "lektrico_holm"
VERSION = "1.0.0"
STATIC_PATH = "/lektrico_holm"
CARD_NAME = "holm-borne-card.js"
CARD_URL = f"{STATIC_PATH}/{CARD_NAME}"

CONF_PREFIX = "prefix"
CONF_SCAN = "scan_interval"
DEFAULT_PREFIX = "garage_borne_de_recharge"
DEFAULT_NAME = "Borne de recharge"
DEFAULT_SCAN = 30          # s entre deux interrogations (2 requêtes au plus)
MIN_SCAN, MAX_SCAN = 15, 300
MAX_BACKOFF = 300          # s : intervalle maximal quand la borne répond mal
SLOW_EVERY = 300           # s : Wi-Fi et compteurs relus toutes les 5 min
APP_EVERY = 120            # s : réglages (App_config) relus toutes les 2 min (changements faits dans l'appli Lektrico)
REQUEST_TIMEOUT = 8        # s

# extended_charger_state -> état lisible (mêmes clés que l'intégration officielle)
STATE_MAP = {
    "A": "available", "B": "connected", "B_AUTH": "need_auth", "C": "charging", "D": "charging",
    "B_PAUSE": "paused", "B_SCHEDULER": "paused_by_scheduler", "LOCKED": "locked",
    "E": "error", "F": "error", "OTA": "updating_firmware",
}
STATE_OPTIONS = ["available", "charging", "connected", "error", "locked", "need_auth",
                 "paused", "paused_by_scheduler", "updating_firmware"]
LIMIT_REASONS = ["no_limit", "installation_current", "user_limit", "dynamic_limit", "schedule",
                 "em_offline", "em", "ocpp", "overtemperature"]

# méthodes lues lentement, une seule par cycle (jamais plus de 2 requêtes par cycle)
SLOW_METHODS = ("App_config.Get", "Wifi_status.Get", "Counters_config.Get")
# lue un cycle sur deux : contient la limite dynamique et le courant de charge autorisé
CURRENTS_METHOD = "System_currents.Get"

ERROR_KEYS = ("state_e_activated", "overtemp", "critical_temp", "overcurrent", "meter_fault", "voltage_error",
              "rcd_error", "rcd_test_error", "state_f_activated", "contactor_failure", "cp_diode_failure",
              "undervoltage_error", "overvoltage_error", "state_machine_na_error")
