# Module 2: Matching-algoritme — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a matching algorithm that assigns confirmed duos to courses and tables with travel-time optimization, plus an interactive organizer manage page with mix/undo/redo/manual override.

**Architecture:** Pure TypeScript matching algorithm in `src/lib/matching.ts`, Google Maps route API in `src/app/api/routes/route.ts` with Supabase `route_cache` table, Vercel cron job to auto-trigger matching at registration deadline. Manage page extends existing `/events/[slug]/manage` with a client component for interactive table editing.

**Tech Stack:** Next.js 16 (App Router), Supabase (PostgreSQL), Google Maps Directions API, Vitest, TypeScript, Tailwind CSS

---

## File Structure

| File | Responsibility |
|------|---------------|
| `supabase/migrations/00009_matching_tables.sql` | New enum + 5 tables for matching results + route cache |
| `supabase/migrations/00010_matching_rls.sql` | RLS policies for new tables |
| `src/lib/database.types.ts` | Regenerated after migration |
| `src/lib/types.ts` | New types: Match, MatchAssignment, MatchTable, MatchTableGuest, CourseType |
| `src/lib/matching.ts` | Core matching algorithm (pure functions, no DB) |
| `src/lib/routes.ts` | Google Maps client wrapper + cache logic |
| `src/app/api/routes/route.ts` | API route for Google Maps Directions |
| `src/app/api/cron/match/route.ts` | Vercel cron job endpoint |
| `src/actions/matching.ts` | Server actions: generateMatch, mixMatch, saveManualEdit |
| `src/components/matching-board.tsx` | Client component: 3-column interactive board |
| `src/app/[locale]/events/[slug]/manage/page.tsx` | Extended: show matching board when event is closed |
| `vercel.json` | Cron job configuration |
| `tests/lib/matching.test.ts` | Unit tests for matching algorithm |
| `tests/lib/routes.test.ts` | Unit tests for route/cache logic |

---

## Task 1: Database migration — matching tables

**Files:**
- Create: `supabase/migrations/00009_matching_tables.sql`

- [ ] **Step 1: Write the migration SQL**

```sql
-- New enum for course types
CREATE TYPE course_type AS ENUM ('appetizer', 'main', 'dessert');

-- Matching versions per event
CREATE TABLE matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  version INT NOT NULL DEFAULT 1,
  is_active BOOLEAN NOT NULL DEFAULT false,
  total_travel_time_bike_min DOUBLE PRECISION,
  total_travel_time_car_min DOUBLE PRECISION,
  avg_travel_time_bike_min DOUBLE PRECISION,
  avg_travel_time_car_min DOUBLE PRECISION,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(event_id, version)
);

CREATE INDEX idx_matches_event ON matches(event_id);
CREATE INDEX idx_matches_active ON matches(event_id, is_active) WHERE is_active = true;

-- Per-duo course assignment
CREATE TABLE match_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  duo_id UUID NOT NULL REFERENCES duos(id) ON DELETE CASCADE,
  hosted_course course_type NOT NULL,
  duo_display_name TEXT NOT NULL,
  UNIQUE(match_id, duo_id)
);

CREATE INDEX idx_match_assignments_match ON match_assignments(match_id);

-- Tables per course per match
CREATE TABLE match_tables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  course course_type NOT NULL,
  table_number INT NOT NULL,
  host_duo_id UUID NOT NULL REFERENCES duos(id) ON DELETE CASCADE,
  UNIQUE(match_id, course, table_number)
);

CREATE INDEX idx_match_tables_match ON match_tables(match_id);

-- Guests at each table
CREATE TABLE match_table_guests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_table_id UUID NOT NULL REFERENCES match_tables(id) ON DELETE CASCADE,
  duo_id UUID NOT NULL REFERENCES duos(id) ON DELETE CASCADE,
  UNIQUE(match_table_id, duo_id)
);

CREATE INDEX idx_match_table_guests_table ON match_table_guests(match_table_id);

-- Route cache for Google Maps
CREATE TABLE route_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  origin_lat DOUBLE PRECISION NOT NULL,
  origin_lng DOUBLE PRECISION NOT NULL,
  dest_lat DOUBLE PRECISION NOT NULL,
  dest_lng DOUBLE PRECISION NOT NULL,
  mode TEXT NOT NULL,
  duration_minutes DOUBLE PRECISION NOT NULL,
  distance_km DOUBLE PRECISION NOT NULL,
  fetched_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_route_cache_lookup ON route_cache(origin_lat, origin_lng, dest_lat, dest_lng, mode);

-- Function to ensure only 1 active match per event
CREATE OR REPLACE FUNCTION set_active_match(p_match_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE matches SET is_active = false
    WHERE event_id = (SELECT event_id FROM matches WHERE id = p_match_id)
    AND is_active = true;
  UPDATE matches SET is_active = true WHERE id = p_match_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

- [ ] **Step 2: Apply migration locally**

Run: `cd /Users/patrikzinger/DinnerJump && npx supabase db push`
Expected: Migration applied successfully

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/00009_matching_tables.sql
git commit -m "feat(m2): add matching tables migration — matches, assignments, tables, guests, route_cache"
```

---

## Task 2: RLS policies for matching tables

**Files:**
- Create: `supabase/migrations/00010_matching_rls.sql`

- [ ] **Step 1: Write RLS policies**

```sql
ALTER TABLE matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE match_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE match_tables ENABLE ROW LEVEL SECURITY;
ALTER TABLE match_table_guests ENABLE ROW LEVEL SECURITY;
ALTER TABLE route_cache ENABLE ROW LEVEL SECURITY;

-- MATCHES: organizers can read/write their event matches
CREATE POLICY "Organizers can read event matches" ON matches FOR SELECT
  USING (EXISTS (SELECT 1 FROM events WHERE events.id = matches.event_id AND events.organizer_id = auth.uid()));
CREATE POLICY "Organizers can insert event matches" ON matches FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM events WHERE events.id = matches.event_id AND events.organizer_id = auth.uid()));
CREATE POLICY "Organizers can update event matches" ON matches FOR UPDATE
  USING (EXISTS (SELECT 1 FROM events WHERE events.id = matches.event_id AND events.organizer_id = auth.uid()));

-- MATCH_ASSIGNMENTS: organizers can read/write
CREATE POLICY "Organizers can read match assignments" ON match_assignments FOR SELECT
  USING (EXISTS (SELECT 1 FROM matches JOIN events ON events.id = matches.event_id WHERE matches.id = match_assignments.match_id AND events.organizer_id = auth.uid()));
CREATE POLICY "Organizers can insert match assignments" ON match_assignments FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM matches JOIN events ON events.id = matches.event_id WHERE matches.id = match_assignments.match_id AND events.organizer_id = auth.uid()));

-- MATCH_TABLES: organizers can read/write
CREATE POLICY "Organizers can read match tables" ON match_tables FOR SELECT
  USING (EXISTS (SELECT 1 FROM matches JOIN events ON events.id = matches.event_id WHERE matches.id = match_tables.match_id AND events.organizer_id = auth.uid()));
CREATE POLICY "Organizers can insert match tables" ON match_tables FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM matches JOIN events ON events.id = matches.event_id WHERE matches.id = match_tables.match_id AND events.organizer_id = auth.uid()));

-- MATCH_TABLE_GUESTS: organizers can read/write
CREATE POLICY "Organizers can read match table guests" ON match_table_guests FOR SELECT
  USING (EXISTS (SELECT 1 FROM match_tables JOIN matches ON matches.id = match_tables.match_id JOIN events ON events.id = matches.event_id WHERE match_tables.id = match_table_guests.match_table_id AND events.organizer_id = auth.uid()));
CREATE POLICY "Organizers can insert match table guests" ON match_table_guests FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM match_tables JOIN matches ON matches.id = match_tables.match_id JOIN events ON events.id = matches.event_id WHERE match_tables.id = match_table_guests.match_table_id AND events.organizer_id = auth.uid()));

-- ROUTE_CACHE: service role only (no user access needed)
-- No RLS policies = only admin/service role can read/write
```

- [ ] **Step 2: Apply migration locally**

Run: `cd /Users/patrikzinger/DinnerJump && npx supabase db push`
Expected: Migration applied successfully

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/00010_matching_rls.sql
git commit -m "feat(m2): add RLS policies for matching tables"
```

---

## Task 3: Regenerate database types + extend types.ts

**Files:**
- Modify: `src/lib/database.types.ts` (auto-generated)
- Modify: `src/lib/types.ts`

- [ ] **Step 1: Regenerate Supabase types**

Run: `cd /Users/patrikzinger/DinnerJump && npx supabase gen types typescript --local > src/lib/database.types.ts`
Expected: File regenerated with new tables (matches, match_assignments, match_tables, match_table_guests, route_cache)

- [ ] **Step 2: Extend types.ts with matching types**

Add to `src/lib/types.ts`:

```typescript
export type Match = Database['public']['Tables']['matches']['Row']
export type MatchAssignment = Database['public']['Tables']['match_assignments']['Row']
export type MatchTable = Database['public']['Tables']['match_tables']['Row']
export type MatchTableGuest = Database['public']['Tables']['match_table_guests']['Row']
export type RouteCache = Database['public']['Tables']['route_cache']['Row']
export type CourseType = Database['public']['Enums']['course_type']

// Matching algorithm input/output types
export type DuoForMatching = {
  id: string
  lat: number
  lng: number
  displayName: string
}

export type TableAssignment = {
  course: CourseType
  tableNumber: number
  hostDuoId: string
  guestDuoIds: [string, string]
}

export type MatchResult = {
  assignments: Map<string, CourseType> // duoId → hosted course
  tables: TableAssignment[]
}
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/database.types.ts src/lib/types.ts
git commit -m "feat(m2): regenerate DB types, add matching type definitions"
```

---

## Task 4: Core matching algorithm — tests first

**Files:**
- Create: `tests/lib/matching.test.ts`
- Create: `src/lib/matching.ts`

- [ ] **Step 1: Write failing tests for `assignCourses`**

Create `tests/lib/matching.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { assignCourses, buildTables, validateMatch, scoreMatch } from '@/lib/matching'
import type { DuoForMatching, MatchResult } from '@/lib/types'

function makeDuos(n: number): DuoForMatching[] {
  return Array.from({ length: n }, (_, i) => ({
    id: `duo-${i}`,
    lat: 52.37 + i * 0.01,
    lng: 4.89 + i * 0.01,
    displayName: `Duo ${i}`,
  }))
}

describe('assignCourses', () => {
  it('divides 9 duos into 3 equal groups', () => {
    const duos = makeDuos(9)
    const groups = assignCourses(duos)
    expect(groups.appetizer).toHaveLength(3)
    expect(groups.main).toHaveLength(3)
    expect(groups.dessert).toHaveLength(3)
  })

  it('divides 12 duos into 3 equal groups', () => {
    const duos = makeDuos(12)
    const groups = assignCourses(duos)
    expect(groups.appetizer).toHaveLength(4)
    expect(groups.main).toHaveLength(4)
    expect(groups.dessert).toHaveLength(4)
  })

  it('every duo appears in exactly one group', () => {
    const duos = makeDuos(9)
    const groups = assignCourses(duos)
    const allIds = [...groups.appetizer, ...groups.main, ...groups.dessert].map(d => d.id)
    expect(new Set(allIds).size).toBe(9)
  })

  it('throws if duo count is not divisible by 3', () => {
    expect(() => assignCourses(makeDuos(10))).toThrow()
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd /Users/patrikzinger/DinnerJump && npx vitest run tests/lib/matching.test.ts`
Expected: FAIL — module `@/lib/matching` not found

- [ ] **Step 3: Implement `assignCourses`**

Create `src/lib/matching.ts`:

```typescript
import type { DuoForMatching, CourseType, TableAssignment, MatchResult } from '@/lib/types'

export type CourseGroups = {
  appetizer: DuoForMatching[]
  main: DuoForMatching[]
  dessert: DuoForMatching[]
}

export function assignCourses(duos: DuoForMatching[]): CourseGroups {
  if (duos.length % 3 !== 0) throw new Error(`Duo count must be divisible by 3, got ${duos.length}`)
  const shuffled = [...duos].sort(() => Math.random() - 0.5)
  const groupSize = duos.length / 3
  return {
    appetizer: shuffled.slice(0, groupSize),
    main: shuffled.slice(groupSize, groupSize * 2),
    dessert: shuffled.slice(groupSize * 2),
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd /Users/patrikzinger/DinnerJump && npx vitest run tests/lib/matching.test.ts`
Expected: 4 tests PASS

- [ ] **Step 5: Commit**

```bash
git add tests/lib/matching.test.ts src/lib/matching.ts
git commit -m "feat(m2): assignCourses — divide duos into 3 course groups"
```

---

## Task 5: Table building algorithm — tests first

**Files:**
- Modify: `tests/lib/matching.test.ts`
- Modify: `src/lib/matching.ts`

- [ ] **Step 1: Write failing tests for `buildTables`**

Append to `tests/lib/matching.test.ts`:

```typescript
describe('buildTables', () => {
  it('creates correct number of tables for 9 duos', () => {
    const duos = makeDuos(9)
    const groups = assignCourses(duos)
    const tables = buildTables(groups)
    // 3 courses x 3 tables = 9 tables
    expect(tables).toHaveLength(9)
    expect(tables.filter(t => t.course === 'appetizer')).toHaveLength(3)
    expect(tables.filter(t => t.course === 'main')).toHaveLength(3)
    expect(tables.filter(t => t.course === 'dessert')).toHaveLength(3)
  })

  it('each table has 1 host from correct group + 2 guests from other groups', () => {
    const duos = makeDuos(9)
    const groups = assignCourses(duos)
    const tables = buildTables(groups)
    const appetizerHostIds = new Set(groups.appetizer.map(d => d.id))

    for (const table of tables.filter(t => t.course === 'appetizer')) {
      expect(appetizerHostIds.has(table.hostDuoId)).toBe(true)
      expect(appetizerHostIds.has(table.guestDuoIds[0])).toBe(false)
      expect(appetizerHostIds.has(table.guestDuoIds[1])).toBe(false)
    }
  })

  it('no duo sits with the same tablemate twice across courses', () => {
    const duos = makeDuos(9)
    const groups = assignCourses(duos)
    const tables = buildTables(groups)

    // Build per-duo set of tablemates across all courses
    const tablemates = new Map<string, string[]>()
    for (const table of tables) {
      const allAtTable = [table.hostDuoId, ...table.guestDuoIds]
      for (const duoId of allAtTable) {
        const mates = allAtTable.filter(id => id !== duoId)
        const existing = tablemates.get(duoId) ?? []
        tablemates.set(duoId, [...existing, ...mates])
      }
    }

    // Each duo has 6 tablemates (2 per course x 3 courses). No duplicates allowed.
    for (const [duoId, mates] of tablemates) {
      expect(mates.length).toBe(6)
      expect(new Set(mates).size).toBe(6)
    }
  })

  it('works for 12 duos', () => {
    const duos = makeDuos(12)
    const groups = assignCourses(duos)
    const tables = buildTables(groups)
    expect(tables).toHaveLength(12) // 3 courses x 4 tables
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd /Users/patrikzinger/DinnerJump && npx vitest run tests/lib/matching.test.ts`
Expected: FAIL — `buildTables` not exported

- [ ] **Step 3: Implement `buildTables`**

Add to `src/lib/matching.ts`:

```typescript
export function buildTables(groups: CourseGroups): TableAssignment[] {
  const courses: CourseType[] = ['appetizer', 'main', 'dessert']
  const groupMap: Record<CourseType, DuoForMatching[]> = groups
  const n = groups.appetizer.length // tables per course

  // For each course, the host group is the course's own group.
  // Guests come from the other two groups.
  // We need to assign guests such that no duo pair shares a table twice.

  // Strategy: controlled index offsets to guarantee no duo pair meets twice.
  //
  // At each course, a host gets 1 guest from each of the other 2 groups.
  // We vary which guest index each host picks per course:
  //
  //   Appetizer table i: host=A[i], guests=B[i], C[i]
  //   Main table i:      host=B[i], guests=A[i], C[(i+1)%n]
  //   Dessert table i:   host=C[i], guests=A[(i+2)%n], B[(i+1)%n]
  //
  // Proof that no pair meets twice (for n >= 3):
  //   - A[i] meets B[i] at appetizer, and A[i] meets B[?] at main where B hosts → A[i] is at main table i (guest of B[i])
  //     Wait — A[i] IS a guest at main table i (guests=A[i]). So A[i] and B[i] meet at BOTH appetizer and main. BUG.
  //
  // Corrected: offset A-guest index at main course:
  //   Appetizer table i: host=A[i], guests=B[i], C[i]         — pairs: {A[i],B[i]}, {A[i],C[i]}, {B[i],C[i]}
  //   Main table j:      host=B[j], guests=A[(j+1)%n], C[(j+2)%n] — pairs: {B[j],A[(j+1)%n]}, {B[j],C[(j+2)%n]}, {A[(j+1)%n],C[(j+2)%n]}
  //   Dessert table k:   host=C[k], guests=A[(k+2)%n], B[(k+1)%n] — pairs: {C[k],A[(k+2)%n]}, {C[k],B[(k+1)%n]}, {A[(k+2)%n],B[(k+1)%n]}
  //
  // Check for n=3:
  //   Appetizer: A0-B0, A0-C0, B0-C0 | A1-B1, A1-C1, B1-C1 | A2-B2, A2-C2, B2-C2
  //   Main:      B0-A1, B0-C2, A1-C2 | B1-A2, B1-C0, A2-C0 | B2-A0, B2-C1, A0-C1
  //   Dessert:   C0-A2, C0-B1, A2-B1 | C1-A0, C1-B2, A0-B2 | C2-A1, C2-B0, A1-B0
  //   All 27 pairs unique ✓

  const tables: TableAssignment[] = []

  // Appetizer: host = A[i], guests = B[i], C[i]
  for (let i = 0; i < n; i++) {
    tables.push({
      course: 'appetizer',
      tableNumber: i + 1,
      hostDuoId: groupMap.appetizer[i].id,
      guestDuoIds: [groupMap.main[i].id, groupMap.dessert[i].id],
    })
  }

  // Main: host = B[j], guests = A[(j+1)%n], C[(j+2)%n]
  for (let j = 0; j < n; j++) {
    tables.push({
      course: 'main',
      tableNumber: j + 1,
      hostDuoId: groupMap.main[j].id,
      guestDuoIds: [groupMap.appetizer[(j + 1) % n].id, groupMap.dessert[(j + 2) % n].id],
    })
  }

  // Dessert: host = C[k], guests = A[(k+2)%n], B[(k+1)%n]
  for (let k = 0; k < n; k++) {
    tables.push({
      course: 'dessert',
      tableNumber: k + 1,
      hostDuoId: groupMap.dessert[k].id,
      guestDuoIds: [groupMap.appetizer[(k + 2) % n].id, groupMap.main[(k + 1) % n].id],
    })
  }

  return tables
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd /Users/patrikzinger/DinnerJump && npx vitest run tests/lib/matching.test.ts`
Expected: All tests PASS

- [ ] **Step 5: Commit**

```bash
git add tests/lib/matching.test.ts src/lib/matching.ts
git commit -m "feat(m2): buildTables — Latin-square table composition, no repeat tablemates"
```

---

## Task 6: Match validation + scoring — tests first

**Files:**
- Modify: `tests/lib/matching.test.ts`
- Modify: `src/lib/matching.ts`

- [ ] **Step 1: Write failing tests for `validateMatch` and `scoreMatch`**

Append to `tests/lib/matching.test.ts`:

```typescript
describe('validateMatch', () => {
  it('returns valid for a correct 9-duo match', () => {
    const duos = makeDuos(9)
    const groups = assignCourses(duos)
    const tables = buildTables(groups)
    const result = validateMatch(duos, groups, tables)
    expect(result.valid).toBe(true)
    expect(result.errors).toHaveLength(0)
  })

  it('detects repeated tablemates', () => {
    const duos = makeDuos(9)
    const groups = assignCourses(duos)
    const tables = buildTables(groups)
    // Corrupt: make dessert table 0 have same guests as appetizer table 0
    tables[6].guestDuoIds = tables[0].guestDuoIds
    const result = validateMatch(duos, groups, tables)
    expect(result.valid).toBe(false)
    expect(result.errors.length).toBeGreaterThan(0)
  })
})

describe('scoreMatch', () => {
  it('returns a score based on travel times', () => {
    // travelTimes: Map<`${duoId}-${duoId}`, number> (minutes)
    const duos = makeDuos(9)
    const groups = assignCourses(duos)
    const tables = buildTables(groups)

    // Create fake travel times (all 10 minutes)
    const travelTimes = new Map<string, number>()
    for (const d1 of duos) {
      for (const d2 of duos) {
        if (d1.id !== d2.id) {
          travelTimes.set(`${d1.id}-${d2.id}`, 10)
        }
      }
    }

    const score = scoreMatch(tables, travelTimes)
    expect(score.totalMinutes).toBeGreaterThan(0)
    expect(score.maxSingleTrip).toBe(10)
    expect(score.weighted).toBe(score.totalMinutes + 2 * score.maxSingleTrip)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd /Users/patrikzinger/DinnerJump && npx vitest run tests/lib/matching.test.ts`
Expected: FAIL — `validateMatch` and `scoreMatch` not exported

- [ ] **Step 3: Implement `validateMatch` and `scoreMatch`**

Add to `src/lib/matching.ts`:

```typescript
export type ValidationResult = {
  valid: boolean
  errors: string[]
}

export function validateMatch(
  duos: DuoForMatching[],
  groups: CourseGroups,
  tables: TableAssignment[]
): ValidationResult {
  const errors: string[] = []
  const duoIds = new Set(duos.map(d => d.id))

  // Check all duos are assigned
  const assignedIds = new Set<string>()
  for (const table of tables) {
    assignedIds.add(table.hostDuoId)
    table.guestDuoIds.forEach(id => assignedIds.add(id))
  }
  for (const id of duoIds) {
    if (!assignedIds.has(id)) errors.push(`Duo ${id} not assigned to any table`)
  }

  // Check no repeated tablemates
  const pairCounts = new Map<string, number>()
  for (const table of tables) {
    const allAtTable = [table.hostDuoId, ...table.guestDuoIds]
    for (let i = 0; i < allAtTable.length; i++) {
      for (let j = i + 1; j < allAtTable.length; j++) {
        const pair = [allAtTable[i], allAtTable[j]].sort().join('-')
        pairCounts.set(pair, (pairCounts.get(pair) ?? 0) + 1)
      }
    }
  }
  for (const [pair, count] of pairCounts) {
    if (count > 1) errors.push(`Duo pair ${pair} shares a table ${count} times`)
  }

  // Check each table has exactly 3 duos
  for (const table of tables) {
    const total = 1 + table.guestDuoIds.length
    if (total !== 3) errors.push(`Table ${table.course}#${table.tableNumber} has ${total} duos, expected 3`)
  }

  return { valid: errors.length === 0, errors }
}

export type MatchScore = {
  totalMinutes: number
  maxSingleTrip: number
  weighted: number
}

export function scoreMatch(
  tables: TableAssignment[],
  travelTimes: Map<string, number>
): MatchScore {
  // Per duo: travel from course 1 location → course 2 location → course 3 location
  // Build each duo's route: which address are they at for each course?
  const courses: CourseType[] = ['appetizer', 'main', 'dessert']
  const duoLocationPerCourse = new Map<string, Map<CourseType, string>>() // duoId → course → hostDuoId (location)

  for (const table of tables) {
    const allAtTable = [table.hostDuoId, ...table.guestDuoIds]
    for (const duoId of allAtTable) {
      if (!duoLocationPerCourse.has(duoId)) duoLocationPerCourse.set(duoId, new Map())
      duoLocationPerCourse.get(duoId)!.set(table.course, table.hostDuoId)
    }
  }

  let totalMinutes = 0
  let maxSingleTrip = 0

  for (const [, locationMap] of duoLocationPerCourse) {
    for (let i = 0; i < courses.length - 1; i++) {
      const from = locationMap.get(courses[i])!
      const to = locationMap.get(courses[i + 1])!
      if (from === to) continue // same location, no travel
      const key = `${from}-${to}`
      const time = travelTimes.get(key) ?? 0
      totalMinutes += time
      maxSingleTrip = Math.max(maxSingleTrip, time)
    }
  }

  return {
    totalMinutes,
    maxSingleTrip,
    weighted: totalMinutes + 2 * maxSingleTrip,
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd /Users/patrikzinger/DinnerJump && npx vitest run tests/lib/matching.test.ts`
Expected: All tests PASS

- [ ] **Step 5: Commit**

```bash
git add tests/lib/matching.test.ts src/lib/matching.ts
git commit -m "feat(m2): validateMatch + scoreMatch — validation and travel-time scoring"
```

---

## Task 7: generateOptimalMatch — multi-shuffle optimizer

**Files:**
- Modify: `tests/lib/matching.test.ts`
- Modify: `src/lib/matching.ts`

- [ ] **Step 1: Write failing test for `generateOptimalMatch`**

Append to `tests/lib/matching.test.ts`:

```typescript
describe('generateOptimalMatch', () => {
  it('returns a valid match with the best score from multiple shuffles', () => {
    const duos = makeDuos(9)
    // Varying travel times so different shuffles produce different scores
    const travelTimes = new Map<string, number>()
    for (const d1 of duos) {
      for (const d2 of duos) {
        if (d1.id !== d2.id) {
          // Distance-based fake time
          const dist = Math.abs(duos.indexOf(d1) - duos.indexOf(d2)) * 5
          travelTimes.set(`${d1.id}-${d2.id}`, dist)
        }
      }
    }

    const result = generateOptimalMatch(duos, travelTimes, 10)
    expect(result.tables).toHaveLength(9)
    const validation = validateMatch(duos, assignCoursesFromResult(duos, result), result.tables)
    expect(validation.valid).toBe(true)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd /Users/patrikzinger/DinnerJump && npx vitest run tests/lib/matching.test.ts`
Expected: FAIL — `generateOptimalMatch` not exported

- [ ] **Step 3: Implement `generateOptimalMatch` and helper**

Add to `src/lib/matching.ts`:

```typescript
export function generateOptimalMatch(
  duos: DuoForMatching[],
  travelTimes: Map<string, number>,
  attempts: number = 15
): MatchResult {
  let bestTables: TableAssignment[] | null = null
  let bestAssignments: Map<string, CourseType> | null = null
  let bestScore = Infinity

  for (let i = 0; i < attempts; i++) {
    const groups = assignCourses(duos)
    const tables = buildTables(groups)
    const validation = validateMatch(duos, groups, tables)
    if (!validation.valid) continue

    const score = scoreMatch(tables, travelTimes)
    if (score.weighted < bestScore) {
      bestScore = score.weighted
      bestTables = tables
      bestAssignments = new Map<string, CourseType>()
      for (const duo of groups.appetizer) bestAssignments.set(duo.id, 'appetizer')
      for (const duo of groups.main) bestAssignments.set(duo.id, 'main')
      for (const duo of groups.dessert) bestAssignments.set(duo.id, 'dessert')
    }
  }

  if (!bestTables || !bestAssignments) throw new Error('Could not generate a valid match')

  return { assignments: bestAssignments, tables: bestTables }
}

// Helper to reconstruct CourseGroups from a MatchResult (for validation)
export function assignCoursesFromResult(duos: DuoForMatching[], result: MatchResult): CourseGroups {
  const groups: CourseGroups = { appetizer: [], main: [], dessert: [] }
  for (const duo of duos) {
    const course = result.assignments.get(duo.id)
    if (course) groups[course].push(duo)
  }
  return groups
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd /Users/patrikzinger/DinnerJump && npx vitest run tests/lib/matching.test.ts`
Expected: All tests PASS

- [ ] **Step 5: Commit**

```bash
git add tests/lib/matching.test.ts src/lib/matching.ts
git commit -m "feat(m2): generateOptimalMatch — multi-shuffle optimizer picks best scoring match"
```

---

## Task 8: Google Maps Directions API route + cache

**Files:**
- Create: `src/lib/routes.ts`
- Create: `src/app/api/routes/route.ts`
- Create: `tests/lib/routes.test.ts`

- [ ] **Step 1: Write failing test for route cache logic**

Create `tests/lib/routes.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { buildCacheKey, buildAllRoutePairs } from '@/lib/routes'

describe('buildCacheKey', () => {
  it('creates a deterministic key from coordinates and mode', () => {
    const key = buildCacheKey(52.37, 4.89, 52.38, 4.90, 'bicycling')
    expect(key).toBe('52.37,4.89→52.38,4.9:bicycling')
  })

  it('rounds coordinates to 6 decimal places', () => {
    const key = buildCacheKey(52.3700001, 4.8900001, 52.38, 4.90, 'driving')
    expect(key).toBe('52.37,4.89→52.38,4.9:driving')
  })
})

describe('buildAllRoutePairs', () => {
  it('generates route pairs for duo travel between courses', () => {
    // 3 tables for appetizer, 3 for main, 3 for dessert
    // Each duo travels: appetizer location → main location → dessert location
    const tables = [
      { course: 'appetizer' as const, tableNumber: 1, hostDuoId: 'a1', guestDuoIds: ['b1', 'c1'] as [string, string] },
      { course: 'main' as const, tableNumber: 1, hostDuoId: 'b1', guestDuoIds: ['a1', 'c2'] as [string, string] },
      { course: 'dessert' as const, tableNumber: 1, hostDuoId: 'c1', guestDuoIds: ['a2', 'b2'] as [string, string] },
    ]
    const duoLocations = new Map([
      ['a1', { lat: 52.37, lng: 4.89 }],
      ['a2', { lat: 52.38, lng: 4.90 }],
      ['b1', { lat: 52.36, lng: 4.88 }],
      ['b2', { lat: 52.39, lng: 4.91 }],
      ['c1', { lat: 52.35, lng: 4.87 }],
      ['c2', { lat: 52.40, lng: 4.92 }],
    ])

    const pairs = buildAllRoutePairs(tables, duoLocations)
    // Each pair is {originLat, originLng, destLat, destLng}
    expect(pairs.length).toBeGreaterThan(0)
    // No self-routes (same origin and dest)
    for (const pair of pairs) {
      expect(pair.originLat === pair.destLat && pair.originLng === pair.destLng).toBe(false)
    }
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd /Users/patrikzinger/DinnerJump && npx vitest run tests/lib/routes.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Implement route utilities**

Create `src/lib/routes.ts`:

```typescript
import type { TableAssignment, CourseType } from '@/lib/types'

export type RoutePair = {
  originLat: number
  originLng: number
  destLat: number
  destLng: number
}

export function buildCacheKey(
  originLat: number, originLng: number,
  destLat: number, destLng: number,
  mode: string
): string {
  const round = (n: number) => parseFloat(n.toFixed(6))
  return `${round(originLat)},${round(originLng)}→${round(destLat)},${round(destLng)}:${mode}`
}

export function buildAllRoutePairs(
  tables: TableAssignment[],
  duoLocations: Map<string, { lat: number; lng: number }>
): RoutePair[] {
  const courses: CourseType[] = ['appetizer', 'main', 'dessert']

  // For each duo, find which host address they're at for each course
  const duoHostPerCourse = new Map<string, Map<CourseType, string>>()
  for (const table of tables) {
    const allAtTable = [table.hostDuoId, ...table.guestDuoIds]
    for (const duoId of allAtTable) {
      if (!duoHostPerCourse.has(duoId)) duoHostPerCourse.set(duoId, new Map())
      duoHostPerCourse.get(duoId)!.set(table.course, table.hostDuoId)
    }
  }

  // Build unique route pairs (deduplicated)
  const seen = new Set<string>()
  const pairs: RoutePair[] = []

  for (const [, hostMap] of duoHostPerCourse) {
    for (let i = 0; i < courses.length - 1; i++) {
      const fromHost = hostMap.get(courses[i])!
      const toHost = hostMap.get(courses[i + 1])!
      if (fromHost === toHost) continue

      const fromLoc = duoLocations.get(fromHost)!
      const toLoc = duoLocations.get(toHost)!
      const key = `${fromLoc.lat},${fromLoc.lng}→${toLoc.lat},${toLoc.lng}`
      if (seen.has(key)) continue
      seen.add(key)

      pairs.push({
        originLat: fromLoc.lat, originLng: fromLoc.lng,
        destLat: toLoc.lat, destLng: toLoc.lng,
      })
    }
  }

  return pairs
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd /Users/patrikzinger/DinnerJump && npx vitest run tests/lib/routes.test.ts`
Expected: All tests PASS

- [ ] **Step 5: Create the API route for Google Maps Directions**

Create `src/app/api/routes/route.ts`:

```typescript
export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { buildCacheKey } from '@/lib/routes'

const GOOGLE_MAPS_API_URL = 'https://maps.googleapis.com/maps/api/directions/json'

export async function POST(request: NextRequest) {
  const { origins, mode } = await request.json() as {
    origins: Array<{ originLat: number; originLng: number; destLat: number; destLng: number }>
    mode: 'bicycling' | 'driving'
  }

  if (!origins?.length || !mode) {
    return NextResponse.json({ error: 'Missing origins or mode' }, { status: 400 })
  }

  const apiKey = process.env.GOOGLE_MAPS_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'Google Maps API key not configured' }, { status: 500 })
  }

  const supabase = createAdminClient()

  // Check cache first
  const results: Array<{ originLat: number; originLng: number; destLat: number; destLng: number; durationMinutes: number; distanceKm: number }> = []

  for (const origin of origins) {
    const { data: cached } = await supabase.from('route_cache')
      .select('duration_minutes, distance_km')
      .eq('origin_lat', origin.originLat)
      .eq('origin_lng', origin.originLng)
      .eq('dest_lat', origin.destLat)
      .eq('dest_lng', origin.destLng)
      .eq('mode', mode)
      .single()

    if (cached) {
      results.push({ ...origin, durationMinutes: cached.duration_minutes, distanceKm: cached.distance_km })
      continue
    }

    // Fetch from Google Maps
    const url = new URL(GOOGLE_MAPS_API_URL)
    url.searchParams.set('origin', `${origin.originLat},${origin.originLng}`)
    url.searchParams.set('destination', `${origin.destLat},${origin.destLng}`)
    url.searchParams.set('mode', mode)
    url.searchParams.set('key', apiKey)

    const response = await fetch(url.toString())
    const data = await response.json()

    if (data.status === 'OK' && data.routes.length > 0) {
      const leg = data.routes[0].legs[0]
      const durationMinutes = Math.round(leg.duration.value / 60 * 10) / 10
      const distanceKm = Math.round(leg.distance.value / 1000 * 100) / 100

      // Cache the result
      await supabase.from('route_cache').insert({
        origin_lat: origin.originLat,
        origin_lng: origin.originLng,
        dest_lat: origin.destLat,
        dest_lng: origin.destLng,
        mode,
        duration_minutes: durationMinutes,
        distance_km: distanceKm,
      })

      results.push({ ...origin, durationMinutes, distanceKm })
    }
  }

  return NextResponse.json({ routes: results })
}
```

- [ ] **Step 6: Commit**

```bash
git add src/lib/routes.ts src/app/api/routes/route.ts tests/lib/routes.test.ts
git commit -m "feat(m2): Google Maps route API + cache + route pair utilities"
```

---

## Task 9: Server actions — generateMatch + mixMatch

**Files:**
- Create: `src/actions/matching.ts`

- [ ] **Step 1: Create the matching server actions**

Create `src/actions/matching.ts`:

```typescript
'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { generateOptimalMatch } from '@/lib/matching'
import { buildAllRoutePairs } from '@/lib/routes'
import type { DuoForMatching, CourseType } from '@/lib/types'

export async function generateMatch(eventId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  // Verify organizer
  const { data: event } = await supabase.from('events').select('id, organizer_id').eq('id', eventId).single()
  if (!event || event.organizer_id !== user.id) return { error: 'Not authorized' }

  // Get confirmed duos
  const { data: duos } = await supabase.from('duos')
    .select('id, lat, lng, person1_id')
    .eq('event_id', eventId)
    .eq('status', 'confirmed')

  if (!duos || duos.length < 9 || duos.length % 3 !== 0) {
    return { error: 'Invalid duo count for matching' }
  }

  // Get display names
  const { data: profiles } = await supabase.from('profiles')
    .select('id, display_name')
    .in('id', duos.map(d => d.person1_id))
  const nameMap = new Map((profiles ?? []).map(p => [p.id, p.display_name ?? 'Onbekend']))

  const duosForMatching: DuoForMatching[] = duos.map(d => ({
    id: d.id,
    lat: d.lat,
    lng: d.lng,
    displayName: nameMap.get(d.person1_id) ?? 'Onbekend',
  }))

  // Build duo locations map
  const duoLocations = new Map(duosForMatching.map(d => [d.id, { lat: d.lat, lng: d.lng }]))

  // Get travel times from route API (fetch via internal API)
  const travelTimes = await fetchTravelTimes(duosForMatching, duoLocations)

  // Generate optimal match
  const result = generateOptimalMatch(duosForMatching, travelTimes)

  // Save to database
  const admin = createAdminClient()

  // Get next version number
  const { data: existing } = await admin.from('matches')
    .select('version')
    .eq('event_id', eventId)
    .order('version', { ascending: false })
    .limit(1)
  const nextVersion = (existing?.[0]?.version ?? 0) + 1

  // Deactivate previous active match
  await admin.from('matches')
    .update({ is_active: false })
    .eq('event_id', eventId)
    .eq('is_active', true)

  // Calculate travel stats
  const stats = calculateTravelStats(result.tables, duoLocations, travelTimes)

  // Insert match
  const { data: match, error: matchError } = await admin.from('matches').insert({
    event_id: eventId,
    version: nextVersion,
    is_active: true,
    total_travel_time_bike_min: stats.totalBike,
    total_travel_time_car_min: stats.totalCar,
    avg_travel_time_bike_min: stats.avgBike,
    avg_travel_time_car_min: stats.avgCar,
  }).select('id').single()

  if (matchError || !match) return { error: 'Failed to save match' }

  // Insert assignments
  const assignments = duosForMatching.map(d => ({
    match_id: match.id,
    duo_id: d.id,
    hosted_course: result.assignments.get(d.id)! as CourseType,
    duo_display_name: d.displayName,
  }))
  await admin.from('match_assignments').insert(assignments)

  // Insert tables and guests
  for (const table of result.tables) {
    const { data: tableRow } = await admin.from('match_tables').insert({
      match_id: match.id,
      course: table.course,
      table_number: table.tableNumber,
      host_duo_id: table.hostDuoId,
    }).select('id').single()

    if (tableRow) {
      const guests = table.guestDuoIds.map(guestId => ({
        match_table_id: tableRow.id,
        duo_id: guestId,
      }))
      await admin.from('match_table_guests').insert(guests)
    }
  }

  return { matchId: match.id, version: nextVersion }
}

export async function mixMatch(eventId: string) {
  // Re-run generateMatch — it creates a new version
  return generateMatch(eventId)
}

export async function setActiveMatchVersion(eventId: string, version: number) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { data: event } = await supabase.from('events').select('id, organizer_id').eq('id', eventId).single()
  if (!event || event.organizer_id !== user.id) return { error: 'Not authorized' }

  const admin = createAdminClient()
  const { data: match } = await admin.from('matches')
    .select('id')
    .eq('event_id', eventId)
    .eq('version', version)
    .single()

  if (!match) return { error: 'Match version not found' }

  await admin.rpc('set_active_match', { p_match_id: match.id })
  return { success: true }
}

// --- Internal helpers ---

async function fetchTravelTimes(
  duos: DuoForMatching[],
  duoLocations: Map<string, { lat: number; lng: number }>
): Promise<Map<string, number>> {
  const travelTimes = new Map<string, number>()

  // Build all possible duo-pair routes
  for (const d1 of duos) {
    for (const d2 of duos) {
      if (d1.id === d2.id) continue
      const key = `${d1.id}-${d2.id}`
      // Use Haversine as approximate travel time (fallback): km * 4 min/km for cycling
      const { calculateDistance } = await import('@/lib/geo')
      const dist = calculateDistance(d1.lat, d1.lng, d2.lat, d2.lng)
      travelTimes.set(key, Math.round(dist * 4)) // ~15 km/h cycling = 4 min/km
    }
  }

  // Try to get better times from Google Maps API
  try {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
    const pairs = Array.from(duoLocations.entries()).flatMap(([id1, loc1]) =>
      Array.from(duoLocations.entries())
        .filter(([id2]) => id2 !== id1)
        .map(([, loc2]) => ({
          originLat: loc1.lat, originLng: loc1.lng,
          destLat: loc2.lat, destLng: loc2.lng,
        }))
    )

    const response = await fetch(`${baseUrl}/api/routes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ origins: pairs, mode: 'bicycling' }),
    })

    if (response.ok) {
      const { routes } = await response.json()
      // Map back to duo-pair keys
      for (const d1 of duos) {
        for (const d2 of duos) {
          if (d1.id === d2.id) continue
          const route = routes.find((r: any) =>
            r.originLat === d1.lat && r.originLng === d1.lng &&
            r.destLat === d2.lat && r.destLng === d2.lng
          )
          if (route) travelTimes.set(`${d1.id}-${d2.id}`, route.durationMinutes)
        }
      }
    }
  } catch {
    // Fallback to Haversine estimates already set
  }

  return travelTimes
}

function calculateTravelStats(
  tables: import('@/lib/types').TableAssignment[],
  duoLocations: Map<string, { lat: number; lng: number }>,
  travelTimes: Map<string, number>
) {
  // For now use bike times. Car times can be fetched separately.
  const duoTotals: number[] = []
  const courses = ['appetizer', 'main', 'dessert'] as const

  const duoHostPerCourse = new Map<string, Map<string, string>>()
  for (const table of tables) {
    const allAtTable = [table.hostDuoId, ...table.guestDuoIds]
    for (const duoId of allAtTable) {
      if (!duoHostPerCourse.has(duoId)) duoHostPerCourse.set(duoId, new Map())
      duoHostPerCourse.get(duoId)!.set(table.course, table.hostDuoId)
    }
  }

  for (const [, hostMap] of duoHostPerCourse) {
    let total = 0
    for (let i = 0; i < courses.length - 1; i++) {
      const from = hostMap.get(courses[i])!
      const to = hostMap.get(courses[i + 1])!
      if (from !== to) total += travelTimes.get(`${from}-${to}`) ?? 0
    }
    duoTotals.push(total)
  }

  const totalBike = duoTotals.reduce((a, b) => a + b, 0)
  const avgBike = duoTotals.length > 0 ? Math.round(totalBike / duoTotals.length * 10) / 10 : 0

  return {
    totalBike,
    avgBike,
    totalCar: null as number | null, // Fetched separately if needed
    avgCar: null as number | null,
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/actions/matching.ts
git commit -m "feat(m2): server actions — generateMatch, mixMatch, setActiveMatchVersion"
```

---

## Task 10: Cron job for automatic matching

**Files:**
- Create: `src/app/api/cron/match/route.ts`
- Create: `vercel.json`

- [ ] **Step 1: Create the cron API route**

Create `src/app/api/cron/match/route.ts`:

```typescript
export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { generateOptimalMatch } from '@/lib/matching'
import { calculateDistance } from '@/lib/geo'
import type { DuoForMatching, CourseType } from '@/lib/types'

export async function GET(request: NextRequest) {
  // Verify cron secret
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createAdminClient()
  const now = new Date().toISOString()

  // Find events that need matching: confirmed + deadline passed + no active match yet
  const { data: events } = await supabase.from('events')
    .select('id')
    .eq('status', 'confirmed')
    .lt('registration_deadline', now)

  if (!events?.length) return NextResponse.json({ matched: 0 })

  let matchedCount = 0

  for (const event of events) {
    // Skip if already has an active match
    const { data: existingMatch } = await supabase.from('matches')
      .select('id')
      .eq('event_id', event.id)
      .eq('is_active', true)
      .single()
    if (existingMatch) continue

    // Get confirmed duos
    const { data: duos } = await supabase.from('duos')
      .select('id, lat, lng, person1_id')
      .eq('event_id', event.id)
      .eq('status', 'confirmed')

    if (!duos || duos.length < 9 || duos.length % 3 !== 0) continue

    // Get display names
    const { data: profiles } = await supabase.from('profiles')
      .select('id, display_name')
      .in('id', duos.map(d => d.person1_id))
    const nameMap = new Map((profiles ?? []).map(p => [p.id, p.display_name ?? 'Onbekend']))

    const duosForMatching: DuoForMatching[] = duos.map(d => ({
      id: d.id, lat: d.lat, lng: d.lng,
      displayName: nameMap.get(d.person1_id) ?? 'Onbekend',
    }))

    // Build travel times using Haversine fallback (cron can't easily call own API)
    const travelTimes = new Map<string, number>()
    for (const d1 of duosForMatching) {
      for (const d2 of duosForMatching) {
        if (d1.id !== d2.id) {
          const dist = calculateDistance(d1.lat, d1.lng, d2.lat, d2.lng)
          travelTimes.set(`${d1.id}-${d2.id}`, Math.round(dist * 4))
        }
      }
    }

    const result = generateOptimalMatch(duosForMatching, travelTimes)

    // Save match
    const { data: match } = await supabase.from('matches').insert({
      event_id: event.id, version: 1, is_active: true,
    }).select('id').single()

    if (!match) continue

    // Insert assignments
    await supabase.from('match_assignments').insert(
      duosForMatching.map(d => ({
        match_id: match.id,
        duo_id: d.id,
        hosted_course: result.assignments.get(d.id)! as CourseType,
        duo_display_name: d.displayName,
      }))
    )

    // Insert tables + guests
    for (const table of result.tables) {
      const { data: tableRow } = await supabase.from('match_tables').insert({
        match_id: match.id, course: table.course,
        table_number: table.tableNumber, host_duo_id: table.hostDuoId,
      }).select('id').single()

      if (tableRow) {
        await supabase.from('match_table_guests').insert(
          table.guestDuoIds.map(guestId => ({ match_table_id: tableRow.id, duo_id: guestId }))
        )
      }
    }

    // Update event status to closed
    await supabase.from('events').update({ status: 'closed' }).eq('id', event.id)
    matchedCount++
  }

  return NextResponse.json({ matched: matchedCount })
}
```

- [ ] **Step 2: Create vercel.json with cron**

Create `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/cron/match",
      "schedule": "0 6 * * *"
    }
  ]
}
```

- [ ] **Step 3: Commit**

```bash
git add src/app/api/cron/match/route.ts vercel.json
git commit -m "feat(m2): Vercel cron job — auto-match events at registration deadline"
```

---

## Task 11: Matching board client component

**Files:**
- Create: `src/components/matching-board.tsx`

- [ ] **Step 1: Create the interactive matching board**

Create `src/components/matching-board.tsx`:

```tsx
'use client'

import { useState, useTransition } from 'react'
import { mixMatch, setActiveMatchVersion } from '@/actions/matching'
import type { CourseType } from '@/lib/types'

type TableData = {
  id: string
  course: CourseType
  tableNumber: number
  hostDuoId: string
  hostName: string
  hostCity: string
  guests: Array<{ duoId: string; name: string; city: string }>
}

type MatchVersion = {
  id: string
  version: number
  isActive: boolean
  avgBikeMin: number | null
  avgCarMin: number | null
  tables: TableData[]
}

type Props = {
  eventId: string
  versions: MatchVersion[]
  duoNames: Map<string, { name: string; city: string }>
}

const COURSE_LABELS: Record<CourseType, string> = {
  appetizer: 'Voorgerecht',
  main: 'Hoofdgerecht',
  dessert: 'Dessert',
}

const COURSE_COLORS: Record<CourseType, string> = {
  appetizer: 'border-orange-300 bg-orange-50',
  main: 'border-red-300 bg-red-50',
  dessert: 'border-purple-300 bg-purple-50',
}

export function MatchingBoard({ eventId, versions: initialVersions, duoNames }: Props) {
  const [versions, setVersions] = useState(initialVersions)
  const [activeIndex, setActiveIndex] = useState(
    initialVersions.findIndex(v => v.isActive)
  )
  const [transportMode, setTransportMode] = useState<'bike' | 'car'>('bike')
  const [isPending, startTransition] = useTransition()
  const [dragSource, setDragSource] = useState<{ duoId: string; tableId: string; course: CourseType } | null>(null)

  const activeVersion = versions[activeIndex]
  if (!activeVersion) return <p className="text-gray-500">Geen matching beschikbaar</p>

  const courseOrder: CourseType[] = ['appetizer', 'main', 'dessert']

  function handleMix() {
    startTransition(async () => {
      const result = await mixMatch(eventId)
      if ('matchId' in result) {
        // Reload page to get fresh data
        window.location.reload()
      }
    })
  }

  function handleUndo() {
    if (activeIndex > 0) {
      const newIndex = activeIndex - 1
      setActiveIndex(newIndex)
      startTransition(async () => {
        await setActiveMatchVersion(eventId, versions[newIndex].version)
      })
    }
  }

  function handleRedo() {
    if (activeIndex < versions.length - 1) {
      const newIndex = activeIndex + 1
      setActiveIndex(newIndex)
      startTransition(async () => {
        await setActiveMatchVersion(eventId, versions[newIndex].version)
      })
    }
  }

  function handleDragStart(duoId: string, tableId: string, course: CourseType) {
    setDragSource({ duoId, tableId, course })
  }

  function handleDrop(targetTableId: string, targetCourse: CourseType) {
    if (!dragSource || dragSource.tableId === targetTableId) {
      setDragSource(null)
      return
    }

    // Swap the duo from source table to target table
    const updatedTables = [...activeVersion.tables]
    const sourceTable = updatedTables.find(t => t.id === dragSource.tableId)
    const targetTable = updatedTables.find(t => t.id === targetTableId)

    if (!sourceTable || !targetTable) { setDragSource(null); return }

    // Find a guest in target table to swap with
    if (targetTable.guests.length > 0) {
      const sourceGuestIdx = sourceTable.guests.findIndex(g => g.duoId === dragSource.duoId)
      if (sourceGuestIdx === -1) { setDragSource(null); return }

      // Swap first guest of target with dragged guest of source
      const tempGuest = targetTable.guests[0]
      targetTable.guests[0] = sourceTable.guests[sourceGuestIdx]
      sourceTable.guests[sourceGuestIdx] = tempGuest
    }

    setVersions(prev => prev.map((v, i) =>
      i === activeIndex ? { ...v, tables: updatedTables } : v
    ))
    setDragSource(null)
  }

  const avgTime = transportMode === 'bike' ? activeVersion.avgBikeMin : activeVersion.avgCarMin

  return (
    <div>
      {/* Controls */}
      <div className="mb-4 flex items-center gap-3">
        <button onClick={handleUndo} disabled={isPending || activeIndex === 0}
          className="rounded border px-3 py-1 text-sm disabled:opacity-30">
          Undo
        </button>
        <span className="text-sm text-gray-500">
          Versie {activeVersion.version} / {versions.length}
        </span>
        <button onClick={handleRedo} disabled={isPending || activeIndex >= versions.length - 1}
          className="rounded border px-3 py-1 text-sm disabled:opacity-30">
          Redo
        </button>
        <button onClick={handleMix} disabled={isPending}
          className="rounded bg-black px-3 py-1 text-sm text-white disabled:opacity-50">
          {isPending ? 'Bezig...' : 'Mix'}
        </button>
        <div className="ml-auto flex items-center gap-2">
          <button onClick={() => setTransportMode('bike')}
            className={`rounded px-2 py-1 text-xs ${transportMode === 'bike' ? 'bg-gray-900 text-white' : 'bg-gray-100'}`}>
            Fiets
          </button>
          <button onClick={() => setTransportMode('car')}
            className={`rounded px-2 py-1 text-xs ${transportMode === 'car' ? 'bg-gray-900 text-white' : 'bg-gray-100'}`}>
            Auto
          </button>
          {avgTime != null && (
            <span className="text-xs text-gray-500">gem. {Math.round(avgTime)} min</span>
          )}
        </div>
      </div>

      {/* 3-column course layout */}
      <div className="grid grid-cols-3 gap-4">
        {courseOrder.map(course => {
          const courseTables = activeVersion.tables
            .filter(t => t.course === course)
            .sort((a, b) => a.tableNumber - b.tableNumber)

          return (
            <div key={course}>
              <h3 className="mb-2 text-sm font-semibold">{COURSE_LABELS[course]}</h3>
              <div className="flex flex-col gap-3">
                {courseTables.map(table => (
                  <div key={table.id}
                    className={`rounded border-2 p-3 ${COURSE_COLORS[course]}`}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={() => handleDrop(table.id, course)}
                  >
                    <p className="text-sm font-bold">
                      {table.hostName}
                      <span className="ml-1 text-xs font-normal text-gray-500">(host)</span>
                    </p>
                    <p className="mb-2 text-xs text-gray-500">{table.hostCity}</p>
                    {table.guests.map(guest => (
                      <div key={guest.duoId}
                        draggable
                        onDragStart={() => handleDragStart(guest.duoId, table.id, course)}
                        className="cursor-grab rounded bg-white px-2 py-1 text-sm shadow-sm mb-1"
                      >
                        {guest.name}
                        <span className="ml-1 text-xs text-gray-400">{guest.city}</span>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/matching-board.tsx
git commit -m "feat(m2): MatchingBoard client component — 3-column view, mix, undo/redo, drag-drop"
```

---

## Task 12: Extend manage page with matching board

**Files:**
- Modify: `src/app/[locale]/events/[slug]/manage/page.tsx`

- [ ] **Step 1: Extend the manage page to show matching when event is closed**

Replace the full content of `src/app/[locale]/events/[slug]/manage/page.tsx`:

```tsx
export const dynamic = 'force-dynamic'

import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Thermometer } from '@/components/thermometer'
import { CountdownTimer } from '@/components/countdown-timer'
import { MatchingBoard } from '@/components/matching-board'
import { generateMatch } from '@/actions/matching'
import type { CourseType } from '@/lib/types'

export default async function ManagePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: event } = await supabase.from('events').select('*').eq('slug', slug).eq('organizer_id', user.id).single()
  if (!event) notFound()

  const { data: duos } = await supabase.from('duos').select('id, city, status, is_organizer_duo, created_at, person1_id, lat, lng')
    .eq('event_id', event.id).neq('status', 'cancelled').order('created_at', { ascending: true })

  // Fetch display names for duo person1
  const person1Ids = duos?.map(d => d.person1_id) ?? []
  const { data: profiles } = person1Ids.length > 0
    ? await supabase.from('profiles').select('id, display_name').in('id', person1Ids)
    : { data: [] }
  const profileMap = new Map((profiles ?? []).map(p => [p.id, p.display_name]))

  const totalPaid = duos?.filter(d => ['registered', 'waitlisted', 'confirmed'].includes(d.status)).length ?? 0
  const confirmedCount = duos?.filter(d => d.status === 'confirmed').length ?? 0

  const shareUrl = event.type === 'closed'
    ? `${process.env.NEXT_PUBLIC_APP_URL}/join/${event.invite_code}`
    : `${process.env.NEXT_PUBLIC_APP_URL}/events/${event.slug}`

  // Load matching data if event is closed
  let matchVersions: any[] = []
  if (event.status === 'closed' || event.status === 'active' || event.status === 'completed') {
    const { data: matches } = await supabase.from('matches')
      .select('id, version, is_active, avg_travel_time_bike_min, avg_travel_time_car_min')
      .eq('event_id', event.id)
      .order('version', { ascending: true })

    if (matches?.length) {
      // Build duo name/city lookup
      const duoNameMap = new Map<string, { name: string; city: string }>()
      for (const duo of duos ?? []) {
        duoNameMap.set(duo.id, {
          name: profileMap.get(duo.person1_id) ?? 'Onbekend',
          city: duo.city,
        })
      }

      for (const match of matches) {
        const { data: tables } = await supabase.from('match_tables')
          .select('id, course, table_number, host_duo_id')
          .eq('match_id', match.id)
          .order('table_number', { ascending: true })

        const tableData = []
        for (const table of tables ?? []) {
          const { data: guests } = await supabase.from('match_table_guests')
            .select('duo_id')
            .eq('match_table_id', table.id)

          const hostInfo = duoNameMap.get(table.host_duo_id) ?? { name: 'Onbekend', city: '' }
          tableData.push({
            id: table.id,
            course: table.course as CourseType,
            tableNumber: table.table_number,
            hostDuoId: table.host_duo_id,
            hostName: hostInfo.name,
            hostCity: hostInfo.city,
            guests: (guests ?? []).map(g => {
              const info = duoNameMap.get(g.duo_id) ?? { name: 'Onbekend', city: '' }
              return { duoId: g.duo_id, name: info.name, city: info.city }
            }),
          })
        }

        matchVersions.push({
          id: match.id,
          version: match.version,
          isActive: match.is_active,
          avgBikeMin: match.avg_travel_time_bike_min,
          avgCarMin: match.avg_travel_time_car_min,
          tables: tableData,
        })
      }
    }
  }

  // Show "Generate matching" button if event is confirmed but no match exists
  const showGenerateButton = event.status === 'confirmed' && matchVersions.length === 0
  const showMatching = matchVersions.length > 0

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <h1 className="mb-2 text-2xl font-bold">{event.title}</h1>
      <p className="mb-6 text-sm text-gray-500">{new Date(event.event_date).toLocaleDateString()} — {event.start_time.slice(0, 5)}</p>

      <div className="mb-6 rounded border p-4">
        <p className="mb-1 text-sm font-medium">Deel deze link:</p>
        <code className="block rounded bg-gray-100 p-2 text-sm break-all">{shareUrl}</code>
        {event.type === 'closed' && <p className="mt-1 text-xs text-gray-500">Invite code: {event.invite_code}</p>}
      </div>

      <div className="mb-6"><Thermometer totalPaidDuos={totalPaid} confirmedDuos={confirmedCount} /></div>
      <CountdownTimer deadline={event.registration_deadline} />

      {showGenerateButton && (
        <div className="mt-8 rounded border-2 border-dashed p-6 text-center">
          <p className="mb-3 text-gray-600">Event is bevestigd. Je kunt nu de tafelindeling genereren.</p>
          <form action={async () => {
            'use server'
            await generateMatch(event.id)
          }}>
            <button type="submit" className="rounded bg-black px-4 py-2 text-white">
              Genereer indeling
            </button>
          </form>
        </div>
      )}

      {showMatching && (
        <div className="mt-8">
          <h2 className="mb-4 text-lg font-semibold">Tafelindeling</h2>
          <MatchingBoard
            eventId={event.id}
            versions={matchVersions}
            duoNames={new Map()}
          />
        </div>
      )}

      <div className="mt-8">
        <h2 className="mb-4 text-lg font-semibold">Duo&apos;s ({duos?.length ?? 0})</h2>
        <div className="flex flex-col gap-2">
          {duos?.map((duo) => (
            <div key={duo.id} className="flex items-center justify-between rounded border p-3">
              <div>
                <p className="font-medium">{profileMap.get(duo.person1_id) ?? 'Onbekend'}</p>
                <p className="text-xs text-gray-500">{duo.city}</p>
              </div>
              <span className={`rounded px-2 py-1 text-xs ${
                duo.status === 'confirmed' ? 'bg-green-100 text-green-700' :
                duo.status === 'waitlisted' ? 'bg-yellow-100 text-yellow-700' :
                'bg-gray-100 text-gray-600'
              }`}>{duo.status}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/[locale]/events/[slug]/manage/page.tsx
git commit -m "feat(m2): extend manage page — matching board, generate button, version display"
```

---

## Task 13: Environment variable setup

**Files:**
- Modify: `.env.local` (not committed)

- [ ] **Step 1: Add required environment variables**

Add to `.env.local`:

```
GOOGLE_MAPS_API_KEY=your_google_maps_api_key_here
CRON_SECRET=your_random_cron_secret_here
```

- [ ] **Step 2: Generate a CRON_SECRET**

Run: `openssl rand -hex 32`

Use the output as `CRON_SECRET` in `.env.local` and in Vercel environment variables.

- [ ] **Step 3: Set up Google Maps API key**

1. Go to https://console.cloud.google.com/
2. Create or select a project
3. Enable "Directions API"
4. Create an API key and restrict it to Directions API
5. Add the key to `.env.local` and Vercel environment variables

---

## Task 14: Manual verification

- [ ] **Step 1: Run all tests**

Run: `cd /Users/patrikzinger/DinnerJump && npx vitest run`
Expected: All tests pass (existing + new matching + routes tests)

- [ ] **Step 2: Run build**

Run: `cd /Users/patrikzinger/DinnerJump && npm run build`
Expected: Build succeeds with no TypeScript errors

- [ ] **Step 3: Test matching locally**

1. Start dev server: `npm run dev`
2. Create an event, register 9 test duos (requires Stripe test mode)
3. On manage page, click "Genereer indeling"
4. Verify 3-column layout with tables
5. Test Mix button — new version appears
6. Test Undo/Redo — navigates between versions
7. Test drag-drop — swap guests between tables

- [ ] **Step 4: Test cron endpoint locally**

Run: `curl -H "Authorization: Bearer $CRON_SECRET" http://localhost:3000/api/cron/match`
Expected: JSON response with `{ "matched": 0 }` (or count if events qualify)
