/* holm-borne-card — HOLM Cards — licence MIT — v2.7.0 */
/* HOLM Borne — carte de borne de recharge (HOLM Lektrico, intégration Lektrico officielle et compatibles)
 * - Illustration animée borne → câble → voiture selon l'état, ou votre photo (avec animation de charge).
 * - Onglets : Charge (mesures, limite, actions) · Réglages (interrupteurs et curseurs) ·
 *   Statistiques (compteurs) · Diagnostic (défauts, Wi-Fi, santé de la liaison, courants système).
 * - Délestage : interrupteur optionnel (automatisation) intégré à l'entête.
 * - Mode Heures creuses : décompte jusqu'aux prochaines heures creuses (HOLM HP/HC, détecté automatiquement).
 * Les entités sont détectées depuis l'appareil de l'entité « État » (clé de traduction, sinon suffixe).
 */
(() => {
  // ---- HOLM i18n : textes écrits en français, traduits à l'affichage (en, de, es, it, nl, pt, pl) ----
  // Langue : option `language` de la carte, sinon celle du profil Home Assistant ; anglais si la langue n'est pas traduite.
  const HOLM_LANGS = ["en", "de", "es", "it", "nl", "pt", "pl"];
  const LANG_NAMES = { fr: "Français", en: "English", de: "Deutsch", es: "Español", it: "Italiano", nl: "Nederlands", pt: "Português", pl: "Polski" };
  const LOCALES = { fr: "fr-FR", en: "en-GB", de: "de-DE", es: "es-ES", it: "it-IT", nl: "nl-NL", pt: "pt-PT", pl: "pl-PL" };
  const I18N = {
    "Automatique (profil)": ["Automatic (profile)", "Automatisch (Profil)", "Automático (perfil)", "Automatica (profilo)", "Automatisch (profiel)", "Automático (perfil)", "Automatycznie (profil)"],
    "Langue": ["Language", "Sprache", "Idioma", "Lingua", "Taal", "Idioma", "Język"],
    "Titre": ["Title", "Titel", "Título", "Titolo", "Titel", "Título", "Tytuł"],
    "Titre (optionnel)": ["Title (optional)", "Titel (optional)", "Título (opcional)", "Titolo (facoltativo)", "Titel (optioneel)", "Título (opcional)", "Tytuł (opcjonalnie)"],
    "Nom": ["Name", "Name", "Nombre", "Nome", "Naam", "Nome", "Nazwa"],
    "Nom affiché": ["Display name", "Anzeigename", "Nombre mostrado", "Nome visualizzato", "Weergavenaam", "Nome apresentado", "Wyświetlana nazwa"],
    "Icône": ["Icon", "Symbol", "Icono", "Icona", "Pictogram", "Ícone", "Ikona"],
    "Couleur": ["Colour", "Farbe", "Color", "Colore", "Kleur", "Cor", "Kolor"],
    "Couleurs": ["Colours", "Farben", "Colores", "Colori", "Kleuren", "Cores", "Kolory"],
    "Entité": ["Entity", "Entität", "Entidad", "Entità", "Entiteit", "Entidade", "Encja"],
    "Entités": ["Entities", "Entitäten", "Entidades", "Entità", "Entiteiten", "Entidades", "Encje"],
    "Chargement…": ["Loading…", "Wird geladen…", "Cargando…", "Caricamento…", "Laden…", "A carregar…", "Ładowanie…"],
    "Erreur": ["Error", "Fehler", "Error", "Errore", "Fout", "Erro", "Błąd"],
    "Fermer": ["Close", "Schließen", "Cerrar", "Chiudi", "Sluiten", "Fechar", "Zamknij"],
    "Annuler": ["Cancel", "Abbrechen", "Cancelar", "Annulla", "Annuleren", "Cancelar", "Anuluj"],
    "Enregistrer": ["Save", "Speichern", "Guardar", "Salva", "Opslaan", "Guardar", "Zapisz"],
    "Supprimer": ["Delete", "Löschen", "Eliminar", "Elimina", "Verwijderen", "Eliminar", "Usuń"],
    "Ajouter": ["Add", "Hinzufügen", "Añadir", "Aggiungi", "Toevoegen", "Adicionar", "Dodaj"],
    "Monter": ["Move up", "Nach oben", "Subir", "Sposta su", "Omhoog", "Mover para cima", "W górę"],
    "Descendre": ["Move down", "Nach unten", "Bajar", "Sposta giù", "Omlaag", "Mover para baixo", "W dół"],
    "Afficher le cadre de la carte": ["Show the card frame", "Kartenrahmen anzeigen", "Mostrar el marco de la tarjeta", "Mostra la cornice della scheda", "Kaartkader tonen", "Mostrar a moldura do cartão", "Pokaż ramkę karty"],
    "Indisponible": ["Unavailable", "Nicht verfügbar", "No disponible", "Non disponibile", "Niet beschikbaar", "Indisponível", "Niedostępna"],
    "Aujourd'hui": ["Today", "Heute", "Hoy", "Oggi", "Vandaag", "Hoje", "Dziś"],
    "Hier": ["Yesterday", "Gestern", "Ayer", "Ieri", "Gisteren", "Ontem", "Wczoraj"],
    "Demain": ["Tomorrow", "Morgen", "Mañana", "Domani", "Morgen", "Amanhã", "Jutro"],
    "Batterie": ["Battery", "Batterie", "Batería", "Batteria", "Batterij", "Bateria", "Bateria"],
    "Aucune donnée sur cette période.": ["No data for this period.", "Keine Daten für diesen Zeitraum.", "No hay datos en este periodo.", "Nessun dato per questo periodo.", "Geen gegevens voor deze periode.", "Sem dados neste período.", "Brak danych w tym okresie."],
    "à l'instant": ["just now", "gerade eben", "ahora mismo", "proprio ora", "zojuist", "agora mesmo", "przed chwilą"],
    "il y a {n} min": ["{n} min ago", "vor {n} Min.", "hace {n} min", "{n} min fa", "{n} min geleden", "há {n} min", "{n} min temu"],
    "il y a {n} h": ["{n} h ago", "vor {n} Std.", "hace {n} h", "{n} h fa", "{n} u geleden", "há {n} h", "{n} godz. temu"],
    "il y a {n} j": ["{n} d ago", "vor {n} T.", "hace {n} d", "{n} g fa", "{n} d geleden", "há {n} d", "{n} dni temu"],
    "Erreur EV": ["EV error", "Fahrzeugfehler", "Error del vehículo", "Errore veicolo", "Voertuigfout", "Erro do veículo", "Błąd pojazdu"],
    "Limitation thermique": ["Thermal limiting", "Thermische Begrenzung", "Limitación térmica", "Limitazione termica", "Thermische begrenzing", "Limitação térmica", "Ograniczenie termiczne"],
    "Surchauffe": ["Overheating", "Überhitzung", "Sobrecalentamiento", "Surriscaldamento", "Oververhitting", "Sobreaquecimento", "Przegrzanie"],
    "Surintensité": ["Overcurrent", "Überstrom", "Sobrecorriente", "Sovracorrente", "Overstroom", "Sobrecorrente", "Przetężenie"],
    "Erreur de comptage": ["Metering error", "Messfehler", "Error de medición", "Errore di misura", "Meetfout", "Erro de medição", "Błąd pomiaru"],
    "Sous-tension": ["Undervoltage", "Unterspannung", "Subtensión", "Sottotensione", "Onderspanning", "Subtensão", "Podnapięcie"],
    "Surtension": ["Overvoltage", "Überspannung", "Sobretensión", "Sovratensione", "Overspanning", "Sobretensão", "Przepięcie"],
    "Différentiel (RCD)": ["Residual current (RCD)", "FI-Schutzschalter (RCD)", "Diferencial (RCD)", "Differenziale (RCD)", "Aardlek (RCD)", "Diferencial (RCD)", "Różnicówka (RCD)"],
    "Test du différentiel": ["RCD test", "FI-Test", "Prueba del diferencial", "Test del differenziale", "Aardlektest", "Teste do diferencial", "Test różnicówki"],
    "Diode EV": ["EV diode", "Fahrzeugdiode", "Diodo del vehículo", "Diodo veicolo", "Voertuigdiode", "Díodo do veículo", "Dioda pojazdu"],
    "Relais soudés": ["Welded relay", "Verschweißtes Relais", "Relé soldado", "Relè saldato", "Gelast relais", "Relé soldado", "Zgrzany przekaźnik"],
    "Erreur de tension": ["Voltage error", "Spannungsfehler", "Error de tensión", "Errore di tensione", "Spanningsfout", "Erro de tensão", "Błąd napięcia"],
    "Erreur état F": ["State F error", "Fehler Zustand F", "Error de estado F", "Errore stato F", "Fout status F", "Erro de estado F", "Błąd stanu F"],
    "Libre": ["Free", "Frei", "Libre", "Libera", "Vrij", "Livre", "Wolna"],
    "Prête, aucun véhicule branché": ["Ready, no vehicle plugged in", "Bereit, kein Fahrzeug angeschlossen", "Lista, ningún vehículo enchufado", "Pronta, nessun veicolo collegato", "Klaar, geen voertuig aangesloten", "Pronto, nenhum veículo ligado", "Gotowa, brak podłączonego pojazdu"],
    "Véhicule branché": ["Vehicle plugged in", "Fahrzeug angeschlossen", "Vehículo enchufado", "Veicolo collegato", "Voertuig aangesloten", "Veículo ligado", "Pojazd podłączony"],
    "Branché, en attente de charge": ["Plugged in, waiting to charge", "Angeschlossen, wartet auf Laden", "Enchufado, esperando la carga", "Collegato, in attesa di ricarica", "Aangesloten, wacht op laden", "Ligado, à espera de carga", "Podłączony, czeka na ładowanie"],
    "En charge": ["Charging", "Lädt", "Cargando", "In ricarica", "Laden", "A carregar", "Ładowanie"],
    "En pause": ["Paused", "Pausiert", "En pausa", "In pausa", "Gepauzeerd", "Em pausa", "Wstrzymana"],
    "Charge suspendue": ["Charging suspended", "Laden unterbrochen", "Carga suspendida", "Ricarica sospesa", "Laden onderbroken", "Carga suspensa", "Ładowanie wstrzymane"],
    "En pause (programme)": ["Paused (schedule)", "Pausiert (Zeitplan)", "En pausa (horario)", "In pausa (programma)", "Gepauzeerd (schema)", "Em pausa (horário)", "Wstrzymana (harmonogram)"],
    "Attend le créneau programmé": ["Waiting for the scheduled slot", "Wartet auf das geplante Zeitfenster", "Espera el tramo programado", "Attende la fascia programmata", "Wacht op het geplande tijdvak", "Aguarda o intervalo programado", "Czeka na zaplanowany przedział"],
    "Authentification": ["Authentication", "Authentifizierung", "Autenticación", "Autenticazione", "Authenticatie", "Autenticação", "Uwierzytelnianie"],
    "Badge ou validation requise": ["Badge or confirmation required", "Ausweis oder Bestätigung erforderlich", "Tarjeta o validación necesaria", "Badge o conferma richiesti", "Pas of bevestiging vereist", "Cartão ou validação necessária", "Wymagana karta lub potwierdzenie"],
    "Verrouillée": ["Locked", "Gesperrt", "Bloqueado", "Bloccata", "Vergrendeld", "Bloqueado", "Zablokowana"],
    "Aucune charge possible": ["No charging possible", "Kein Laden möglich", "Carga imposible", "Nessuna ricarica possibile", "Laden niet mogelijk", "Nenhuma carga possível", "Ładowanie niemożliwe"],
    "Voir le diagnostic": ["See diagnostics", "Siehe Diagnose", "Ver el diagnóstico", "Vedi la diagnostica", "Zie diagnose", "Ver o diagnóstico", "Zobacz diagnostykę"],
    "Mise à jour": ["Updating", "Aktualisierung", "Actualizando", "Aggiornamento", "Bijwerken", "Atualização", "Aktualizacja"],
    "Mise à jour du micrologiciel": ["Firmware update", "Firmware-Aktualisierung", "Actualización del firmware", "Aggiornamento del firmware", "Firmware-update", "Atualização do firmware", "Aktualizacja oprogramowania"],
    "Aucune limite": ["No limit", "Keine Begrenzung", "Sin límite", "Nessun limite", "Geen limiet", "Sem limite", "Brak limitu"],
    "Courant de l'installation": ["Installation current", "Installationsstrom", "Corriente de la instalación", "Corrente dell'impianto", "Installatiestroom", "Corrente da instalação", "Prąd instalacji"],
    "Limite utilisateur": ["User limit", "Benutzerlimit", "Límite del usuario", "Limite utente", "Gebruikerslimiet", "Limite do utilizador", "Limit użytkownika"],
    "Limite dynamique": ["Dynamic limit", "Dynamisches Limit", "Límite dinámico", "Limite dinamico", "Dynamische limiet", "Limite dinâmico", "Limit dynamiczny"],
    "Programme de charge": ["Charging schedule", "Ladezeitplan", "Horario de carga", "Programma di ricarica", "Laadschema", "Horário de carga", "Harmonogram ładowania"],
    "Compteur hors ligne": ["Meter offline", "Zähler offline", "Contador sin conexión", "Contatore offline", "Meter offline", "Contador offline", "Licznik offline"],
    "Compteur d'énergie": ["Energy meter", "Energiezähler", "Contador de energía", "Contatore di energia", "Energiemeter", "Contador de energia", "Licznik energii"],
    "Température": ["Temperature", "Temperatur", "Temperatura", "Temperatura", "Temperatuur", "Temperatura", "Temperatura"],
    "Bascule de phases": ["Phase switching", "Phasenumschaltung", "Cambio de fases", "Commutazione delle fasi", "Faseomschakeling", "Comutação de fases", "Przełączanie faz"],
    "Charge monophasée désactivée": ["Single-phase charging off", "Einphasiges Laden deaktiviert", "Carga monofásica desactivada", "Ricarica monofase disattivata", "Eenfasig laden uit", "Carga monofásica desativada", "Ładowanie jednofazowe wyłączone"],
    "Charge": ["Charge", "Laden", "Carga", "Ricarica", "Laden", "Carga", "Ładowanie"],
    "Réglages": ["Settings", "Einstellungen", "Ajustes", "Impostazioni", "Instellingen", "Definições", "Ustawienia"],
    "Statistiques": ["Statistics", "Statistik", "Estadísticas", "Statistiche", "Statistieken", "Estatísticas", "Statystyki"],
    "Diagnostic": ["Diagnostics", "Diagnose", "Diagnóstico", "Diagnostica", "Diagnose", "Diagnóstico", "Diagnostyka"],
    "{n} j": ["{n} d", "{n} T", "{n} d", "{n} g", "{n} d", "{n} d", "{n} d"],
    "demain ": ["tomorrow ", "morgen ", "mañana ", "domani ", "morgen ", "amanhã ", "jutro "],
    "Heures creuses jusqu'à <b>{t}</b>": ["Off-peak until <b>{t}</b>", "Niedertarif bis <b>{t}</b>", "Horas valle hasta <b>{t}</b>", "Fuori punta fino a <b>{t}</b>", "Daluren tot <b>{t}</b>", "Horas de vazio até <b>{t}</b>", "Poza szczytem do <b>{t}</b>"],
    "Heures creuses dans <b>{d}</b> <small>(à {t})</small>": ["Off-peak in <b>{d}</b> <small>(at {t})</small>", "Niedertarif in <b>{d}</b> <small>(um {t})</small>", "Horas valle en <b>{d}</b> <small>(a las {t})</small>", "Fuori punta tra <b>{d}</b> <small>(alle {t})</small>", "Daluren over <b>{d}</b> <small>(om {t})</small>", "Horas de vazio dentro de <b>{d}</b> <small>(às {t})</small>", "Poza szczytem za <b>{d}</b> <small>(o {t})</small>"],
    "HC": ["Off-peak", "NT", "Valle", "F3", "Dal", "Vazio", "Poza szczytem"],
    "HP": ["Peak", "HT", "Punta", "F1", "Piek", "Cheias", "Szczyt"],
    "Délestage": ["Load shedding", "Lastabwurf", "Deslastre", "Distacco carichi", "Lastafschakeling", "Corte de carga", "Odciążenie"],
    "Borne indisponible": ["Charger unavailable", "Wallbox nicht verfügbar", "Cargador no disponible", "Wallbox non disponibile", "Laadpaal niet beschikbaar", "Carregador indisponível", "Ładowarka niedostępna"],
    "jamais": ["never", "nie", "nunca", "mai", "nooit", "nunca", "nigdy"],
    "0 A · pause": ["0 A · pause", "0 A · Pause", "0 A · pausa", "0 A · pausa", "0 A · pauze", "0 A · pausa", "0 A · pauza"],
    "Borne de recharge": ["Charger", "Wallbox", "Cargador", "Wallbox", "Laadpaal", "Carregador", "Ładowarka"],
    "Délestage actif": ["Load shedding on", "Lastabwurf aktiv", "Deslastre activo", "Distacco carichi attivo", "Lastafschakeling aan", "Corte de carga ativo", "Odciążenie włączone"],
    "Délestage coupé": ["Load shedding off", "Lastabwurf aus", "Deslastre desactivado", "Distacco carichi spento", "Lastafschakeling uit", "Corte de carga desligado", "Odciążenie wyłączone"],
    "{e} kWh rechargés · {t}": ["{e} kWh charged · {t}", "{e} kWh geladen · {t}", "{e} kWh cargados · {t}", "{e} kWh ricaricati · {t}", "{e} kWh geladen · {t}", "{e} kWh carregados · {t}", "{e} kWh naładowano · {t}"],
    "Courant": ["Current", "Strom", "Corriente", "Corrente", "Stroom", "Corrente", "Prąd"],
    "Tension": ["Voltage", "Spannung", "Tensión", "Tensione", "Spanning", "Tensão", "Napięcie"],
    "Session": ["Session", "Sitzung", "Sesión", "Sessione", "Sessie", "Sessão", "Sesja"],
    "Durée": ["Duration", "Dauer", "Duración", "Durata", "Duur", "Duração", "Czas"],
    "Puiss. max": ["Max power", "Max. Leist.", "Pot. máx.", "Pot. max", "Max. verm.", "Pot. máx.", "Moc maks."],
    "Autorisé": ["Allowed", "Erlaubt", "Permitido", "Consentita", "Toegestaan", "Permitida", "Dozwolony"],
    "Utilisateur": ["User", "Benutzer", "Usuario", "Utente", "Gebruiker", "Utilizador", "Użytkownik"],
    "Puissance max": ["Max power", "Max. Leistung", "Potencia máx.", "Potenza max", "Max. vermogen", "Potência máx.", "Moc maks."],
    "Installation": ["Installation", "Installation", "Instalación", "Impianto", "Installatie", "Instalação", "Instalacja"],
    "Heures creuses": ["Off-peak hours", "Niedertarif", "Horas valle", "Fuori punta", "Daluren", "Horas de vazio", "Poza szczytem"],
    "Maintenant": ["Now", "Sofort", "Ahora", "Subito", "Nu", "Agora", "Teraz"],
    "Arrêt": ["Stop", "Stopp", "Parada", "Stop", "Stop", "Parar", "Stop"],
    "pause": ["pause", "Pause", "pausa", "pausa", "pauze", "pausa", "pauza"],
    "Modifier dans l'onglet Réglages": ["Change in the Settings tab", "Im Reiter Einstellungen ändern", "Cambiar en la pestaña Ajustes", "Modifica nella scheda Impostazioni", "Wijzigen in het tabblad Instellingen", "Alterar no separador Definições", "Zmień w karcie Ustawienia"],
    "Courant de charge souhaité": ["Desired charging current", "Gewünschter Ladestrom", "Corriente de carga deseada", "Corrente di ricarica desiderata", "Gewenste laadstroom", "Corrente de carga pretendida", "Żądany prąd ładowania"],
    "Raison de la limite : <b>{r}</b>": ["Limit reason: <b>{r}</b>", "Grund der Begrenzung: <b>{r}</b>", "Motivo del límite: <b>{r}</b>", "Motivo del limite: <b>{r}</b>", "Reden van de limiet: <b>{r}</b>", "Motivo do limite: <b>{r}</b>", "Przyczyna limitu: <b>{r}</b>"],
    "Limite de charge": ["Charging limit", "Ladelimit", "Límite de carga", "Limite di ricarica", "Laadlimiet", "Limite de carga", "Limit ładowania"],
    "pilotée par le délestage — coupez-le pour régler à la main": ["driven by load shedding — turn it off to set it by hand", "durch Lastabwurf gesteuert — zum manuellen Einstellen ausschalten", "controlada por el deslastre — desactívalo para ajustarla a mano", "gestita dal distacco carichi — spegnilo per regolarla a mano", "gestuurd door lastafschakeling — zet die uit om handmatig in te stellen", "controlada pelo corte de carga — desligue-o para ajustar à mão", "sterowany przez odciążenie — wyłącz je, aby ustawić ręcznie"],
    "réglage manuel": ["manual setting", "manuelle Einstellung", "ajuste manual", "regolazione manuale", "handmatige instelling", "ajuste manual", "ustawienie ręczne"],
    "0 · pause": ["0 · pause", "0 · Pause", "0 · pausa", "0 · pausa", "0 · pauze", "0 · pausa", "0 · pauza"],
    "Arrêter": ["Stop", "Stoppen", "Detener", "Ferma", "Stoppen", "Parar", "Zatrzymaj"],
    "Démarrer": ["Start", "Starten", "Iniciar", "Avvia", "Starten", "Iniciar", "Start"],
    "Reprendre": ["Resume", "Fortsetzen", "Reanudar", "Riprendi", "Hervatten", "Retomar", "Wznów"],
    "Pause": ["Pause", "Pause", "Pausa", "Pausa", "Pauze", "Pausa", "Pauza"],
    "Dérogation": ["Override", "Übersteuerung", "Excepción", "Deroga", "Overschrijven", "Exceção", "Pominięcie"],
    "Confirmer ?": ["Confirm?", "Bestätigen?", "¿Confirmar?", "Confermare?", "Bevestigen?", "Confirmar?", "Potwierdzić?"],
    "Redémarrer": ["Restart", "Neu starten", "Reiniciar", "Riavvia", "Herstarten", "Reiniciar", "Uruchom ponownie"],
    "Badge ou appli requis": ["Badge or app required", "Ausweis oder App erforderlich", "Tarjeta o app necesaria", "Badge o app richiesti", "Pas of app vereist", "Cartão ou app necessário", "Wymagana karta lub aplikacja"],
    "Démarrage automatique": ["Automatic start", "Automatischer Start", "Inicio automático", "Avvio automatico", "Automatisch starten", "Arranque automático", "Automatyczny start"],
    "Verrou": ["Lock", "Sperre", "Bloqueo", "Blocco", "Vergrendeling", "Bloqueio", "Blokada"],
    "Charge impossible": ["Charging impossible", "Laden nicht möglich", "Carga imposible", "Ricarica impossibile", "Laden onmogelijk", "Carga impossível", "Ładowanie niemożliwe"],
    "Déverrouillée": ["Unlocked", "Entsperrt", "Desbloqueado", "Sbloccata", "Ontgrendeld", "Desbloqueado", "Odblokowana"],
    "Activé": ["On", "An", "Activado", "Attivo", "Aan", "Ativado", "Włączony"],
    "Désactivé": ["Off", "Aus", "Desactivado", "Disattivato", "Uit", "Desativado", "Wyłączony"],
    "Activée": ["On", "An", "Activada", "Attiva", "Aan", "Ativada", "Włączona"],
    "Désactivée": ["Off", "Aus", "Desactivada", "Disattivata", "Uit", "Desativada", "Wyłączona"],
    "Activées": ["On", "An", "Activadas", "Attivi", "Aan", "Ativadas", "Włączone"],
    "Désactivées": ["Off", "Aus", "Desactivadas", "Disattivati", "Uit", "Desativadas", "Wyłączone"],
    "Buzzer": ["Buzzer", "Summer", "Zumbador", "Cicalino", "Zoemer", "Besouro", "Brzęczyk"],
    "Sons activés": ["Sounds on", "Töne an", "Sonidos activados", "Suoni attivi", "Geluid aan", "Sons ativados", "Dźwięki włączone"],
    "Silencieux": ["Silent", "Stumm", "Silencioso", "Silenzioso", "Stil", "Silencioso", "Cichy"],
    "Mise à jour auto.": ["Auto update", "Auto-Update", "Actualización auto.", "Aggiornamento auto", "Auto-update", "Atualização auto.", "Aktualizacja auto."],
    "Manuelle": ["Manual", "Manuell", "Manual", "Manuale", "Handmatig", "Manual", "Ręczna"],
    "Redémarrage si Wi-Fi perdu": ["Restart if Wi-Fi lost", "Neustart bei WLAN-Verlust", "Reiniciar si se pierde el Wi-Fi", "Riavvio se si perde il Wi-Fi", "Herstarten bij wifi-verlies", "Reiniciar se perder o Wi-Fi", "Restart po utracie Wi-Fi"],
    "Gestion d'énergie": ["Energy management", "Energiemanagement", "Gestión de energía", "Gestione dell'energia", "Energiebeheer", "Gestão de energia", "Zarządzanie energią"],
    "Couleurs LED perso.": ["Custom LED colours", "Eigene LED-Farben", "Colores LED pers.", "Colori LED pers.", "Eigen ledkleuren", "Cores LED pers.", "Własne kolory LED"],
    "PWM précis": ["Precise PWM", "Präzises PWM", "PWM preciso", "PWM preciso", "Nauwkeurige PWM", "PWM preciso", "Precyzyjny PWM"],
    "courant maximal choisi": ["chosen maximum current", "gewählter Maximalstrom", "corriente máxima elegida", "corrente massima scelta", "gekozen maximale stroom", "corrente máxima escolhida", "wybrany prąd maksymalny"],
    "Puissance maximale": ["Maximum power", "Maximale Leistung", "Potencia máxima", "Potenza massima", "Maximaal vermogen", "Potência máxima", "Moc maksymalna"],
    "la borne ne dépasse pas cette puissance": ["the charger doesn't exceed this power", "die Wallbox überschreitet diese Leistung nicht", "el cargador no supera esta potencia", "la wallbox non supera questa potenza", "de laadpaal komt niet boven dit vermogen", "o carregador não ultrapassa esta potência", "ładowarka nie przekracza tej mocy"],
    "Courant minimal du véhicule": ["Vehicle minimum current", "Minimaler Fahrzeugstrom", "Corriente mínima del vehículo", "Corrente minima del veicolo", "Minimale voertuigstroom", "Corrente mínima do veículo", "Minimalny prąd pojazdu"],
    "Luminosité de la LED": ["LED brightness", "LED-Helligkeit", "Brillo del LED", "Luminosità del LED", "Ledhelderheid", "Brilho do LED", "Jasność LED"],
    "Atténuation de la LED": ["LED dimming", "LED-Dimmung", "Atenuación del LED", "Attenuazione del LED", "Leddimmen", "Atenuação do LED", "Przyciemnianie LED"],
    "après ce délai": ["after this delay", "nach dieser Zeit", "tras este tiempo", "dopo questo intervallo", "na deze tijd", "após este tempo", "po tym czasie"],
    "Courant d'installation": ["Installation current", "Installationsstrom", "Corriente de instalación", "Corrente d'impianto", "Installatiestroom", "Corrente de instalação", "Prąd instalacji"],
    "réglage électricien — prudence": ["electrician setting — careful", "Einstellung für Elektriker — Vorsicht", "ajuste de electricista — precaución", "impostazione da elettricista — attenzione", "instelling voor elektricien — voorzichtig", "definição de eletricista — cuidado", "ustawienie elektryka — ostrożnie"],
    "Courant de charge": ["Charging current", "Ladestrom", "Corriente de carga", "Corrente di ricarica", "Laadstroom", "Corrente de carga", "Prąd ładowania"],
    "souhaité — le délestage peut le réduire": ["desired — load shedding may lower it", "gewünscht — der Lastabwurf kann ihn senken", "deseada — el deslastre puede reducirla", "desiderata — il distacco carichi può ridurla", "gewenst — lastafschakeling kan hem verlagen", "pretendida — o corte de carga pode reduzi-la", "żądany — odciążenie może go obniżyć"],
    "souhaité": ["desired", "gewünscht", "deseada", "desiderata", "gewenst", "pretendida", "żądany"],
    "Faites glisser la pastille, ou touchez une valeur.": ["Drag the knob, or tap a value.", "Ziehen Sie den Regler oder tippen Sie auf einen Wert.", "Arrastra el control o toca un valor.", "Trascina il cursore o tocca un valore.", "Sleep de knop of tik op een waarde.", "Arraste o cursor ou toque num valor.", "Przeciągnij suwak lub dotknij wartości."],
    "Fonctions": ["Functions", "Funktionen", "Funciones", "Funzioni", "Functies", "Funções", "Funkcje"],
    "Aucun réglage disponible.": ["No setting available.", "Keine Einstellung verfügbar.", "Ningún ajuste disponible.", "Nessuna impostazione disponibile.", "Geen instelling beschikbaar.", "Nenhuma definição disponível.", "Brak dostępnych ustawień."],
    "Limites et LED": ["Limits and LED", "Limits und LED", "Límites y LED", "Limiti e LED", "Limieten en led", "Limites e LED", "Limity i LED"],
    "Énergie totale": ["Total energy", "Gesamtenergie", "Energía total", "Energia totale", "Totale energie", "Energia total", "Energia całkowita"],
    "Sessions": ["Sessions", "Sitzungen", "Sesiones", "Sessioni", "Sessies", "Sessões", "Sesje"],
    "Temps de charge": ["Charging time", "Ladezeit", "Tiempo de carga", "Tempo di ricarica", "Laadtijd", "Tempo de carga", "Czas ładowania"],
    "Dernière session": ["Last session", "Letzte Sitzung", "Última sesión", "Ultima sessione", "Laatste sessie", "Última sessão", "Ostatnia sesja"],
    "Moyenne par session": ["Average per session", "Durchschnitt pro Sitzung", "Media por sesión", "Media per sessione", "Gemiddeld per sessie", "Média por sessão", "Średnio na sesję"],
    "Session en cours": ["Current session", "Aktuelle Sitzung", "Sesión en curso", "Sessione in corso", "Huidige sessie", "Sessão em curso", "Bieżąca sesja"],
    "Durée de la session": ["Session duration", "Sitzungsdauer", "Duración de la sesión", "Durata della sessione", "Sessieduur", "Duração da sessão", "Czas sesji"],
    "Numéro de session": ["Session number", "Sitzungsnummer", "Número de sesión", "Numero di sessione", "Sessienummer", "Número da sessão", "Numer sesji"],
    "Index d'énergie": ["Energy index", "Energiezählerstand", "Índice de energía", "Indice energia", "Energie-index", "Índice de energia", "Indeks energii"],
    "faible": ["weak", "schwach", "débil", "debole", "zwak", "fraco", "słaby"],
    "moyen": ["fair", "mittel", "medio", "medio", "redelijk", "médio", "średni"],
    "bon": ["good", "gut", "bueno", "buono", "goed", "bom", "dobry"],
    "excellent": ["excellent", "ausgezeichnet", "excelente", "eccellente", "uitstekend", "excelente", "doskonały"],
    "{n} défaut : {l}": ["{n} fault: {l}", "{n} Fehler: {l}", "{n} fallo: {l}", "{n} guasto: {l}", "{n} storing: {l}", "{n} falha: {l}", "{n} usterka: {l}"],
    "{n} défauts : {l}": ["{n} faults: {l}", "{n} Fehler: {l}", "{n} fallos: {l}", "{n} guasti: {l}", "{n} storingen: {l}", "{n} falhas: {l}", "{n} usterek: {l}"],
    "{n} contrôles OK": ["{n} checks OK", "{n} Prüfungen OK", "{n} comprobaciones OK", "{n} controlli OK", "{n} controles OK", "{n} verificações OK", "{n} kontroli OK"],
    "Signal Wi-Fi": ["Wi-Fi signal", "WLAN-Signal", "Señal Wi-Fi", "Segnale Wi-Fi", "Wifi-signaal", "Sinal Wi-Fi", "Sygnał Wi-Fi"],
    "Reconnexions Wi-Fi": ["Wi-Fi reconnections", "WLAN-Neuverbindungen", "Reconexiones Wi-Fi", "Riconnessioni Wi-Fi", "Wifi-herverbindingen", "Religações Wi-Fi", "Ponowne połączenia Wi-Fi"],
    "Adresse IP": ["IP address", "IP-Adresse", "Dirección IP", "Indirizzo IP", "IP-adres", "Endereço IP", "Adres IP"],
    "Temps de fonctionnement": ["Uptime", "Betriebszeit", "Tiempo activo", "Tempo di attività", "Uptime", "Tempo ativo", "Czas pracy"],
    "retombe à zéro si la borne redémarre": ["resets to zero if the charger restarts", "fällt auf null, wenn die Wallbox neu startet", "vuelve a cero si el cargador se reinicia", "torna a zero se la wallbox si riavvia", "valt terug naar nul als de laadpaal herstart", "volta a zero se o carregador reiniciar", "zeruje się po restarcie ładowarki"],
    "Mémoire libre": ["Free memory", "Freier Speicher", "Memoria libre", "Memoria libera", "Vrij geheugen", "Memória livre", "Wolna pamięć"],
    "Requêtes envoyées": ["Requests sent", "Gesendete Anfragen", "Peticiones enviadas", "Richieste inviate", "Verzonden verzoeken", "Pedidos enviados", "Wysłane zapytania"],
    "depuis le démarrage de Home Assistant": ["since Home Assistant started", "seit dem Start von Home Assistant", "desde el inicio de Home Assistant", "dall'avvio di Home Assistant", "sinds de start van Home Assistant", "desde o arranque do Home Assistant", "od uruchomienia Home Assistant"],
    "Échecs de communication": ["Communication failures", "Kommunikationsfehler", "Fallos de comunicación", "Errori di comunicazione", "Communicatiefouten", "Falhas de comunicação", "Błędy komunikacji"],
    "État IEC 61851": ["IEC 61851 state", "IEC-61851-Zustand", "Estado IEC 61851", "Stato IEC 61851", "IEC 61851-status", "Estado IEC 61851", "Stan IEC 61851"],
    "Courant PWM": ["PWM current", "PWM-Strom", "Corriente PWM", "Corrente PWM", "PWM-stroom", "Corrente PWM", "Prąd PWM"],
    "Courant de charge autorisé": ["Allowed charging current", "Erlaubter Ladestrom", "Corriente de carga permitida", "Corrente di ricarica consentita", "Toegestane laadstroom", "Corrente de carga permitida", "Dozwolony prąd ładowania"],
    "Courant maximal système": ["System maximum current", "Maximaler Systemstrom", "Corriente máxima del sistema", "Corrente massima di sistema", "Maximale systeemstroom", "Corrente máxima do sistema", "Maksymalny prąd systemu"],
    "Courant du programme": ["Schedule current", "Strom laut Zeitplan", "Corriente del horario", "Corrente da programma", "Stroom volgens schema", "Corrente do horário", "Prąd harmonogramu"],
    "Courant limité par la température": ["Temperature-limited current", "Temperaturbegrenzter Strom", "Corriente limitada por temperatura", "Corrente limitata dalla temperatura", "Door temperatuur beperkte stroom", "Corrente limitada pela temperatura", "Prąd ograniczony temperaturą"],
    "Courant puissance utilisateur": ["User power current", "Strom laut Benutzerleistung", "Corriente de potencia del usuario", "Corrente di potenza utente", "Stroom gebruikersvermogen", "Corrente de potência do utilizador", "Prąd mocy użytkownika"],
    "Liaison et santé": ["Link and health", "Verbindung und Zustand", "Enlace y estado", "Collegamento e stato", "Verbinding en status", "Ligação e estado", "Łączność i stan"],
    "Courants et état technique": ["Currents and technical state", "Ströme und technischer Zustand", "Corrientes y estado técnico", "Correnti e stato tecnico", "Stromen en technische status", "Correntes e estado técnico", "Prądy i stan techniczny"],
    "Photo (à la place de l'illustration)": ["Photo (instead of the illustration)", "Foto (statt der Illustration)", "Foto (en lugar de la ilustración)", "Foto (al posto dell'illustrazione)", "Foto (in plaats van de illustratie)", "Foto (em vez da ilustração)", "Zdjęcie (zamiast ilustracji)"],
    "Remplir le cadre": ["Fill the frame", "Rahmen füllen", "Rellenar el marco", "Riempi il riquadro", "Kader vullen", "Preencher o quadro", "Wypełnij ramkę"],
    "Image entière": ["Whole image", "Ganzes Bild", "Imagen completa", "Immagine intera", "Hele afbeelding", "Imagem inteira", "Cały obraz"],
    "Entité « État » de la borne": ["Charger “State” entity", "Entität „Zustand“ der Wallbox", "Entidad «Estado» del cargador", "Entità «Stato» della wallbox", "Entiteit ‘Status’ van de laadpaal", "Entidade «Estado» do carregador", "Encja „Stan” ładowarki"],
    "Délestage (si non intégré : automatisation)": ["Load shedding (if not built in: automation)", "Lastabwurf (falls nicht integriert: Automatisierung)", "Deslastre (si no está integrado: automatización)", "Distacco carichi (se non integrato: automazione)", "Lastafschakeling (indien niet ingebouwd: automatisering)", "Corte de carga (se não integrado: automatização)", "Odciążenie (jeśli nie wbudowane: automatyzacja)"],
    "Heures creuses pour le décompte (HOLM HP/HC, détectées automatiquement)": ["Off-peak hours for the countdown (HOLM HP/HC, detected automatically)", "Niedertarif für den Countdown (HOLM HP/HC, automatisch erkannt)", "Horas valle para la cuenta atrás (HOLM HP/HC, detectadas automáticamente)", "Fuori punta per il conto alla rovescia (HOLM HP/HC, rilevato automaticamente)", "Daluren voor het aftellen (HOLM HP/HC, automatisch gevonden)", "Horas de vazio para a contagem (HOLM HP/HC, detetadas automaticamente)", "Poza szczytem do odliczania (HOLM HP/HC, wykrywane automatycznie)"],
    "Onglet affiché par défaut": ["Tab shown by default", "Standardmäßig angezeigter Reiter", "Pestaña mostrada por defecto", "Scheda mostrata per impostazione predefinita", "Standaard getoond tabblad", "Separador mostrado por defeito", "Domyślna karta"],
    "Photo (médiathèque : vous pouvez y téléverser une image)": ["Photo (media library: you can upload an image there)", "Foto (Medienbibliothek: Sie können dort ein Bild hochladen)", "Foto (mediateca: puedes subir una imagen)", "Foto (libreria multimediale: puoi caricarvi un'immagine)", "Foto (mediabibliotheek: je kunt er een afbeelding uploaden)", "Foto (mediateca: pode carregar lá uma imagem)", "Zdjęcie (biblioteka multimediów: możesz tam wgrać obraz)"],
    "… ou adresse d'une image (ex. /local/borne.jpg)": ["… or an image address (e.g. /local/charger.jpg)", "… oder Bildadresse (z. B. /local/wallbox.jpg)", "… o dirección de una imagen (p. ej. /local/cargador.jpg)", "… o indirizzo di un'immagine (es. /local/wallbox.jpg)", "… of adres van een afbeelding (bv. /local/laadpaal.jpg)", "… ou endereço de uma imagem (ex. /local/carregador.jpg)", "… lub adres obrazu (np. /local/ladowarka.jpg)"],
    "Cadrage de la photo": ["Photo framing", "Bildausschnitt", "Encuadre de la foto", "Inquadratura della foto", "Uitsnede van de foto", "Enquadramento da foto", "Kadrowanie zdjęcia"],
    "Couleur de la voiture (ex. #4a5d70)": ["Car colour (e.g. #4a5d70)", "Autofarbe (z. B. #4a5d70)", "Color del coche (p. ej. #4a5d70)", "Colore dell'auto (es. #4a5d70)", "Kleur van de auto (bv. #4a5d70)", "Cor do carro (ex. #4a5d70)", "Kolor samochodu (np. #4a5d70)"],
    "Onglet Réglages": ["Settings tab", "Reiter Einstellungen", "Pestaña Ajustes", "Scheda Impostazioni", "Tabblad Instellingen", "Separador Definições", "Karta Ustawienia"],
    "Onglet Diagnostic": ["Diagnostics tab", "Reiter Diagnose", "Pestaña Diagnóstico", "Scheda Diagnostica", "Tabblad Diagnose", "Separador Diagnóstico", "Karta Diagnostyka"],
    "Choisis l'entité « État » de la borne.": ["Choose the charger's “State” entity.", "Wählen Sie die Entität „Zustand“ der Wallbox.", "Elige la entidad «Estado» del cargador.", "Scegli l'entità «Stato» della wallbox.", "Kies de entiteit ‘Status’ van de laadpaal.", "Escolha a entidade «Estado» do carregador.", "Wybierz encję „Stan” ładowarki."],
    "HOLM Borne": ["HOLM Charger", "HOLM Wallbox", "HOLM Cargador", "HOLM Wallbox", "HOLM Laadpaal", "HOLM Carregador", "HOLM Ładowarka"],
    "Borne de recharge (HOLM Lektrico…) : illustration animée, mesures, limite, actions, réglages, statistiques, diagnostic et délestage.": ["EV charger (HOLM Lektrico…): animated illustration, measurements, limit, actions, settings, statistics, diagnostics and load shedding.", "Wallbox (HOLM Lektrico…): animierte Illustration, Messwerte, Limit, Aktionen, Einstellungen, Statistik, Diagnose und Lastabwurf.", "Cargador (HOLM Lektrico…): ilustración animada, medidas, límite, acciones, ajustes, estadísticas, diagnóstico y deslastre.", "Wallbox (HOLM Lektrico…): illustrazione animata, misure, limite, azioni, impostazioni, statistiche, diagnostica e distacco carichi.", "Laadpaal (HOLM Lektrico…): geanimeerde illustratie, metingen, limiet, acties, instellingen, statistieken, diagnose en lastafschakeling.", "Carregador (HOLM Lektrico…): ilustração animada, medições, limite, ações, definições, estatísticas, diagnóstico e corte de carga.", "Ładowarka (HOLM Lektrico…): animowana ilustracja, pomiary, limit, akcje, ustawienia, statystyki, diagnostyka i odciążenie."]
  };
  let LANG = "fr", NUMLOC = "fr-FR";
  const langOf = (hass, c) => { const l = String((c && c.language) || (hass && ((hass.locale && hass.locale.language) || hass.language)) || navigator.language || "en").toLowerCase().split(/[-_]/)[0]; return l === "fr" || HOLM_LANGS.includes(l) ? l : "en"; };
  const setLang = (hass, c) => { LANG = langOf(hass, c); const p = hass && hass.locale && hass.locale.language; NUMLOC = !(c && c.language) && p && p.toLowerCase().startsWith(LANG) ? p : LOCALES[LANG]; return LANG; };
  const _ = (s, v) => { let o = LANG === "fr" ? s : ((I18N[s] && I18N[s][HOLM_LANGS.indexOf(LANG)]) || s); if (v) for (const k in v) o = o.split("{" + k + "}").join(v[k]); return o; };
  // champ « Langue » pour les éditeurs visuels (ha-form)
  const langField = () => ({ name: "language", selector: { select: { mode: "dropdown", options: [{ value: "", label: _("Automatique (profil)") }, ...Object.entries(LANG_NAMES).map(([value, label]) => ({ value, label }))] } } });
  // traduit les titres de sections et les libellés d'options d'un schéma ha-form (écrits en français)
  const locSchema = (sc) => (sc || []).map((x) => { const o = { ...x }; if (o.title) o.title = _(o.title); if (o.schema) o.schema = locSchema(o.schema);
    if (o.selector && o.selector.select && o.name !== "language") o.selector = { ...o.selector, select: { ...o.selector.select, options: (o.selector.select.options || []).map((op) => (typeof op === "string" ? op : { ...op, label: _(op.label) })) } };
    if (o.name === "language" && o.selector && o.selector.select) o.selector = { ...o.selector, select: { ...o.selector.select, options: o.selector.select.options.map((op) => (op.value ? op : { ...op, label: _("Automatique (profil)") })) } };
    return o; });
  const VERSION = "2.7.0";
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
    ["state_e_activated", "erreur_ev", _("Erreur EV"), "mdi:car-off"], ["overtemp", "limitation_thermique", _("Limitation thermique"), "mdi:thermometer-alert"],
    ["critical_temp", "surchauffe", _("Surchauffe"), "mdi:fire-alert"], ["overcurrent", "surintensite", _("Surintensité"), "mdi:current-ac"],
    ["meter_fault", "erreur_de_comptage", _("Erreur de comptage"), "mdi:meter-electric-outline"], ["undervoltage", "sous_tension", _("Sous-tension"), "mdi:flash-triangle-outline"],
    ["overvoltage", "surtension", _("Surtension"), "mdi:flash-alert"], ["rcd_error", "erreur_du_differentiel_rcd", _("Différentiel (RCD)"), "mdi:shield-alert-outline"],
    ["rcd_test_error", "echec_du_test_differentiel", _("Test du différentiel"), "mdi:shield-sync-outline"], ["cp_diode_failure", "court_circuit_de_la_diode_ev", _("Diode EV"), "mdi:led-off"],
    ["contactor_failure", "contacts_du_relais_soudes", _("Relais soudés"), "mdi:electric-switch"], ["voltage_error", "erreur_de_tension", _("Erreur de tension"), "mdi:sine-wave"],
    ["state_f_activated", "erreur_etat_f", _("Erreur état F"), "mdi:alert-octagon-outline"],
  ];
const _T = (o) => new Proxy(o, { get: (t, k) => { const v = t[k]; return typeof v === "string" ? _(v) : v && typeof v === "object" ? _T(v) : v; } });
  const STATES_RAW = {
    available: { l: _("Libre"), d: _("Prête, aucun véhicule branché"), rgb: "120,170,210", icon: "mdi:ev-station", fx: "idle" },
    connected: { l: _("Véhicule branché"), d: _("Branché, en attente de charge"), rgb: "80,160,255", icon: "mdi:ev-plug-type2", fx: "plug" },
    charging: { l: _("En charge"), d: "", rgb: "62,207,142", icon: "mdi:battery-charging-high", fx: "charge" },
    paused: { l: _("En pause"), d: _("Charge suspendue"), rgb: "255,184,64", icon: "mdi:pause-circle-outline", fx: "plug" },
    paused_by_scheduler: { l: _("En pause (programme)"), d: _("Attend le créneau programmé"), rgb: "255,184,64", icon: "mdi:calendar-clock", fx: "plug" },
    need_auth: { l: _("Authentification"), d: _("Badge ou validation requise"), rgb: "176,132,255", icon: "mdi:card-account-details-outline", fx: "plug" },
    locked: { l: _("Verrouillée"), d: _("Aucune charge possible"), rgb: "150,160,178", icon: "mdi:lock", fx: "idle" },
    error: { l: _("Erreur"), d: _("Voir le diagnostic"), rgb: "255,90,95", icon: "mdi:alert-octagon", fx: "error" },
    updating_firmware: { l: _("Mise à jour"), d: _("Mise à jour du micrologiciel"), rgb: "90,210,230", icon: "mdi:update", fx: "idle" },
  };
  const STATES = _T(STATES_RAW);
  const REASON_RAW = {
    no_limit: _("Aucune limite"), installation_current: _("Courant de l'installation"), user_limit: _("Limite utilisateur"), dynamic_limit: _("Limite dynamique"),
    schedule: _("Programme de charge"), em_offline: _("Compteur hors ligne"), em: _("Compteur d'énergie"), ocpp: "OCPP", overtemperature: _("Température"),
    switching_phases: _("Bascule de phases"), "1p_charging_disabled": _("Charge monophasée désactivée"),
  };
  const REASON = _T(REASON_RAW);
  const TABS = _T([["charge", "mdi:ev-station", _("Charge")], ["settings", "mdi:tune-variant", _("Réglages")], ["stats", "mdi:chart-box-outline", _("Statistiques")], ["diag", "mdi:stethoscope", _("Diagnostic")]]);
  const OPT_TTL = 12000;
  const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const fmtN = (v, d = 0) => Number(v).toLocaleString(NUMLOC, { minimumFractionDigits: d, maximumFractionDigits: d });
  const num = (s) => (s && !["unknown", "unavailable", ""].includes(s.state) && !isNaN(parseFloat(s.state)) ? parseFloat(s.state) : null);
  const fmtDur = (sec) => {
    if (sec == null) return "–";
    sec = Math.round(sec);
    const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60);
    return h ? `${h} h ${String(m).padStart(2, "0")}` : m ? `${m} min` : `${sec} s`;
  };
  const fmtHours = (h) => (h == null ? "–" : h >= 48 ? _("{n} j", { n: fmtN(h / 24, 1) }) : h >= 1 ? `${fmtN(h, 1)} h` : `${fmtN(h * 60)} min`);

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
      if (!config || !config.entity) throw new Error(_("Choisis l'entité « État » de la borne."));
      this._config = { show_diagnostic: true, show_settings: true, car_color: "#4a5d70", default_tab: "charge", ...config };
      this._e = null; this._imgKey = null; this._imgShown = null; this._opt = {}; this._confirm = null; this._tab = this._config.default_tab;
      if (!this.shadowRoot) this.attachShadow({ mode: "open" });
      this._built = false;
      if (this._hass) this.hass = this._hass;
    }
    connectedCallback() {
      clearInterval(this._tick);
      // le décompte des heures creuses avance même si aucune entité ne change
      this._tick = setInterval(() => { if (this._built && this._hass && this._tab === "charge" && !this._drag) this._render(); }, 30000);
    }
    disconnectedCallback() { clearInterval(this._tick); this._tick = null; }
    getCardSize() { return 10; }
    getGridOptions() { return { columns: 12, min_columns: 6, rows: "auto" }; }

    set hass(hass) {
      this._hass = hass;
      if (!this._config) return;
      { const _l = setLang(hass, this._config); if (this._lang && _l !== this._lang) this._built = false; this._lang = _l; }
      if (!this._e) this._detect();
      if (!this._built) this._build();
      this._resolveImg();
      this._render();
    }
    // photo : média de la médiathèque (résolu en URL signée) ou adresse directe
    _resolveImg() {
      const m = this._config.image_media, id = m && m.media_content_id;
      if (!id) { this._img = null; this._imgKey = null; return; }
      if (this._imgKey === id) return;
      this._imgKey = id;
      this._hass.callWS({ type: "media_source/resolve_media", media_content_id: id, expires: 86400 })
        .then((r) => { this._img = r.url.startsWith("http") ? r.url : this._hass.hassUrl(r.url); this._render(); })
        .catch(() => { this._img = null; });
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

    // ---- heures creuses (HOLM HP/HC) ----
    // entité : option de la carte, sinon celle du pilotage HOLM Lektrico, sinon binary_sensor exposant prochaine_bascule
    _hcEnt() {
      const h = this._hass, ok = (id) => { const s = id && h.states[id]; return !!s && s.attributes.prochaine_bascule !== undefined; };
      if (this._config.hc_entity) return ok(this._config.hc_entity) ? this._config.hc_entity : null;
      const fromPilot = this._s("pilot")?.attributes?.entite_heures_creuses;
      if (ok(fromPilot)) return fromPilot;
      if (ok(this._hcAuto)) return this._hcAuto;
      this._hcAuto = ok("binary_sensor.heures_creuses") ? "binary_sensor.heures_creuses"
        : Object.keys(h.states).find((k) => k.startsWith("binary_sensor.") && h.states[k].attributes.prochaine_bascule !== undefined && h.states[k].attributes.prochaine_periode !== undefined) || null;
      return this._hcAuto;
    }
    _hcLine() {
      const id = this._hcEnt(); if (!id) return "";
      const s = this._hass.states[id], a = s.attributes;
      if (!["on", "off"].includes(s.state)) return "";
      const on = s.state === "on", next = a.prochaine_bascule ? new Date(a.prochaine_bascule) : null;
      if (!next || isNaN(next)) return "";
      const now = new Date(), min = Math.max(0, Math.round((next - now) / 60000));
      const hm = next.toLocaleTimeString(NUMLOC, { hour: "2-digit", minute: "2-digit" }).replace(":", "h");
      const day = next.toDateString() === now.toDateString() ? "" : new Date(now.getTime() + 864e5).toDateString() === next.toDateString() ? _("demain ") : next.toLocaleDateString(NUMLOC, { weekday: "long" }) + " ";
      const dur = min >= 60 ? `${Math.floor(min / 60)} h ${String(min % 60).padStart(2, "0")}` : `${min} min`;
      const txt = on ? _("Heures creuses jusqu'à <b>{t}</b>", { t: day + hm }) : _("Heures creuses dans <b>{d}</b> <small>(à {t})</small>", { d: dur, t: day + hm });
      const t = Number(a.tarif), tarif = isFinite(t) && a.tarif != null ? `<em>${on ? _("HC") : _("HP")} · ${fmtN(t, 4)} €/kWh</em>` : "";
      return `<div class="hcd${on ? " on" : ""}" data-more="${esc(id)}"><ha-icon icon="${on ? "mdi:weather-night" : "mdi:timer-sand"}"></ha-icon><span>${txt}</span>${tarif}</div>`;
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
            <button class="dl" id="dl" title="${_("Délestage")}"><ha-icon icon="mdi:transmission-tower-export"></ha-icon><span id="dltxt">${_("Délestage")}</span></button>
          </div>
          <div class="hero" id="hero">${ILLU}<div class="photo" id="photo"><i class="pglow"></i><i class="pbar"></i></div><div class="big"><b id="pw">–</b><small>kW</small></div><div class="sub" id="sub"></div></div>
          <div class="tabs" id="tabs">${TABS.map(([k, i, l]) => `<button data-tab="${k}"><ha-icon icon="${i}"></ha-icon><span>${l}</span><i class="badge-dot" id="tb-${k}"></i></button>`).join("")}</div>
          <div class="pane" id="pane"></div>
        </div>
        <div class="na" id="na">${_("Borne indisponible")}</div>
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
      // Curseurs protégés contre les gestes involontaires : il faut saisir la pastille et la faire glisser
      // horizontalement. Un toucher sur la piste ou un défilement vertical de la page ne change rien.
      const show = (r) => {
        const out = r.closest(".srow")?.querySelector("output"); if (out) out.innerHTML = this._fmtNum(r.dataset.num, +r.value);
        const fill = r.parentElement.querySelector(".fill"); if (fill) fill.style.width = `${((r.value - r.min) / (r.max - r.min)) * 100}%`;
      };
      const valAt = (r, x) => {
        const b = r.getBoundingClientRect(), mn = +r.min, mx = +r.max, st = +r.step || 1;
        const f = Math.max(0, Math.min(1, (x - b.left - 11) / Math.max(1, b.width - 22)));
        return Math.round((mn + f * (mx - mn)) / st) * st;
      };
      const thumbX = (r) => { const b = r.getBoundingClientRect(); return b.left + 11 + ((+r.value - +r.min) / ((+r.max - +r.min) || 1)) * (b.width - 22); };
      let g = null;
      card.addEventListener("pointerdown", (ev) => {
        const sl = ev.target.closest(".slider"); if (!sl) return;
        const r = sl.querySelector("input[data-num]"); if (!r || r.disabled) return;
        if (Math.abs(ev.clientX - thumbX(r)) > 24) return;          // pas sur la pastille : on ignore
        g = { r, sl, id: ev.pointerId, x0: ev.clientX, y0: ev.clientY, active: false, v0: r.value };
      });
      card.addEventListener("pointermove", (ev) => {
        if (!g || ev.pointerId !== g.id) return;
        const dx = Math.abs(ev.clientX - g.x0), dy = Math.abs(ev.clientY - g.y0);
        if (!g.active) {
          if (dy > 8 && dy > dx) { g = null; return; }               // défilement de la page
          if (dx < 8) return;
          g.active = true; this._drag = g.r.dataset.num;
          try { g.sl.setPointerCapture(ev.pointerId); } catch (e) { /* rien */ }
        }
        ev.preventDefault();
        g.r.value = valAt(g.r, ev.clientX); show(g.r);
      });
      const end = (ev, commit) => {
        if (!g || (ev && ev.pointerId !== g.id)) return;
        const { r, active, v0 } = g; g = null;
        if (!active) return;
        this._drag = null;
        if (!commit || String(r.value) === String(v0)) { r.value = v0; show(r); return; }
        const id = this._e[r.dataset.num]; if (!id) return;
        this._opt[r.dataset.num] = { v: Number(r.value), ts: Date.now() };
        this._call("number", "set_value", { entity_id: id, value: Number(r.value) });
      };
      card.addEventListener("pointerup", (ev) => end(ev, true));
      card.addEventListener("pointercancel", (ev) => end(ev, false));
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
      if (k === "led_delay") return v ? `${fmtN(v)} s` : _("jamais");
      if (k === "limit" && v === 0) return _("0 A · pause");
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
      setLang(this._hass, this._config);
      const h = this._hass, cfg = this._config, $ = this.$;
      const so = this._s("state"), card = this._card;
      const unav = !so || so.state === "unavailable" || so.state === "unknown";
      card.classList.toggle("unav", unav);
      $("name").textContent = cfg.name || (so && so.attributes.friendly_name ? so.attributes.friendly_name.replace(/\s*(État|Etat|State)$/i, "") : _("Borne de recharge"));
      card.style.setProperty("--car", cfg.car_color);
      const img = this._img || cfg.image || "";
      $("hero").classList.toggle("hasimg", !!img);
      if (img && this._imgShown !== img) { $("photo").style.backgroundImage = `url("${String(img).replace(/"/g, "%22")}")`; this._imgShown = img; }
      $("photo").style.backgroundSize = cfg.image_fit === "contain" ? "contain" : "cover";
      if (unav) { $("status").textContent = _("Indisponible"); return; }
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
        $("dltxt").textContent = on ? _("Délestage actif") : _("Délestage coupé");
        $("dl").querySelector("ha-icon").setAttribute("icon", on ? "mdi:transmission-tower-export" : "mdi:transmission-tower-off");
      }
      $("pw").textContent = pw != null ? fmtN(pw, pw < 10 ? 2 : 1) : "–";
      $("sub").textContent = charging ? (en != null ? _("{e} kWh rechargés · {t}", { e: fmtN(en, 2), t: fmtDur(tm) }) : "") : st.d;
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
        this._stat("current", "mdi:current-ac", _("Courant"), cur != null ? `${fmtN(cur, 1)} A` : "–", charging),
        this._stat("voltage", "mdi:sine-wave", _("Tension"), volt != null ? `${fmtN(volt)} V` : "–"),
        this._stat("energy", "mdi:battery-plus-variant", _("Session"), en != null ? `${fmtN(en, 2)} kWh` : "–", charging),
        this._stat("time", "mdi:timer-outline", _("Durée"), fmtDur(tm), charging),
        this._stat("temp", "mdi:thermometer", _("Température"), tp != null ? `${fmtN(Math.round(tp))} °C` : "–", tp != null && tp >= 60),
        this._stat("user_power", "mdi:flash", _("Puiss. max"), upw != null ? `${fmtN(upw / 1000, 2)} kW` : "–"),
      ].join("");
      // limite
      let lim = "";
      if ((this._e.limit && this._ok("limit")) || (this._e.mode && this._s("mode"))) {
        const rs = this._s("reason"), r = rs ? rs.state : null;
        const dlS = this._dlId() ? this._hass.states[this._dlId()] : null;
        const chips = [
          ["allowed", _("Autorisé"), this._n("allowed")], ["user_limit", _("Utilisateur"), this._n("user_limit")],
          ["upow_cur", _("Puissance max"), this._n("upow_cur")], ["install", _("Installation"), this._n("install")],
        ].filter(([, , v]) => v != null).map(([k, l, v]) => `<button class="chip" data-more="${k}"><small>${l}</small><b>${fmtN(v)} A</b><small class="kw">${this._kw(v)}</small></button>`).join("");
        if (this._e.mode && this._s("mode")) {
          const ms = this._s("mode"), mode = this._optv("mode", ms.state);
          const MODES = [["heures_creuses", "mdi:weather-night", _("Heures creuses")], ["maintenant", "mdi:flash", _("Maintenant")], ["arret", "mdi:stop-circle-outline", _("Arrêt")]];
          const ps = this._s("pilot"), applied = this._n("limit"), ca = this._optv("charge_a", this._n("charge_a"));
          const mx = Number(this._s("charge_a")?.attributes?.max ?? 32);
          const pre = [6, 10, 16, 20, 25, 32].filter((a) => a <= mx);
          lim = `<div class="block lim pilot${r && r !== "no_limit" ? " capped" : ""}">
            <div class="modes">${MODES.map(([k, ic, l]) => `<button class="md${mode === k ? " on" : ""}" data-mode="${k}"><ha-icon icon="${ic}"></ha-icon><span>${l}</span></button>`).join("")}</div>
            <div class="pst" data-more="pilot"><ha-icon icon="mdi:robot-outline"></ha-icon><span>${ps ? esc(ps.state) : ""}</span>${applied != null ? `<b>${applied ? `${fmtN(applied)} A · ${this._kw(applied)}` : _("pause")}</b>` : ""}</div>
            ${mode === "heures_creuses" ? this._hcLine() : ""}
            ${mode !== "arret" && this._e.charge_a && ca != null ? `<button class="cwant" data-tab="settings" title="${_("Modifier dans l'onglet Réglages")}"><ha-icon icon="mdi:current-ac"></ha-icon><span>${_("Courant de charge souhaité")}</span><b>${fmtN(ca)} A · ${this._kw(ca)}</b><ha-icon class="go" icon="mdi:tune-variant"></ha-icon></button>` : ""}
            <div class="reason" data-more="reason">${r ? _("Raison de la limite : <b>{r}</b>", { r: esc(REASON[r] || r) }) : ""}</div>
            <div class="chips">${chips}</div></div>`;
        } else {
        const auto = !!dlS && this._optv("dl", dlS.state) === "on";
        const curLim = this._optv("limit", this._n("limit"));
        const presets = auto ? "" : `<div class="presets">${[6, 10, 16, 20, 25, 32].map((a) =>
          `<button class="pre${curLim === a ? " on" : ""}" data-preset="${a}"><b>${a} A</b><small>${this._kw(a)}</small></button>`).join("")}</div>`;
        lim = `<div class="block lim${r && r !== "no_limit" ? " capped" : ""}">
          ${this._slider("limit", auto ? "mdi:robot-outline" : "mdi:hand-back-right-outline", _("Limite de charge"),
            auto ? _("pilotée par le délestage — coupez-le pour régler à la main") : _("réglage manuel"), auto)}
          <div class="scale"><span>${_("0 · pause")}</span><span>6</span><span>16</span><span>32 A</span></div>
          ${presets}
          <div class="reason" data-more="reason">${r ? _("Raison de la limite : <b>{r}</b>", { r: esc(REASON[r] || r) }) : ""}</div>
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
        canStop ? act("stop", "mdi:stop-circle-outline", _("Arrêter"), "pri stop") : act("start", "mdi:play-circle-outline", _("Démarrer"), "pri", !canStart),
        paused ? act("resume", "mdi:play-pause", _("Reprendre"), "", false) : act(_("pause"), "mdi:pause-circle-outline", _("Pause"), "", s !== "charging"),
        act("override", "mdi:calendar-fast", _("Dérogation"), "", !["paused_by_scheduler", "connected"].includes(s)),
        this._e.reboot ? `<button class="act warn${conf ? " confirm" : ""}" data-reboot><ha-icon icon="mdi:restart"></ha-icon><span>${conf ? _("Confirmer ?") : _("Redémarrer")}</span></button>` : "",
      ].join("");
      return `<div class="stats">${stats}</div>${lim}<div class="acts">${acts}</div>`;
    }

    // ---------- onglet Réglages ----------
    _settings() {
      const t = [
        this._switch("auth", "mdi:card-account-details-outline", _("Authentification"), _("Badge ou appli requis"), _("Démarrage automatique")),
        this._switch("lock", "mdi:lock-outline", _("Verrou"), _("Charge impossible"), _("Déverrouillée")),
        this._switch("schedule", "mdi:calendar-clock", _("Programme de charge"), _("Activé"), _("Désactivé")),
        this._switch("buzzer", "mdi:volume-high", _("Buzzer"), _("Sons activés"), _("Silencieux")),
        this._switch("auto_update", "mdi:update", _("Mise à jour auto."), _("Activée"), _("Manuelle")),
        this._switch("wifi_reset", "mdi:wifi-refresh", _("Redémarrage si Wi-Fi perdu"), _("Activé"), _("Désactivé")),
        this._switch("energy_mgmt", "mdi:transmission-tower", _("Gestion d'énergie"), _("Activée"), _("Désactivée")),
        this._switch("led_tpl", "mdi:palette", _("Couleurs LED perso."), _("Activées"), _("Désactivées")),
        this._switch("pwm_precise", "mdi:sine-wave", _("PWM précis"), _("Activé"), _("Désactivé")),
        this._switch("mqtt", "mdi:lan-connect", "MQTT", _("Activé"), _("Désactivé")),
      ].join("");
      const sl = [
        this._slider("user_limit", "mdi:account-cog", _("Limite utilisateur"), _("courant maximal choisi")),
        this._slider("user_power", "mdi:flash", _("Puissance maximale"), _("la borne ne dépasse pas cette puissance")),
        this._slider("car_min", "mdi:car-electric", _("Courant minimal du véhicule")),
        this._slider("led", "mdi:brightness-6", _("Luminosité de la LED")),
        this._slider("led_delay", "mdi:timer-sand", _("Atténuation de la LED"), _("après ce délai")),
        this._slider("install_set", "mdi:home-lightning-bolt", _("Courant d'installation"), _("réglage électricien — prudence")),
      ].join("");
      // courant de charge souhaité (pilotage HOLM Lektrico) : ici plutôt que dans l'onglet Charge, à l'abri des touchers involontaires
      let want = "";
      if (this._e.charge_a && this._ok("charge_a")) {
        const ca = this._optv("charge_a", this._n("charge_a")), mx = Number(this._s("charge_a")?.attributes?.max ?? 32);
        const dlS = this._dlId() ? this._hass.states[this._dlId()] : null;
        want = `<div class="sec">${_("Courant de charge")}</div><div class="block lim pilot">
          ${this._slider("charge_a", "mdi:current-ac", _("Courant de charge"), dlS && this._optv("dl", dlS.state) === "on" ? _("souhaité — le délestage peut le réduire") : _("souhaité"))}
          <div class="presets">${[6, 10, 16, 20, 25, 32].filter((a) => a <= mx).map((a) => `<button class="pre${ca === a ? " on" : ""}" data-preset="${a}" data-pk="charge_a"><b>${a} A</b><small>${this._kw(a)}</small></button>`).join("")}</div>
          <div class="hint">${_("Faites glisser la pastille, ou touchez une valeur.")}</div></div>`;
      }
      return `${want}<div class="sec">${_("Fonctions")}</div><div class="tgrid">${t || `<div class="muted">${_("Aucun réglage disponible.")}</div>`}</div>
        ${sl ? `<div class="sec">${_("Limites et LED")}</div><div class="block">${sl}</div>` : ""}`;
    }

    // ---------- onglet Statistiques ----------
    _stats() {
      const tot = this._n("total"), sess = this._n("sessions"), tt = this._n("total_time"), last = this._n("last_session");
      const avg = tot != null && sess ? tot / sess : null;
      const tiles = [
        this._stat("total", "mdi:counter", _("Énergie totale"), tot != null ? `${fmtN(tot, tot < 100 ? 1 : 0)} kWh` : "–"),
        this._stat("sessions", "mdi:numeric", _("Sessions"), sess != null ? fmtN(sess) : "–"),
        this._stat("total_time", "mdi:timer-sand-complete", _("Temps de charge"), fmtHours(tt)),
        this._stat("last_session", "mdi:history", _("Dernière session"), last != null ? `${fmtN(last, 2)} kWh` : "–"),
      ].join("");
      const rows = [
        avg != null ? `<div class="row static"><ha-icon icon="mdi:approximately-equal"></ha-icon><span class="rl">${_("Moyenne par session")}</span><b>${fmtN(avg, 2)} kWh</b></div>` : "",
        this._row("energy", "mdi:battery-plus-variant", _("Session en cours"), this._v("energy", (v) => `${fmtN(v, 2)} kWh`)),
        this._row("time", "mdi:timer-outline", _("Durée de la session"), fmtDur(this._n("time"))),
        this._row("session_id", "mdi:pound", _("Numéro de session"), this._v("session_id", (v) => fmtN(v))),
        this._row("energy_index", "mdi:meter-electric", _("Index d'énergie"), this._v("energy_index", (v) => `${fmtN(v, 2)} kWh`)),
      ].join("");
      return `<div class="stats four">${tiles}</div><div class="block list">${rows}</div>`;
    }

    // ---------- onglet Diagnostic ----------
    _diag(so, st, bad) {
      const h = this._hass;
      const rssi = this._n("rssi");
      const bars = rssi == null ? 0 : rssi >= -55 ? 4 : rssi >= -65 ? 3 : rssi >= -75 ? 2 : 1;
      const wifiQ = rssi == null ? "" : _(["", _("faible"), _("moyen"), _("bon"), _("excellent")][bars]);
      const up = this._n("uptime");
      const sumTxt = bad.length ? _(bad.length > 1 ? _("{n} défauts : {l}") : _("{n} défaut : {l}"), { n: bad.length, l: bad.map((x) => _(x.label)).join(", ") }) : _("{n} contrôles OK", { n: this._e.diag.length });
      const faults = this._e.diag.map((d) => {
        const ko = h.states[d.id] && h.states[d.id].state === "on";
        return `<button class="fchip${ko ? " ko" : ""}" data-more="${d.id}"><ha-icon icon="${ko ? d.icon : "mdi:check-circle"}"></ha-icon><span>${_(d.label)}</span></button>`;
      }).join("");
      const health = [
        this._row("rssi", `mdi:wifi-strength-${bars || "off"}`, _("Signal Wi-Fi"), rssi != null ? `${fmtN(rssi)} dBm` : "–", wifiQ),
        this._row("reconnects", "mdi:wifi-refresh", _("Reconnexions Wi-Fi"), this._v("reconnects", (v) => fmtN(v))),
        this._row("ip", "mdi:ip-network-outline", _("Adresse IP"), esc(this._s("ip")?.state ?? "–")),
        this._row("uptime", "mdi:clock-check-outline", _("Temps de fonctionnement"), fmtHours(up), _("retombe à zéro si la borne redémarre")),
        this._row("heap", "mdi:memory", _("Mémoire libre"), this._v("heap", (v) => `${fmtN(v)} Kio`)),
        this._row("requests", "mdi:swap-vertical", _("Requêtes envoyées"), this._v("requests", (v) => fmtN(v)), _("depuis le démarrage de Home Assistant")),
        this._row("failures", "mdi:lan-disconnect", _("Échecs de communication"), this._v("failures", (v) => fmtN(v)), "", this._n("failures") ? "warnrow" : ""),
      ].join("");
      const tech = [
        this._row("iec", "mdi:ev-plug-type2", _("État IEC 61851"), esc(this._s("iec")?.state ?? "–")),
        this._row("pwm", "mdi:pulse", _("Courant PWM"), this._v("pwm", (v) => `${fmtN(v)} A`)),
        this._row("allowed", "mdi:current-ac", _("Courant de charge autorisé"), this._v("allowed", (v) => `${fmtN(v)} A`)),
        this._row("sysmax", "mdi:arrow-collapse-up", _("Courant maximal système"), this._v("sysmax", (v) => `${fmtN(v)} A`)),
        this._row("sched_cur", "mdi:calendar-clock", _("Courant du programme"), this._v("sched_cur", (v) => `${fmtN(v)} A`)),
        this._row("temp_cur", "mdi:thermometer-lines", _("Courant limité par la température"), this._v("temp_cur", (v) => `${fmtN(v)} A`)),
        this._row("upow_cur", "mdi:flash-outline", _("Courant puissance utilisateur"), this._v("upow_cur", (v) => `${fmtN(v)} A`)),
        this._row("install", "mdi:home-lightning-bolt-outline", _("Courant de l'installation"), this._v("install", (v) => `${fmtN(v)} A`)),
      ].join("");
      return `<div class="diagsum${bad.length ? " bad" : ""}"><ha-icon icon="${bad.length ? "mdi:alert-circle" : "mdi:shield-check"}"></ha-icon><span>${sumTxt}</span></div>
        <div class="fgrid">${faults}</div>
        ${health ? `<div class="sec">${_("Liaison et santé")}</div><div class="block list">${health}</div>` : ""}
        ${tech ? `<div class="sec">${_("Courants et état technique")}</div><div class="block list">${tech}</div>` : ""}`;
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
      .photo { display: none; position: relative; aspect-ratio: 2 / 1; border-radius: 16px; overflow: hidden; background: center / cover no-repeat rgba(255,255,255,.03);
        box-shadow: inset 0 0 0 1px rgba(255,255,255,.07); transition: box-shadow .6s; }
      .hero.hasimg .illu { display: none; } .hero.hasimg .photo { display: block; }
      .photo::before { content: ""; position: absolute; inset: 0; background: linear-gradient(180deg, rgba(0,0,0,.55) 0%, rgba(0,0,0,0) 38%, rgba(0,0,0,0) 70%, rgba(0,0,0,.45) 100%); }
      .pglow { position: absolute; inset: 0; border-radius: inherit; opacity: 0; box-shadow: inset 0 0 0 2px rgba(var(--m), .85), inset 0 0 28px rgba(var(--m), .55); transition: opacity .6s; }
      .pbar { position: absolute; left: 0; right: 0; bottom: 0; height: 5px; opacity: 0; transition: opacity .6s;
        background: repeating-linear-gradient(90deg, rgba(var(--m), .25) 0 14px, rgba(var(--m), 1) 14px 28px); background-size: 56px 100%; filter: drop-shadow(0 0 6px rgba(var(--m), .9)); }
      ha-card[data-fx="plug"] .pbar { opacity: .45; }
      ha-card[data-fx="error"] .pglow { opacity: 1; animation: blink 1s steps(2) infinite; }
      ha-card.active .pglow { opacity: 1; animation: pglow 2.4s ease-in-out infinite; }
      ha-card.active .pbar { opacity: 1; animation: pbar var(--flow) linear infinite; }
      @keyframes pglow { 50% { opacity: .35; } }
      @keyframes pbar { to { background-position: 56px 0; } }
      ha-card[data-fx="idle"] .photo { filter: saturate(.75) brightness(.85); }
      .hero.hasimg .big { left: 16px; top: 10px; }
      .hero.hasimg .big b { text-shadow: 0 2px 10px rgba(0,0,0,.7), 0 0 18px rgba(var(--m), .6); }
      .hero.hasimg .sub { margin-top: 8px; }
      @media (prefers-reduced-motion: reduce) { .pglow, .pbar { animation: none !important; } }
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
      .hcd { display: flex; align-items: center; gap: 8px; padding: 8px 10px; border-radius: 10px; background: rgba(120,140,255,.08); border: 1px solid rgba(120,140,255,.18); font-size: 12.5px; color: var(--tx2); margin: -2px 0 8px; cursor: pointer; flex-wrap: wrap; }
      .hcd.on { background: rgba(62,207,142,.08); border-color: rgba(62,207,142,.22); }
      .hcd ha-icon { --mdc-icon-size: 16px; color: #8f9bff; } .hcd.on ha-icon { color: #3ecf8e; }
      .hcd span { flex: 1; min-width: 0; } .hcd b { color: var(--tx); font-variant-numeric: tabular-nums; } .hcd small { opacity: .75; }
      .hcd em { font-style: normal; white-space: nowrap; font-variant-numeric: tabular-nums; font-size: 11.5px; padding: 2px 8px; border-radius: 999px; background: rgba(255,255,255,.06); color: var(--tx); }
      .pst ha-icon { --mdc-icon-size: 16px; color: rgb(var(--m)); } .pst span { flex: 1; min-width: 0; } .pst b { color: var(--tx); white-space: nowrap; font-variant-numeric: tabular-nums; }
      @container (max-width: 430px) { .md span { font-size: 12px; } .md ha-icon { display: none; } }
      .pre { display: flex; flex-direction: column; align-items: center; padding: 6px 2px; border-radius: 10px; border: 1px solid rgba(255,255,255,.08); background: rgba(255,255,255,.04); color: var(--tx); cursor: pointer; font: inherit; }
      .cwant { display: flex; align-items: center; gap: 8px; width: 100%; padding: 9px 10px; margin-bottom: 8px; border-radius: 10px; background: rgba(255,255,255,.04); font-size: 12.5px; color: var(--tx2); cursor: pointer; }
      .cwant ha-icon { --mdc-icon-size: 16px; color: rgb(var(--m)); } .cwant span { flex: 1; } .cwant b { color: var(--tx); font-variant-numeric: tabular-nums; }
      .cwant .go { color: var(--tx2); opacity: .7; }
      .hint { font-size: 11px; color: var(--tx2); margin-top: 6px; opacity: .8; }
      .pre b { font-size: 12.5px; } .pre small { font-size: 9.5px; color: var(--tx2); }
      .pre.on { background: rgba(var(--m), .22); border-color: rgba(var(--m), .6); }
      .track { position: absolute; left: 0; right: 0; top: 50%; height: 8px; transform: translateY(-50%); border-radius: 4px; background: rgba(255,255,255,.08); }
      .fill { position: absolute; left: 0; top: 0; bottom: 0; border-radius: 4px; background: linear-gradient(90deg, rgba(var(--m), .5), rgb(var(--m))); box-shadow: 0 0 10px rgba(var(--m), .45); }
      input[type=range] { position: absolute; inset: 0; width: 100%; margin: 0; background: transparent; -webkit-appearance: none; appearance: none; cursor: pointer; pointer-events: none; }
      .slider { touch-action: pan-y; cursor: grab; }
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
    set hass(hass) { this._hass = hass; const _l = setLang(hass, this._config); if (this._form && _l !== this._lang) { this._form.remove(); this._form = null; } this._lang = _l; this._render(); }
    connectedCallback() { this._render(); }
    _data() { return { show_diagnostic: true, show_settings: true, car_color: "#4a5d70", default_tab: "charge", ...this._config }; }
    _render() {
      if (!this._hass || !this._config) return;
      if (!this._form) {
        const f = document.createElement("ha-form");
        f.schema = [
          langField(),
          { name: "entity", required: true, selector: { entity: { domain: "sensor" } } },
          { name: "name", selector: { text: {} } },
          { name: "delestage_entity", selector: { entity: { domain: ["automation", "input_boolean", "switch"] } } },
          { name: "hc_entity", selector: { entity: { domain: "binary_sensor" } } },
          { type: "expandable", title: _("Photo (à la place de l'illustration)"), icon: "mdi:image", flatten: true, schema: [
            { name: "image_media", selector: { media: { accept: ["image/*"] } } },
            { name: "image", selector: { text: {} } },
            { name: "image_fit", selector: { select: { mode: "dropdown", options: [{ value: "cover", label: _("Remplir le cadre") }, { value: "contain", label: _("Image entière") }] } } },
          ] },
          { type: "grid", name: "", schema: [
            { name: "default_tab", selector: { select: { mode: "dropdown", options: [{ value: "charge", label: _("Charge") }, { value: "settings", label: _("Réglages") }, { value: "stats", label: _("Statistiques") }, { value: "diag", label: _("Diagnostic") }] } } },
            { name: "car_color", selector: { text: {} } },
          ] },
          { type: "grid", name: "", schema: [
            { name: "show_settings", selector: { boolean: {} } },
            { name: "show_diagnostic", selector: { boolean: {} } },
          ] },
        ];
        const L = { language: _("Langue"), entity: _("Entité « État » de la borne"), name: _("Nom affiché"), delestage_entity: _("Délestage (si non intégré : automatisation)"), hc_entity: _("Heures creuses pour le décompte (HOLM HP/HC, détectées automatiquement)"),
          default_tab: _("Onglet affiché par défaut"), image_media: _("Photo (médiathèque : vous pouvez y téléverser une image)"), image: _("… ou adresse d'une image (ex. /local/borne.jpg)"), image_fit: _("Cadrage de la photo"), car_color: _("Couleur de la voiture (ex. #4a5d70)"), show_settings: _("Onglet Réglages"), show_diagnostic: _("Onglet Diagnostic") };
        f.computeLabel = (s) => L[s.name] || s.name;
        f.addEventListener("value-changed", (ev) => {
          ev.stopPropagation(); this._config = { ...ev.detail.value }; this._self = true;
          if (this._config.image_media && !this._config.image_media.media_content_id) delete this._config.image_media;
          for (const k of ["image", "image_fit", "hc_entity", "language"]) if (!this._config[k]) delete this._config[k];
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
    setLang(document.querySelector("home-assistant")?.hass);
    window.customCards.push({ type: "holm-borne-card", name: _("HOLM Borne"), description: _("Borne de recharge (HOLM Lektrico…) : illustration animée, mesures, limite, actions, réglages, statistiques, diagnostic et délestage."), preview: true });
  }
  console.info(`%c HOLM-BORNE-CARD %c v${VERSION} `, "background:#3ecf8e;color:#08130e;font-weight:700", "background:#1b2633;color:#fff");
})();
