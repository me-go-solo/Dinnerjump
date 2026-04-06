import { Image, View } from 'react-native'

type Props = {
  destLat: number
  destLng: number
}

export function StaticMap({ destLat, destLng }: Props) {
  const apiKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_KEY
  const url = `https://maps.googleapis.com/maps/api/staticmap?center=${destLat},${destLng}&zoom=15&size=600x300&scale=2&markers=color:red|${destLat},${destLng}&key=${apiKey}`

  return (
    <View style={{ margin: 16, borderRadius: 12, overflow: 'hidden' }}>
      <Image
        source={{ uri: url }}
        style={{ width: '100%', height: 180 }}
        resizeMode="cover"
      />
    </View>
  )
}
