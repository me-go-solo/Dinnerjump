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

const PhotoFrameRenderer = forwardRef<View, Props>(function PhotoFrameRenderer(
  { photoUri, eventTitle, courseName, eventDate, aspectRatio, style },
  ref,
) {
  const dimensions = getDimensionsForRatio(aspectRatio)
  const scale = 0.3
  const w = dimensions.width * scale
  const h = dimensions.height * scale

  const courseLabel = COURSE_LABELS[courseName] ?? courseName

  return (
    <View ref={ref} style={[styles.frame, { width: w, height: h }, style]} collapsable={false}>
      <Image source={{ uri: photoUri }} style={styles.photo} resizeMode="cover" />

      <View style={[styles.corner, styles.cornerTL]} />
      <View style={[styles.corner, styles.cornerTR]} />
      <View style={[styles.corner, styles.cornerBL]} />
      <View style={[styles.corner, styles.cornerBR]} />

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
    borderBottomLeftRadius: 4,
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
