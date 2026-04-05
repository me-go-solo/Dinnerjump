# Module 2: Matching-algoritme — Design Spec

## Context

Dinner Jump is een roterend diner-platform waarbij duo's (twee personen op één adres) langs 3 huizen trekken voor voorgerecht, hoofdgerecht en dessert. Module 1 (registratie, betaling, waitlist) is af. Module 2 bouwt het matching-algoritme dat duo's toewijst aan gangen en tafels, met geo-optimalisatie op basis van echte reistijden.

## Scope

Module 2 levert:
- **Matching-algoritme** — gangentoewijzing + tafelsamenstelling met reistijd-optimalisatie
- **Database-opslag** — matching-resultaten in nieuwe tabellen
- **Manage-pagina** — organisator bekijkt indeling, mixt, undo/redo, handmatige override
- **Google Maps Directions API** — echte fiets- en autoreistijden

Buiten scope:
- Anti-repeat logic (terugkerende deelnemers over meerdere events)
- E-mailnotificaties naar duo's over toewijzing
- Deelnemersweergave van toewijzing (Module 3: app)
- OV-reistijden (te complex, alleen fiets + auto)

## Datamodel

### Nieuw enum

```sql
CREATE TYPE course_type AS ENUM ('appetizer', 'main', 'dessert');
```

### Nieuwe tabellen

**`matches`** — een versie van de indeling voor een event

| Kolom | Type | Beschrijving |
|-------|------|-------------|
| id | uuid PK | |
| event_id | uuid FK→events | Het event |
| version | int | Versienummer (1, 2, 3... bij mix/re-run) |
| is_active | boolean | De huidige actieve indeling |
| total_travel_time_bike_min | float | Totale fietsreistijd alle duo's (minuten) |
| total_travel_time_car_min | float | Totale autoreistijd alle duo's (minuten) |
| avg_travel_time_bike_min | float | Gemiddelde fietsreistijd per duo (minuten) |
| avg_travel_time_car_min | float | Gemiddelde autoreistijd per duo (minuten) |
| created_at | timestamp | |

Constraint: maximaal 1 `is_active = true` per event.

**`match_assignments`** — per duo de gangentoewijzing

| Kolom | Type | Beschrijving |
|-------|------|-------------|
| id | uuid PK | |
| match_id | uuid FK→matches | De indeling |
| duo_id | uuid FK→duos | Het duo |
| hosted_course | course_type | Welke gang dit duo host |
| duo_display_name | text | Snapshot van de naam (voor organisator + e-mails) |

**`match_tables`** — tafels per gang

| Kolom | Type | Beschrijving |
|-------|------|-------------|
| id | uuid PK | |
| match_id | uuid FK→matches | De indeling |
| course | course_type | De gang |
| table_number | int | Tafelnummer binnen de gang |
| host_duo_id | uuid FK→duos | Duo dat host (eet bij eigen adres) |

**`match_table_guests`** — gasten aan een tafel

| Kolom | Type | Beschrijving |
|-------|------|-------------|
| id | uuid PK | |
| match_table_id | uuid FK→match_tables | De tafel |
| duo_id | uuid FK→duos | Het gast-duo |

### Route-cache

**`route_cache`** — cache voor Google Maps Directions reistijden

| Kolom | Type | Beschrijving |
|-------|------|-------------|
| id | uuid PK | |
| origin_lat | float | |
| origin_lng | float | |
| dest_lat | float | |
| dest_lng | float | |
| mode | text | 'bicycling' of 'driving' |
| duration_minutes | float | Reistijd in minuten |
| distance_km | float | Afstand in km |
| fetched_at | timestamp | |

Routes tussen dezelfde coördinaten worden gecached zodat we de API niet dubbel aanroepen bij mix/re-run.

## Algoritme

### Input
- Lijst confirmed duo's voor een event (altijd deelbaar door 3, gegarandeerd door waitlist-logica)
- Coördinaten (lat/lng) van elk duo-adres

### Stap 1 — Gangentoewijzing
- Verdeel N duo's willekeurig in 3 gelijke groepen van N/3
- Groep A host het voorgerecht, Groep B het hoofdgerecht, Groep C het dessert
- Elk duo host precies 1 gang bij hun eigen adres

### Stap 2 — Tafelsamenstelling
Per gang worden tafels van 3 duo's gevormd:
- **Voorgerecht:** elke tafel = 1 host uit groep A + 2 gasten (1 uit B, 1 uit C)
- **Hoofdgerecht:** elke tafel = 1 host uit groep B + 2 gasten (1 uit A, 1 uit C)
- **Dessert:** elke tafel = 1 host uit groep C + 2 gasten (1 uit A, 1 uit B)

**Kernconstraint:** elke duo zit bij elke gang met andere duo's. Geen duo ziet dezelfde tafelgenoot bij 2 gangen.

### Stap 3 — Reistijd-optimalisatie
- Haal reistijden op via Google Maps Directions API (fiets + auto) voor alle relevante duo-paren
- Cache resultaten in `route_cache`
- Per duo: bereken totale reistijd over 3 gangen (2 verplaatsingen: gang 1→2, gang 2→3)
- Score = `totalTravelTime + 2 * maxSingleTrip` (penalty voor uitschieters, balans)

### Stap 4 — Generatie-heuristiek
De eerste indeling wordt geo-geoptimaliseerd via:
1. **Gangentoewijzing:** verdeel duo's in 3 groepen met geografische spreiding (zodat elke groep een mix van locaties bevat, niet allemaal in dezelfde hoek)
2. **Tafeltoewijzing:** greedy — per tafel, kies de gast-duo's die de laagste totale reistijd opleveren voor die tafel
3. **Probeer meerdere gangverdelingen** (10-20 random shuffles), scoor elk, kies de beste

Bij "Mix": genereer een nieuwe indeling met een andere random shuffle van de gangentoewijzing.
Sla elke versie op als nieuw `matches` record met oplopend versienummer.

## Trigger

De matching draait automatisch wanneer de registratiedeadline verstrijkt:
1. **Vercel Cron Job** (via `vercel.json`) draait dagelijks en checkt events met status `confirmed` en `registration_deadline` verstreken
2. API route `GET /api/cron/match` (beveiligd met `CRON_SECRET`) voert de check uit
3. Algoritme draait voor elk qualifying event
4. Resultaat wordt opgeslagen (version 1, is_active = true)
5. Event status → `closed`
6. Indeling verschijnt op de manage-pagina

## Manage-pagina (`/events/[slug]/manage`)

### Weergave na matching
- **3 kolommen:** Voorgerecht | Hoofdgerecht | Dessert
- **Per gang:** tafels met host (vet, adres) + 2 gasten (namen)
- **Reistijd-overzicht:** gemiddelde reistijd per duo, toggle fiets/auto
- **Per duo:** geschatte reistijd voor hun route (fiets + auto)

### Interactie
- **Mix-knop:** genereer een nieuwe indeling (nieuwe versie)
- **Undo/Redo:** wissel tussen eerdere versies van de indeling
- **Handmatige override:** organisator kan:
  - Een duo naar een andere gang verplaatsen (gangentoewijzing wijzigen)
  - Een duo naar een andere tafel verplaatsen (binnen dezelfde gang)
  - Na wijziging: reistijden worden automatisch herberekend
  - Handmatige wijzigingen worden opgeslagen als nieuwe `matches` versie (zodat undo altijd werkt)
- **Actieve indeling:** de huidige `is_active` versie is wat geldt
- **Undo/Redo:** navigeert door de versie-geschiedenis (version 1, 2, 3...) en zet `is_active` op de gekozen versie

### Validatie bij handmatige wijziging
- Tafels moeten altijd exact 3 duo's bevatten
- Elke gang moet exact N/3 hosts hebben
- Constraint "geen herhaalde tafelgenoten" wordt gecontroleerd en waarschuwing getoond als geschonden

## Google Maps Directions API

### Integratie
- Server-side API route: `POST /api/routes`
- Input: origin + destination coördinaten, mode (bicycling/driving)
- Output: reistijd (minuten) + afstand (km)
- Resultaten worden gecached in `route_cache` tabel
- API-key via environment variable `GOOGLE_MAPS_API_KEY`

### Kosten
- $5 per 1000 requests
- $200/maand gratis tegoed van Google (= ~40.000 requests)
- Een event van 9 duo's: ~54 route-berekeningen (27 duo-paren x 2 modes)
- Caching voorkomt dubbele requests bij mix/re-run

## Bestaande code die hergebruikt wordt

- `src/lib/geo.ts` — `calculateDistance()` als fallback bij API-fout
- `src/lib/waitlist.ts` — `MINIMUM_DUOS`, `TABLE_SIZE` constanten
- `src/lib/types.ts` — bestaande types uitbreiden met matching-types
- `src/lib/database.types.ts` — auto-gegenereerd na migratie
- Vitest test-patronen uit `tests/lib/`

## Verificatie

1. **Unit tests:** algoritme-logica (gangentoewijzing, tafelsamenstelling, constraints, scoring)
2. **Unit tests:** route-cache logica
3. **Integratietest:** volledige flow van confirmed duo's → matching-resultaat in DB
4. **Handmatig:** manage-pagina testen met mix/undo/redo/override
5. **Handmatig:** verifieer Google Maps API-integratie met echte adressen
