"""Diagnostic téléchargeable HOLM Lektrico."""
from __future__ import annotations

from homeassistant.components.diagnostics import async_redact_data

TO_REDACT = {"owner_id", "latitude", "longitude", "bssid", "sta_name", "em_id", "ocpp_server_link"}


async def async_get_config_entry_diagnostics(hass, entry):
    c = entry.runtime_data
    return {
        "ident": {k: v for k, v in c.ident.items() if k != "info"},
        "interval_s": c.update_interval.total_seconds() if c.update_interval else None,
        "requests": c.client.requests, "failures": c.client.failures, "consecutive_failures": c.fails,
        "unsupported": sorted(c.unsupported),
        "charger_info": c.info, "errors": c.errors, "active_errors_raw": c.raw_errors,
        "slow": async_redact_data(c.slow, TO_REDACT),
    }
