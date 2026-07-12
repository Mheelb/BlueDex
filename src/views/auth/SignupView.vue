<script setup lang="ts">
import { ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useMutation } from '@tanstack/vue-query'
import { useForm } from '@tanstack/vue-form'
import { UploadIcon } from '@lucide/vue'
import { supabase } from '@/lib/supabase'
import { convertImageToWebP } from '@/lib/imageCompression'
import { uploadAvatar } from '@/lib/avatarStorage'
import { updateProfileAvatar } from '@/queries/profile'
import { required } from '@/lib/formValidators'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import FormField from '@/components/form/FormField.vue'

const route = useRoute()
const router = useRouter()

const avatarFile = ref<File | null>(null)
const avatarPreview = ref<string | null>(null)
const converting = ref(false)
const fileInputEl = ref<HTMLInputElement | null>(null)

async function onFileChange(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0] ?? null
  if (!file) {
    avatarFile.value = null
    avatarPreview.value = null
    return
  }

  converting.value = true
  try {
    avatarFile.value = await convertImageToWebP(file)
    avatarPreview.value = URL.createObjectURL(avatarFile.value)
  } finally {
    converting.value = false
  }
}

function triggerFileInput() {
  fileInputEl.value?.click()
}

function emptyForm() {
  return { email: '', password: '', displayName: '' }
}

const signUpMutation = useMutation({
  mutationFn: async (value: ReturnType<typeof emptyForm>) => {
    const { data, error: signUpError } = await supabase.auth.signUp({
      email: value.email,
      password: value.password,
      options: { data: { display_name: value.displayName } },
    })
    if (signUpError) throw new Error(signUpError.message)
    const userId = data.user?.id
    if (!userId) throw new Error('Compte créé mais session absente, réessaie de te connecter.')

    if (avatarFile.value) {
      const avatarUrl = await uploadAvatar(userId, avatarFile.value)
      await updateProfileAvatar(userId, avatarUrl)
    }
  },
  onSuccess: () => {
    const redirect = typeof route.query.redirect === 'string' ? route.query.redirect : undefined
    router.push(redirect ?? { name: 'home' })
  },
})

const form = useForm({
  defaultValues: emptyForm(),
  onSubmit: async ({ value }) => {
    await signUpMutation.mutateAsync(value)
  },
})
</script>

<template>
  <Card class="mx-auto w-full max-w-sm">
    <CardHeader>
      <CardTitle class="text-xl">Créer un compte</CardTitle>
    </CardHeader>
    <CardContent>
      <form class="flex flex-col gap-4" @submit.prevent="() => form.handleSubmit()">
        <form.Field v-slot="{ field }" name="displayName" :validators="{ onChange: required('Pseudo requis.') }">
          <FormField label="Pseudo" for="display-name" required :error="field.state.meta.errors[0]">
            <Input
              id="display-name"
              :model-value="field.state.value"
              maxlength="32"
              @update:model-value="(v) => field.handleChange(String(v))"
              @blur="field.handleBlur"
            />
          </FormField>
        </form.Field>

        <form.Field v-slot="{ field }" name="email" :validators="{ onChange: required('Email requis.') }">
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

        <form.Field v-slot="{ field }" name="password" :validators="{ onChange: required('Mot de passe requis.') }">
          <FormField label="Mot de passe" for="password" required :error="field.state.meta.errors[0]">
            <Input
              id="password"
              :model-value="field.state.value"
              type="password"
              minlength="6"
              autocomplete="new-password"
              @update:model-value="(v) => field.handleChange(String(v))"
              @blur="field.handleBlur"
            />
          </FormField>
        </form.Field>

        <FormField label="Avatar (optionnel)">
          <input ref="fileInputEl" type="file" accept="image/*" class="hidden" @change="onFileChange" />
          <div class="flex items-center gap-3">
            <img v-if="avatarPreview" :src="avatarPreview" alt="" class="size-10 rounded-full object-cover" />
            <Button type="button" variant="outline" size="sm" :disabled="converting" @click="triggerFileInput">
              <UploadIcon />
              Importer
            </Button>
            <span class="truncate text-sm text-muted-foreground">
              {{ converting ? 'Compression...' : (avatarFile?.name ?? 'Aucun fichier sélectionné') }}
            </span>
          </div>
        </FormField>

        <p v-if="signUpMutation.error.value" class="text-sm text-destructive">
          {{ signUpMutation.error.value.message }}
        </p>

        <Button type="submit" :disabled="signUpMutation.isPending.value">
          {{ signUpMutation.isPending.value ? 'Création...' : 'Créer mon compte' }}
        </Button>

        <RouterLink :to="{ name: 'login' }" class="text-center text-sm text-muted-foreground hover:text-foreground">
          Déjà un compte ? Se connecter
        </RouterLink>
      </form>
    </CardContent>
  </Card>
</template>
