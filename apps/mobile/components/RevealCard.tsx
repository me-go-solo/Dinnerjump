import { View, Text } from 'react-native'
import type { ReactNode } from 'react'
import { CountdownTimer } from './CountdownTimer'

type Props = {
  title: string
  emoji: string
  isRevealed: boolean
  scheduledAt?: string
  children?: ReactNode
}

export function RevealCard({ title, emoji, isRevealed, scheduledAt, children }: Props) {
  if (!isRevealed) {
    return (
      <View style={{ padding: 16, backgroundColor: '#1a1a2e', borderRadius: 12, borderWidth: 1, borderColor: '#333', borderStyle: 'dashed' }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <View>
            <Text style={{ color: '#888', fontSize: 12, textTransform: 'uppercase', letterSpacing: 1 }}>Hierna</Text>
            <Text style={{ color: '#666', fontSize: 16, fontWeight: '600', marginTop: 4 }}>{emoji} {title}</Text>
          </View>
          <Text style={{ color: '#333', fontSize: 28 }}>{'🔒'}</Text>
        </View>
        {scheduledAt && (
          <View style={{ marginTop: 10, padding: 8, backgroundColor: 'rgba(245,166,35,0.1)', borderRadius: 8, alignItems: 'center' }}>
            <Text style={{ color: '#f5a623', fontSize: 16, fontWeight: '700' }}>{'🔔'} Bekendmaking over</Text>
            <CountdownTimer targetDate={scheduledAt} />
          </View>
        )}
      </View>
    )
  }

  return (
    <View style={{ padding: 16, backgroundColor: '#1a1a2e', borderRadius: 12 }}>
      <Text style={{ color: '#888', fontSize: 12, textTransform: 'uppercase', letterSpacing: 1 }}>{emoji} {title}</Text>
      <View style={{ marginTop: 12 }}>{children}</View>
    </View>
  )
}
