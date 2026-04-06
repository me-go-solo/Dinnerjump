import { useState } from 'react'
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator } from 'react-native'
import { useAuth } from '../../lib/auth'

export default function LoginScreen() {
  const { signInWithOtp } = useAuth()
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSend = async () => {
    setLoading(true)
    setError(null)
    const { error } = await signInWithOtp(email)
    setLoading(false)
    if (error) setError(error)
    else setSent(true)
  }

  if (sent) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24, backgroundColor: '#0f0f1a' }}>
        <Text style={{ color: 'white', fontSize: 20, fontWeight: '700', marginBottom: 8 }}>Check je e-mail</Text>
        <Text style={{ color: '#aaa', textAlign: 'center' }}>
          We hebben een magic link gestuurd naar {email}. Klik op de link om in te loggen.
        </Text>
      </View>
    )
  }

  return (
    <View style={{ flex: 1, justifyContent: 'center', padding: 24, backgroundColor: '#0f0f1a' }}>
      <Text style={{ color: 'white', fontSize: 28, fontWeight: '700', marginBottom: 8 }}>Dinner Jump</Text>
      <Text style={{ color: '#aaa', marginBottom: 32 }}>Log in met je e-mailadres</Text>

      <TextInput
        value={email}
        onChangeText={setEmail}
        placeholder="jouw@email.nl"
        placeholderTextColor="#555"
        keyboardType="email-address"
        autoCapitalize="none"
        style={{ backgroundColor: '#1a1a2e', color: 'white', padding: 16, borderRadius: 12, fontSize: 16, marginBottom: 16 }}
      />

      {error && <Text style={{ color: '#e94560', marginBottom: 12 }}>{error}</Text>}

      <TouchableOpacity
        onPress={handleSend}
        disabled={loading || !email}
        style={{ backgroundColor: '#e94560', padding: 16, borderRadius: 12, alignItems: 'center', opacity: loading || !email ? 0.5 : 1 }}
      >
        {loading ? <ActivityIndicator color="white" /> : <Text style={{ color: 'white', fontWeight: '700', fontSize: 16 }}>Verstuur magic link</Text>}
      </TouchableOpacity>
    </View>
  )
}
