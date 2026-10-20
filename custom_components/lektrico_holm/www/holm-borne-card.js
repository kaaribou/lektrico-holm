/* holm-borne-card — HOLM Cards — licence MIT — v2.3.1 */
/* HOLM Borne — carte de borne de recharge (HOLM Lektrico, intégration Lektrico officielle et compatibles)
 * - Illustration animée borne → câble → voiture selon l'état.
 * - Onglets : Charge (mesures, limite, actions) · Réglages (interrupteurs et curseurs) ·
 *   Statistiques (compteurs) · Diagnostic (défauts, Wi-Fi, santé de la liaison, courants système).
 * - Délestage : interrupteur optionnel (automatisation) intégré à l'entête.
 * Les entités sont détectées depuis l'appareil de l'entité « État » (clé de traduction, sinon suffixe).
 */
(() => {
  const VERSION = "2.3.1";
  // clé -> [translation_key, suffixe d'entity_id, domaine]
  const MAP = {
    state: ["state", "etat", "sensor"], power: ["power", "puissance", "sensor"], current: ["current", "courant", "sensor"],
    voltage: ["voltage", "tension", "sensor"], energy: ["energy", "energie", "sensor"], total: ["lifetime_energy", "energie_totale", "sensor"],
    time: ["charging_time", "temps_de_charge", "sensor"], temp: ["temperature", "temperature", "sensor"],
    install: ["installation_current", "courant_de_l_installation", "sensor"], reason: ["limit_reason", "raison_de_la_limite", "sensor"],
    iec: ["iec_state", "etat_iec", "sensor"], pwm: ["pwm_current", "courant_pwm", "sensor"], heap: ["heap_free", "memoire_libre", "sensor"],
    uptime: ["uptime", "temps_de_fonctionnement", "sensor"], session_id: ["session_id", "numero_de_session", "sensor"],
    energy_index: ["energy_index", "index_d_energie", "sensor"],
    allowed: ["charging_current", "courant_de_charge_autorise", "sensor"], sysmax: ["system_max_current", "courant_maximal_systeme", "sensor"],
    sched_cur: ["schedule_current", "courant_du_programme", "sensor"], temp_cur: ["temperature_current", "courant_limite_temperature", "sensor"],
    upow_cur: ["user_power_current", "courant_puissance_utilisateur", "sensor"],
    rssi: ["wifi_rssi", "signal_wifi", "sensor"], reconnects: ["wifi_reconnects", "reconnexions_wifi", "sensor"], ip: ["wifi_ip", "adresse_ip", "sensor"],
    sessions: ["total_sessions", "nombre_de_sessions", "sensor"], total_time: ["total_time", "temps_de_charge_total", "sensor"],
    last_session: ["last_session_energy", "energie_derniere_session", "sensor"],
    requests: ["requests", "requetes_envoyees", "sensor"], failures: ["failures", "echecs_de_communication", "sensor"],
    wifi_ok: ["wifi_connected", "wifi_connecte", "binary_sensor"], active_err: ["active_errors", "erreurs_actives", "binary_sensor"],
    override_on: ["schedule_override", "derogation_active", "binary_sensor"],
    limit: ["dynamic_limit", "limite_dynamique", "number"], user_limit: ["user_limit", "limite_utilisateur", "number"],
    user_power: ["user_power", "puissance_maximale", "number"], led: ["led_max_brightness", "luminosite_de_la_led", "number"],
    led_delay: ["led_dimming_delay", "delai_d_attenuation_de_la_led", "number"], car_min: ["car_minimum_current", "courant_minimal_vehicule", "number"],
    install_set: ["install_current", "courant_d_installation_reglage", "number"],
    auth: ["authentication", "authentification", "switch"], lock: ["lock", "verrou", "switch"], schedule: ["charging_schedule", "programme_de_charge", "switch"],
    buzzer: ["buzzer", "buzzer", "switch"], auto_update: ["auto_update", "mise_a_jour_automatique", "switch"],
    wifi_reset: ["reset_on_wifi_loss", "redemarrage_si_wifi_perdu", "switch"], energy_mgmt: ["energy_management", "gestion_d_energie", "switch"],
    led_tpl: ["led_template", "couleurs_led_personnalisees", "switch"], pwm_precise: ["precise_pwm", "pwm_precis", "switch"], mqtt: ["mqtt", "mqtt", "switch"],
    start: ["charge_start", "demarrer_la_recharge", "button"], stop: ["charge_stop", "arreter_la_recharge", "button"],
    pause: ["charge_pause", "mettre_en_pause", "button"], resume: ["charge_resume", "reprendre_la_recharge", "button"],
    override: ["charging_schedule_override", "derogation_du_programme_de_charge", "button"], reboot: ["reboot", "redemarrer", "button"],
    mode: ["charge_mode", "mode_de_charge", "select"], dl_sw: ["delestage", "delestage", "switch"],
    pilot: ["pilot", "pilotage", "sensor"], charge_a: ["charge_current", "courant_de_charge", "number"],
  };
  const DIAG = [
    ["state_e_activated", "erreur_ev", "Erreur EV", "mdi:car-off"], ["overtemp", "limitation_thermique", "Limitation thermique", "mdi:thermometer-alert"],
    ["critical_temp", "surchauffe", "Surchauffe", "mdi:fire-alert"], ["overcurrent", "surintensite", "Surintensité", "mdi:current-ac"],
    ["meter_fault", "erreur_de_comptage", "Erreur de comptage", "mdi:meter-electric-outline"], ["undervoltage", "sous_tension", "Sous-tension", "mdi:flash-triangle-outline"],
    ["overvoltage", "surtension", "Surtension", "mdi:flash-alert"], ["rcd_error", "erreur_du_differentiel_rcd", "Différentiel (RCD)", "mdi:shield-alert-outline"],
    ["rcd_test_error", "echec_du_test_differentiel", "Test du différentiel", "mdi:shield-sync-outline"], ["cp_diode_failure", "court_circuit_de_la_diode_ev", "Diode EV", "mdi:led-off"],
    ["contactor_failure", "contacts_du_relais_soudes", "Relais soudés", "mdi:electric-switch"], ["voltage_error", "erreur_de_tension", "Erreur de tension", "mdi:sine-wave"],
    ["state_f_activated", "erreur_etat_f", "Erreur état F", "mdi:alert-octagon-outline"],
  ];
  const STATES = {
    available: { l: "Libre", d: "Prête, aucun véhicule branché", rgb: "120,170,210", icon: "mdi:ev-station", fx: "idle" },
    connected: { l: "Véhicule branché", d: "Branché, en attente de charge", rgb: "80,160,255", icon: "mdi:ev-plug-type2", fx: "plug" },
    charging: { l: "En charge", d: "", rgb: "62,207,142", icon: "mdi:battery-charging-high", fx: "charge" },
    paused: { l: "En pause", d: "Charge suspendue", rgb: "255,184,64", icon: "mdi:pause-circle-outline", fx: "plug" },
    paused_by_scheduler: { l: "En pause (programme)", d: "Attend le créneau programmé", rgb: "255,184,64", icon: "mdi:calendar-clock", fx: "plug" },
    need_auth: { l: "Authentification", d: "Badge ou validation requise", rgb: "176,132,255", icon: "mdi:card-account-details-outline", fx: "plug" },
    locked: { l: "Verrouillée", d: "Aucune charge possible", rgb: "150,160,178", icon: "mdi:lock", fx: "idle" },
    error: { l: "Erreur", d: "Voir le diagnostic", rgb: "255,90,95", icon: "mdi:alert-octagon", fx: "error" },
    updating_firmware: { l: "Mise à jour", d: "Mise à jour du micrologiciel", rgb: "90,210,230", icon: "mdi:update", fx: "idle" },
  };
  const REASON = {
    no_limit: "Aucune limite", installation_current: "Courant de l'installation", user_limit: "Limite utilisateur", dynamic_limit: "Limite dynamique",
    schedule: "Programme de charge", em_offline: "Compteur hors ligne", em: "Compteur d'énergie", ocpp: "OCPP", overtemperature: "Température",
    switching_phases: "Bascule de phases", "1p_charging_disabled": "Charge monophasée désactivée",
  };
  const TABS = [["charge", "mdi:ev-station", "Charge"], ["settings", "mdi:tune-variant", "Réglages"], ["stats", "mdi:chart-box-outline", "Statistiques"], ["diag", "mdi:stethoscope", "Diagnostic"]];
  const OPT_TTL = 12000;
  const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const fmtN = (v, d = 0) => Number(v).toLocaleString("fr-FR", { minimumFractionDigits: d, maximumFractionDigits: d });
  const num = (s) => (s && !["unknown", "unavailable", ""].includes(s.state) && !isNaN(parseFloat(s.state)) ? parseFloat(s.state) : null);
  const fmtDur = (sec) => {
    if (sec == null) return "–";
    sec = Math.round(sec);
    const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60);
    return h ? `${h} h ${String(m).padStart(2, "0")}` : m ? `${m} min` : `${sec} s`;
  };
  const fmtHours = (h) => (h == null ? "–" : h >= 48 ? `${fmtN(h / 24, 1)} j` : h >= 1 ? `${fmtN(h, 1)} h` : `${fmtN(h * 60)} min`);

  // ---- illustration ----
  const CABLE = "M96 92 C 120 128, 160 130, 190 106";
  const DOTS = Array.from({ length: 6 }, (_, i) => `<circle class="pk" r="2.6"><animateMotion dur="1.8s" begin="${(-i * 0.3).toFixed(1)}s" repeatCount="indefinite" path="${CABLE}"/></circle>`).join("");
  const SPARKS = Array.from({ length: 10 }, (_, i) => `<i style="left:${(i * 37) % 100}%;--d:${3 + ((i * 7) % 5) / 2}s;--dl:${-((i * 11) % 17) / 3}s;--s:${2 + (i % 3)}px;--dx:${((i % 5) - 2) * 6}px"></i>`).join("");
  const WHEEL = (cx) => `<g class="wheel"><circle cx="${cx}" cy="117" r="12" class="tyre"/><circle cx="${cx}" cy="117" r="8" class="rim"/>
      ${[0, 72, 144, 216, 288].map((a) => `<line x1="${cx}" y1="117" x2="${cx + 7 * Math.cos((a * Math.PI) / 180)}" y2="${117 + 7 * Math.sin((a * Math.PI) / 180)}" class="spoke"/>`).join("")}
      <circle cx="${cx}" cy="117" r="2.2" class="hub"/></g>`;
  // compacte électrique générique : capot court, pare-brise couché, toit fuyant, becquet, poignées affleurantes
  const CAR = `
    <g class="carg">
      <path class="carshadow" d="M182 128 Q 240 134 298 128 L 298 130 Q 240 136 182 130 Z"/>
      <path class="carbody" d="M180 112 C 180 105, 183 101, 190 99 L 211 93 C 221 85, 232 77, 246 75 L 266 74.5 C 278 74.5, 286 79, 292 87 L 297 95 C 299 100, 299 110, 297 117 L 289 117 A 13 13 0 0 0 263 117 L 217 117 A 13 13 0 0 0 191 117 L 184 117 C 181 116, 180 114, 180 112 Z"/>
      <path class="carsheen" d="M190 100 L 211 94.5 C 221 87, 232 79.5, 246 77.5 L 266 77 C 276 77, 283 80.5, 288 87 L 292 93 C 260 92, 220 96, 190 100 Z"/>
      <path class="win" d="M221 91 C 229 83.5, 237 79.5, 248 78.5 L 264 78.2 C 273 78.5, 279.5 82, 284 89.5 Z"/>
      <path class="pillar" d="M252 78.5 L 250 90.5"/>
      <path class="shoulder" d="M192 104 C 228 99.5, 262 98, 297 100"/>
      <path class="sill" d="M217 114 L 263 114"/>
      <rect class="handle" x="233" y="100.5" width="8" height="1.6" rx=".8"/><rect class="handle" x="262" y="99.6" width="8" height="1.6" rx=".8"/>
      <path class="light front" d="M183 103 L 196 99.5"/>
      <path class="light rear" d="M289 95.5 L 297.5 97"/>
      <path class="spoiler" d="M287 86.5 L 296 88"/>
      ${WHEEL(204)}${WHEEL(276)}
      <circle class="port" cx="191" cy="106" r="3.2"/>
      <rect x="214" y="56" width="58" height="9" rx="4.5" class="batbg"/>
      <g clip-path="url(#batclip)"><rect x="214" y="56" width="58" height="9" class="batfill"/></g>
    </g>`;
  const ILLU = `
  <svg viewBox="0 0 300 150" class="illu" aria-hidden="true">
    <defs>
      <linearGradient id="body" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f4f7fa"/><stop offset="1" stop-color="#c9d3dc"/></linearGradient>
      <linearGradient id="glass" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1c2733"/><stop offset="1" stop-color="#0b1118"/></linearGradient>
      <linearGradient id="paint" x1="0" y1="0" x2="0" y2="1"><stop offset="0" class="p0"/><stop offset="1" class="p1"/></linearGradient>
      <linearGradient id="wglass" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="rgba(190,220,245,.55)"/><stop offset="1" stop-color="rgba(40,60,80,.85)"/></linearGradient>
      <radialGradient id="halo" cx=".5" cy=".5" r=".5"><stop offset="0" class="h0"/><stop offset="1" stop-color="transparent"/></radialGradient>
      <clipPath id="batclip"><rect x="214" y="56" width="58" height="9" rx="4.5"/></clipPath>
    </defs>
    <ellipse class="floor" cx="150" cy="140" rx="138" ry="7"/>
    <circle class="halo" cx="62" cy="62" r="54" fill="url(#halo)"/>
    <rect x="34" y="14" width="56" height="96" rx="16" fill="url(#body)"/>
    <rect x="34" y="14" width="56" height="96" rx="16" class="bodyedge"/>
    <rect x="41" y="22" width="42" height="62" rx="11" fill="url(#glass)"/>
    <circle class="ring" cx="62" cy="50" r="13"/><circle class="ringspin" cx="62" cy="50" r="13"/>
    <g class="glyph"><path d="M64.5 40 L56.5 52 H62 L59.5 61 L67.5 48.5 H62 Z"/></g>
    <rect class="led" x="50" y="74" width="24" height="3" rx="1.5"/>
    <rect x="52" y="96" width="20" height="8" rx="4" class="socket"/>
    <path class="cable" d="${CABLE}"/><path class="cableflow" d="${CABLE}"/><g class="pks">${DOTS}</g>
    ${CAR}
  </svg>`;

  class HolmBorneCard extends HTMLElement {
    static getConfigElement() { return document.createElement("holm-borne-card-editor"); }
    static getStubConfig(hass) {
      const e = hass ? Object.keys(hass.states).find((k) => k.startsWith("sensor.") && /_etat$|_state$/.test(k) && (hass.states[k].attributes.options || []).includes("paused_by_scheduler")) : "";
      return { type: "custom:holm-borne-card", entity: e || "" };
    }
    setConfig(config) {
      if (!config || !config.entity) throw new Error("Choisis l'entité « État » de la borne.");
      this._config = { show_diagnostic: true, show_settings: true, car_color: "#4a5d70", default_tab: "charge", ...config };
      this._e = null; this._opt = {}; this._confirm = null; this._tab = this._config.default_tab;
      if (!this.shadowRoot) this.attachShadow({ mode: "open" });
      this._built = false;
      if (this._hass) this.hass = this._hass;
    }
    getCardSize() { return 10; }
    getGridOptions() { return { columns: 12, min_columns: 6, rows: "auto" }; }

    set hass(hass) {
      this._hass = hass;
      if (!this._config) return;
      if (!this._e) this._detect();
      if (!this._built) this._build();
      this._render();
    }

    _detect() {
      const h = this._hass, cfg = this._config, e = {};
      const reg = h.entities || {};
      const dev = reg[cfg.entity] && reg[cfg.entity].device_id;
      const devEnts = dev ? Object.values(reg).filter((r) => r.device_id === dev) : [];
      const base = cfg.entity.replace(/^sensor\./, "").replace(/_(etat|state)$/, "");
      const find = (tk, suf, dom) => {
        const byTk = devEnts.find((r) => r.translation_key === tk && r.entity_id.startsWith(dom + "."));
        if (byTk) return byTk.entity_id;
        const id = `${dom}.${base}_${suf}`;
        return h.states[id] ? id : null;
      };
      for (const [k, [tk, suf, dom]] of Object.entries(MAP)) e[k] = cfg[k + "_entity"] || find(tk, suf, dom);
      e.state = cfg.entity;
      e.diag = DIAG.map(([tk, suf, label, icon]) => ({ id: find(tk, suf, "binary_sensor"), label, icon })).filter((d) => d.id);
      this._e = e;
    }
    _s(k) { const id = this._e[k]; return id ? this._hass.states[id] : null; }
    _ok(k) { const s = this._s(k); return !!s && s.state !== "unavailable"; }
    _n(k) { return num(this._s(k)); }
    _call(domain, service, data) { return this._hass.callService(domain, service, data); }
    _more(id) { if (id) this.dispatchEvent(new CustomEvent("hass-more-info", { detail: { entityId: id }, bubbles: true, composed: true })); }
    _optv(key, real) {
      const o = this._opt[key];
      if (!o) return real;
      if (String(o.v) === String(real) || Date.now() - o.ts > OPT_TTL) { delete this._opt[key]; return real; }
      return o.v;
    }

    _build() {
      const root = this.shadowRoot;
      root.innerHTML = `<style>${HolmBorneCard.css()}</style>
      <ha-card>
        <div class="amb"><div class="glow"></div><div class="fx">${SPARKS}</div></div>
        <div class="wrap">
          <div class="head">
            <div class="badge" data-more="state"><ha-icon id="bicon"></ha-icon></div>
            <div class="ttl" data-more="state"><div class="name" id="name"></div><div class="status"><span class="dot"></span><span id="status"></span></div></div>
            <button class="dl" id="dl" title="Délestage"><ha-icon icon="mdi:transmission-tower-export"></ha-icon><span id="dltxt">Délestage</span></button>
          </div>
          <div class="hero">${ILLU}<div class="big"><b id="pw">–</b><small>kW</small></div><div class="sub" id="sub"></div></div>
          <div class="tabs" id="tabs">${TABS.map(([k, i, l]) => `<button data-tab="${k}"><ha-icon icon="${i}"></ha-icon><span>${l}</span><i class="badge-dot" id="tb-${k}"></i></button>`).join("")}</div>
          <div class="pane" id="pane"></div>
        </div>
        <div class="na" id="na">Borne indisponible</div>
      </ha-card>`;
      this.$ = (id) => root.getElementById(id);
      this._card = root.querySelector("ha-card");
      const card = this._card;
      card.addEventListener("click", (ev) => {
        const t = ev.target.closest("[data-tab],[data-more],[data-btn],[data-sw],#dl,[data-reboot],[data-preset],[data-mode]");
        if (!t || !card.contains(t)) return;
        if (t.dataset.tab) { this._tab = t.dataset.tab; this._render(true); return; }
        if (t.id === "dl") return this._toggleDelestage();
        if (t.dataset.reboot !== undefined) return this._reboot();
        if (t.dataset.mode) return this._setMode(t.dataset.mode);
        if (t.dataset.preset) return this._setNum(t.dataset.pk || "limit", Number(t.dataset.preset));
        if (t.dataset.btn) return this._press(t.dataset.btn);
        if (t.dataset.sw) return this._toggle(t.dataset.sw);
        if (t.dataset.more) return this._more(this._e[t.dataset.more] || t.dataset.more);
      });
      card.addEventListener("contextmenu", (ev) => { if (ev.target.closest("#dl")) { ev.preventDefault(); this._more(this._dlId()); } });
      card.addEventListener("input", (ev) => {
        const r = ev.target.closest("input[data-num]"); if (!r) return;
        this._drag = r.dataset.num;
        const out = r.closest(".srow")?.querySelector("output"); if (out) out.innerHTML = this._fmtNum(r.dataset.num, +r.value);
        const fill = r.parentElement.querySelector(".fill"); if (fill) fill.style.width = `${((r.value - r.min) / (r.max - r.min)) * 100}%`;
      });
      card.addEventListener("change", (ev) => {
        const r = ev.target.closest("input[data-num]"); if (!r) return;
        this._drag = null;
        const id = this._e[r.dataset.num]; if (!id) return;
        this._opt[r.dataset.num] = { v: Number(r.value), ts: Date.now() };
        this._call("number", "set_value", { entity_id: id, value: Number(r.value) });
      });
      this._built = true;
    }

    _setNum(k, v) {
      const id = this._e[k]; if (!id) return;
      this._opt[k] = { v, ts: Date.now() };
      this._call("number", "set_value", { entity_id: id, value: v });
      this._render(true);
    }
    _press(k) { const id = this._e[k]; if (id) this._call("button", "press", { entity_id: id }); }
    _toggle(k) {
      const s = this._s(k); if (!s) return;
      const on = this._optv(k, s.state) === "on";
      this._opt[k] = { v: on ? "off" : "on", ts: Date.now() };
      this._call("switch", on ? "turn_off" : "turn_on", { entity_id: this._e[k] });
      this._render(true);
    }
    _dlId() { return this._e.dl_sw || this._config.delestage_entity; }
    _setMode(opt) {
      const id = this._e.mode; if (!id) return;
      this._opt.mode = { v: opt, ts: Date.now() };
      this._call("select", "select_option", { entity_id: id, option: opt });
      this._render(true);
    }
    _toggleDelestage() {
      const id = this._dlId(); if (!id || !this._hass.states[id]) return;
      const on = this._optv("dl", this._hass.states[id].state) === "on";
      this._opt.dl = { v: on ? "off" : "on", ts: Date.now() };
      this._call("homeassistant", on ? "turn_off" : "turn_on", { entity_id: id });
      this._render(true);
    }
    _reboot() {
      if (this._confirm && Date.now() - this._confirm < 4000) { this._confirm = null; this._press("reboot"); this._render(true); return; }
      this._confirm = Date.now(); this._render(true);
      setTimeout(() => this._render(true), 4100);
    }
    _fmtNum(k, v) {
      if (k === "user_power") return `${fmtN(v / 1000, 2)} kW<small class="kw">${fmtN(v / this._volt() / this._ph())} A</small>`;
      if (k === "led") return `${fmtN(v)} %`;
      if (k === "led_delay") return v ? `${fmtN(v)} s` : "jamais";
      if (k === "limit" && v === 0) return "0 A · pause";
      return `${fmtN(v)} A<small class="kw">${this._kw(v)}</small>`;
    }
    // équivalent en kW d'un courant (tension mesurée, monophasé par défaut)
    _volt() { return Number(this._config.voltage) || 230; }   // tension nominale (comme la borne : 32 A = 7,36 kW)
    _ph() { return Number(this._config.phases) === 3 ? 3 : 1; }
    _kw(a) {
      const kw = (a * this._volt() * this._ph()) / 1000;
      return `${fmtN(kw, kw < 10 ? 1 : 0)} kW`;
    }

    // ---------- rendu ----------
    _render(force) {
      const h = this._hass, cfg = this._config, $ = this.$;
      const so = this._s("state"), card = this._card;
      const unav = !so || so.state === "unavailable" || so.state === "unknown";
      card.classList.toggle("unav", unav);
      $("name").textContent = cfg.name || (so && so.attributes.friendly_name ? so.attributes.friendly_name.replace(/\s*(État|Etat|State)$/i, "") : "Borne de recharge");
      card.style.setProperty("--car", cfg.car_color);
      if (unav) { $("status").textContent = "Indisponible"; return; }
      const st = STATES[so.state] || { l: so.state, d: "", rgb: "150,160,178", icon: "mdi:ev-station", fx: "idle" };
      const pw = this._n("power"), en = this._n("energy"), tm = this._n("time");
      const charging = so.state === "charging";
      card.style.setProperty("--m", st.rgb);
      card.dataset.fx = st.fx;
      card.classList.toggle("active", charging);
      $("bicon").setAttribute("icon", st.icon);
      $("status").textContent = charging && pw != null ? `${st.l} · ${fmtN(pw, 1)} kW` : st.l;
      const dlS = this._dlId() ? h.states[this._dlId()] : null;
      $("dl").style.display = dlS ? "" : "none";
      if (dlS) {
        const on = this._optv("dl", dlS.state) === "on";
        $("dl").classList.toggle("on", on);
        $("dltxt").textContent = on ? "Délestage actif" : "Délestage coupé";
        $("dl").querySelector("ha-icon").setAttribute("icon", on ? "mdi:transmission-tower-export" : "mdi:transmission-tower-off");
      }
      $("pw").textContent = pw != null ? fmtN(pw, pw < 10 ? 2 : 1) : "–";
      $("sub").textContent = charging ? (en != null ? `${fmtN(en, 2)} kWh rechargés · ${fmtDur(tm)}` : "") : st.d;
      card.style.setProperty("--flow", charging ? Math.max(0.6, 2.4 - (pw || 0) / 4) + "s" : "2s");
      // onglets
      const tabs = TABS.filter(([k]) => (k !== "settings" || cfg.show_settings) && (k !== "diag" || cfg.show_diagnostic));
      if (!tabs.some(([k]) => k === this._tab)) this._tab = "charge";
      this.shadowRoot.querySelectorAll("[data-tab]").forEach((b) => {
        b.style.display = tabs.some(([k]) => k === b.dataset.tab) ? "" : "none";
        b.classList.toggle("on", b.dataset.tab === this._tab);
      });
      const bad = this._e.diag.filter((d) => h.states[d.id] && h.states[d.id].state === "on");
      $("tb-diag").classList.toggle("on", bad.length > 0);
      if (this._drag && !force) return;    // ne pas redessiner sous le doigt
      $("pane").innerHTML = this["_" + this._tab](so, st, bad);
    }

    // éléments communs
    _stat(k, icon, label, val, hot) {
      return `<button class="stat${hot ? " hot" : ""}" data-more="${k}"><ha-icon icon="${icon}"></ha-icon><b>${val}</b><small>${label}</small></button>`;
    }
    _row(k, icon, label, val, sub, cls = "") {
      if (!this._e[k]) return "";
      return `<button class="row ${cls}" data-more="${k}"><ha-icon icon="${icon}"></ha-icon><span class="rl">${label}${sub ? `<small>${sub}</small>` : ""}</span><b>${val}</b></button>`;
    }
    _switch(k, icon, label, dOn, dOff) {
      const s = this._s(k); if (!s || s.state === "unavailable") return "";
      const on = this._optv(k, s.state) === "on";
      return `<button class="tg${on ? " on" : ""}" data-sw="${k}"><ha-icon icon="${icon}"></ha-icon><div><b>${label}</b><small>${on ? dOn : dOff}</small></div><span class="sw"><i></i></span></button>`;
    }
    _slider(k, icon, label, hint, locked) {
      const s = this._s(k); if (!s || s.state === "unavailable") return "";
      const a = s.attributes, mn = Number(a.min ?? 0), mx = Number(a.max ?? 100), step = Number(a.step ?? 1);
      const v = this._optv(k, num(s)) ?? mn;
      return `<div class="srow${locked ? " locked" : ""}"><div class="sh"><ha-icon icon="${icon}"></ha-icon><span data-more="${k}">${label}${hint ? `<small>${hint}</small>` : ""}</span><output>${this._fmtNum(k, v)}</output></div>
        <div class="slider"><div class="track"><div class="fill" style="width:${((v - mn) / (mx - mn || 1)) * 100}%"></div></div>
        <input type="range" data-num="${k}" min="${mn}" max="${mx}" step="${step}" value="${v}"${locked ? " disabled" : ""}></div></div>`;
    }
    _v(k, fmt, dflt = "–") { const v = this._n(k); return v == null ? dflt : fmt(v); }

    // ---------- onglet Charge ----------
    _charge(so) {
      const cur = this._n("current"), volt = this._n("voltage"), en = this._n("energy"), tm = this._n("time"), tp = this._n("temp");
      const charging = so.state === "charging";
      const upw = this._n("user_power");
      const stats = [
        this._stat("current", "mdi:current-ac", "Courant", cur != null ? `${fmtN(cur, 1)} A` : "–", charging),
        this._stat("voltage", "mdi:sine-wave", "Tension", volt != null ? `${fmtN(volt)} V` : "–"),
        this._stat("energy", "mdi:battery-plus-variant", "Session", en != null ? `${fmtN(en, 2)} kWh` : "–", charging),
        this._stat("time", "mdi:timer-outline", "Durée", fmtDur(tm), charging),
        this._stat("temp", "mdi:thermometer", "Température", tp != null ? `${fmtN(Math.round(tp))} °C` : "–", tp != null && tp >= 60),
        this._stat("user_power", "mdi:flash", "Puiss. max", upw != null ? `${fmtN(upw / 1000, 2)} kW` : "–"),
      ].join("");
      // limite
      let lim = "";
      if ((this._e.limit && this._ok("limit")) || (this._e.mode && this._s("mode"))) {
        const rs = this._s("reason"), r = rs ? rs.state : null;
        const dlS = this._dlId() ? this._hass.states[this._dlId()] : null;
        const chips = [
          ["allowed", "Autorisé", this._n("allowed")], ["user_limit", "Utilisateur", this._n("user_limit")],
          ["upow_cur", "Puissance max", this._n("upow_cur")], ["install", "Installation", this._n("install")],
        ].filter(([, , v]) => v != null).map(([k, l, v]) => `<button class="chip" data-more="${k}"><small>${l}</small><b>${fmtN(v)} A</b><small class="kw">${this._kw(v)}</small></button>`).join("");
        if (this._e.mode && this._s("mode")) {
          const ms = this._s("mode"), mode = this._optv("mode", ms.state);
          const MODES = [["heures_creuses", "mdi:weather-night", "Heures creuses"], ["maintenant", "mdi:flash", "Maintenant"], ["arret", "mdi:stop-circle-outline", "Arrêt"]];
          const ps = this._s("pilot"), applied = this._n("limit"), ca = this._optv("charge_a", this._n("charge_a"));
          const mx = Number(this._s("charge_a")?.attributes?.max ?? 32);
          const pre = [6, 10, 16, 20, 25, 32].filter((a) => a <= mx);
          lim = `<div class="block lim pilot${r && r !== "no_limit" ? " capped" : ""}">
            <div class="modes">${MODES.map(([k, ic, l]) => `<button class="md${mode === k ? " on" : ""}" data-mode="${k}"><ha-icon icon="${ic}"></ha-icon><span>${l}</span></button>`).join("")}</div>
            <div class="pst" data-more="pilot"><ha-icon icon="mdi:robot-outline"></ha-icon><span>${ps ? esc(ps.state) : ""}</span>${applied != null ? `<b>${applied ? `${fmtN(applied)} A · ${this._kw(applied)}` : "pause"}</b>` : ""}</div>
            ${mode !== "arret" && this._e.charge_a ? `${this._slider("charge_a", "mdi:current-ac", "Courant de charge", dlS && this._optv("dl", dlS.state) === "on" ? "souhaité — le délestage peut le réduire" : "souhaité")}
            <div class="presets">${pre.map((a) => `<button class="pre${ca === a ? " on" : ""}" data-preset="${a}" data-pk="charge_a"><b>${a} A</b><small>${this._kw(a)}</small></button>`).join("")}</div>` : ""}
            <div class="reason" data-more="reason">${r ? `Raison de la limite : <b>${esc(REASON[r] || r)}</b>` : ""}</div>
            <div class="chips">${chips}</div></div>`;
        } else {
        const auto = !!dlS && this._optv("dl", dlS.state) === "on";
        const curLim = this._optv("limit", this._n("limit"));
        const presets = auto ? "" : `<div class="presets">${[6, 10, 16, 20, 25, 32].map((a) =>
          `<button class="pre${curLim === a ? " on" : ""}" data-preset="${a}"><b>${a} A</b><small>${this._kw(a)}</small></button>`).join("")}</div>`;
        lim = `<div class="block lim${r && r !== "no_limit" ? " capped" : ""}">
          ${this._slider("limit", auto ? "mdi:robot-outline" : "mdi:hand-back-right-outline", "Limite de charge",
            auto ? "pilotée par le délestage — coupez-le pour régler à la main" : "réglage manuel", auto)}
          <div class="scale"><span>0 · pause</span><span>6</span><span>16</span><span>32 A</span></div>
          ${presets}
          <div class="reason" data-more="reason">${r ? `Raison de la limite : <b>${esc(REASON[r] || r)}</b>` : ""}</div>
          <div class="chips">${chips}</div></div>`;
        }
      }
      // actions
      const s = so.state;
      const canStop = ["charging", "paused", "paused_by_scheduler"].includes(s);
      const canStart = ["connected", "need_auth", "paused_by_scheduler"].includes(s);
      const paused = s === "paused";
      const conf = this._confirm && Date.now() - this._confirm < 4000;
      const act = (k, icon, label, cls, dis) => this._e[k] ? `<button class="act ${cls}" data-btn="${k}" ${dis ? "disabled" : ""}><ha-icon icon="${icon}"></ha-icon><span>${label}</span></button>` : "";
      const acts = [
        canStop ? act("stop", "mdi:stop-circle-outline", "Arrêter", "pri stop") : act("start", "mdi:play-circle-outline", "Démarrer", "pri", !canStart),
        paused ? act("resume", "mdi:play-pause", "Reprendre", "", false) : act("pause", "mdi:pause-circle-outline", "Pause", "", s !== "charging"),
        act("override", "mdi:calendar-fast", "Dérogation", "", !["paused_by_scheduler", "connected"].includes(s)),
        this._e.reboot ? `<button class="act warn${conf ? " confirm" : ""}" data-reboot><ha-icon icon="mdi:restart"></ha-icon><span>${conf ? "Confirmer ?" : "Redémarrer"}</span></button>` : "",
      ].join("");
      return `<div class="stats">${stats}</div>${lim}<div class="acts">${acts}</div>`;
    }

    // ---------- onglet Réglages ----------
    _settings() {
      const t = [
        this._switch("auth", "mdi:card-account-details-outline", "Authentification", "Badge ou appli requis", "Démarrage automatique"),
        this._switch("lock", "mdi:lock-outline", "Verrou", "Charge impossible", "Déverrouillée"),
        this._switch("schedule", "mdi:calendar-clock", "Programme de charge", "Activé", "Désactivé"),
        this._switch("buzzer", "mdi:volume-high", "Buzzer", "Sons activés", "Silencieux"),
        this._switch("auto_update", "mdi:update", "Mise à jour auto.", "Activée", "Manuelle"),
        this._switch("wifi_reset", "mdi:wifi-refresh", "Redémarrage si Wi-Fi perdu", "Activé", "Désactivé"),
        this._switch("energy_mgmt", "mdi:transmission-tower", "Gestion d'énergie", "Activée", "Désactivée"),
        this._switch("led_tpl", "mdi:palette", "Couleurs LED perso.", "Activées", "Désactivées"),
        this._switch("pwm_precise", "mdi:sine-wave", "PWM précis", "Activé", "Désactivé"),
        this._switch("mqtt", "mdi:lan-connect", "MQTT", "Activé", "Désactivé"),
      ].join("");
      const sl = [
        this._slider("user_limit", "mdi:account-cog", "Limite utilisateur", "courant maximal choisi"),
        this._slider("user_power", "mdi:flash", "Puissance maximale", "la borne ne dépasse pas cette puissance"),
        this._slider("car_min", "mdi:car-electric", "Courant minimal du véhicule"),
        this._slider("led", "mdi:brightness-6", "Luminosité de la LED"),
        this._slider("led_delay", "mdi:timer-sand", "Atténuation de la LED", "après ce délai"),
        this._slider("install_set", "mdi:home-lightning-bolt", "Courant d'installation", "réglage électricien — prudence"),
      ].join("");
      return `<div class="sec">Fonctions</div><div class="tgrid">${t || `<div class="muted">Aucun réglage disponible.</div>`}</div>
        ${sl ? `<div class="sec">Limites et LED</div><div class="block">${sl}</div>` : ""}`;
    }

    // ---------- onglet Statistiques ----------
    _stats() {
      const tot = this._n("total"), sess = this._n("sessions"), tt = this._n("total_time"), last = this._n("last_session");
      const avg = tot != null && sess ? tot / sess : null;
      const tiles = [
        this._stat("total", "mdi:counter", "Énergie totale", tot != null ? `${fmtN(tot, tot < 100 ? 1 : 0)} kWh` : "–"),
        this._stat("sessions", "mdi:numeric", "Sessions", sess != null ? fmtN(sess) : "–"),
        this._stat("total_time", "mdi:timer-sand-complete", "Temps de charge", fmtHours(tt)),
        this._stat("last_session", "mdi:history", "Dernière session", last != null ? `${fmtN(last, 2)} kWh` : "–"),
      ].join("");
      const rows = [
        avg != null ? `<div class="row static"><ha-icon icon="mdi:approximately-equal"></ha-icon><span class="rl">Moyenne par session</span><b>${fmtN(avg, 2)} kWh</b></div>` : "",
        this._row("energy", "mdi:battery-plus-variant", "Session en cours", this._v("energy", (v) => `${fmtN(v, 2)} kWh`)),
        this._row("time", "mdi:timer-outline", "Durée de la session", fmtDur(this._n("time"))),
        this._row("session_id", "mdi:pound", "Numéro de session", this._v("session_id", (v) => fmtN(v))),
        this._row("energy_index", "mdi:meter-electric", "Index d'énergie", this._v("energy_index", (v) => `${fmtN(v, 2)} kWh`)),
      ].join("");
      return `<div class="stats four">${tiles}</div><div class="block list">${rows}</div>`;
    }

    // ---------- onglet Diagnostic ----------
    _diag(so, st, bad) {
      const h = this._hass;
      const rssi = this._n("rssi");
      const bars = rssi == null ? 0 : rssi >= -55 ? 4 : rssi >= -65 ? 3 : rssi >= -75 ? 2 : 1;
      const wifiQ = rssi == null ? "" : ["", "faible", "moyen", "bon", "excellent"][bars];
      const up = this._n("uptime");
      const sumTxt = bad.length ? `${bad.length} défaut${bad.length > 1 ? "s" : ""} : ${bad.map((x) => x.label).join(", ")}` : `${this._e.diag.length} contrôles OK`;
      const faults = this._e.diag.map((d) => {
        const ko = h.states[d.id] && h.states[d.id].state === "on";
        return `<button class="fchip${ko ? " ko" : ""}" data-more="${d.id}"><ha-icon icon="${ko ? d.icon : "mdi:check-circle"}"></ha-icon><span>${d.label}</span></button>`;
      }).join("");
      const health = [
        this._row("rssi", `mdi:wifi-strength-${bars || "off"}`, "Signal Wi-Fi", rssi != null ? `${fmtN(rssi)} dBm` : "–", wifiQ),
        this._row("reconnects", "mdi:wifi-refresh", "Reconnexions Wi-Fi", this._v("reconnects", (v) => fmtN(v))),
        this._row("ip", "mdi:ip-network-outline", "Adresse IP", esc(this._s("ip")?.state ?? "–")),
        this._row("uptime", "mdi:clock-check-outline", "Temps de fonctionnement", fmtHours(up), "retombe à zéro si la borne redémarre"),
        this._row("heap", "mdi:memory", "Mémoire libre", this._v("heap", (v) => `${fmtN(v)} Kio`)),
        this._row("requests", "mdi:swap-vertical", "Requêtes envoyées", this._v("requests", (v) => fmtN(v)), "depuis le démarrage de Home Assistant"),
        this._row("failures", "mdi:lan-disconnect", "Échecs de communication", this._v("failures", (v) => fmtN(v)), "", this._n("failures") ? "warnrow" : ""),
      ].join("");
      const tech = [
        this._row("iec", "mdi:ev-plug-type2", "État IEC 61851", esc(this._s("iec")?.state ?? "–")),
        this._row("pwm", "mdi:pulse", "Courant PWM", this._v("pwm", (v) => `${fmtN(v)} A`)),
        this._row("allowed", "mdi:current-ac", "Courant de charge autorisé", this._v("allowed", (v) => `${fmtN(v)} A`)),
        this._row("sysmax", "mdi:arrow-collapse-up", "Courant maximal système", this._v("sysmax", (v) => `${fmtN(v)} A`)),
        this._row("sched_cur", "mdi:calendar-clock", "Courant du programme", this._v("sched_cur", (v) => `${fmtN(v)} A`)),
        this._row("temp_cur", "mdi:thermometer-lines", "Courant limité par la température", this._v("temp_cur", (v) => `${fmtN(v)} A`)),
        this._row("upow_cur", "mdi:flash-outline", "Courant puissance utilisateur", this._v("upow_cur", (v) => `${fmtN(v)} A`)),
        this._row("install", "mdi:home-lightning-bolt-outline", "Courant de l'installation", this._v("install", (v) => `${fmtN(v)} A`)),
      ].join("");
      return `<div class="diagsum${bad.length ? " bad" : ""}"><ha-icon icon="${bad.length ? "mdi:alert-circle" : "mdi:shield-check"}"></ha-icon><span>${sumTxt}</span></div>
        <div class="fgrid">${faults}</div>
        ${health ? `<div class="sec">Liaison et santé</div><div class="block list">${health}</div>` : ""}
        ${tech ? `<div class="sec">Courants et état technique</div><div class="block list">${tech}</div>` : ""}`;
    }

    static css() {
      return `
      :host { display: block; }
      ha-card { display: block; --m: 120,170,210; --tx: #e6f2f5; --tx2: rgba(220,235,240,.62); --flow: 2s; --car: #4a5d70;
        position: relative; overflow: hidden; box-sizing: border-box; container-type: inline-size;
        border-radius: var(--ha-card-border-radius, 20px);
        background: linear-gradient(160deg, rgba(20,28,38,.92), rgba(10,15,22,.96));
        border: 1px solid rgba(var(--m), .2);
        box-shadow: 0 8px 26px rgba(0,0,0,.35), inset 0 1px 0 rgba(255,255,255,.04);
        color: var(--tx); user-select: none; -webkit-tap-highlight-color: transparent; transition: border-color .6s, box-shadow .6s; }
      ha-card.active { box-shadow: 0 10px 30px rgba(0,0,0,.35), 0 0 26px -6px rgba(var(--m), .5), inset 0 1px 0 rgba(255,255,255,.05); }
      button { font: inherit; color: inherit; border: 0; background: none; cursor: pointer; padding: 0; -webkit-tap-highlight-color: transparent; text-align: left; }
      button:disabled { opacity: .35; cursor: default; }
      .amb { position: absolute; inset: 0; pointer-events: none; overflow: hidden; }
      .glow { position: absolute; inset: 0; opacity: .45; transition: opacity .8s, background .8s;
        background: radial-gradient(90% 40% at 25% 18%, rgba(var(--m),.32), transparent 70%), radial-gradient(80% 35% at 80% 25%, rgba(var(--m),.12), transparent 70%); }
      ha-card.active .glow { opacity: 1; animation: breathe 4.5s ease-in-out infinite; }
      @keyframes breathe { 50% { opacity: .6; } }
      .fx { position: absolute; inset: 0; opacity: 0; transition: opacity 1s; }
      ha-card.active .fx { opacity: 1; }
      .fx i { position: absolute; bottom: -8px; width: var(--s); height: var(--s); border-radius: 50%; opacity: 0; background: radial-gradient(circle, #e2fff1, rgb(var(--m)) 60%, transparent 72%); box-shadow: 0 0 6px rgba(var(--m),.7); }
      ha-card.active .fx i { animation: rise var(--d) ease-in var(--dl) infinite; }
      @keyframes rise { 0% { transform: translate(0,0) scale(1); opacity: 0; } 12% { opacity: .85; } 100% { transform: translate(var(--dx), -620px) scale(.3); opacity: 0; } }
      @media (prefers-reduced-motion: reduce) { .fx, .pks { display: none; } * { animation: none !important; } }

      .wrap { position: relative; padding: 14px; display: flex; flex-direction: column; gap: 12px; }
      .head { display: flex; align-items: center; gap: 10px; min-width: 0; }
      .badge { flex: 0 0 38px; width: 38px; height: 38px; border-radius: 12px; display: grid; place-items: center; cursor: pointer; background: rgba(var(--m), .16); color: rgb(var(--m)); box-shadow: inset 0 0 0 1px rgba(var(--m), .28); transition: background .5s, color .5s; }
      .badge ha-icon { --mdc-icon-size: 22px; }
      .ttl { min-width: 0; flex: 1; cursor: pointer; }
      .name { font-size: 15px; font-weight: 700; line-height: 1.2; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
      .status { display: flex; align-items: center; gap: 6px; font-size: 12px; color: var(--tx2); margin-top: 2px; white-space: nowrap; overflow: hidden; }
      .dot { flex: 0 0 7px; width: 7px; height: 7px; border-radius: 50%; background: rgb(var(--m)); box-shadow: 0 0 6px rgba(var(--m),.8); }
      ha-card.active .dot { animation: pulse 1.6s ease-in-out infinite; }
      @keyframes pulse { 50% { opacity: .3; } }
      .dl { flex: 0 0 auto; display: inline-flex; align-items: center; gap: 6px; height: 32px; padding: 0 11px 0 9px; border-radius: 16px; font-size: 12px; font-weight: 700; color: var(--tx2); background: rgba(255,255,255,.06); box-shadow: inset 0 0 0 1px rgba(255,255,255,.08); transition: all .3s; }
      .dl ha-icon { --mdc-icon-size: 17px; }
      .dl.on { color: #3ecf8e; background: rgba(62,207,142,.14); box-shadow: inset 0 0 0 1px rgba(62,207,142,.35); }

      /* illustration */
      .hero { position: relative; }
      .illu { width: 100%; height: auto; display: block; overflow: visible; }
      .floor { fill: rgba(0,0,0,.35); }
      .halo { opacity: .55; } .h0 { stop-color: rgba(var(--m), .55); }
      ha-card.active .halo { animation: halo 2.4s ease-in-out infinite; }
      @keyframes halo { 50% { opacity: .95; } }
      .bodyedge { fill: none; stroke: rgba(255,255,255,.55); stroke-width: .8; }
      .ring { fill: none; stroke: rgba(var(--m), .9); stroke-width: 3; filter: drop-shadow(0 0 4px rgba(var(--m), .9)); }
      .ringspin { fill: none; stroke: #fff; stroke-width: 3; stroke-linecap: round; stroke-dasharray: 14 68; opacity: 0; transform-origin: 62px 50px; }
      ha-card.active .ringspin { opacity: .9; animation: spin 1.6s linear infinite; }
      ha-card[data-fx="error"] .ring { animation: blink 1s steps(2) infinite; }
      @keyframes spin { to { transform: rotate(360deg); } }
      @keyframes blink { 50% { opacity: .2; } }
      .glyph path { fill: rgba(var(--m), .95); }
      .led { fill: rgba(var(--m), .85); filter: drop-shadow(0 0 3px rgba(var(--m), .9)); }
      .socket { fill: #8d99a6; }
      .cable { fill: none; stroke: #2b3440; stroke-width: 5.5; stroke-linecap: round; transition: opacity .5s; }
      .cableflow { fill: none; stroke: rgba(var(--m), .9); stroke-width: 2; stroke-linecap: round; stroke-dasharray: 6 10; opacity: 0; }
      ha-card[data-fx="idle"] .cable, ha-card[data-fx="idle"] .cableflow { opacity: 0; }
      ha-card[data-fx="plug"] .cableflow { opacity: .35; }
      ha-card.active .cableflow { opacity: .9; animation: flow var(--flow) linear infinite; }
      @keyframes flow { to { stroke-dashoffset: -32; } }
      .pks { opacity: 0; } ha-card.active .pks { opacity: 1; }
      .pk { fill: #fff; filter: drop-shadow(0 0 4px rgb(var(--m))); }
      .carg { transition: opacity .6s; }
      ha-card[data-fx="idle"] .carg { opacity: .35; }
      .p0 { stop-color: color-mix(in srgb, var(--car) 100%, #fff 18%); } .p1 { stop-color: color-mix(in srgb, var(--car) 70%, #000 30%); }
      .carbody { fill: url(#paint); stroke: rgba(255,255,255,.14); stroke-width: .6; }
      .carshadow { fill: rgba(0,0,0,.45); }
      .carsheen { fill: rgba(255,255,255,.08); }
      .win { fill: url(#wglass); stroke: rgba(0,0,0,.35); stroke-width: .6; }
      .pillar { stroke: color-mix(in srgb, var(--car) 60%, #000 40%); stroke-width: 2.2; }
      .shoulder { fill: none; stroke: rgba(255,255,255,.22); stroke-width: .8; }
      .sill { stroke: rgba(0,0,0,.35); stroke-width: 1.4; stroke-linecap: round; }
      .handle { fill: rgba(255,255,255,.35); }
      .light { fill: none; stroke-width: 2; stroke-linecap: round; }
      .light.front { stroke: #e9f6ff; filter: drop-shadow(0 0 2px #bfe6ff); }
      .light.rear { stroke: #ff4d5a; filter: drop-shadow(0 0 2px #ff4d5a); }
      .spoiler { stroke: color-mix(in srgb, var(--car) 55%, #000 45%); stroke-width: 1.6; stroke-linecap: round; }
      .tyre { fill: #0b0f14; stroke: #2a333d; stroke-width: 2.2; }
      .rim { fill: #3b4652; stroke: #8c99a6; stroke-width: 1; }
      .spoke { stroke: #aeb9c4; stroke-width: 1.4; stroke-linecap: round; }
      .hub { fill: #d6dde3; }
      .port { fill: rgba(var(--m), .95); filter: drop-shadow(0 0 3px rgb(var(--m))); }
      ha-card[data-fx="idle"] .port { fill: #445; filter: none; }
      .batbg { fill: rgba(255,255,255,.08); stroke: rgba(255,255,255,.18); stroke-width: .8; }
      .batfill { fill: rgb(var(--m)); transform-box: fill-box; transform-origin: left; transform: scaleX(.55); opacity: .85; }
      ha-card.active .batfill { animation: fillbat 3.2s ease-in-out infinite; }
      ha-card[data-fx="idle"] .batbg, ha-card[data-fx="idle"] .batfill { opacity: 0; }
      @keyframes fillbat { 0% { transform: scaleX(.25); } 85% { transform: scaleX(1); } 100% { transform: scaleX(1); opacity: .4; } }
      .big { position: absolute; left: 34%; top: 4%; display: flex; align-items: baseline; gap: 4px; }
      .big b { font-size: clamp(26px, 9cqi, 40px); font-weight: 800; letter-spacing: -.02em; font-variant-numeric: tabular-nums; color: #fff; text-shadow: 0 0 18px rgba(var(--m), .6); }
      .big small { font-size: 13px; color: var(--tx2); font-weight: 700; }
      .sub { text-align: center; font-size: 12.5px; color: var(--tx2); margin-top: -4px; min-height: 16px; }
      ha-card.active .sub { color: rgb(var(--m)); font-weight: 700; }

      /* onglets */
      .tabs { display: grid; grid-template-columns: repeat(4, minmax(0,1fr)); gap: 4px; padding: 4px; border-radius: 14px; background: rgba(0,0,0,.28); box-shadow: inset 0 0 0 1px rgba(255,255,255,.06); }
      .tabs button { position: relative; display: flex; align-items: center; justify-content: center; gap: 6px; height: 36px; border-radius: 11px; font-size: 12.5px; font-weight: 700; color: var(--tx2); transition: background .25s, color .25s; }
      .tabs button ha-icon { --mdc-icon-size: 17px; }
      .tabs button.on { background: rgba(var(--m), .18); color: var(--tx); box-shadow: inset 0 0 0 1px rgba(var(--m), .35); }
      .badge-dot { position: absolute; top: 6px; right: 8px; width: 7px; height: 7px; border-radius: 50%; background: #ff5a5f; display: none; box-shadow: 0 0 6px #ff5a5f; }
      .badge-dot.on { display: block; }
      @container (max-width: 430px) { .tabs button span { display: none; } .tabs button { height: 38px; } }
      .pane { display: flex; flex-direction: column; gap: 10px; min-height: 120px; }
      .sec { font-size: 11px; font-weight: 800; letter-spacing: .06em; text-transform: uppercase; color: var(--tx2); margin: 4px 2px -4px; }
      .muted { color: var(--tx2); font-size: 12px; }

      .stats { display: grid; grid-template-columns: repeat(6, minmax(0, 1fr)); gap: 5px; }
      .stats.four { grid-template-columns: repeat(4, minmax(0, 1fr)); }
      @container (max-width: 430px) { .stats { grid-template-columns: repeat(3, minmax(0, 1fr)); } .stats.four { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
      .stat { min-width: 0; display: flex; flex-direction: column; align-items: center; gap: 1px; padding: 8px 2px; border-radius: 12px; background: rgba(255,255,255,.05); box-shadow: inset 0 0 0 1px rgba(255,255,255,.04); text-align: center; }
      .stat ha-icon { --mdc-icon-size: 16px; color: var(--tx2); }
      .stat b { font-size: 13px; font-weight: 700; white-space: nowrap; font-variant-numeric: tabular-nums; }
      .stat small { font-size: 10px; color: var(--tx2); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 100%; }
      .stat.hot ha-icon, .stat.hot b { color: rgb(var(--m)); }

      .block { border-radius: 16px; background: rgba(0,0,0,.24); box-shadow: inset 0 0 0 1px rgba(255,255,255,.06); padding: 11px 12px; display: flex; flex-direction: column; gap: 10px; }
      .block.list { padding: 4px; gap: 0; }
      .srow .sh { display: flex; align-items: center; gap: 8px; font-size: 13px; font-weight: 700; }
      .srow .sh ha-icon { --mdc-icon-size: 18px; color: rgb(var(--m)); }
      .srow .sh span { flex: 1; cursor: pointer; display: flex; flex-direction: column; }
      .srow .sh small { font-size: 10.5px; font-weight: 500; color: var(--tx2); }
      .srow output { font-size: 14px; font-weight: 800; font-variant-numeric: tabular-nums; }
      .srow output .kw { margin-left: 6px; font-size: 11.5px; font-weight: 600; color: var(--tx2); }
      .srow output .kw::before { content: "· "; }
      .slider { position: relative; height: 26px; margin-top: 4px; }
      .srow.locked .slider { opacity: .55; } .srow.locked input[type=range] { cursor: not-allowed; }
      .presets { display: grid; grid-template-columns: repeat(6, 1fr); gap: 6px; margin: 8px 0 4px; }
      .modes { display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px; margin-bottom: 10px; }
      .md { display: flex; align-items: center; justify-content: center; gap: 7px; height: 40px; border-radius: 12px; font-weight: 700; font-size: 13px;
            background: rgba(255,255,255,.05); border: 1px solid rgba(255,255,255,.08); color: var(--tx2); transition: background .25s, color .25s, border-color .25s; }
      .md ha-icon { --mdc-icon-size: 18px; }
      .md.on { background: rgba(var(--m), .22); border-color: rgba(var(--m), .6); color: var(--tx); box-shadow: 0 0 14px rgba(var(--m), .25); }
      .pst { display: flex; align-items: center; gap: 8px; padding: 8px 10px; border-radius: 10px; background: rgba(255,255,255,.04); font-size: 12.5px; color: var(--tx2); margin-bottom: 8px; cursor: pointer; }
      .pst ha-icon { --mdc-icon-size: 16px; color: rgb(var(--m)); } .pst span { flex: 1; min-width: 0; } .pst b { color: var(--tx); white-space: nowrap; font-variant-numeric: tabular-nums; }
      @container (max-width: 430px) { .md span { font-size: 12px; } .md ha-icon { display: none; } }
      .pre { display: flex; flex-direction: column; align-items: center; padding: 6px 2px; border-radius: 10px; border: 1px solid rgba(255,255,255,.08); background: rgba(255,255,255,.04); color: var(--tx); cursor: pointer; font: inherit; }
      .pre b { font-size: 12.5px; } .pre small { font-size: 9.5px; color: var(--tx2); }
      .pre.on { background: rgba(var(--m), .22); border-color: rgba(var(--m), .6); }
      .track { position: absolute; left: 0; right: 0; top: 50%; height: 8px; transform: translateY(-50%); border-radius: 4px; background: rgba(255,255,255,.08); }
      .fill { position: absolute; left: 0; top: 0; bottom: 0; border-radius: 4px; background: linear-gradient(90deg, rgba(var(--m), .5), rgb(var(--m))); box-shadow: 0 0 10px rgba(var(--m), .45); }
      input[type=range] { position: absolute; inset: 0; width: 100%; margin: 0; background: transparent; -webkit-appearance: none; appearance: none; cursor: pointer; }
      input[type=range]::-webkit-slider-runnable-track { background: transparent; height: 100%; }
      input[type=range]::-moz-range-track { background: transparent; }
      input[type=range]::-webkit-slider-thumb { -webkit-appearance: none; width: 22px; height: 22px; margin-top: 2px; border-radius: 50%; background: #fff; box-shadow: 0 0 0 4px rgba(var(--m), .35), 0 2px 6px rgba(0,0,0,.5); }
      input[type=range]::-moz-range-thumb { width: 20px; height: 20px; border: 0; border-radius: 50%; background: #fff; box-shadow: 0 0 0 4px rgba(var(--m), .35); }
      .scale { display: flex; justify-content: space-between; font-size: 10px; color: var(--tx2); margin-top: -6px; font-variant-numeric: tabular-nums; }
      .reason { font-size: 11.5px; color: var(--tx2); cursor: pointer; }
      .lim.capped .reason b { color: #ffb840; }
      .chips { display: grid; grid-template-columns: repeat(auto-fit, minmax(80px, 1fr)); gap: 5px; }
      .chip { display: flex; flex-direction: column; align-items: center; padding: 5px 4px; border-radius: 10px; background: rgba(255,255,255,.05); text-align: center; }
      .chip small { font-size: 10px; color: var(--tx2); } .chip b { font-size: 12.5px; font-variant-numeric: tabular-nums; } .chip small.kw { font-size: 9.5px; opacity: .8; }

      .acts { display: grid; grid-template-columns: repeat(4, minmax(0,1fr)); gap: 6px; }
      .act { height: 46px; border-radius: 14px; display: flex; align-items: center; justify-content: center; gap: 6px; font-size: 12.5px; font-weight: 700; background: rgba(255,255,255,.06); box-shadow: inset 0 0 0 1px rgba(255,255,255,.07); transition: background .25s, transform .1s; }
      .act:active:not(:disabled) { transform: scale(.97); }
      .act ha-icon { --mdc-icon-size: 19px; }
      .act.pri { background: rgba(62,207,142,.16); color: #5fe0a8; box-shadow: inset 0 0 0 1px rgba(62,207,142,.35); }
      .act.pri.stop { background: rgba(255,90,95,.14); color: #ff8a8e; box-shadow: inset 0 0 0 1px rgba(255,90,95,.35); }
      .act.warn.confirm { background: rgba(255,184,64,.18); color: #ffc560; box-shadow: inset 0 0 0 1px rgba(255,184,64,.5); animation: pulse 1s ease-in-out infinite; }
      @container (max-width: 430px) { .acts { grid-template-columns: repeat(2, minmax(0,1fr)); } }

      .tgrid { display: grid; grid-template-columns: repeat(2, minmax(0,1fr)); gap: 6px; }
      @container (max-width: 430px) { .tgrid { grid-template-columns: 1fr; } }
      .tg { display: flex; align-items: center; gap: 9px; padding: 9px 10px; border-radius: 12px; background: rgba(255,255,255,.04); box-shadow: inset 0 0 0 1px rgba(255,255,255,.05); min-width: 0; }
      .tg > ha-icon { --mdc-icon-size: 19px; color: var(--tx2); flex: 0 0 auto; }
      .tg div { flex: 1; min-width: 0; } .tg b { display: block; font-size: 12.5px; } .tg small { display: block; font-size: 10.5px; color: var(--tx2); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
      .sw { flex: 0 0 34px; width: 34px; height: 20px; border-radius: 10px; background: rgba(255,255,255,.14); position: relative; transition: background .25s; }
      .sw i { position: absolute; top: 2px; left: 2px; width: 16px; height: 16px; border-radius: 50%; background: #cfd8e0; transition: transform .25s, background .25s; }
      .tg.on .sw { background: rgba(var(--m), .55); } .tg.on .sw i { transform: translateX(14px); background: #fff; }
      .tg.on > ha-icon { color: rgb(var(--m)); }

      .row { width: 100%; display: flex; align-items: center; gap: 10px; padding: 9px 10px; border-radius: 12px; font-size: 12.5px; }
      .row:hover { background: rgba(255,255,255,.04); }
      .row + .row { box-shadow: 0 -1px 0 rgba(255,255,255,.05); }
      .row ha-icon { --mdc-icon-size: 18px; color: var(--tx2); flex: 0 0 auto; }
      .row .rl { flex: 1; min-width: 0; display: flex; flex-direction: column; }
      .row .rl small { font-size: 10.5px; color: var(--tx2); }
      .row b { font-variant-numeric: tabular-nums; white-space: nowrap; }
      .row.warnrow b, .row.warnrow ha-icon { color: #ffb840; }
      .row.static { cursor: default; }

      .diagsum { display: flex; align-items: center; gap: 8px; padding: 10px 12px; border-radius: 14px; background: rgba(62,207,142,.1); color: #5fe0a8; font-weight: 700; font-size: 12.5px; box-shadow: inset 0 0 0 1px rgba(62,207,142,.25); }
      .diagsum.bad { background: rgba(255,90,95,.1); color: #ff8a8e; box-shadow: inset 0 0 0 1px rgba(255,90,95,.4); }
      .diagsum ha-icon { --mdc-icon-size: 18px; }
      .fgrid { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 5px; }
      .fchip { display: flex; align-items: center; gap: 6px; padding: 6px 8px; border-radius: 10px; background: rgba(255,255,255,.04); font-size: 11.5px; color: var(--tx2); }
      .fchip ha-icon { --mdc-icon-size: 15px; color: #3ecf8e; flex: 0 0 auto; }
      .fchip.ko { background: rgba(255,90,95,.14); color: #ffb3b5; } .fchip.ko ha-icon { color: #ff5a5f; }

      .na { display: none; position: absolute; inset: 0; place-items: center; font-weight: 700; color: var(--tx2); background: rgba(10,15,22,.7); backdrop-filter: blur(2px); }
      ha-card.unav .na { display: grid; }
      @container (max-width: 430px) { .dl span { display: none; } .dl { padding: 0 8px; } }
      `;
    }
  }

  class HolmBorneCardEditor extends HTMLElement {
    setConfig(config) { this._config = config || {}; if (this._form && !this._self) this._form.data = this._data(); }
    set hass(hass) { this._hass = hass; this._render(); }
    connectedCallback() { this._render(); }
    _data() { return { show_diagnostic: true, show_settings: true, car_color: "#4a5d70", default_tab: "charge", ...this._config }; }
    _render() {
      if (!this._hass || !this._config) return;
      if (!this._form) {
        const f = document.createElement("ha-form");
        f.schema = [
          { name: "entity", required: true, selector: { entity: { domain: "sensor" } } },
          { name: "name", selector: { text: {} } },
          { name: "delestage_entity", selector: { entity: { domain: ["automation", "input_boolean", "switch"] } } },
          { type: "grid", name: "", schema: [
            { name: "default_tab", selector: { select: { mode: "dropdown", options: [{ value: "charge", label: "Charge" }, { value: "settings", label: "Réglages" }, { value: "stats", label: "Statistiques" }, { value: "diag", label: "Diagnostic" }] } } },
            { name: "car_color", selector: { text: {} } },
          ] },
          { type: "grid", name: "", schema: [
            { name: "show_settings", selector: { boolean: {} } },
            { name: "show_diagnostic", selector: { boolean: {} } },
          ] },
        ];
        const L = { entity: "Entité « État » de la borne", name: "Nom affiché", delestage_entity: "Délestage (si non intégré : automatisation)",
          default_tab: "Onglet affiché par défaut", car_color: "Couleur de la voiture (ex. #4a5d70)", show_settings: "Onglet Réglages", show_diagnostic: "Onglet Diagnostic" };
        f.computeLabel = (s) => L[s.name] || s.name;
        f.addEventListener("value-changed", (ev) => {
          ev.stopPropagation(); this._config = ev.detail.value; this._self = true;
          this.dispatchEvent(new CustomEvent("config-changed", { detail: { config: this._config }, bubbles: true, composed: true }));
          setTimeout(() => (this._self = false), 0);
        });
        this._form = f; this.appendChild(f);
      }
      this._form.hass = this._hass; this._form.data = this._data();
    }
  }

  if (!customElements.get("holm-borne-card")) customElements.define("holm-borne-card", HolmBorneCard);
  if (!customElements.get("holm-borne-card-editor")) customElements.define("holm-borne-card-editor", HolmBorneCardEditor);
  window.customCards = window.customCards || [];
  if (!window.customCards.some((c) => c.type === "holm-borne-card")) {
    window.customCards.push({ type: "holm-borne-card", name: "HOLM Borne", description: "Borne de recharge (HOLM Lektrico…) : illustration animée, mesures, limite, actions, réglages, statistiques, diagnostic et délestage.", preview: true });
  }
  console.info(`%c HOLM-BORNE-CARD %c v${VERSION} `, "background:#3ecf8e;color:#08130e;font-weight:700", "background:#1b2633;color:#fff");
})();
