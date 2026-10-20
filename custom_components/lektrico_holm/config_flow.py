"""Configuration de HOLM Lektrico (ajout manuel par adresse IP, aucune détection automatique)."""
from __future__ import annotations

from typing import Any

import voluptuous as vol

from homeassistant.config_entries import ConfigEntry, ConfigFlow, ConfigFlowResult, OptionsFlow
from homeassistant.const import CONF_HOST, CONF_NAME
from homeassistant.core import callback
from homeassistant.helpers import selector

from .api import LektricoClient, LektricoError
from .const import (CONF_HC_ENTITY, CONF_HC_VALUES, CONF_MAX_CURRENT, CONF_MAX_POWER, CONF_METER, CONF_PILOT, CONF_PREFIX,
                    CONF_SCAN, DEFAULT_MAX_CURRENT, DEFAULT_MAX_POWER, DEFAULT_NAME, DEFAULT_PREFIX, DEFAULT_SCAN, DOMAIN,
                    MAX_SCAN, MIN_SCAN)


class LektricoHolmFlow(ConfigFlow, domain=DOMAIN):
    VERSION = 1

    async def async_step_user(self, user_input: dict[str, Any] | None = None) -> ConfigFlowResult:
        errors: dict[str, str] = {}
        if user_input is not None:
            client = LektricoClient(user_input[CONF_HOST])
            try:
                ident = await client.identify()
            except LektricoError:
                errors["base"] = "cannot_connect"
            else:
                await self.async_set_unique_id(ident["serial"] or ident["device_id"])
                self._abort_if_unique_id_configured(updates={CONF_HOST: client.host})
                prefix = (user_input.get(CONF_PREFIX) or DEFAULT_PREFIX).strip().lower().replace(" ", "_")
                return self.async_create_entry(
                    title=user_input.get(CONF_NAME) or DEFAULT_NAME,
                    data={CONF_HOST: client.host, CONF_PREFIX: prefix},
                )
            finally:
                await client.close()
        schema = vol.Schema({
            vol.Required(CONF_HOST, default=(user_input or {}).get(CONF_HOST, "")): str,
            vol.Optional(CONF_NAME, default=(user_input or {}).get(CONF_NAME, DEFAULT_NAME)): str,
            vol.Optional(CONF_PREFIX, default=(user_input or {}).get(CONF_PREFIX, DEFAULT_PREFIX)): str,
        })
        return self.async_show_form(step_id="user", data_schema=schema, errors=errors)

    async def async_step_reconfigure(self, user_input: dict[str, Any] | None = None) -> ConfigFlowResult:
        """Changer l'adresse IP de la borne sans tout refaire."""
        entry = self._get_reconfigure_entry()
        errors: dict[str, str] = {}
        if user_input is not None:
            client = LektricoClient(user_input[CONF_HOST])
            try:
                ident = await client.identify()
            except LektricoError:
                errors["base"] = "cannot_connect"
            else:
                await self.async_set_unique_id(ident["serial"] or ident["device_id"])
                self._abort_if_unique_id_mismatch(reason="wrong_device")
                return self.async_update_reload_and_abort(entry, data_updates={CONF_HOST: client.host})
            finally:
                await client.close()
        return self.async_show_form(step_id="reconfigure", errors=errors,
                                    data_schema=vol.Schema({vol.Required(CONF_HOST, default=entry.data[CONF_HOST]): str}))

    @staticmethod
    @callback
    def async_get_options_flow(entry: ConfigEntry) -> OptionsFlow:
        return LektricoHolmOptions()


class LektricoHolmOptions(OptionsFlow):
    async def async_step_init(self, user_input: dict[str, Any] | None = None) -> ConfigFlowResult:
        return self.async_show_menu(step_id="init", menu_options=["general", "pilot"])

    async def async_step_general(self, user_input: dict[str, Any] | None = None) -> ConfigFlowResult:
        if user_input is not None:
            return self.async_create_entry(data={**self.config_entry.options, **user_input})
        cur = self.config_entry.options.get(CONF_SCAN, DEFAULT_SCAN)
        return self.async_show_form(step_id="general", data_schema=vol.Schema({
            vol.Required(CONF_SCAN, default=cur): selector.NumberSelector(selector.NumberSelectorConfig(
                min=MIN_SCAN, max=MAX_SCAN, step=5, unit_of_measurement="s", mode=selector.NumberSelectorMode.BOX)),
        }))

    async def async_step_pilot(self, user_input: dict[str, Any] | None = None) -> ConfigFlowResult:
        o = self.config_entry.options
        errors: dict[str, str] = {}
        if user_input is not None:
            if user_input.get(CONF_PILOT) and not user_input.get(CONF_HC_ENTITY):
                errors[CONF_HC_ENTITY] = "hc_required"
            else:
                data = {**o, **user_input}
                for k in (CONF_METER, CONF_HC_ENTITY):
                    if not user_input.get(k):
                        data.pop(k, None)
                return self.async_create_entry(data=data)
        def opt(k, d=None):
            return {"suggested_value": (user_input or o).get(k, d)}
        schema = vol.Schema({
            vol.Required(CONF_PILOT, default=o.get(CONF_PILOT, False)): selector.BooleanSelector(),
            vol.Optional(CONF_HC_ENTITY, description=opt(CONF_HC_ENTITY)): selector.EntitySelector(),
            vol.Optional(CONF_HC_VALUES, description=opt(CONF_HC_VALUES, "on")): selector.TextSelector(),
            vol.Optional(CONF_METER, description=opt(CONF_METER)): selector.EntitySelector(
                selector.EntitySelectorConfig(domain="sensor", device_class="power")),
            vol.Required(CONF_MAX_POWER, default=o.get(CONF_MAX_POWER, DEFAULT_MAX_POWER)): selector.NumberSelector(
                selector.NumberSelectorConfig(min=1000, max=36000, step=100, unit_of_measurement="W", mode=selector.NumberSelectorMode.BOX)),
            vol.Required(CONF_MAX_CURRENT, default=o.get(CONF_MAX_CURRENT, DEFAULT_MAX_CURRENT)): selector.NumberSelector(
                selector.NumberSelectorConfig(min=6, max=32, step=1, unit_of_measurement="A", mode=selector.NumberSelectorMode.BOX)),
        })
        return self.async_show_form(step_id="pilot", data_schema=schema, errors=errors)
