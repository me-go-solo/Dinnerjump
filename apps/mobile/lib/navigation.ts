import { Linking, Platform } from 'react-native'

export function openInGoogleMaps(lat: number, lng: number) {
  const url = Platform.select({
    ios: `comgooglemaps://?daddr=${lat},${lng}&directionsmode=bicycling`,
    android: `google.navigation:q=${lat},${lng}&mode=b`,
    default: `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=bicycling`,
  })
  Linking.openURL(url!)
}

export function openInAppleMaps(lat: number, lng: number, label: string) {
  Linking.openURL(`maps://app?daddr=${lat},${lng}&dirflg=w&t=m`)
}
