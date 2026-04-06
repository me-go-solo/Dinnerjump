import AsyncStorage from '@react-native-async-storage/async-storage'

export async function getCache<T>(key: string): Promise<T | null> {
  try {
    const raw = await AsyncStorage.getItem(`cache:${key}`)
    if (!raw) return null
    const { data, expiresAt } = JSON.parse(raw)
    if (expiresAt && Date.now() > expiresAt) {
      await AsyncStorage.removeItem(`cache:${key}`)
      return null
    }
    return data as T
  } catch { return null }
}

export async function setCache<T>(key: string, data: T, ttlMs = 3600000): Promise<void> {
  try {
    await AsyncStorage.setItem(`cache:${key}`, JSON.stringify({
      data,
      expiresAt: Date.now() + ttlMs,
    }))
  } catch {}
}
