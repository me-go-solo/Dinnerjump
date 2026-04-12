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
