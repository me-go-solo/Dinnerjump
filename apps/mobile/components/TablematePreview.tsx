import { View, Text } from 'react-native'

type Props = {
  name: string
  disclosureLevel: 'hidden' | 'initial' | 'full'
  color: string
  isHost?: boolean
}

export function TablematePreview({ name, disclosureLevel, color, isHost }: Props) {
  const displayName = disclosureLevel === 'hidden'
    ? '?...'
    : disclosureLevel === 'initial'
    ? `${name.charAt(0)}${'...'.repeat(1)}`
    : name

  const initial = disclosureLevel === 'hidden' ? '?' : name.charAt(0).toUpperCase()

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8 }}>
      <View style={{
        width: 44, height: 44, borderRadius: 22,
        backgroundColor: disclosureLevel === 'hidden' ? '#2a2a3e' : color,
        justifyContent: 'center', alignItems: 'center',
      }}>
        <Text style={{ color: disclosureLevel === 'hidden' ? '#555' : 'white', fontWeight: '700', fontSize: 18 }}>{initial}</Text>
      </View>
      <View>
        <Text style={{ color: disclosureLevel === 'hidden' ? '#444' : 'white', fontSize: 14, fontWeight: disclosureLevel === 'full' ? '600' : '400' }}>
          {displayName}
          {isHost && disclosureLevel === 'full' && <Text style={{ color: '#4ecdc4', fontSize: 12, fontWeight: '400' }}> host</Text>}
        </Text>
      </View>
    </View>
  )
}
