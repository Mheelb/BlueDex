<script setup lang="ts">
import { computed } from 'vue'
import { useQuery } from '@tanstack/vue-query'
import { toUserMessage } from '@/lib/errorMessage'
import { useMyCollection } from '@/composables/useMyCollection'
import { useSetBySlug } from '@/composables/useSetBySlug'
import { cardKeys, fetchCardByNumber } from '@/queries/cards'
import { usePageSeo } from '@/lib/seo'
import CardImage from '@/components/cards/CardImage.vue'
import CardBadges from '@/components/cards/CardBadges.vue'
import CardStatPills from '@/components/cards/CardStatPills.vue'
import CardEffectText from '@/components/cards/CardEffectText.vue'
import CardPriceHistory from '@/components/cards/CardPriceHistory.vue'
import CollectionQuantityControl from '@/components/collection/CollectionQuantityControl.vue'
import BackButton from '@/components/common/BackButton.vue'
import { Badge } from '@/components/ui/badge'
import QueryState from '@/components/common/QueryState.vue'
import Heading from '@/components/common/Heading.vue'

const props = defineProps<{ setSlug: string; cardNumber: string }>()

const { data: set, isPending: setLoading, error: setError } = useSetBySlug(() => props.setSlug)

const setId = computed(() => set.value?.id)
const {
  data: card,
  isPending: cardLoading,
  error: cardError,
} = useQuery({
  queryKey: computed(() => cardKeys.detail(setId.value ?? '', props.cardNumber)),
  queryFn: () => fetchCardByNumber(setId.value!, props.cardNumber),
  enabled: computed(() => !!setId.value),
})

const loading = computed(() => setLoading.value || (!!setId.value && cardLoading.value))
const error = computed(() => {
  const err = setError.value ?? cardError.value
  return err ? toUserMessage(err) : null
})

const { userId, ownedQuantity, setQuantity } = useMyCollection()

const cardQuantity = computed(() => (card.value ? ownedQuantity(card.value.id) : 0))

function onUpdateQuantity(quantity: number) {
  if (card.value) setQuantity(card.value.id, quantity)
}

usePageSeo({
  title: () => (card.value && set.value ? `${card.value.name} · ${set.value.name}` : card.value?.name),
  description: () =>
    card.value && set.value
      ? `${card.value.name} (#${card.value.number}) — carte du set ${set.value.name} de Blue Rising.`
      : undefined,
  path: () => `/sets/${props.setSlug}/cards/${props.cardNumber}`,
  image: () => card.value?.image_url ?? undefined,
})
</script>

<template>
  <QueryState :loading="loading" :error="error">
    <template v-if="card && set">
      <BackButton
        :to="{ name: 'set', params: { setSlug: set.slug }, query: $route.query }"
        :label="`Retour à ${set.name}`"
        class="mb-6"
      />

      <div class="grid grid-cols-1 gap-10 md:grid-cols-2">
        <div class="mx-auto w-full max-w-sm">
          <CardImage :src="card.image_url" :alt="card.name" :is-holo="card.is_holo" :width="700" />
          <p v-if="card.artist" class="mt-2 text-center text-xs text-muted-foreground">
            Illustration : {{ card.artist }}
          </p>
        </div>

        <div>
          <div
            v-if="card.is_holo || card.is_signed || card.is_numbered || card.is_full_art || card.is_overframe"
            class="mb-2 flex flex-wrap gap-2"
          >
            <Badge v-if="card.is_holo" variant="secondary">Holo</Badge>
            <Badge v-if="card.is_signed" variant="secondary">Signée</Badge>
            <Badge v-if="card.is_numbered" variant="secondary">Numérotée /{{ card.numbered_total }}</Badge>
            <Badge v-if="card.is_full_art" variant="secondary">Full Art</Badge>
            <Badge v-if="card.is_overframe" variant="secondary">Overframe</Badge>
          </div>

          <Heading>{{ card.name }}</Heading>
          <p class="mt-1 text-sm text-muted-foreground">{{ set.name }} · #{{ card.number }}</p>

          <CardBadges :card="card" class="mt-4" />
          <CardStatPills :card="card" class="mt-6" />

          <div v-if="card.effect" class="mt-6 rounded-lg border bg-card p-4">
            <p class="mb-1 text-sm font-medium text-muted-foreground">Effet</p>
            <CardEffectText :text="card.effect" />
          </div>

          <CollectionQuantityControl
            v-if="userId"
            :quantity="cardQuantity"
            class="mt-6"
            @update:quantity="onUpdateQuantity"
          />
          <p v-else class="mt-6 text-sm text-muted-foreground">
            <RouterLink :to="{ name: 'login' }" class="text-primary hover:underline">Connecte-toi</RouterLink>
            pour ajouter cette carte à ta collection.
          </p>

          <CardPriceHistory :card-id="card.id" class="mt-6" />
        </div>
      </div>
    </template>
  </QueryState>
</template>
