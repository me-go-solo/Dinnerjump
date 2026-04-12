# Module 5: Foto Delen — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a photo-sharing feature to the mobile app where participants can take/choose photos, frame them with DinnerJump branding, and share to social media.

**Architecture:** Camera/gallery picker → frame renderer (React Native View → PNG via view-shot) → native share per platform. All local, no server storage. Dessert reminder via local scheduled notification.

**Tech Stack:** expo-image-picker, react-native-view-shot, expo-sharing, expo-notifications (existing), AsyncStorage (existing)

---

## File Structure

### New files

| File | Responsibility |
|------|---------------|
| `apps/mobile/lib/photo-sharing.ts` | Share utilities: platform detection, hashtag generation, share intents |
| `apps/mobile/components/photo/PhotoFrameRenderer.tsx` | Dark Elegance frame as React Native View with capture-to-PNG |
| `apps/mobile/components/photo/ShareButtons.tsx` | Instagram, X, Facebook, more buttons + share logic |
| `apps/mobile/app/(tabs)/photo.tsx` | Photo tab screen: pick/capture → preview → share |

### Modified files

| File | Change |
|------|--------|
| `apps/mobile/app/(tabs)/_layout.tsx` | Add 4th tab "Foto" with Camera icon |
| `apps/mobile/app/(tabs)/index.tsx` | Add "Deel je avond" card |
| `apps/mobile/package.json` | Add dependencies |

---

### Task 1: Install dependencies

**Files:**
- Modify: `apps/mobile/package.json`

- [ ] **Step 1: Install expo-image-picker, react-native-view-shot, expo-sharing**

```bash
cd /Users/patrikzinger/DinnerJump/apps/mobile && npx expo install expo-image-picker react-native-view-shot expo-sharing
```

Expected: packages added to `package.json` dependencies and installed.

- [ ] **Step 2: Verify installation**

```bash
cd /Users/patrikzinger/DinnerJump && pnpm install --frozen-lockfile || pnpm install
```

- [ ] **Step 3: Commit**

```bash
git add apps/mobile/package.json pnpm-lock.yaml
git commit -m "chore: add photo sharing dependencies (expo-image-picker, react-native-view-shot, expo-sharing)"
```

---

### Task 2: Create photo-sharing utilities

**Files:**
- Create: `apps/mobile/lib/photo-sharing.ts`

- [ ] **Step 1: Create the utility file**

```typescript
// apps/mobile/lib/photo-sharing.ts
import { Platform, Linking } from 'react-native'
import * as Sharing from 'expo-sharing'
import AsyncStorage from '@react-native-async-storage/async-storage'

export type SharePlatform = 'instagram' | 'x' | 'facebook' | 'other'
export type FrameAspectRatio = '9:16' | '4:5' | '16:9'

/**
 * Maps share platform to optimal frame aspect ratio.
 */
export function getAspectRatioForPlatform(platform: SharePlatform): FrameAspectRatio {
  switch (platform) {
    case 'instagram':
      return '9:16'
    case 'facebook':
      return '4:5'
    case 'x':
      return '16:9'
    case 'other':
      return '4:5'
  }
}

/**
 * Returns pixel dimensions for a given aspect ratio.
 */
export function getDimensionsForRatio(ratio: FrameAspectRatio): { width: number; height: number } {
  switch (ratio) {
    case '9:16':
      return { width: 1080, height: 1920 }
    case '4:5':
      return { width: 1080, height: 1350 }
    case '16:9':
      return { width: 1200, height: 675 }
  }
}

/**
 * Generates share text with hashtags.
 */
export function getShareText(eventTitle: string): string {
  const hashtag = eventTitle.replace(/\s+/g, '')
  return `Wat een avond! #DinnerJump #${hashtag}`
}

/**
 * Share image to a specific platform or generic share sheet.
 */
export async function shareImage(
  imageUri: string,
  platform: SharePlatform,
  eventTitle: string,
): Promise<void> {
  const text = getShareText(eventTitle)

  if (platform === 'instagram' && Platform.OS === 'ios') {
    // Instagram Stories deep link (iOS)
    const url = `instagram-stories://share?source_application=dinnerjump`
    const canOpen = await Linking.canOpenURL(url)
    if (canOpen) {
      await Linking.openURL(url)
      return
    }
  }

  // Fall back to native share for all platforms
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(imageUri, {
      mimeType: 'image/png',
      dialogTitle: text,
    })
  }
}

/**
 * Track that user has shared a photo for this event.
 */
export async function markPhotoShared(eventId: string): Promise<void> {
  await AsyncStorage.setItem(`photo_shared_${eventId}`, 'true')
}

/**
 * Check if user has shared a photo for this event.
 */
export async function hasSharedPhoto(eventId: string): Promise<boolean> {
  const value = await AsyncStorage.getItem(`photo_shared_${eventId}`)
  return value === 'true'
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/mobile/lib/photo-sharing.ts
git commit -m "feat(module5): add photo sharing utilities"
```

---

### Task 3: Create Dark Elegance frame renderer

**Files:**
- Create: `apps/mobile/components/photo/PhotoFrameRenderer.tsx`

- [ ] **Step 1: Create the component**

```typescript
// apps/mobile/components/photo/PhotoFrameRenderer.tsx
import { forwardRef } from 'react'
import { View, Text, Image, StyleSheet, type ViewStyle } from 'react-native'
import type { FrameAspectRatio } from '../../lib/photo-sharing'
import { getDimensionsForRatio } from '../../lib/photo-sharing'

type Props = {
  photoUri: string
  eventTitle: string
  courseName: string
  eventDate: string
  aspectRatio: FrameAspectRatio
  style?: ViewStyle
}

const COURSE_LABELS: Record<string, string> = {
  appetizer: 'Voorgerecht',
  main: 'Hoofdgerecht',
  dessert: 'Dessert',
}

/**
 * Renders the Dark Elegance frame around a photo.
 * Use ref + react-native-view-shot to capture as PNG.
 */
const PhotoFrameRenderer = forwardRef<View, Props>(function PhotoFrameRenderer(
  { photoUri, eventTitle, courseName, eventDate, aspectRatio, style },
  ref,
) {
  const dimensions = getDimensionsForRatio(aspectRatio)
  // Scale down for on-screen preview (render at 1/3 size)
  const scale = 0.3
  const w = dimensions.width * scale
  const h = dimensions.height * scale

  const courseLabel = COURSE_LABELS[courseName] ?? courseName

  return (
    <View ref={ref} style={[styles.frame, { width: w, height: h }, style]} collapsable={false}>
      {/* Photo */}
      <Image source={{ uri: photoUri }} style={styles.photo} resizeMode="cover" />

      {/* Corner accents */}
      <View style={[styles.corner, styles.cornerTL]} />
      <View style={[styles.corner, styles.cornerTR]} />
      <View style={[styles.corner, styles.cornerBL]} />
      <View style={[styles.corner, styles.cornerBR]} />

      {/* Bottom overlay */}
      <View style={styles.overlay}>
        <Text style={styles.brandText}>✦ DINNERJUMP ✦</Text>
        <Text style={styles.eventTitle}>{eventTitle}</Text>

        <View style={styles.courseRow}>
          <View style={styles.decorLine} />
          <Text style={styles.courseLabel}>{courseLabel}</Text>
          <View style={styles.decorLine} />
        </View>

        <Text style={styles.dateText}>{eventDate}</Text>
        <Text style={styles.urlText}>dinnerjump.nl</Text>
      </View>
    </View>
  )
})

const GOLD = 'rgba(255, 180, 120, 0.4)'
const GOLD_TEXT = 'rgba(255, 180, 120, 0.6)'
const GOLD_COURSE = 'rgba(255, 180, 120, 0.7)'

const styles = StyleSheet.create({
  frame: {
    backgroundColor: '#1a1a2e',
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 180, 100, 0.15)',
  },
  photo: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 12,
    margin: 16,
  },
  corner: {
    position: 'absolute',
    width: 20,
    height: 20,
  },
  cornerTL: {
    top: 8,
    left: 8,
    borderTopWidth: 2,
    borderLeftWidth: 2,
    borderColor: GOLD,
    borderTopLeftRadius: 4,
  },
  cornerTR: {
    top: 8,
    right: 8,
    borderTopWidth: 2,
    borderRightWidth: 2,
    borderColor: GOLD,
    borderTopRightRadius: 4,
  },
  cornerBL: {
    bottom: 8,
    left: 8,
    borderBottomWidth: 2,
    borderLeftWidth: 2,
    borderColor: GOLD,
    borderBottomLeftRadius: 4,
  },
  cornerBR: {
    bottom: 8,
    right: 8,
    borderBottomWidth: 2,
    borderRightWidth: 2,
    borderColor: GOLD,
    borderBottomRightRadius: 4,
  },
  overlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingTop: 24,
    paddingBottom: 16,
    paddingHorizontal: 16,
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
  },
  brandText: {
    fontSize: 8,
    letterSpacing: 4,
    color: GOLD_TEXT,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  eventTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '300',
    fontFamily: 'Georgia',
    letterSpacing: 0.5,
  },
  courseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 6,
  },
  decorLine: {
    width: 20,
    height: 1,
    backgroundColor: GOLD,
  },
  courseLabel: {
    color: GOLD_COURSE,
    fontSize: 10,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  dateText: {
    color: 'rgba(255, 255, 255, 0.3)',
    fontSize: 9,
    letterSpacing: 1,
    marginTop: 6,
  },
  urlText: {
    color: 'rgba(255, 180, 120, 0.4)',
    fontSize: 8,
    letterSpacing: 1,
    marginTop: 4,
  },
})

export { PhotoFrameRenderer }
```

- [ ] **Step 2: Commit**

```bash
git add apps/mobile/components/photo/PhotoFrameRenderer.tsx
git commit -m "feat(module5): add Dark Elegance photo frame renderer"
```

---

### Task 4: Create share buttons component

**Files:**
- Create: `apps/mobile/components/photo/ShareButtons.tsx`

- [ ] **Step 1: Create the component**

```typescript
// apps/mobile/components/photo/ShareButtons.tsx
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import type { SharePlatform } from '../../lib/photo-sharing'

type Props = {
  onShare: (platform: SharePlatform) => void
}

const PLATFORMS: { id: SharePlatform; label: string; bg: string }[] = [
  { id: 'instagram', label: 'Instagram', bg: '#E1306C' },
  { id: 'x', label: 'X', bg: '#000000' },
  { id: 'facebook', label: 'Facebook', bg: '#1877F2' },
  { id: 'other', label: 'Meer', bg: '#2a2a3e' },
]

export function ShareButtons({ onShare }: Props) {
  return (
    <View style={styles.container}>
      {PLATFORMS.map((p) => (
        <TouchableOpacity
          key={p.id}
          style={[styles.button, { backgroundColor: p.bg }]}
          onPress={() => onShare(p.id)}
          activeOpacity={0.7}
        >
          <Text style={[styles.label, p.id === 'x' && styles.labelBorder]}>
            {p.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'center',
    paddingVertical: 16,
  },
  button: {
    width: 72,
    height: 72,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
  },
  labelBorder: {
    borderWidth: 1,
    borderColor: '#333',
  },
})
```

- [ ] **Step 2: Commit**

```bash
git add apps/mobile/components/photo/ShareButtons.tsx
git commit -m "feat(module5): add social media share buttons"
```

---

### Task 5: Create photo tab screen

**Files:**
- Create: `apps/mobile/app/(tabs)/photo.tsx`

- [ ] **Step 1: Create the photo screen**

```typescript
// apps/mobile/app/(tabs)/photo.tsx
import { useState, useRef, useCallback } from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
} from 'react-native'
import * as ImagePicker from 'expo-image-picker'
import { captureRef } from 'react-native-view-shot'
import { useMyEvent } from '../../lib/hooks/useMyEvent'
import { PhotoFrameRenderer } from '../../components/photo/PhotoFrameRenderer'
import { ShareButtons } from '../../components/photo/ShareButtons'
import {
  type SharePlatform,
  type FrameAspectRatio,
  getAspectRatioForPlatform,
  shareImage,
  markPhotoShared,
} from '../../lib/photo-sharing'

export default function PhotoScreen() {
  const { event, hostedCourse } = useMyEvent()
  const [photoUri, setPhotoUri] = useState<string | null>(null)
  const [aspectRatio, setAspectRatio] = useState<FrameAspectRatio>('9:16')
  const frameRef = useRef<View>(null)

  const pickFromGallery = useCallback(async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.9,
      allowsEditing: true,
    })
    if (!result.canceled && result.assets[0]) {
      setPhotoUri(result.assets[0].uri)
    }
  }, [])

  const takePhoto = useCallback(async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync()
    if (status !== 'granted') {
      Alert.alert('Camera toegang nodig', 'Geef de app toegang tot je camera in Instellingen.')
      return
    }
    const result = await ImagePicker.launchCameraAsync({
      quality: 0.9,
      allowsEditing: true,
    })
    if (!result.canceled && result.assets[0]) {
      setPhotoUri(result.assets[0].uri)
    }
  }, [])

  const handleShare = useCallback(
    async (platform: SharePlatform) => {
      if (!frameRef.current || !event) return

      // Set correct aspect ratio for platform, then capture
      const ratio = getAspectRatioForPlatform(platform)
      setAspectRatio(ratio)

      // Small delay to let the frame re-render with new ratio
      await new Promise((r) => setTimeout(r, 100))

      try {
        const uri = await captureRef(frameRef, {
          format: 'png',
          quality: 1,
        })
        await shareImage(uri, platform, event.title)
        await markPhotoShared(event.id)
      } catch (err) {
        Alert.alert('Delen mislukt', 'Er ging iets mis bij het delen. Probeer het opnieuw.')
      }
    },
    [event],
  )

  if (!event) {
    return (
      <View style={styles.container}>
        <Text style={styles.emptyText}>Geen actief event gevonden</Text>
      </View>
    )
  }

  const courseName = hostedCourse ?? 'appetizer'
  const eventDate = new Date(event.event_date).toLocaleDateString('nl-NL', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })

  // No photo selected yet — show picker
  if (!photoUri) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.brandLabel}>✦ DINNERJUMP ✦</Text>
          <Text style={styles.title}>Deel je avond</Text>
          <Text style={styles.subtitle}>
            Maak een foto met een DinnerJump frame en deel het op social media
          </Text>
        </View>

        <View style={styles.pickerRow}>
          <TouchableOpacity style={styles.pickerButton} onPress={takePhoto} activeOpacity={0.7}>
            <Text style={styles.pickerIcon}>📷</Text>
            <Text style={styles.pickerLabel}>Camera</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.pickerButton} onPress={pickFromGallery} activeOpacity={0.7}>
            <Text style={styles.pickerIcon}>🖼</Text>
            <Text style={styles.pickerLabel}>Galerij</Text>
          </TouchableOpacity>
        </View>
      </View>
    )
  }

  // Photo selected — show frame preview + share
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      <View style={styles.header}>
        <Text style={styles.brandLabel}>✦ DINNERJUMP ✦</Text>
        <Text style={styles.title}>Je foto is klaar!</Text>
      </View>

      <View style={styles.previewContainer}>
        <PhotoFrameRenderer
          ref={frameRef}
          photoUri={photoUri}
          eventTitle={event.title}
          courseName={courseName}
          eventDate={eventDate}
          aspectRatio={aspectRatio}
        />
      </View>

      <ShareButtons onShare={handleShare} />

      <TouchableOpacity
        style={styles.retakeButton}
        onPress={() => setPhotoUri(null)}
        activeOpacity={0.7}
      >
        <Text style={styles.retakeText}>Andere foto kiezen</Text>
      </TouchableOpacity>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f0f1a',
  },
  scrollContent: {
    paddingBottom: 40,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    alignItems: 'center',
  },
  brandLabel: {
    fontSize: 8,
    letterSpacing: 4,
    color: 'rgba(255, 180, 120, 0.6)',
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  title: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '300',
    fontFamily: 'Georgia',
  },
  subtitle: {
    color: '#aaa',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 8,
    paddingHorizontal: 20,
  },
  pickerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
    marginTop: 40,
  },
  pickerButton: {
    width: 140,
    height: 140,
    backgroundColor: '#1a1a2e',
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 180, 100, 0.15)',
  },
  pickerIcon: {
    fontSize: 36,
    marginBottom: 8,
  },
  pickerLabel: {
    color: '#ccc',
    fontSize: 14,
  },
  previewContainer: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  retakeButton: {
    alignSelf: 'center',
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  retakeText: {
    color: '#aaa',
    fontSize: 14,
    textDecorationLine: 'underline',
  },
  emptyText: {
    color: '#666',
    fontSize: 16,
    textAlign: 'center',
    marginTop: 100,
  },
})
```

- [ ] **Step 2: Commit**

```bash
git add apps/mobile/app/\(tabs\)/photo.tsx
git commit -m "feat(module5): add photo tab screen with picker and share flow"
```

---

### Task 6: Add photo tab to navigation

**Files:**
- Modify: `apps/mobile/app/(tabs)/_layout.tsx`

- [ ] **Step 1: Add the Foto tab**

Replace the entire file content:

```typescript
// apps/mobile/app/(tabs)/_layout.tsx
import { Tabs } from 'expo-router'

export default function TabsLayout() {
  return (
    <Tabs screenOptions={{
      headerShown: false,
      tabBarStyle: { backgroundColor: '#0f0f1a', borderTopColor: '#1a1a2e' },
      tabBarActiveTintColor: '#e94560',
      tabBarInactiveTintColor: '#555',
    }}>
      <Tabs.Screen name="index" options={{ title: 'Home' }} />
      <Tabs.Screen name="course" options={{ title: 'Gang' }} />
      <Tabs.Screen name="route" options={{ title: 'Route' }} />
      <Tabs.Screen name="photo" options={{ title: 'Foto' }} />
    </Tabs>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/mobile/app/\(tabs\)/_layout.tsx
git commit -m "feat(module5): add Foto tab to navigation"
```

---

### Task 7: Add "Deel je avond" card to home screen

**Files:**
- Modify: `apps/mobile/app/(tabs)/index.tsx`

- [ ] **Step 1: Add the share card**

Add these imports at the top of the file:

```typescript
import { useRouter } from 'expo-router'
```

Add this component inside the file (before the default export):

```typescript
function ShareCard() {
  const router = useRouter()

  return (
    <TouchableOpacity
      style={{
        marginHorizontal: 20,
        marginVertical: 12,
        backgroundColor: 'rgba(255, 107, 53, 0.1)',
        borderWidth: 1,
        borderColor: 'rgba(255, 107, 53, 0.2)',
        borderRadius: 14,
        padding: 14,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
      }}
      onPress={() => router.push('/photo')}
      activeOpacity={0.7}
    >
      <View
        style={{
          width: 40,
          height: 40,
          backgroundColor: '#FF6B35',
          borderRadius: 12,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Text style={{ fontSize: 18 }}>📷</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ color: '#fff', fontSize: 13, fontWeight: '500' }}>Deel je avond</Text>
        <Text style={{ color: 'rgba(255, 180, 120, 0.6)', fontSize: 10 }}>
          Maak een foto met DinnerJump frame
        </Text>
      </View>
      <Text style={{ color: 'rgba(255, 180, 120, 0.4)', fontSize: 16 }}>›</Text>
    </TouchableOpacity>
  )
}
```

Then render `<ShareCard />` inside the main ScrollView, just before the schedule/timeline section (near the bottom of the screen content, after the locked course cards).

- [ ] **Step 2: Commit**

```bash
git add apps/mobile/app/\(tabs\)/index.tsx
git commit -m "feat(module5): add 'Deel je avond' card to home screen"
```

---

### Task 8: Add dessert photo reminder

**Files:**
- Modify: `apps/mobile/app/(tabs)/index.tsx` (or `course.tsx` — wherever dessert reveal is handled)

- [ ] **Step 1: Add reminder logic**

Add this import:

```typescript
import * as Notifications from 'expo-notifications'
import { hasSharedPhoto } from '../../lib/photo-sharing'
```

Add this function and call it when the dessert course becomes active (when the dessert reveal executes). Place it alongside the existing reveal-checking logic:

```typescript
async function scheduleDessertPhotoReminder(eventId: string) {
  const alreadyShared = await hasSharedPhoto(eventId)
  if (alreadyShared) return

  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Deel een leuke foto van de avond!',
      body: 'Kies of maak een foto met een DinnerJump frame en deel het via social.',
    },
    trigger: null, // Fire immediately
  })
}
```

Call `scheduleDessertPhotoReminder(event.id)` when the dessert course starts — this is determined by checking if the `course_3_full` reveal has been executed. Add it to the existing useEffect that checks reveal states:

```typescript
// Inside the existing reveal-checking logic:
const dessertRevealed = reveals.some(
  (r) => r.reveal_type === 'course_3_full' && r.executed_at
)
if (dessertRevealed) {
  scheduleDessertPhotoReminder(event.id)
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/mobile/app/\(tabs\)/index.tsx
git commit -m "feat(module5): add dessert photo reminder notification"
```

---

### Task 9: Verify and test

- [ ] **Step 1: Start dev server**

```bash
cd /Users/patrikzinger/DinnerJump && pnpm dev
```

Open the Expo Go app on your phone or simulator.

- [ ] **Step 2: Verify tab navigation**

Expected: 4 tabs visible — Home, Gang, Route, Foto. Foto tab shows camera/gallery picker.

- [ ] **Step 3: Test photo picker**

Tap Camera → should open camera. Tap Gallery → should open photo library. Select a photo → Dark Elegance frame preview appears.

- [ ] **Step 4: Test sharing**

Tap Instagram/X/Facebook/Meer → native share sheet opens with framed image.

- [ ] **Step 5: Verify home screen card**

Go to Home tab → "Deel je avond" card is visible. Tapping it navigates to Foto tab.

- [ ] **Step 6: Final commit**

```bash
git add -A
git commit -m "feat(module5): photo sharing with Dark Elegance frame — complete"
```
