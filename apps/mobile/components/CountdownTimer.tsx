import { useEffect, useState } from 'react'
import { Text, View } from 'react-native'

export function CountdownTimer({ targetDate, label }: { targetDate: string; label?: string }) {
  const [timeLeft, setTimeLeft] = useState('')

  useEffect(() => {
    const update = () => {
      const diff = new Date(targetDate).getTime() - Date.now()
      if (diff <= 0) { setTimeLeft('Nu!'); return }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24))
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))

      const parts = []
      if (days > 0) parts.push(`${days}d`)
      parts.push(`${hours}u`)
      parts.push(`${String(minutes).padStart(2, '0')}m`)
      setTimeLeft(parts.join(' '))
    }

    update()
    const interval = setInterval(update, 60000)
    return () => clearInterval(interval)
  }, [targetDate])

  return (
    <View style={{ padding: 16, backgroundColor: '#1a1a2e', borderRadius: 12, alignItems: 'center' }}>
      {label && <Text style={{ color: '#888', fontSize: 12, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>{label}</Text>}
      <Text style={{ color: '#f5a623', fontSize: 32, fontWeight: '700', fontVariant: ['tabular-nums'] }}>{timeLeft}</Text>
    </View>
  )
}
