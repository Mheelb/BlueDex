import { computed } from 'vue'
import { useQuery } from '@tanstack/vue-query'
import { useAuthUser } from '@/composables/useAuthUser'
import { fetchProfile, profileKeys } from '@/queries/profile'

export function useProfile() {
  const { session } = useAuthUser()
  const userId = computed(() => session.value?.user.id)

  const query = useQuery({
    queryKey: computed(() => profileKeys.detail(userId.value ?? '')),
    queryFn: () => fetchProfile(userId.value!),
    enabled: computed(() => !!userId.value),
  })

  const isAdmin = computed(() => query.data.value?.is_admin ?? false)

  return { ...query, isAdmin }
}
