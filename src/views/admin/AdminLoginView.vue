<script setup lang="ts">
import { ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { supabase } from '@/lib/supabase'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'

const route = useRoute()
const router = useRouter()

const email = ref('')
const password = ref('')
const loading = ref(false)
const error = ref<string | null>(null)

async function onSubmit() {
  loading.value = true
  error.value = null

  const { error: signInError } = await supabase.auth.signInWithPassword({
    email: email.value,
    password: password.value,
  })

  loading.value = false

  if (signInError) {
    error.value = signInError.message
    return
  }

  const redirect = typeof route.query.redirect === 'string' ? route.query.redirect : undefined
  router.push(redirect ?? { name: 'admin-sets' })
}
</script>

<template>
  <div class="mx-auto max-w-sm px-4 py-16">
    <Card>
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

          <p v-if="error" class="text-sm text-destructive">{{ error }}</p>

          <Button type="submit" :disabled="loading">
            {{ loading ? 'Connexion...' : 'Se connecter' }}
          </Button>
        </form>
      </CardContent>
    </Card>
  </div>
</template>
