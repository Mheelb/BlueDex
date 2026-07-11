<script setup lang="ts">
import { useRoute, useRouter } from 'vue-router'
import { useMutation } from '@tanstack/vue-query'
import { useForm } from '@tanstack/vue-form'
import { supabase } from '@/lib/supabase'
import { required } from '@/lib/formValidators'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import FormField from '@/components/form/FormField.vue'

const route = useRoute()
const router = useRouter()

function emptyForm() {
  return { email: '', password: '' }
}

const signInMutation = useMutation({
  mutationFn: async (value: ReturnType<typeof emptyForm>) => {
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: value.email,
      password: value.password,
    })
    if (signInError) throw new Error(signInError.message)
  },
  onSuccess: () => {
    const redirect = typeof route.query.redirect === 'string' ? route.query.redirect : undefined
    router.push(redirect ?? { name: 'admin-sets' })
  },
})

const form = useForm({
  defaultValues: emptyForm(),
  onSubmit: async ({ value }) => {
    await signInMutation.mutateAsync(value)
  },
})
</script>

<template>
  <Card class="mx-auto w-full max-w-sm">
    <CardHeader>
      <CardTitle class="text-xl">Connexion admin</CardTitle>
    </CardHeader>
    <CardContent>
      <form class="flex flex-col gap-4" @submit.prevent="() => form.handleSubmit()">
        <form.Field name="email" :validators="{ onChange: required('Email requis.') }" v-slot="{ field }">
          <FormField label="Email" for="email" required :error="field.state.meta.errors[0]">
            <Input
              id="email"
              :model-value="field.state.value"
              type="email"
              autocomplete="username"
              @update:model-value="(v) => field.handleChange(String(v))"
              @blur="field.handleBlur"
            />
          </FormField>
        </form.Field>

        <form.Field name="password" :validators="{ onChange: required('Mot de passe requis.') }" v-slot="{ field }">
          <FormField label="Mot de passe" for="password" required :error="field.state.meta.errors[0]">
            <Input
              id="password"
              :model-value="field.state.value"
              type="password"
              autocomplete="current-password"
              @update:model-value="(v) => field.handleChange(String(v))"
              @blur="field.handleBlur"
            />
          </FormField>
        </form.Field>

        <p v-if="signInMutation.error.value" class="text-sm text-destructive">{{ signInMutation.error.value.message }}</p>

        <Button type="submit" :disabled="signInMutation.isPending.value">
          {{ signInMutation.isPending.value ? 'Connexion...' : 'Se connecter' }}
        </Button>
      </form>
    </CardContent>
  </Card>
</template>
