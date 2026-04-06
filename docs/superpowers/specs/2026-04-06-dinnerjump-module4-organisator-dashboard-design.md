# Module 4: Organisator Dashboard — Design Spec

## Context

DinnerJump Module 1-3 zijn compleet: website met registratie/betaling, matching-algoritme met drag-drop board, en een native companion app met reveal-systeem. Wat ontbreekt is een centraal dashboard voor de organisator om events te beheren, deelnemers te overzien, berichten te sturen, en de indeling goed te keuren. De bestaande manage-pagina (`/events/[slug]/manage`) wordt geïntegreerd in dit dashboard.

**Aanpak:** Functionaliteit eerst met basis Tailwind styling. Design-pass over de hele app (Module 1-4) volgt later als apart traject.

## Architectuur

### Routes

```
/[locale]/organizer                    → Events overzicht
/[locale]/organizer/[slug]             → Event detail dashboard (scrollbare pagina met 8 blokken)
```

De bestaande `/[locale]/events/[slug]/manage` pagina wordt vervangen door het event detail dashboard. Een redirect van de oude URL naar de nieuwe is wenselijk.

### Toegang

Alleen de `organizer_id` van een event heeft toegang tot het dashboard van dat event. Het events overzicht toont alleen events waar de ingelogde gebruiker organisator van is.

## Events Overzicht (`/organizer`)

Persoonlijke landingspagina met:

- **Begroeting:** "Hallo [display_name]," + subtekst "Hieronder staan de DinnerJump events die je hebt georganiseerd."
- **"+ Nieuw Event" button** rechtsboven naast de begroeting
- **Event cards** gesorteerd op datum (nieuwste eerst):
  - **Actief event:** dikke rand (`border-2 border-black`), naam, datum+tijd, status badge, aantal duo's (Lucide `Users` icon), deadline rechts uitgelijnd
  - **Afgelopen event:** subtiele rand, gedempte kleuren, aantal duo's, "Bekijk dit event →" link

### Status badges

| Status | Kleuren |
|--------|---------|
| Concept | `bg-gray-100 text-gray-700` |
| Registratie open | `bg-green-100 text-green-700` |
| Bevestigd | `bg-blue-100 text-blue-700` |
| Gesloten | `bg-yellow-100 text-yellow-700` |
| Afgelopen | `bg-gray-100 text-gray-500` |

## Event Detail Dashboard (`/organizer/[slug]`)

Eén scrollbare pagina met 8 blokken, gescheiden door `border-bottom`. Bovenaan een "Terug naar overzicht" link (Lucide `ChevronLeft`).

### Blok 1: Event Header

- Eventnaam (h1, `text-2xl font-bold`)
- Datum + starttijd
- Status badge (rechts)
- **Dupliceer button** (rechts, naast status badge) — kopieert event-instellingen als startpunt voor een nieuw event
- **Countdown:** "Sluit over X dagen" badge met Lucide `Clock` icon. Op de laatste dag wisselt dit naar uren en minuten.

### Blok 2: Thermometer

Visuele voortgangsbalk voor aanmeldingen:

- Groene balk met huidig aantal duo's (`linear-gradient`)
- Getal in de balk (wit, bold)
- **Mijlpaalmarkeringen** onder de balk: 9, 12, 15, 18 (elke mijlpaal = 1 extra tafel per gang)
  - Bereikte mijlpalen: groen
  - Toekomstige mijlpalen: grijs
- Tekst: "Nog X duo's nodig voor de volgende tafel (Y)"
- Balk breed = `(huidig / max_mijlpaal) * 100%`, maximum mijlpaal is dynamisch (altijd +3 boven huidige stand)

### Blok 3: Uitnodigingen & Berichten

Drie secties:

**Uitnodigen:**
- Event-link met kopieerknop (Lucide `Copy`)
- Persoonlijke uitnodiging: naam + e-mailadres invoervelden + verstuur-button (Lucide `Send`)
- Deel-buttons: WhatsApp (groen), Facebook (blauw), Instagram (gradient), QR-code (outline)
- QR-code button genereert een downloadbare QR-code voor de event-link

**E-mail naar alle deelnemers:**
- Tekstveld + "Verstuur e-mail" button (Lucide `Mail`)
- Verstuurd via Resend (bestaande integratie)

**Noodbericht (push notificatie):**
- Visueel apart: rode styling (`border-red`, `bg-red-50`)
- Waarschuwings-icon (Lucide `AlertTriangle`) + label "Noodbericht (push notificatie)"
- Kort invoerveld + "Verstuur noodbericht" button (rode achtergrond)
- Stuurt push notificatie via Expo Push API naar alle deelnemers met de app
- Subtekst: "Stuurt een push notificatie naar alle deelnemers met de app"

### Blok 4: Duo-lijst

Tabel met kolommen: Duo | Status | Aangemeld | Gang | Acties

- **Sorteerbaar** via dropdown: aanmeldtijd, status, naam
- **Export CSV** button rechts (Lucide `Download`) — download CSV met namen, e-mailadressen, status, aanmelddatum
- **Status badges per rij:**
  - Bevestigd: groen
  - Wachtlijst: geel, met **"Promoveer" button** om handmatig naar bevestigd te zetten
  - Uitgenodigd (nog niet aangemeld): hele rij op `opacity: 0.5`, italic naam, grijs badge
- **Gang kolom:** toont gehoste gang na matching, "—" vóór matching
- Header rij: grijze achtergrond, uppercase labels
- Bij >5 duo's: "+X meer duo's" link onderaan die de volledige lijst toont

### Blok 5: Indeling

Twee weergaven met toggle:

**Standaard: Simpele lijst**
- Per gang (voorgerecht/hoofdgerecht/dessert) een sectie met gang-kleur (oranje/rood/paars)
- Per tafel een rij: "Tafel X: [Host naam] (host) → [Gast 1], [Gast 2]"
- Leesbaar, scanbaar, printbaar

**Geavanceerd: Drag-drop board**
- Bestaande `matching-board.tsx` component geïntegreerd
- 3-kolommen grid, drag-drop, reistijden
- Mix / Undo / Fiets-Auto toggle buttons

**Beide weergaven:**
- **"Goedkeuren — activeer onthullingen"** button (groen, prominent)
- Deze button is alleen beschikbaar als er een actieve matching is
- Na goedkeuring worden de reveals in de `reveals` tabel geactiveerd
- Na goedkeuring wordt de event status naar `active` gezet

**Zichtbaarheid:** Dit blok toont een placeholder-tekst ("Zichtbaar na sluiting registratie") zolang de event-status nog niet `closed` is.

### Blok 6: Notificatie-log

Tabel met kolommen: Datum | Bericht | Type

- Chronologisch (nieuwste eerst)
- Toont alle verstuurde communicatie: uitnodigings-e-mails, bevestigingen, handmatige e-mails, noodberichten
- Type badges: "E-mail" (blauw), "Push" (oranje)
- Data komt uit een nieuwe `notification_log` tabel (zie Database sectie)

### Blok 7: Welkomstkaart

Placeholder voor toekomstige functionaliteit:

- Label "Welkomstkaart" + "Coming soon"
- Toggle switch (disabled, `opacity: 0.5`, `cursor: not-allowed`)
- Geen functionaliteit in Module 4

### Blok 8: Instellingen

Bewerkbaar tot T-7 (7 dagen voor het event). Na T-7 zijn de velden read-only met een melding.

Drie instellingsrijen, elk als bordered card:
- **Afterparty-adres:** huidige waarde of "Nog niet ingesteld" + "Toevoegen"/"Wijzigen" link
- **Uitnodigingsbeleid:** huidige waarde + "Wijzigen" link (toggle: alleen organisator / deelnemers mogen ook)
- **Gangduren:** huidige waarden (bijv. "Voorgerecht 75 min · Hoofdgerecht 90 min · Dessert 60 min") + "Wijzigen" link

Wijzigen opent een inline edit-modus of modal — implementatiekeuze.

## Herinvite Flow

Bereikbaar vanuit het event detail dashboard van een **afgelopen** event:

1. Organisator klikt "Nodig deelnemers opnieuw uit" (button zichtbaar bij afgelopen events)
2. Lijst van alle duo's van dat event verschijnt met checkboxes
3. Organisator selecteert duo's
4. Kiest bestaand event of maakt nieuw event aan (via wizard)
5. Geselecteerde duo's krijgen een uitnodigings-e-mail voor het nieuwe event

## Database

### Nieuwe tabel: `notification_log`

```sql
CREATE TABLE notification_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id),
  type TEXT NOT NULL CHECK (type IN ('email', 'push')),
  subject TEXT,
  body TEXT NOT NULL,
  recipient_count INTEGER NOT NULL,
  sent_by UUID NOT NULL REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

**RLS:** Alleen leesbaar door de organisator van het event.

### Bestaande tabellen — geen wijzigingen nodig

- `events`: heeft al `organizer_id`, status, alle relevante velden
- `duos`: heeft al status, namen, aanmelddatum
- `invitations`: heeft al `invited_by_duo_id`, `invitee_email`, status
- `matches`, `match_assignments`, `match_tables`, `match_table_guests`: matching data
- `push_tokens`: voor noodberichten

## Hergebruik bestaande code

| Component/Functie | Locatie | Gebruik |
|---|---|---|
| `matching-board.tsx` | `apps/web/src/components/` | Integreren in Blok 5 (drag-drop weergave) |
| `event-card.tsx` | `apps/web/src/components/` | Basis voor event cards in overzicht |
| `thermometer.tsx` | `apps/web/src/components/` | Uitbreiden met mijlpaalmarkeringen |
| Resend e-mail integratie | `apps/web/src/actions/` | Hergebruiken voor e-mail berichten |
| Expo Push API | `apps/web/src/app/api/` | Hergebruiken voor noodberichten |
| Event wizard | `apps/web/src/components/event-wizard/` | Link naar voor nieuw event / dupliceren |
| Supabase client | `apps/web/src/lib/supabase/` | Server + client instanties |

## Icons

Uitsluitend **Lucide React** (`lucide-react`) icons door het hele dashboard. Geen emoji's.

## Verificatie

1. **Events overzicht:** Inloggen als organisator → events verschijnen gesorteerd, actief event heeft dikke rand, afgelopen events zijn gedimpt
2. **Event detail:** Klik op event → alle 8 blokken laden met correcte data
3. **Thermometer:** Voeg duo's toe → balk groeit, mijlpalen kleuren groen
4. **Uitnodiging:** Stuur persoonlijke uitnodiging → e-mail wordt ontvangen, verschijnt in notificatie-log
5. **Noodbericht:** Stuur push → deelnemer ontvangt notificatie op telefoon
6. **Duo-lijst:** Sorteer op verschillende velden, export CSV → download klopt
7. **Wachtlijst:** Promoveer duo → status wijzigt naar bevestigd
8. **Indeling simpele lijst:** Toont correcte tafels per gang na matching
9. **Indeling drag-drop:** Bestaande matching board functionaliteit werkt
10. **Goedkeuren:** Klik goedkeuren → reveals worden geactiveerd, event status → active
11. **Instellingen:** Wijzig afterparty/beleid/gangduren → opgeslagen, na T-7 read-only
12. **Event dupliceren:** Klik dupliceer → wizard opent met vooringevulde waarden
13. **Herinvite:** Vanuit afgelopen event → selecteer duo's → uitnodiging verstuurd
14. **RLS:** Niet-organisator kan dashboard niet bereiken
