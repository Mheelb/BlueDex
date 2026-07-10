<script setup lang="ts">
import { ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useMutation } from '@tanstack/vue-query'
import { supabase } from '@/lib/supabase'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'

const route = useRoute()
const router = useRouter()

const email = ref('')
const password = ref('')

const signInMutation = useMutation({
  mutationFn: async () => {
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: email.value,
      password: password.value,
    })
    if (signInError) throw new Error(signInError.message)
  },
  onSuccess: () => {
    const redirect = typeof route.query.redirect === 'string' ? route.query.redirect : undefined
    router.push(redirect ?? { name: 'admin-sets' })
  },
})

function onSubmit() {
  signInMutation.mutate()
}
</script>

<template>
  <Card class="mx-auto w-full max-w-sm">
    <CardHeader>
      <CardTitle class="text-xl">Connexion admin</CardTitle>
    </CardHeader>
    <CardContent>
      <form class="flex flex-col gap-4" @submit.prevent="onSubmit">
        <div class="flex flex-col gap-1.5">
          <Label for="email">Email</Label>
          <Input id="email" v-model="email" type="email" required autocomplete="username" />
        </div>

        <div class="flex flex-col gap-1.5">
          <Label for="password">Mot de passe</Label>
          <Input id="password" v-model="password" type="password" required autocomplete="current-password" />
        </div>

        <p v-if="signInMutation.error.value" class="text-sm text-destructive">{{ signInMutation.error.value.message }}</p>

        <Button type="submit" :disabled="signInMutation.isPending.value">
          {{ signInMutation.isPending.value ? 'Connexion...' : 'Se connecter' }}
        </Button>
      </form>
    </CardContent>
  </Card>
</template>
