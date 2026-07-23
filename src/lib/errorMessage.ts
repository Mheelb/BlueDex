const GENERIC = 'Une erreur est survenue, réessaie.'

export function toUserMessage(err: unknown): string {
  const raw = err instanceof Error ? err.message : typeof err === 'string' ? err : ''
  if (!raw) return GENERIC

  const msg = raw.toLowerCase()
  if (msg.includes('jwt') || msg.includes('token has expired') || msg.includes('session')) {
    return 'Ta session a expiré, reconnecte-toi.'
  }
  if (msg.includes('duplicate key') || msg.includes('already exists') || msg.includes('unique constraint')) {
    return 'Cet élément existe déjà.'
  }
  if (
    msg.includes('row-level security') ||
    msg.includes('violates') ||
    msg.includes('not authorized') ||
    msg.includes('permission denied')
  ) {
    return "Tu n'as pas les droits pour effectuer cette action."
  }
  if (msg.includes('failed to fetch') || msg.includes('networkerror') || msg.includes('network request failed')) {
    return 'Problème de connexion, réessaie.'
  }
  if (msg.includes('invalid login credentials')) {
    return 'Email ou mot de passe incorrect.'
  }

  return raw
}
