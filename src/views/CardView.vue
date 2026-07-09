<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import { supabase } from '@/lib/supabase'
import type { Card } from '@/types/card'
import { useSetBySlug } from '@/composables/useSetBySlug'
import CardImage from '@/components/CardImage.vue'
import CardBadges from '@/components/CardBadges.vue'
import CardStatPills from '@/components/CardStatPills.vue'
import CardEffectText from '@/components/CardEffectText.vue'
import BackButton from '@/components/BackButton.vue'
import { Badge } from '@/components/ui/badge'

const props = defineProps<{ setSlug: string; cardNumber: string }>()

const { set, error: setError, loadSet } = useSetBySlug()
const card = ref<Card | null>(null)
const loading = ref(true)
const error = ref<string | null>(null)

async function load() {
  loading.value = true
  error.value = null

  const ok = await loadSet(props.setSlug)
  if (!ok || !set.value) {
    error.value = setError.value
    loading.value = false
    return
  }

  const { data: cardData, error: cardError } = await supabase
    .from('cards')
    .select('*')
    .eq('set_id', set.value.id)
    .eq('number', props.cardNumber)
    .single()

  if (cardError || !cardData) {
    error.value = cardError?.message ?? 'Carte introuvable.'
  } else {
    card.value = cardData as Card
  }
  loading.value = false
}

onMounted(load)
watch(() => [props.setSlug, props.cardNumber], load)
</script>

<template>
  <div class="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
    <p v-if="loading" class="text-muted-foreground">Chargement...</p>
    <p v-else-if="error" class="text-destructive">{{ error }}</p>

    <template v-else-if="card && set">
      <BackButton :to="{ name: 'set', params: { setSlug: set.slug } }" :label="`Retour à ${set.name}`" class="mb-6" />

      <div class="grid grid-cols-1 gap-10 md:grid-cols-2">
        <div class="mx-auto w-full max-w-sm">
          <CardImage :src="card.image_url" :alt="card.name" :is-holo="card.is_holo" />
        </div>

        <div>
          <div v-if="card.is_holo || card.is_signed || card.is_numbered" class="mb-2 flex flex-wrap gap-2">
            <Badge v-if="card.is_holo" variant="secondary">Holo</Badge>
            <Badge v-if="card.is_signed" variant="secondary">Signée</Badge>
            <Badge v-if="card.is_numbered" variant="secondary">Numérotée /{{ card.numbered_total }}</Badge>
          </div>

          <h1 class="text-3xl font-bold">{{ card.name }}</h1>
          <p class="mt-1 text-sm text-muted-foreground">{{ set.name }} · #{{ card.number }}</p>

          <CardBadges :card="card" class="mt-4" />
          <CardStatPills :card="card" class="mt-6" />

          <div v-if="card.effect" class="mt-6 rounded-lg border bg-card p-4">
            <p class="mb-1 text-sm font-medium text-muted-foreground">Effet</p>
            <CardEffectText :text="card.effect" />
          </div>
        </div>
      </div>
    </template>
  </div>
</template>
