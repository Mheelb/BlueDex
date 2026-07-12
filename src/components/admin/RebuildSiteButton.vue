<script setup lang="ts">
import { useMutation } from '@tanstack/vue-query'
import { RefreshCwIcon } from '@lucide/vue'
import { toast } from 'vue-sonner'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'

const rebuildMutation = useMutation({
  mutationFn: async () => {
    const { error } = await supabase.functions.invoke('trigger-rebuild')
    if (error) throw new Error(error.message)
  },
  onSuccess: () => {
    toast.success('Régénération lancée', {
      description: 'Le site se met à jour dans quelques minutes.',
    })
  },
  onError: (err: Error) => {
    toast.error('Échec de la régénération', { description: err.message })
  },
})
</script>

<template>
  <Button variant="outline" :disabled="rebuildMutation.isPending.value" @click="rebuildMutation.mutate()">
    <RefreshCwIcon :class="rebuildMutation.isPending.value ? 'animate-spin' : ''" />
    {{ rebuildMutation.isPending.value ? 'Lancement...' : 'Régénérer le site' }}
  </Button>
</template>
