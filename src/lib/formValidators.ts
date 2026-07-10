export function required(message: string) {
  return ({ value }: { value: string }) => (value.trim() ? undefined : message)
}

const SLUG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/

export function slugPattern(message: string) {
  return ({ value }: { value: string }) => (!value.trim() || SLUG_PATTERN.test(value) ? undefined : message)
}

export function optionalNonNegativeNumber(message: string) {
  return ({ value }: { value: string | number }) =>
    value === '' || value === undefined || (!Number.isNaN(Number(value)) && Number(value) >= 0) ? undefined : message
}
