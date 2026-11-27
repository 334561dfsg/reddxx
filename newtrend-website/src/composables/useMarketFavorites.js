import { readonly, ref } from 'vue'
import { readStorage, writeStorage } from '../utils/storage.js'

// One shared list per storage key, so every star bound to the same key (trading header, mobile pair drawer) stays in
// sync without a reload.
const lists = new Map()

function load(storageKey) {
  let saved = []
  try {
    const value = JSON.parse(readStorage(storageKey) || '[]')
    if (Array.isArray(value)) saved = [...new Set(value.filter(id => typeof id === 'string' && id.length > 0))]
  } catch {
    // Invalid or unavailable storage must not prevent opening the terminal.
  }
  return ref(saved)
}

export function useMarketFavorites(storageKey) {
  if (!lists.has(storageKey)) lists.set(storageKey, load(storageKey))
  const favorites = lists.get(storageKey)

  function favorite(id) {
    favorites.value = favorites.value.includes(id)
      ? favorites.value.filter(value => value !== id)
      : [...favorites.value, id]
    // Favorites are a UI preference (user decision); in-page favorites keep working if storage is blocked.
    writeStorage(storageKey, JSON.stringify(favorites.value))
  }

  return { favorites: readonly(favorites), favorite }
}
