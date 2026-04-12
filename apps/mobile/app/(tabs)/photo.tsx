// apps/mobile/app/(tabs)/photo.tsx
import { useState, useRef, useCallback, useEffect } from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
} from 'react-native'
import { Camera, Image } from 'lucide-react-native'
import * as ImagePicker from 'expo-image-picker'
import { captureRef } from 'react-native-view-shot'
import { useMyEvent } from '../../lib/hooks/useMyEvent'
import { PhotoFrameRenderer } from '../../components/photo/PhotoFrameRenderer'
import { ShareButtons } from '../../components/photo/ShareButtons'
import {
  type SharePlatform,
  type FrameAspectRatio,
  getAspectRatioForPlatform,
  shareImage,
  markPhotoShared,
} from '../../lib/photo-sharing'

export default function PhotoScreen() {
  const { event, hostedCourse } = useMyEvent()
  const [photoUri, setPhotoUri] = useState<string | null>(null)
  const [aspectRatio, setAspectRatio] = useState<FrameAspectRatio>('9:16')
  const [pendingShare, setPendingShare] = useState<SharePlatform | null>(null)
  const [isSharing, setIsSharing] = useState(false)
  const frameRef = useRef<View>(null)

  const pickFromGallery = useCallback(async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.9,
      allowsEditing: true,
    })
    if (!result.canceled && result.assets[0]) {
      setPhotoUri(result.assets[0].uri)
    }
  }, [])

  const takePhoto = useCallback(async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync()
    if (status !== 'granted') {
      Alert.alert('Camera toegang nodig', 'Geef de app toegang tot je camera in Instellingen.')
      return
    }
    const result = await ImagePicker.launchCameraAsync({
      quality: 0.9,
      allowsEditing: true,
    })
    if (!result.canceled && result.assets[0]) {
      setPhotoUri(result.assets[0].uri)
    }
  }, [])

  // Trigger capture after aspect ratio change has rendered
  useEffect(() => {
    if (!pendingShare || !frameRef.current || !event) return

    const capture = async () => {
      setIsSharing(true)
      try {
        // Wait for next frame to ensure render is complete
        await new Promise(resolve => requestAnimationFrame(resolve))
        const uri = await captureRef(frameRef, { format: 'png', quality: 1 })
        await shareImage(uri, event.title)
        await markPhotoShared(event.id)
      } catch (err) {
        Alert.alert('Delen mislukt', 'Er ging iets mis bij het delen. Probeer het opnieuw.')
      } finally {
        setIsSharing(false)
        setPendingShare(null)
      }
    }

    capture()
  }, [pendingShare, event])

  const handleShare = useCallback(
    (platform: SharePlatform) => {
      if (isSharing) return
      const ratio = getAspectRatioForPlatform(platform)
      setAspectRatio(ratio)
      setPendingShare(platform)
    },
    [isSharing],
  )

  if (!event) {
    return (
      <View style={styles.container}>
        <Text style={styles.emptyText}>Geen actief event gevonden</Text>
      </View>
    )
  }

  const courseName = hostedCourse ?? 'appetizer'
  const eventDate = new Date(event.event_date).toLocaleDateString('nl-NL', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })

  if (!photoUri) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.brandLabel}>✦ DINNERJUMP ✦</Text>
          <Text style={styles.title}>Deel je avond</Text>
          <Text style={styles.subtitle}>
            Maak een foto met een DinnerJump frame en deel het op social media
          </Text>
        </View>

        <View style={styles.pickerRow}>
          <TouchableOpacity style={styles.pickerButton} onPress={takePhoto} activeOpacity={0.7}>
            <Camera size={36} color="#ccc" />
            <Text style={styles.pickerLabel}>Camera</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.pickerButton} onPress={pickFromGallery} activeOpacity={0.7}>
            <Image size={36} color="#ccc" />
            <Text style={styles.pickerLabel}>Galerij</Text>
          </TouchableOpacity>
        </View>
      </View>
    )
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      <View style={styles.header}>
        <Text style={styles.brandLabel}>✦ DINNERJUMP ✦</Text>
        <Text style={styles.title}>Je foto is klaar!</Text>
      </View>

      <View style={styles.previewContainer}>
        <PhotoFrameRenderer
          ref={frameRef}
          photoUri={photoUri}
          eventTitle={event.title}
          courseName={courseName}
          eventDate={eventDate}
          aspectRatio={aspectRatio}
        />
      </View>

      <ShareButtons onShare={handleShare} isSharing={isSharing} />

      <TouchableOpacity
        style={styles.retakeButton}
        onPress={() => setPhotoUri(null)}
        activeOpacity={0.7}
      >
        <Text style={styles.retakeText}>Andere foto kiezen</Text>
      </TouchableOpacity>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f0f1a',
  },
  scrollContent: {
    paddingBottom: 40,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    alignItems: 'center',
  },
  brandLabel: {
    fontSize: 8,
    letterSpacing: 4,
    color: 'rgba(255, 180, 120, 0.6)',
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  title: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '300',
    fontFamily: 'Georgia',
  },
  subtitle: {
    color: '#aaa',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 8,
    paddingHorizontal: 20,
  },
  pickerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
    marginTop: 40,
  },
  pickerButton: {
    width: 140,
    height: 140,
    backgroundColor: '#1a1a2e',
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 180, 100, 0.15)',
  },
  pickerLabel: {
    color: '#ccc',
    fontSize: 14,
  },
  previewContainer: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  retakeButton: {
    alignSelf: 'center',
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  retakeText: {
    color: '#aaa',
    fontSize: 14,
    textDecorationLine: 'underline',
  },
  emptyText: {
    color: '#666',
    fontSize: 16,
    textAlign: 'center',
    marginTop: 100,
  },
})
