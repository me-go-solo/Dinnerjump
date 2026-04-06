import * as Notifications from 'expo-notifications'
import { Platform } from 'react-native'
import { supabase } from './supabase'

// Configure how notifications are displayed when app is in foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
})

export async function registerForPushNotifications(userId: string) {
  // Request permissions
  const { status: existingStatus } = await Notifications.getPermissionsAsync()
  let finalStatus = existingStatus

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync()
    finalStatus = status
  }

  if (finalStatus !== 'granted') {
    return null
  }

  // Get Expo push token
  const { data: tokenData } = await Notifications.getExpoPushTokenAsync()
  const token = tokenData

  // Upsert to push_tokens table (handles token refresh on reinstall)
  const platform = Platform.OS as 'ios' | 'android'

  await supabase
    .from('push_tokens')
    .upsert(
      { profile_id: userId, token, platform },
      { onConflict: 'token' }
    )

  return token
}
