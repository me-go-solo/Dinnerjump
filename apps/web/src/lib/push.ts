type ExpoPushMessage = {
  to: string
  sound?: string
  title: string
  body: string
  data?: Record<string, unknown>
  priority?: 'default' | 'normal' | 'high'
}

export async function sendPushNotifications(messages: ExpoPushMessage[]) {
  if (messages.length === 0) return

  // Expo Push API accepts max 100 messages per request
  const chunks: ExpoPushMessage[][] = []
  for (let i = 0; i < messages.length; i += 100) {
    chunks.push(messages.slice(i, i + 100))
  }

  for (const chunk of chunks) {
    await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(chunk),
    })
  }
}
