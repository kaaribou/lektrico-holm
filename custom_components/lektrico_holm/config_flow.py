"""Configuration de HOLM Lektrico (ajout manuel par adresse IP, aucune détection automatique)."""
from __future__ import annotations

from typing import Any

import voluptuous as vol

from homeassistant.config_entries import ConfigEntry, ConfigFlow, ConfigFlowResult, OptionsFlow
from homeassistant.const import CONF_HOST, CONF_NAME
from homeassistant.core import callback
from homeassistant.helpers import selector

from .api import LektricoClient, LektricoError
from .const import CONF_PREFIX, CONF_SCAN, DEFAULT_NAME, DEFAULT_PREFIX, DEFAULT_SCAN, DOMAIN, MAX_SCAN, MIN_SCAN


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
        if user_input is not None:
            return self.async_create_entry(data=user_input)
        cur = self.config_entry.options.get(CONF_SCAN, DEFAULT_SCAN)
        return self.async_show_form(step_id="init", data_schema=vol.Schema({
            vol.Required(CONF_SCAN, default=cur): selector.NumberSelector(selector.NumberSelectorConfig(
                min=MIN_SCAN, max=MAX_SCAN, step=5, unit_of_measurement="s", mode=selector.NumberSelectorMode.BOX)),
        }))
