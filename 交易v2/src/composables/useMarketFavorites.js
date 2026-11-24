import { readonly, ref } from 'vue'

export function useMarketFavorites(storageKey) {
  let saved = []
  try {
    const value = JSON.parse(localStorage.getItem(storageKey) || '[]')
    if (Array.isArray(value)) saved = [...new Set(value.filter(id => typeof id === 'string' && id.length > 0))]
  } catch {
    // Invalid or unavailable storage must not prevent opening the terminal.
  }
  const favorites = ref(saved)

  function favorite(id) {
    favorites.value = favorites.value.includes(id)
      ? favorites.value.filter(value => value !== id)
      : [...favorites.value, id]
    try {
      localStorage.setItem(storageKey, JSON.stringify(favorites.value))
    } catch {
      // Continue supporting in-page favorites when browser storage is unavailable.
    }
  }

  return { favorites: readonly(favorites), favorite }
}
