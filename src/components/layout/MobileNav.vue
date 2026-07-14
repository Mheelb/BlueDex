<script setup lang="ts">
import { ref } from 'vue'
import { useRoute } from 'vue-router'
import { MenuIcon } from '@lucide/vue'
import { isTabActive, navTabs } from './navTabs'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'

const route = useRoute()
const open = ref(false)
</script>

<template>
  <Sheet v-model:open="open">
    <SheetTrigger as-child>
      <Button variant="ghost" size="icon" class="sm:hidden" aria-label="Ouvrir le menu de navigation">
        <MenuIcon class="size-5" />
      </Button>
    </SheetTrigger>
    <SheetContent side="left" class="w-64 border-primary/35 bg-card p-0">
      <SheetHeader>
        <SheetTitle class="font-blackletter text-2xl text-foreground">BlueDex</SheetTitle>
        <SheetDescription class="sr-only">Menu de navigation principal</SheetDescription>
      </SheetHeader>
      <nav class="flex flex-col gap-1 px-4 pb-4">
        <RouterLink
          v-for="tab in navTabs"
          :key="tab.name"
          :to="{ name: tab.name }"
          class="flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors"
          :class="
            isTabActive(route, tab)
              ? 'bg-primary text-primary-foreground'
              : 'text-muted-foreground hover:bg-white/5 hover:text-foreground'
          "
          @click="open = false"
        >
          <component :is="tab.icon" v-if="tab.icon" class="size-4" />
          <span>{{ tab.label }}</span>
        </RouterLink>
      </nav>
    </SheetContent>
  </Sheet>
</template>
