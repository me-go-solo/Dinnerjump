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
    const url = `instagram-stories://share?source_application=dinnerjump`
    const canOpen = await Linking.canOpenURL(url)
    if (canOpen) {
      await Linking.openURL(url)
      return
    }
  }

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
