<script setup lang="ts">
import { nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { isTabActive, navTabs as tabs, type NavTab } from './navTabs'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'

const route = useRoute()
const router = useRouter()

const SCROLL_COLLAPSE_THRESHOLD = 100
const PADDING_TRANSITION_PROPERTIES = ['padding-left', 'padding-inline-start', 'padding-inline']

const tabRefs = ref<(HTMLElement | null)[]>([])
const isCollapsed = ref(false)

const isIndicatorTracking = ref(false)
let trackingFrame: number | null = null
let settleTimeout: ReturnType<typeof setTimeout> | undefined

function setTabRef(el: Element | null, index: number) {
  tabRefs.value[index] = el as HTMLElement | null
}

const indicatorStyle = ref({ width: '0px', transform: 'translateX(0px)', opacity: 0 })

function updateIndicator() {
  const index = tabs.findIndex((tab) => isTabActive(route, tab))
  const el = tabRefs.value[index]

  indicatorStyle.value = el
    ? { width: `${el.offsetWidth}px`, transform: `translateX(${el.offsetLeft}px)`, opacity: 1 }
    : { ...indicatorStyle.value, opacity: 0 }
}

function stopIndicatorTracking() {
  if (trackingFrame !== null) {
    cancelAnimationFrame(trackingFrame)
    trackingFrame = null
  }
  clearTimeout(settleTimeout)
}

function trackIndicatorFrame() {
  updateIndicator()
  trackingFrame = requestAnimationFrame(trackIndicatorFrame)
}

function finishIndicatorTracking() {
  stopIndicatorTracking()
  updateIndicator()
  isIndicatorTracking.value = false
}

function updateCollapsed() {
  const collapsed = window.scrollY > SCROLL_COLLAPSE_THRESHOLD
  if (collapsed === isCollapsed.value) return

  isCollapsed.value = collapsed
  isIndicatorTracking.value = true
  stopIndicatorTracking()
  trackIndicatorFrame()
  settleTimeout = setTimeout(finishIndicatorTracking, 350)
}

function onTabTransitionEnd(event: TransitionEvent) {
  if (PADDING_TRANSITION_PROPERTIES.includes(event.propertyName)) finishIndicatorTracking()
}

function isIconOnly(tab: NavTab) {
  return isCollapsed.value || tab.name === 'home'
}

onMounted(async () => {
  await router.isReady()
  await nextTick()
  updateIndicator()
  updateCollapsed()
  window.addEventListener('resize', updateIndicator)
  window.addEventListener('scroll', updateCollapsed, { passive: true })
})

onUnmounted(() => {
  window.removeEventListener('resize', updateIndicator)
  window.removeEventListener('scroll', updateCollapsed)
  stopIndicatorTracking()
})

watch(
  () => [route.path, route.name],
  async () => {
    await nextTick()
    updateIndicator()
  },
)
</script>

<template>
  <TooltipProvider :delay-duration="200">
    <nav
      class="relative hidden items-center gap-1 rounded-full border border-primary/35 bg-card p-1 shadow-[0_2px_10px_rgba(0,0,0,0.35)] sm:flex"
      @transitionend="onTabTransitionEnd"
    >
      <div
        class="absolute inset-y-1 left-0 rounded-full bg-primary ease-out"
        :class="isIndicatorTracking ? '' : 'transition-all duration-300'"
        :style="indicatorStyle"
      />
      <div
        v-for="(tab, index) in tabs"
        :key="tab.name"
        :ref="(el) => setTabRef(el as Element | null, index)"
        class="relative z-10"
      >
        <Tooltip :disabled="!isIconOnly(tab)">
          <TooltipTrigger as-child>
            <RouterLink
              :to="{ name: tab.name }"
              class="flex items-center justify-center rounded-full text-sm font-medium transition-all duration-700"
              :class="[
                tab.name === 'home' ? 'size-8' : isCollapsed ? 'px-2 py-1.5' : 'px-4 py-1.5',
                isTabActive(route, tab) ? 'text-primary-foreground' : 'text-muted-foreground hover:text-foreground',
              ]"
            >
              <component :is="tab.icon" v-if="isIconOnly(tab)" class="size-4" />
              <span v-else>{{ tab.label }}</span>
              <span v-if="isIconOnly(tab)" class="sr-only">{{ tab.label }}</span>
            </RouterLink>
          </TooltipTrigger>
          <TooltipContent side="bottom">{{ tab.label }}</TooltipContent>
        </Tooltip>
      </div>
    </nav>
  </TooltipProvider>
</template>
