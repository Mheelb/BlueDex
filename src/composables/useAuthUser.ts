import { ref } from 'vue'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'

const session = ref<Session | null>(null)
const initialized = ref(false)

const ready = supabase.auth.getSession().then(({ data }) => {
  session.value = data.session
  initialized.value = true
})

supabase.auth.onAuthStateChange((_event, newSession) => {
  session.value = newSession
})

export function useAuthUser() {
  return { session, initialized }
}

export function ensureAuthReady() {
  return ready
}
