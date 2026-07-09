import { ref, watchEffect } from 'vue'

const STORAGE_KEY = 'bluedex-theme'

// Le bouton pour basculer le thème est masqué pour l'instant : on force le
// mode clair dans tous les cas, peu importe la préférence système ou une
// ancienne valeur enregistrée dans ce navigateur.
const isDark = ref(false)

watchEffect(() => {
  document.documentElement.classList.toggle('dark', isDark.value)
  localStorage.setItem(STORAGE_KEY, isDark.value ? 'dark' : 'light')
})

export function useDarkMode() {
  function toggle() {
    isDark.value = !isDark.value
  }

  return { isDark, toggle }
}
