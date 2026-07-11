export interface LoopSlide<T> {
  item: T
  originalIndex: number
}

export function withLoopPadding<T>(items: T[], minSlides = 8): LoopSlide<T>[] {
  if (items.length <= 1) {
    return items.map((item, originalIndex) => ({ item, originalIndex }))
  }

  const cycles = items.length >= minSlides ? 1 : Math.ceil(minSlides / items.length)
  const padded: LoopSlide<T>[] = []
  for (let cycle = 0; cycle < cycles; cycle++) {
    items.forEach((item, originalIndex) => padded.push({ item, originalIndex }))
  }
  return padded
}
