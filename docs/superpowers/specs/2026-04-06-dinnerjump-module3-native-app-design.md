# Module 3 Design — Native App (Dinner Jump Companion)

## Context

Module 1 (website, registratie, betaling) en Module 2 (matching-algoritme) zijn grotendeels af. Module 3 is de native companion-app die deelnemers begeleidt in de week vóór en tijdens het Dinner Jump event. De app bouwt spanning op via een reeks geleidelijke onthullingen en navigeert deelnemers tijdens de avond van adres naar adres.

## Scope

De app is een **companion voor deelnemers** — geen vervanging van de website. Registratie en betaling blijven op de website. De app begint na goedkeuring van de matching door de organisator.

### In scope

- Magic link login (Supabase Auth)
- Persoonlijk welkomscherm met gang-toewijzing
- Geleidelijk onthullingssysteem (D-7 t/m avond zelf)
- Countdown timer naar volgende onthulling met alarm 15 min van tevoren
- Push notifications (Expo Push API) + e-mail notificaties (Resend)
- Navigatie via static map preview + deep link naar Google Maps / Apple Maps
- Basis offline caching van event- en reveal-data
- iOS + Android (Expo)

### Buiten scope

- Chat/messaging (Module 4/5)
- Organisator-functies (blijven op website)
- QR-code check-in
- Foto's delen

## Tech Stack

| Component | Technologie |
|-----------|------------|
| Framework | React Native + Expo (SDK 52+) |
| Routing | Expo Router (file-based) |
| Database | Supabase (bestaand) |
| Auth | Supabase Auth (magic link) |
| Push notifications | Expo Push API (abstraheert APNs + FCM) |
| E-mail | Resend (bestaand) |
| Kaart | Google Static Maps API (route preview image) |
| Navigatie | Deep link naar Google Maps / Apple Maps |
| Offline | AsyncStorage voor data caching |
| Monorepo | Turborepo + pnpm workspaces |

## Monorepo-structuur

De bestaande DinnerJump repo wordt gemigreerd naar een Turborepo monorepo:

```
DinnerJump/
├── apps/
│   ├── web/                    ← bestaande Next.js code (verplaatst vanuit src/)
│   │   ├── src/
│   │   ├── package.json
│   │   └── next.config.ts
│   └── mobile/                 ← nieuwe Expo app
│       ├── app/                ← Expo Router
│       ├── components/
│       ├── hooks/
│       ├── package.json
│       └── app.json
├── packages/
│   ├── shared/                 ← gedeelde code
│   │   ├── src/
│   │   │   ├── types.ts        ← database types, enums, interfaces
│   │   │   ├── constants.ts    ← gangduren, onthullingsschema
│   │   │   └── supabase.ts     ← Supabase client factory
│   │   └── package.json
│   └── ui/                     ← eventueel later: gedeelde UI componenten
├── supabase/                   ← blijft op root-niveau
├── turbo.json
├── pnpm-workspace.yaml
└── package.json                ← root workspace
```

## Datamodel

### Nieuwe kolommen op `events` tabel

```sql
ALTER TABLE events ADD COLUMN appetizer_duration INTEGER NOT NULL DEFAULT 90;
ALTER TABLE events ADD COLUMN main_duration INTEGER NOT NULL DEFAULT 120;
ALTER TABLE events ADD COLUMN dessert_duration INTEGER NOT NULL DEFAULT 60;
ALTER TABLE events ADD COLUMN event_start_time TIME NOT NULL DEFAULT '18:00';
```

Gangduren in minuten. Organisator kan aanpassen per 15 minuten. Defaults: voorgerecht 1,5u, hoofdgerecht 2u, dessert 1u.

### Nieuwe tabel: `reveals`

```sql
CREATE TYPE reveal_type AS ENUM (
  'course_assignment',    -- D-7: welke gang je host
  'initials',             -- D-5: initialen tafelgenoten
  'names_course_1',       -- D-3: volledige namen gang 1
  'address_course_1',     -- D-1: startadres voorgerecht
  'course_2_full',        -- Tijdens voorgerecht: gang 2 namen + adres + route
  'course_3_full',        -- Tijdens hoofdgerecht: gang 3 namen + adres + route
  'afterparty'            -- Tijdens dessert: afterparty locatie + route
);

CREATE TABLE reveals (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id      UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  reveal_type   reveal_type NOT NULL,
  scheduled_at  TIMESTAMPTZ NOT NULL,
  revealed_at   TIMESTAMPTZ,
  created_at    TIMESTAMPTZ DEFAULT now(),
  UNIQUE(event_id, reveal_type)
);
```

Na goedkeuring van de matching door de organisator worden 7 reveals aangemaakt met berekende `scheduled_at` tijden. Een cron job zet `revealed_at` op het juiste moment. De app toont alleen data waarvoor `revealed_at IS NOT NULL`.

### Nieuwe tabel: `push_tokens`

```sql
CREATE TABLE push_tokens (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id  UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  token       TEXT NOT NULL UNIQUE,
  platform    TEXT NOT NULL CHECK (platform IN ('ios', 'android')),
  created_at  TIMESTAMPTZ DEFAULT now()
);
```

### RLS policies

- `reveals`: deelnemers kunnen alleen reveals lezen van events waar hun duo aan deelneemt
- `push_tokens`: gebruikers kunnen alleen hun eigen tokens lezen/schrijven

## Onthullingstijdlijn

Na goedkeuring van de matching berekent het systeem de `scheduled_at` tijden op basis van `event_date`:

| Offset | `reveal_type` | Wat wordt zichtbaar | Notificatie |
|--------|--------------|--------------------|----|
| D-7 | `course_assignment` | Welke gang het duo host + tijdschema | E-mail + push |
| D-5 | `initials` | Initialen tafelgenoten: `P•••••`, `M••••` | E-mail + push |
| D-3 | `names_course_1` | Volledige namen gang 1 tafelgenoten | E-mail + push |
| D-1 | `address_course_1` | Startadres (voorgerecht) | E-mail + push |
| 15 min voor einde gang 1 | `course_2_full` | Gang 2: namen + adres + route | Alleen push + geluid |
| 15 min voor einde gang 2 | `course_3_full` | Gang 3: namen + adres + route | Alleen push + geluid |
| 15 min voor einde gang 3 | `afterparty` | Afterparty: naam + locatie + route | Alleen push + geluid |

**15-minuten alarm:** Bij elke onthulling wordt 15 minuten vóór de `scheduled_at` een extra push notification gestuurd ("Bekendmaking over 15 minuten...") om spanning op te bouwen aan tafel.

**Dual channel (D-7 t/m D-1):** De pre-event onthullingen worden zowel per e-mail (Resend) als push notification gestuurd. E-mail bereikt ook deelnemers die de app nog niet geïnstalleerd hebben.

**Alleen push (tijdens event):** De onthullingen tijdens de avond gaan uitsluitend via push notification met geluid.

## App-schermen

### Scherm 1: Welkom (eerste login, D-7)

**Header:** Event naam, locatie, datum + starttijd

**Welkomsttekst:**
> Hoi [VOORNAAM],
>
> Drie gangen op drie locaties met telkens andere tafelgasten is één bijzondere event. En dat is deelnemen aan een DinnerJump ook.
>
> Want tijdens dit culinaire event wordt er met aandacht en passie gekookt om elkaar te verrassen met heerlijke gerechten en drankjes.
>
> Nu is het aan jullie om er iets bijzonders van te maken en jullie gasten een ervaring te geven die ze niet snel vergeten.
>
> Hieronder ontdekken jullie wat jullie gaan bereiden.

**Gang-toewijzing blok:**
- Label: "Jullie verzorgen het"
- Gangnaam (bijv. "Hoofdgerecht")
- Adres van het duo

**Countdown timer:**
- "Volgende onthulling over 1d 14u 23m"
- Telt af naar de volgende `scheduled_at` uit de reveals-tabel

**Tafelgenoten blok:**
- Bij D-7: allemaal `?•••••` (vraagtekens)
- Bij D-5: initialen `P•••••`, `M••••` (eerste letter + stipjes)
- Bij D-3: volledige namen voor gang 1

**Tijdschema:**
- Drie rijen: voorgerecht, hoofdgerecht, dessert met begin- en eindtijden
- Berekend uit `event_start_time` + gangduren + geschatte transporttijden
- Noot: "Transporttijd tussen gangen niet inbegrepen"

### Scherm 2: Tijdens event (actieve gang)

**Header:** "Nu bezig" + gangnaam + host naam + adres

**Gang-timer:** "Het [gangnaam] duurt nog: 1u 12m" — telt af

**Tafelgenoten:** Lijst met naam van elk duo + "host" label bij de host

**Volgende gang (locked):**
- "Hierna: 🍝 Hoofdgerecht" met 🔒 icoon
- "Bekendmaking over 57m" — countdown naar volgende reveal
- Wordt unlocked wanneer de reveal actief wordt (15 min voor einde huidige gang)

### Scherm 3: Route naar volgende gang

Verschijnt wanneer een gang-reveal actief wordt.

**Header:** "Volgende stop: [gangnaam] bij [host naam]"

**Static map:** Google Static Maps API image met route polyline van huidige locatie naar volgend adres

**Route-info:** Afstand, fietstijd, adres

**Tafelgenoten:** "Je zit aan tafel met [namen] (host), [namen]"

**Navigatie knoppen:** "Google Maps" en "Apple Maps" — deep links die de betreffende app openen met het bestemmingsadres

## Authenticatie

Magic link via Supabase Auth:

1. Deelnemer opent app → voert e-mailadres in
2. Supabase stuurt magic link e-mail
3. Deelnemer klikt link → Expo deep link (`dinnerjump://auth/callback`) vangt dit op
4. Sessie wordt lokaal opgeslagen via Supabase auth helpers
5. Bij meerdere events: event-selectiescherm

## Push Notifications

Expo Push API (abstraheert APNs + FCM):

1. Bij eerste login → app vraagt notificatie-permissie
2. Expo Push Token wordt opgeslagen in `push_tokens` tabel
3. Server-side: cron job stuurt notificaties via Expo Push API wanneer reveals actief worden
4. 15 min vóór elke reveal: extra alarm-notificatie

## Offline strategie

- Bij app-open: alle beschikbare reveal-data + event-data ophalen en opslaan in AsyncStorage
- Static map images worden gecached door React Native Image component
- Zonder internet: gecachte data tonen met subtiele "offline" indicator
- Geen write-operaties vereist offline (app is read-only voor deelnemers)

## Expo App-structuur

```
apps/mobile/
├── app/
│   ├── _layout.tsx              ← Root layout (auth check, theme, notifications setup)
│   ├── index.tsx                ← Redirect: ingelogd → event, niet → login
│   ├── login.tsx                ← Magic link login scherm
│   ├── (auth)/                  ← Beschermde routes
│   │   ├── _layout.tsx          ← Auth guard + tab navigator
│   │   ├── event/
│   │   │   ├── index.tsx        ← Home/welkom scherm
│   │   │   ├── course.tsx       ← Actieve gang
│   │   │   └── route.tsx        ← Route naar volgende gang
│   │   └── select-event.tsx     ← Event kiezen (meerdere events)
├── components/
│   ├── RevealCard.tsx           ← Locked/unlocked content card
│   ├── CountdownTimer.tsx       ← Afteller + 15-min alarm
│   ├── TablematePreviews.tsx    ← ?••••• → P••••• → Pieter & Anna
│   └── StaticMap.tsx            ← Google Static Maps + deep links
├── hooks/
│   ├── useReveals.ts            ← Reveals ophalen + lokaal cachen
│   ├── useEvent.ts              ← Event data + gangduren
│   └── usePushNotifications.ts  ← Token registratie + handlers
├── lib/
│   └── supabase.ts              ← Supabase client (uit packages/shared)
├── app.json
└── package.json
```

## Wijzigingen aan bestaande website

De website (apps/web) heeft een paar kleine aanpassingen nodig:

1. **Event creation wizard:** gangduren toevoegen als stap (voorgerecht/hoofd/dessert, aanpasbaar per 15 min)
2. **Manage page:** knop "Matching goedkeuren" die reveals aanmaakt en de eerste e-mail met app-link stuurt
3. **E-mail templates:** nieuwe templates voor onthullings-e-mails (D-7, D-5, D-3, D-1)
4. **Cron job:** uitbreiden of nieuwe cron voor het activeren van reveals en sturen van notificaties

## Bestaande code hergebruik

- `src/lib/routes.ts` → route-berekeningen en cache (verplaatst naar packages/shared)
- `src/lib/types.ts` → database types (verplaatst naar packages/shared)
- `src/lib/database.types.ts` → Supabase generated types (verplaatst naar packages/shared)
- Resend integratie → e-mail templates uitbreiden voor onthullings-e-mails
- Google Maps API key → hergebruiken voor Static Maps API
- Supabase client setup → factory in packages/shared

## Verificatie

1. **Monorepo:** `pnpm install` + `pnpm build` slaagt voor alle packages
2. **Web app:** bestaande website draait zonder regressies na migratie naar apps/web
3. **Database:** migraties draaien succesvol, reveals worden correct aangemaakt
4. **Auth:** magic link flow werkt op iOS simulator + Android emulator
5. **Reveals:** onthullingen verschijnen op de juiste momenten, locked content blijft verborgen
6. **Push:** notificaties komen aan op beide platforms met geluid
7. **E-mail:** onthullings-e-mails worden verstuurd bij D-7, D-5, D-3, D-1
8. **Offline:** gecachte data is beschikbaar zonder internet
9. **Navigatie:** deep links openen Google Maps / Apple Maps correct
10. **Timer:** countdown en bekendmaking-alarm werken nauwkeurig
