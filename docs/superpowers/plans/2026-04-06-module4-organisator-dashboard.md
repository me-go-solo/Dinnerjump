# Module 4: Organisator Dashboard — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a centralized organizer dashboard for managing DinnerJump events

**Architecture:** New `/[locale]/organizer` route group with events overview and per-event detail page (8 scrollable blocks). Integrates existing matching board component. New `notification_log` database table. Server actions for email/push messaging.

**Tech Stack:** Next.js 16 App Router, Supabase, Tailwind CSS 4, next-intl, Resend, Expo Push API, Lucide React, Vitest

**Design Spec:** `docs/superpowers/specs/2026-04-06-dinnerjump-module4-organisator-dashboard-design.md`

---

## File Structure

```
# New files
supabase/migrations/00013_notification_log.sql
apps/web/src/app/[locale]/organizer/page.tsx
apps/web/src/app/[locale]/organizer/[slug]/page.tsx
apps/web/src/components/organizer/events-overview.tsx
apps/web/src/components/organizer/event-header.tsx
apps/web/src/components/organizer/registration-thermometer.tsx
apps/web/src/components/organizer/invitations-block.tsx
apps/web/src/components/organizer/messaging-block.tsx
apps/web/src/components/organizer/duo-list.tsx
apps/web/src/components/organizer/matching-overview.tsx
apps/web/src/components/organizer/notification-log.tsx
apps/web/src/components/organizer/welcome-card-placeholder.tsx
apps/web/src/components/organizer/event-settings.tsx
apps/web/src/components/organizer/reinvite-modal.tsx
apps/web/src/actions/organizer.ts
apps/web/src/lib/csv.ts
apps/web/tests/actions/organizer.test.ts
apps/web/tests/lib/csv.test.ts

# Modified files
apps/web/src/messages/nl.json              — add organizer.* translations
apps/web/src/messages/en.json              — add organizer.* translations
apps/web/src/app/[locale]/events/[slug]/manage/page.tsx  — redirect to /organizer/[slug]
```

## Existing code to reuse

| Component/Function | Path | Usage |
|---|---|---|
| `MatchingBoard` | `apps/web/src/components/matching-board.tsx` | Integrate in Block 5 drag-drop view |
| `Thermometer` | `apps/web/src/components/thermometer.tsx` | Reference for Block 2 (build new with milestones) |
| `matching.ts` actions | `apps/web/src/actions/matching.ts` | `mixMatch`, `approveMatching`, `saveMatchOverride`, `setActiveMatchVersion` |
| `sendInvitation` | `apps/web/src/actions/invitations.ts` | Reuse for personal invites |
| `createClient` | `apps/web/src/lib/supabase/server.ts` | Server-side Supabase |
| `createAdminClient` | `apps/web/src/lib/supabase/admin.ts` | Service role for writes |
| `resend` | `apps/web/src/lib/resend.ts` | Email sending |
| Expo Push | `apps/web/src/app/api/cron/reveals/route.ts` | Push notification pattern |

---

## Task 1: Database Migration — notification_log

**Files:**
- Create: `supabase/migrations/00013_notification_log.sql`

- [ ] **Step 1: Write migration SQL**

```sql
-- supabase/migrations/00013_notification_log.sql
CREATE TABLE notification_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('email', 'push')),
  subject TEXT,
  body TEXT NOT NULL,
  recipient_count INTEGER NOT NULL,
  sent_by UUID NOT NULL REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_notification_log_event ON notification_log(event_id);

ALTER TABLE notification_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Organizers can read their event notifications"
  ON notification_log FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM events
      WHERE events.id = notification_log.event_id
      AND events.organizer_id = auth.uid()
    )
  );

CREATE POLICY "Organizers can insert notifications for their events"
  ON notification_log FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM events
      WHERE events.id = notification_log.event_id
      AND events.organizer_id = auth.uid()
    )
  );
```

- [ ] **Step 2: Apply migration locally**

Run: `cd /Users/patrikzinger/DinnerJump && npx supabase db push`
Expected: Migration 00013 applied successfully

- [ ] **Step 3: Regenerate types**

Run: `cd /Users/patrikzinger/DinnerJump && npx supabase gen types typescript --local > apps/web/src/lib/database.types.ts`
Expected: `notification_log` table appears in generated types

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/00013_notification_log.sql apps/web/src/lib/database.types.ts
git commit -m "feat(db): add notification_log table with RLS"
```

---

## Task 2: i18n Translations

**Files:**
- Modify: `apps/web/src/messages/nl.json`
- Modify: `apps/web/src/messages/en.json`

- [ ] **Step 1: Add organizer translations to nl.json**

Add to the root of the JSON:

```json
"organizer": {
  "greeting": "Hallo {name},",
  "subtitle": "Hieronder staan de DinnerJump events die je hebt georganiseerd.",
  "newEvent": "+ Nieuw Event",
  "viewEvent": "Bekijk dit event",
  "backToOverview": "Terug naar overzicht",
  "closesIn": "Sluit over {count} dagen",
  "closesInHours": "Sluit over {hours}u {minutes}m",
  "duosRegistered": "{count} duo's aangemeld",
  "duosCount": "{count} duo's",
  "deadline": "Deadline: {date}",
  "registrations": "Aanmeldingen",
  "needMore": "Nog {count} duo's nodig voor de volgende tafel ({target})",
  "invitations": "Uitnodigingen & berichten",
  "copyLink": "Kopieer",
  "copied": "Gekopieerd!",
  "name": "Naam",
  "email": "E-mailadres",
  "sendInvite": "Verstuur",
  "qrCode": "QR-code",
  "emailAll": "E-mail naar alle deelnemers",
  "typeMessage": "Typ je bericht...",
  "sendEmail": "Verstuur e-mail",
  "emergency": "Noodbericht (push notificatie)",
  "emergencyPlaceholder": "Kort noodbericht...",
  "sendEmergency": "Verstuur noodbericht",
  "emergencyHint": "Stuurt een push notificatie naar alle deelnemers met de app",
  "duos": "Duo's",
  "confirmed": "Bevestigd",
  "waitlisted": "Wachtlijst",
  "invited": "Uitgenodigd",
  "promote": "Promoveer",
  "exportCsv": "Export CSV",
  "sortBy": "Sorteer op",
  "sortTime": "aanmeldtijd",
  "sortStatus": "status",
  "sortName": "naam",
  "duo": "Duo",
  "status": "Status",
  "registered": "Aangemeld",
  "course": "Gang",
  "moreCount": "+ {count} meer duo's",
  "matching": "Indeling",
  "matchingHidden": "Zichtbaar na sluiting registratie",
  "simpleView": "Lijst",
  "boardView": "Board",
  "table": "Tafel {number}",
  "host": "host",
  "approve": "Goedkeuren — activeer onthullingen",
  "sentMessages": "Verzonden berichten",
  "date": "Datum",
  "message": "Bericht",
  "type": "Type",
  "welcomeCard": "Welkomstkaart",
  "comingSoon": "Coming soon",
  "settings": "Instellingen",
  "settingsHint": "bewerkbaar tot 7 dagen voor het event",
  "settingsLocked": "Instellingen zijn vergrendeld (minder dan 7 dagen voor het event)",
  "afterparty": "Afterparty-adres",
  "notSet": "Nog niet ingesteld",
  "add": "Toevoegen",
  "edit": "Wijzigen",
  "invitationPolicy": "Uitnodigingsbeleid",
  "policyOrganizerOnly": "Alleen organisator",
  "policyParticipantsAllowed": "Deelnemers mogen ook uitnodigen",
  "courseDurations": "Gangduren",
  "durationFormat": "Voorgerecht {appetizer} min · Hoofdgerecht {main} min · Dessert {dessert} min",
  "duplicate": "Dupliceer",
  "reinvite": "Nodig deelnemers opnieuw uit",
  "reinviteSelect": "Selecteer duo's om uit te nodigen",
  "reinviteToEvent": "Nodig uit voor event",
  "reinviteNewEvent": "Maak nieuw event aan",
  "statusDraft": "Concept",
  "statusOpen": "Registratie open",
  "statusConfirmed": "Bevestigd",
  "statusClosed": "Gesloten",
  "statusActive": "Actief",
  "statusCompleted": "Afgelopen",
  "statusCancelled": "Geannuleerd",
  "appetizer": "Voorgerecht",
  "main": "Hoofdgerecht",
  "dessert": "Dessert"
}
```

- [ ] **Step 2: Add organizer translations to en.json**

Same keys with English values (translate each value).

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/messages/nl.json apps/web/src/messages/en.json
git commit -m "feat(i18n): add organizer dashboard translations"
```

---

## Task 3: Server Actions

**Files:**
- Create: `apps/web/src/actions/organizer.ts`
- Create: `apps/web/src/lib/csv.ts`
- Create: `apps/web/tests/lib/csv.test.ts`

- [ ] **Step 1: Write CSV utility test**

```typescript
// apps/web/tests/lib/csv.test.ts
import { describe, it, expect } from 'vitest'
import { generateDuoCsv } from '@/lib/csv'

describe('generateDuoCsv', () => {
  it('generates CSV with headers and rows', () => {
    const duos = [
      {
        person1_name: 'Jan de Vries',
        person2_name: 'Marieke de Vries',
        person1_email: 'jan@example.com',
        person2_email: 'marieke@example.com',
        status: 'confirmed' as const,
        created_at: '2026-04-03T10:00:00Z',
        hosted_course: 'appetizer' as const,
      },
    ]
    const csv = generateDuoCsv(duos)
    expect(csv).toContain('Duo,E-mail 1,E-mail 2,Status,Aangemeld,Gang')
    expect(csv).toContain('Jan de Vries & Marieke de Vries')
    expect(csv).toContain('jan@example.com')
    expect(csv).toContain('confirmed')
  })

  it('handles null person2', () => {
    const duos = [
      {
        person1_name: 'Solo',
        person2_name: null,
        person1_email: 'solo@example.com',
        person2_email: null,
        status: 'confirmed' as const,
        created_at: '2026-04-03T10:00:00Z',
        hosted_course: null,
      },
    ]
    const csv = generateDuoCsv(duos)
    expect(csv).toContain('Solo')
    expect(csv).not.toContain('& null')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /Users/patrikzinger/DinnerJump && pnpm --filter web test:run -- tests/lib/csv.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Implement CSV utility**

```typescript
// apps/web/src/lib/csv.ts
type DuoRow = {
  person1_name: string
  person2_name: string | null
  person1_email: string
  person2_email: string | null
  status: string
  created_at: string
  hosted_course: string | null
}

export function generateDuoCsv(duos: DuoRow[]): string {
  const headers = 'Duo,E-mail 1,E-mail 2,Status,Aangemeld,Gang'
  const rows = duos.map((d) => {
    const name = d.person2_name
      ? `${d.person1_name} & ${d.person2_name}`
      : d.person1_name
    const date = new Date(d.created_at).toLocaleDateString('nl-NL')
    return [
      name,
      d.person1_email,
      d.person2_email ?? '',
      d.status,
      date,
      d.hosted_course ?? '—',
    ]
      .map((v) => `"${v.replace(/"/g, '""')}"`)
      .join(',')
  })
  return [headers, ...rows].join('\n')
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd /Users/patrikzinger/DinnerJump && pnpm --filter web test:run -- tests/lib/csv.test.ts`
Expected: PASS

- [ ] **Step 5: Write server actions**

```typescript
// apps/web/src/actions/organizer.ts
'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { resend } from '@/lib/resend'
import { redirect } from 'next/navigation'
import { generateDuoCsv } from '@/lib/csv'

async function requireOrganizer(eventId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { data: event } = await supabase
    .from('events')
    .select('*')
    .eq('id', eventId)
    .eq('organizer_id', user.id)
    .single()

  if (!event) throw new Error('Not authorized')
  return { supabase, user, event }
}

export async function sendEmailToParticipants(
  eventId: string,
  body: string
) {
  const { supabase, user, event } = await requireOrganizer(eventId)

  // Get all confirmed duo emails
  const { data: duos } = await supabase
    .from('duos')
    .select('person1_id, person2_id')
    .eq('event_id', eventId)
    .eq('status', 'confirmed')

  if (!duos || duos.length === 0) return { error: 'No confirmed duos' }

  const profileIds = duos.flatMap((d) =>
    [d.person1_id, d.person2_id].filter(Boolean)
  )

  const { data: profiles } = await supabase
    .from('profiles')
    .select('email')
    .in('id', profileIds)

  if (!profiles || profiles.length === 0) return { error: 'No emails found' }

  const emails = profiles.map((p) => p.email).filter(Boolean) as string[]

  await resend.emails.send({
    from: 'Dinner Jump <noreply@dinnerjump.nl>',
    to: emails,
    subject: `Bericht van ${event.title}`,
    text: body,
  })

  // Log notification
  const admin = createAdminClient()
  await admin.from('notification_log').insert({
    event_id: eventId,
    type: 'email',
    subject: `Bericht van ${event.title}`,
    body,
    recipient_count: emails.length,
    sent_by: user.id,
  })

  return { success: true, count: emails.length }
}

export async function sendEmergencyPush(
  eventId: string,
  message: string
) {
  const { supabase, user, event } = await requireOrganizer(eventId)

  // Get all confirmed duo participant IDs
  const { data: duos } = await supabase
    .from('duos')
    .select('person1_id, person2_id')
    .eq('event_id', eventId)
    .eq('status', 'confirmed')

  if (!duos || duos.length === 0) return { error: 'No confirmed duos' }

  const profileIds = duos.flatMap((d) =>
    [d.person1_id, d.person2_id].filter(Boolean)
  ) as string[]

  // Get push tokens
  const { data: tokens } = await supabase
    .from('push_tokens')
    .select('token')
    .in('profile_id', profileIds)

  if (!tokens || tokens.length === 0) return { error: 'No push tokens found' }

  // Send via Expo Push API
  const pushMessages = tokens.map((t) => ({
    to: t.token,
    title: `⚠️ ${event.title}`,
    body: message,
    sound: 'default' as const,
    priority: 'high' as const,
  }))

  await fetch('https://exp.host/--/api/v2/push/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(pushMessages),
  })

  // Log notification
  const admin = createAdminClient()
  await admin.from('notification_log').insert({
    event_id: eventId,
    type: 'push',
    body: message,
    recipient_count: tokens.length,
    sent_by: user.id,
  })

  return { success: true, count: tokens.length }
}

export async function exportDuosCsv(eventId: string) {
  const { supabase } = await requireOrganizer(eventId)

  const { data: duos } = await supabase
    .from('duos')
    .select(`
      id, status, created_at,
      person1:profiles!person1_id(display_name, email),
      person2:profiles!person2_id(display_name, email)
    `)
    .eq('event_id', eventId)
    .in('status', ['confirmed', 'waitlisted', 'registered'])
    .order('created_at')

  if (!duos) return { error: 'No duos found' }

  // Get match assignments if available
  const { data: activeMatch } = await supabase
    .from('matches')
    .select('id')
    .eq('event_id', eventId)
    .eq('is_active', true)
    .single()

  let assignments: Record<string, string> = {}
  if (activeMatch) {
    const { data: assigns } = await supabase
      .from('match_assignments')
      .select('duo_id, hosted_course')
      .eq('match_id', activeMatch.id)

    if (assigns) {
      assignments = Object.fromEntries(
        assigns.map((a) => [a.duo_id, a.hosted_course])
      )
    }
  }

  const rows = duos.map((d: any) => ({
    person1_name: d.person1?.display_name ?? '',
    person2_name: d.person2?.display_name ?? null,
    person1_email: d.person1?.email ?? '',
    person2_email: d.person2?.email ?? null,
    status: d.status,
    created_at: d.created_at,
    hosted_course: assignments[d.id] ?? null,
  }))

  return { csv: generateDuoCsv(rows) }
}

export async function promoteDuo(eventId: string, duoId: string) {
  const { supabase } = await requireOrganizer(eventId)

  const { error } = await supabase
    .from('duos')
    .update({ status: 'confirmed' })
    .eq('id', duoId)
    .eq('event_id', eventId)
    .eq('status', 'waitlisted')

  if (error) return { error: error.message }
  return { success: true }
}

export async function updateEventSettings(
  eventId: string,
  settings: {
    afterparty_address?: string | null
    invitation_policy?: 'organizer_only' | 'participants_allowed'
    appetizer_duration?: number
    main_duration?: number
    dessert_duration?: number
  }
) {
  const { supabase, event } = await requireOrganizer(eventId)

  // Check T-7 lock
  const eventDate = new Date(event.event_date)
  const lockDate = new Date(eventDate)
  lockDate.setDate(lockDate.getDate() - 7)

  if (new Date() > lockDate) {
    return { error: 'Settings locked — less than 7 days before event' }
  }

  const { error } = await supabase
    .from('events')
    .update(settings)
    .eq('id', eventId)

  if (error) return { error: error.message }
  return { success: true }
}

export async function duplicateEvent(eventId: string) {
  const { event } = await requireOrganizer(eventId)

  // Return prefill data for the event wizard
  return {
    prefill: {
      title: event.title,
      center_address: event.center_address,
      center_lat: event.center_lat,
      center_lng: event.center_lng,
      radius_km: event.radius_km,
      type: event.type,
      invitation_policy: event.invitation_policy,
      appetizer_duration: event.appetizer_duration,
      main_duration: event.main_duration,
      dessert_duration: event.dessert_duration,
    },
  }
}

export async function reinviteDuos(
  sourceEventId: string,
  targetEventId: string,
  duoIds: string[]
) {
  const { supabase, user } = await requireOrganizer(sourceEventId)

  // Verify target event belongs to same organizer
  const { data: targetEvent } = await supabase
    .from('events')
    .select('id, title')
    .eq('id', targetEventId)
    .eq('organizer_id', user.id)
    .single()

  if (!targetEvent) return { error: 'Target event not found' }

  // Get profile emails for selected duos
  const { data: duos } = await supabase
    .from('duos')
    .select(`
      person1:profiles!person1_id(display_name, email),
      person2:profiles!person2_id(display_name, email)
    `)
    .in('id', duoIds)
    .eq('event_id', sourceEventId)

  if (!duos || duos.length === 0) return { error: 'No duos found' }

  // Send invitation emails
  let sentCount = 0
  for (const duo of duos) {
    const d = duo as any
    for (const person of [d.person1, d.person2].filter(Boolean)) {
      if (!person?.email) continue
      await resend.emails.send({
        from: 'Dinner Jump <noreply@dinnerjump.nl>',
        to: person.email,
        subject: `Je bent uitgenodigd voor ${targetEvent.title}`,
        text: `Hoi ${person.display_name},\n\nJe wordt opnieuw uitgenodigd voor een DinnerJump event: ${targetEvent.title}.\n\nMeld je aan via: ${process.env.NEXT_PUBLIC_APP_URL}/events/${targetEventId}`,
      })
      sentCount++
    }
  }

  return { success: true, count: sentCount }
}
```

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/actions/organizer.ts apps/web/src/lib/csv.ts apps/web/tests/lib/csv.test.ts
git commit -m "feat: add organizer server actions and CSV export utility"
```

---

## Task 4: Events Overzicht Page

**Files:**
- Create: `apps/web/src/app/[locale]/organizer/page.tsx`
- Create: `apps/web/src/components/organizer/events-overview.tsx`

- [ ] **Step 1: Create the server page**

```typescript
// apps/web/src/app/[locale]/organizer/page.tsx
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import { EventsOverview } from '@/components/organizer/events-overview'

export default async function OrganizerPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const t = await getTranslations('organizer')

  const { data: profile } = await supabase
    .from('profiles')
    .select('display_name')
    .eq('id', user.id)
    .single()

  const { data: events } = await supabase
    .from('events')
    .select('*, duos(id, status)')
    .eq('organizer_id', user.id)
    .order('event_date', { ascending: false })

  const eventsWithCounts = (events ?? []).map((e) => ({
    ...e,
    confirmed_count: e.duos?.filter((d: any) => d.status === 'confirmed').length ?? 0,
    total_count: e.duos?.filter((d: any) => d.status !== 'cancelled').length ?? 0,
    duos: undefined,
  }))

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <EventsOverview
        displayName={profile?.display_name ?? ''}
        events={eventsWithCounts}
      />
    </div>
  )
}
```

- [ ] **Step 2: Create the client component**

```typescript
// apps/web/src/components/organizer/events-overview.tsx
'use client'

import { useTranslations } from 'next-intl'
import { Link } from '@/i18n/navigation'
import { Users } from 'lucide-react'

type EventSummary = {
  id: string
  slug: string
  title: string
  event_date: string
  start_time: string
  status: string
  registration_deadline: string
  confirmed_count: number
  total_count: number
}

type Props = {
  displayName: string
  events: EventSummary[]
}

const statusColors: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-700',
  registration_open: 'bg-green-100 text-green-700',
  confirmed: 'bg-blue-100 text-blue-700',
  closed: 'bg-yellow-100 text-yellow-700',
  active: 'bg-blue-100 text-blue-700',
  completed: 'bg-gray-100 text-gray-500',
  cancelled: 'bg-red-100 text-red-700',
}

export function EventsOverview({ displayName, events }: Props) {
  const t = useTranslations('organizer')

  const isActive = (status: string) =>
    !['completed', 'cancelled'].includes(status)

  return (
    <div>
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold">
            {t('greeting', { name: displayName })}
          </h1>
          <p className="mt-1 text-sm text-gray-500">{t('subtitle')}</p>
        </div>
        <Link
          href="/events/create"
          className="rounded bg-black px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
        >
          {t('newEvent')}
        </Link>
      </div>

      <div className="flex flex-col gap-3">
        {events.map((event) => (
          <Link
            key={event.id}
            href={`/organizer/${event.slug}`}
            className={`rounded-lg border p-4 transition hover:border-black ${
              isActive(event.status)
                ? 'border-2 border-black'
                : 'border-gray-200'
            }`}
          >
            <div className="mb-2 flex items-start justify-between">
              <div>
                <div
                  className={`text-base font-semibold ${
                    isActive(event.status) ? '' : 'text-gray-500'
                  }`}
                >
                  {event.title}
                </div>
                <div className="mt-0.5 text-sm text-gray-500">
                  {new Date(event.event_date).toLocaleDateString('nl-NL', {
                    weekday: 'long',
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  })}{' '}
                  · {event.start_time?.slice(0, 5)}
                </div>
              </div>
              <span
                className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                  statusColors[event.status] ?? 'bg-gray-100 text-gray-700'
                }`}
              >
                {t(`status${event.status.charAt(0).toUpperCase() + event.status.slice(1).replace(/_./g, (m) => m[1].toUpperCase())}` as any)}
              </span>
            </div>

            <div className="flex items-center justify-between text-sm">
              <span
                className={`inline-flex items-center gap-1.5 ${
                  isActive(event.status) ? 'text-gray-600' : 'text-gray-400'
                }`}
              >
                <Users size={14} />
                {isActive(event.status)
                  ? t('duosRegistered', { count: event.confirmed_count })
                  : t('duosCount', { count: event.confirmed_count })}
              </span>

              {isActive(event.status) && event.registration_deadline && (
                <span className="text-gray-400">
                  {t('deadline', {
                    date: new Date(
                      event.registration_deadline
                    ).toLocaleDateString('nl-NL', {
                      day: 'numeric',
                      month: 'long',
                    }),
                  })}
                </span>
              )}

              {!isActive(event.status) && (
                <span className="text-blue-600">{t('viewEvent')} →</span>
              )}
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Verify in browser**

Run: Open `http://localhost:3000/nl/organizer` (logged in as organizer)
Expected: Events overzicht with greeting, event cards, status badges

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/app/[locale]/organizer/page.tsx apps/web/src/components/organizer/events-overview.tsx
git commit -m "feat: add organizer events overview page"
```

---

## Task 5: Event Detail Page + Header Block

**Files:**
- Create: `apps/web/src/app/[locale]/organizer/[slug]/page.tsx`
- Create: `apps/web/src/components/organizer/event-header.tsx`

- [ ] **Step 1: Create event detail server page**

This page fetches all data for all 8 blocks and passes props to each component. Start with just the header block; other blocks will be added in subsequent tasks.

```typescript
// apps/web/src/app/[locale]/organizer/[slug]/page.tsx
import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import { EventHeader } from '@/components/organizer/event-header'

type Props = { params: Promise<{ slug: string }> }

export default async function EventDetailPage({ params }: Props) {
  const { slug } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: event } = await supabase
    .from('events')
    .select('*')
    .eq('slug', slug)
    .eq('organizer_id', user.id)
    .single()

  if (!event) notFound()

  // Duo counts
  const { data: duos } = await supabase
    .from('duos')
    .select('id, status, created_at, person1_id, person2_id')
    .eq('event_id', event.id)
    .in('status', ['confirmed', 'waitlisted', 'registered'])
    .order('created_at')

  // Invitations
  const { data: invitations } = await supabase
    .from('invitations')
    .select('id, status, invited_by_duo_id')
    .eq('event_id', event.id)

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <a
        href={`/${(await params).slug ? '' : ''}organizer`}
        className="mb-4 inline-flex items-center gap-1 text-sm text-blue-600 hover:underline"
      >
        ← Terug naar overzicht
      </a>

      <EventHeader event={event} />

      {/* Blocks 2-8 will be added in subsequent tasks */}
    </div>
  )
}
```

Note: This page will be incrementally extended in Tasks 6-13 as each block component is created. Each task will add its component import and render call here.

- [ ] **Step 2: Create EventHeader component**

```typescript
// apps/web/src/components/organizer/event-header.tsx
'use client'

import { useTranslations } from 'next-intl'
import { Clock, Copy } from 'lucide-react'
import { useRouter } from '@/i18n/navigation'
import { duplicateEvent } from '@/actions/organizer'
import { useState, useEffect } from 'react'

type Props = {
  event: {
    id: string
    title: string
    event_date: string
    start_time: string
    status: string
    registration_deadline: string
  }
}

const statusColors: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-700',
  registration_open: 'bg-green-100 text-green-700',
  confirmed: 'bg-blue-100 text-blue-700',
  closed: 'bg-yellow-100 text-yellow-700',
  active: 'bg-blue-100 text-blue-700',
  completed: 'bg-gray-100 text-gray-500',
  cancelled: 'bg-red-100 text-red-700',
}

export function EventHeader({ event }: Props) {
  const t = useTranslations('organizer')
  const router = useRouter()
  const [countdown, setCountdown] = useState('')

  useEffect(() => {
    function updateCountdown() {
      const deadline = new Date(event.registration_deadline)
      const now = new Date()
      const diff = deadline.getTime() - now.getTime()

      if (diff <= 0) {
        setCountdown('')
        return
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24))
      if (days > 0) {
        setCountdown(t('closesIn', { count: days }))
      } else {
        const hours = Math.floor(diff / (1000 * 60 * 60))
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
        setCountdown(t('closesInHours', { hours, minutes }))
      }
    }

    updateCountdown()
    const interval = setInterval(updateCountdown, 60_000)
    return () => clearInterval(interval)
  }, [event.registration_deadline, t])

  async function handleDuplicate() {
    const result = await duplicateEvent(event.id)
    if (result.prefill) {
      // Store prefill in sessionStorage and navigate to wizard
      sessionStorage.setItem('event_prefill', JSON.stringify(result.prefill))
      router.push('/events/create')
    }
  }

  const statusKey = `status${event.status.charAt(0).toUpperCase() + event.status.slice(1).replace(/_./g, (m) => m[1].toUpperCase())}`

  return (
    <div className="border-b pb-5">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">{event.title}</h1>
          <p className="mt-1 text-sm text-gray-500">
            {new Date(event.event_date).toLocaleDateString('nl-NL', {
              weekday: 'long',
              day: 'numeric',
              month: 'long',
              year: 'numeric',
            })}{' '}
            · {event.start_time?.slice(0, 5)}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
              statusColors[event.status] ?? 'bg-gray-100 text-gray-700'
            }`}
          >
            {t(statusKey as any)}
          </span>
          <button
            onClick={handleDuplicate}
            className="inline-flex items-center gap-1.5 rounded border border-gray-300 px-2.5 py-1.5 text-xs text-gray-600 hover:border-black"
          >
            <Copy size={14} />
            {t('duplicate')}
          </button>
        </div>
      </div>

      {countdown && (
        <div className="mt-3 inline-flex items-center gap-1.5 rounded bg-amber-50 px-3 py-1.5 text-sm font-medium text-amber-800">
          <Clock size={14} />
          {countdown}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 3: Verify in browser**

Open: `http://localhost:3000/nl/organizer/[your-event-slug]`
Expected: Event header with title, date, status badge, countdown, duplicate button

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/app/[locale]/organizer/[slug]/page.tsx apps/web/src/components/organizer/event-header.tsx
git commit -m "feat: add event detail page with header block"
```

---

## Task 6: Registration Thermometer with Milestones

**Files:**
- Create: `apps/web/src/components/organizer/registration-thermometer.tsx`
- Modify: `apps/web/src/app/[locale]/organizer/[slug]/page.tsx` — add component

- [ ] **Step 1: Create thermometer component**

Build a new milestone-aware thermometer (not reusing the existing one since the spec requires different behavior — milestones at 9, 12, 15, 18).

```typescript
// apps/web/src/components/organizer/registration-thermometer.tsx
'use client'

import { useTranslations } from 'next-intl'

type Props = {
  confirmedCount: number
}

const MILESTONES = [9, 12, 15, 18, 21, 24, 27, 30]

export function RegistrationThermometer({ confirmedCount }: Props) {
  const t = useTranslations('organizer')

  // Find the next milestone above current count
  const maxMilestone = MILESTONES.find((m) => m > confirmedCount) ?? MILESTONES[MILESTONES.length - 1]
  const visibleMilestones = MILESTONES.filter((m) => m <= maxMilestone)
  const percentage = Math.min((confirmedCount / maxMilestone) * 100, 100)
  const nextMilestone = MILESTONES.find((m) => m > confirmedCount)
  const needed = nextMilestone ? nextMilestone - confirmedCount : 0

  return (
    <div className="border-b py-5">
      <h2 className="mb-3 text-sm font-semibold">{t('registrations')}</h2>

      {/* Progress bar */}
      <div className="relative h-7 overflow-hidden rounded-full bg-gray-100">
        <div
          className="flex h-full items-center justify-end rounded-full bg-gradient-to-r from-green-500 to-green-600 pr-2.5 transition-all duration-500"
          style={{ width: `${Math.max(percentage, 8)}%` }}
        >
          <span className="text-sm font-bold text-white">{confirmedCount}</span>
        </div>
      </div>

      {/* Milestone markers */}
      <div className="relative mt-1 h-5">
        {visibleMilestones.map((m) => (
          <span
            key={m}
            className={`absolute -translate-x-1/2 text-xs font-semibold ${
              m <= confirmedCount ? 'text-green-600' : 'text-gray-400'
            }`}
            style={{ left: `${(m / maxMilestone) * 100}%` }}
          >
            {m}
          </span>
        ))}
      </div>

      {needed > 0 && (
        <p className="mt-0.5 text-xs text-gray-500">
          {t('needMore', { count: needed, target: nextMilestone })}
        </p>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Add to event detail page**

Add import and render `<RegistrationThermometer confirmedCount={confirmedCount} />` after EventHeader in the page.

- [ ] **Step 3: Verify in browser, then commit**

```bash
git add apps/web/src/components/organizer/registration-thermometer.tsx apps/web/src/app/[locale]/organizer/[slug]/page.tsx
git commit -m "feat: add registration thermometer with milestones"
```

---

## Task 7: Invitations Block

**Files:**
- Create: `apps/web/src/components/organizer/invitations-block.tsx`

- [ ] **Step 1: Create invitations component**

Features: event link + copy button, personal invite form (name + email), share buttons (WhatsApp, Facebook, Instagram), QR code download.

For QR code: use a simple SVG-based QR library or generate via API. Implementation should use `qrcode` npm package — add with `pnpm --filter web add qrcode @types/qrcode`.

- [ ] **Step 2: Add to event detail page**

- [ ] **Step 3: Verify + commit**

```bash
git commit -m "feat: add invitations block with share buttons and QR code"
```

---

## Task 8: Messaging Block

**Files:**
- Create: `apps/web/src/components/organizer/messaging-block.tsx`

- [ ] **Step 1: Create messaging component**

Two sections:
1. Email textarea + send button → calls `sendEmailToParticipants` action
2. Emergency push input + send button (red styling) → calls `sendEmergencyPush` action

Both show success/error feedback after sending.

- [ ] **Step 2: Add to event detail page**

- [ ] **Step 3: Verify + commit**

```bash
git commit -m "feat: add messaging block with email and emergency push"
```

---

## Task 9: Duo List

**Files:**
- Create: `apps/web/src/components/organizer/duo-list.tsx`

- [ ] **Step 1: Create duo list component**

Features:
- Sortable table (dropdown: time/status/name) with client-side sorting
- Status badges (confirmed=green, waitlisted=yellow+promote button, invited=dimmed)
- Gang column (from match assignments)
- Export CSV button → calls `exportDuosCsv` action, triggers browser download
- "+X meer duo's" when collapsed (>5 rows)

- [ ] **Step 2: Add to event detail page**

Pass duos data + match assignments from server component.

- [ ] **Step 3: Verify + commit**

```bash
git commit -m "feat: add duo list with sorting, export, and waitlist management"
```

---

## Task 10: Matching Overview

**Files:**
- Create: `apps/web/src/components/organizer/matching-overview.tsx`

- [ ] **Step 1: Create matching overview component**

Two views with toggle button (Lijst / Board):
1. **Simple list:** Per-course sections with tables listed as "Tafel X: Host (host) → Guest1, Guest2"
2. **Drag-drop board:** Renders existing `<MatchingBoard />` component

Both views show the green "Goedkeuren" button → calls `approveMatching` action.

Placeholder text when event status is not yet `closed`.

- [ ] **Step 2: Add to event detail page**

Pass matching data (versions array) from server component, matching the existing manage page query pattern.

- [ ] **Step 3: Verify + commit**

```bash
git commit -m "feat: add matching overview with simple list and drag-drop views"
```

---

## Task 11: Notification Log

**Files:**
- Create: `apps/web/src/components/organizer/notification-log.tsx`

- [ ] **Step 1: Create notification log component**

Table: Datum | Bericht | Type (with color badges: email=blue, push=orange).
Data fetched from `notification_log` table in the server component.

- [ ] **Step 2: Add to event detail page + data fetch**

- [ ] **Step 3: Commit**

```bash
git commit -m "feat: add notification log block"
```

---

## Task 12: Welcome Card Placeholder + Event Settings

**Files:**
- Create: `apps/web/src/components/organizer/welcome-card-placeholder.tsx`
- Create: `apps/web/src/components/organizer/event-settings.tsx`

- [ ] **Step 1: Create welcome card placeholder**

Simple disabled toggle with "Coming soon" label.

- [ ] **Step 2: Create event settings component**

Three setting rows (afterparty, policy, durations) with inline edit mode.
Calls `updateEventSettings` action. Read-only after T-7.

- [ ] **Step 3: Add both to event detail page + commit**

```bash
git commit -m "feat: add welcome card placeholder and event settings block"
```

---

## Task 13: Reinvite Flow

**Files:**
- Create: `apps/web/src/components/organizer/reinvite-modal.tsx`

- [ ] **Step 1: Create reinvite modal**

Shown on completed events. Lists all duos with checkboxes. Options:
- "Nodig uit voor event" → dropdown of organizer's open events
- "Maak nieuw event aan" → navigates to wizard

Calls `reinviteDuos` action.

- [ ] **Step 2: Add to event detail page (only for completed events)**

- [ ] **Step 3: Commit**

```bash
git commit -m "feat: add reinvite flow for past events"
```

---

## Task 14: Redirect Old Manage Page

**Files:**
- Modify: `apps/web/src/app/[locale]/events/[slug]/manage/page.tsx`

- [ ] **Step 1: Replace manage page with redirect**

```typescript
import { redirect } from 'next/navigation'

type Props = { params: Promise<{ slug: string; locale: string }> }

export default async function ManagePage({ params }: Props) {
  const { slug, locale } = await params
  redirect(`/${locale}/organizer/${slug}`)
}
```

- [ ] **Step 2: Verify redirect works**

- [ ] **Step 3: Commit**

```bash
git commit -m "feat: redirect old manage page to organizer dashboard"
```

---

## Task 15: Complete Event Detail Page Data Fetching

**Files:**
- Modify: `apps/web/src/app/[locale]/organizer/[slug]/page.tsx`

- [ ] **Step 1: Add all remaining data fetches**

Extend the page to fetch: matching versions (with tables and guests), invitations, notification log, match assignments. Pass all data to the respective block components.

- [ ] **Step 2: Verify all 8 blocks render correctly**

Open: `http://localhost:3000/nl/organizer/[slug]`
Expected: All 8 blocks visible and functional

- [ ] **Step 3: Commit**

```bash
git commit -m "feat: complete event detail page with all data fetching"
```

---

## Task 16: End-to-End Verification

- [ ] **Step 1: Test events overzicht**
- Login as organizer → navigate to `/organizer` → events appear
- Active events have thick border, completed events are dimmed

- [ ] **Step 2: Test event detail — all 8 blocks**
- Click event → all blocks load
- Thermometer shows correct progress
- Copy event link → clipboard works
- Send personal invite → email received
- Send email to all → email received, appears in notification log
- Send emergency push → push received (test with Expo Go)
- Sort duo list → sorts correctly
- Export CSV → downloads valid CSV file
- Promote waitlisted duo → status changes
- Toggle matching views (list ↔ board)
- Approve matching → reveals activated
- Edit settings → saved
- Duplicate event → wizard opens with prefilled values

- [ ] **Step 3: Test reinvite flow**
- Open completed event → click reinvite → select duos → send → emails received

- [ ] **Step 4: Test redirect**
- Navigate to old `/events/[slug]/manage` → redirected to `/organizer/[slug]`

- [ ] **Step 5: Test authorization**
- Login as non-organizer → `/organizer` shows empty or redirect
- Try accessing `/organizer/[slug]` for someone else's event → 404

- [ ] **Step 6: Final commit**

```bash
git commit -m "feat: Module 4 organizer dashboard complete"
```
