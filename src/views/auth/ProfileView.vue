<script setup lang="ts">
import { ref, watch } from 'vue'
import { useMutation, useQueryClient } from '@tanstack/vue-query'
import { useForm } from '@tanstack/vue-form'
import { UploadIcon } from '@lucide/vue'
import { toast } from 'vue-sonner'
import { supabase } from '@/lib/supabase'
import { toUserMessage } from '@/lib/errorMessage'
import { convertImageToWebP } from '@/lib/imageCompression'
import { uploadAvatar } from '@/lib/avatarStorage'
import { cdnImage } from '@/lib/imageCdn'
import { updateProfile, profileKeys } from '@/queries/profile'
import { useAuthUser } from '@/composables/useAuthUser'
import { useProfile } from '@/composables/useProfile'
import { required } from '@/lib/formValidators'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import FormField from '@/components/form/FormField.vue'
import PageHeader from '@/components/common/PageHeader.vue'
import QueryState from '@/components/common/QueryState.vue'

const queryClient = useQueryClient()
const { session } = useAuthUser()
const { data: profile, isPending, isError, error: profileError } = useProfile()

const avatarFile = ref<File | null>(null)
const avatarPreview = ref<string | null>(null)
const converting = ref(false)
const fileInputEl = ref<HTMLInputElement | null>(null)

async function onFileChange(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0] ?? null
  if (!file) return

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
  return { displayName: '' }
}

const profileForm = useForm({
  defaultValues: emptyForm(),
  onSubmit: async ({ value }) => {
    await saveProfileMutation.mutateAsync(value)
  },
})

watch(
  profile,
  (value) => {
    if (value) profileForm.reset({ displayName: value.display_name })
  },
  { immediate: true },
)

const saveProfileMutation = useMutation({
  mutationFn: async (value: ReturnType<typeof emptyForm>) => {
    const userId = session.value?.user.id
    if (!userId) throw new Error('Session introuvable.')

    let avatar_url: string | undefined
    if (avatarFile.value) {
      avatar_url = await uploadAvatar(userId, avatarFile.value)
    }

    await updateProfile(userId, { display_name: value.displayName, ...(avatar_url ? { avatar_url } : {}) })
  },
  onSuccess: () => {
    const userId = session.value?.user.id
    if (userId) queryClient.invalidateQueries({ queryKey: profileKeys.detail(userId) })
    avatarFile.value = null
    avatarPreview.value = null
    if (fileInputEl.value) fileInputEl.value.value = ''
    toast.success('Profil mis à jour.')
  },
  onError: (err) => {
    toast.error(toUserMessage(err))
  },
})

function emptyPasswordForm() {
  return { password: '', passwordConfirm: '' }
}

const passwordForm = useForm({
  defaultValues: emptyPasswordForm(),
  onSubmit: async ({ value }) => {
    if (value.password !== value.passwordConfirm) {
      toast.error('Les mots de passe ne correspondent pas.')
      return
    }
    await savePasswordMutation.mutateAsync(value.password)
  },
})

const savePasswordMutation = useMutation({
  mutationFn: async (password: string) => {
    const { error: updateError } = await supabase.auth.updateUser({ password })
    if (updateError) throw new Error(updateError.message)
  },
  onSuccess: () => {
    passwordForm.reset(emptyPasswordForm())
    toast.success('Mot de passe mis à jour.')
  },
  onError: (err) => {
    toast.error(toUserMessage(err))
  },
})
</script>

<template>
  <div>
    <PageHeader title="Mon profil" />

    <QueryState :loading="isPending" :error="isError ? (profileError?.message ?? 'Erreur.') : null">
      <div class="flex flex-col gap-6">
        <Card class="mx-auto w-full max-w-sm">
          <CardHeader>
            <CardTitle class="text-lg">Informations</CardTitle>
          </CardHeader>
          <CardContent>
            <form class="flex flex-col gap-4" @submit.prevent="() => profileForm.handleSubmit()">
              <profileForm.Field
                v-slot="{ field }"
                name="displayName"
                :validators="{ onChange: required('Pseudo requis.') }"
              >
                <FormField label="Pseudo" for="display-name" required :error="field.state.meta.errors[0]">
                  <Input
                    id="display-name"
                    :model-value="field.state.value"
                    maxlength="32"
                    @update:model-value="(v) => field.handleChange(String(v))"
                    @blur="field.handleBlur"
                  />
                </FormField>
              </profileForm.Field>

              <FormField label="Email">
                <Input :model-value="session?.user.email" type="email" disabled />
              </FormField>

              <FormField label="Avatar">
                <input ref="fileInputEl" type="file" accept="image/*" class="hidden" @change="onFileChange" />
                <div class="flex items-center gap-3">
                  <Avatar>
                    <AvatarImage
                      v-if="avatarPreview ?? profile?.avatar_url"
                      :src="(avatarPreview ?? cdnImage(profile!.avatar_url!, 128))!"
                    />
                    <AvatarFallback class="bg-primary text-primary-foreground">
                      {{ (profile?.display_name ?? '?').slice(0, 2).toUpperCase() }}
                    </AvatarFallback>
                  </Avatar>
                  <Button type="button" variant="outline" size="sm" :disabled="converting" @click="triggerFileInput">
                    <UploadIcon />
                    Changer
                  </Button>
                  <span class="truncate text-sm text-muted-foreground">
                    {{ converting ? 'Compression...' : (avatarFile?.name ?? '') }}
                  </span>
                </div>
              </FormField>

              <Button type="submit" :disabled="saveProfileMutation.isPending.value">
                {{ saveProfileMutation.isPending.value ? 'Enregistrement...' : 'Enregistrer' }}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card class="mx-auto w-full max-w-sm">
          <CardHeader>
            <CardTitle class="text-lg">Mot de passe</CardTitle>
          </CardHeader>
          <CardContent>
            <form class="flex flex-col gap-4" @submit.prevent="() => passwordForm.handleSubmit()">
              <passwordForm.Field
                v-slot="{ field }"
                name="password"
                :validators="{ onChange: required('Nouveau mot de passe requis.') }"
              >
                <FormField label="Nouveau mot de passe" for="password" required :error="field.state.meta.errors[0]">
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
              </passwordForm.Field>

              <passwordForm.Field
                v-slot="{ field }"
                name="passwordConfirm"
                :validators="{ onChange: required('Confirmation requise.') }"
              >
                <FormField
                  label="Confirmer le mot de passe"
                  for="password-confirm"
                  required
                  :error="field.state.meta.errors[0]"
                >
                  <Input
                    id="password-confirm"
                    :model-value="field.state.value"
                    type="password"
                    minlength="6"
                    autocomplete="new-password"
                    @update:model-value="(v) => field.handleChange(String(v))"
                    @blur="field.handleBlur"
                  />
                </FormField>
              </passwordForm.Field>

              <Button type="submit" :disabled="savePasswordMutation.isPending.value">
                {{ savePasswordMutation.isPending.value ? 'Enregistrement...' : 'Changer le mot de passe' }}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </QueryState>
  </div>
</template>
