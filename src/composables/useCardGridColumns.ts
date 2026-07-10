import { computed } from 'vue'
import { breakpointsTailwind, useBreakpoints } from '@vueuse/core'

const COLUMNS_BY_BREAKPOINT = [
  ['2xl', 7],
  ['xl', 6],
  ['lg', 5],
  ['md', 4],
  ['sm', 3],
] as const

export function useCardGridColumns() {
  const breakpoints = useBreakpoints(breakpointsTailwind)

  return computed(() => {
    for (const [name, columns] of COLUMNS_BY_BREAKPOINT) {
      if (breakpoints.greaterOrEqual(name).value) return columns
    }
    return 2
  })
}
