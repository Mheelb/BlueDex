import { describe, expect, it } from 'vitest'
import { toUserMessage } from '@/lib/errorMessage'

describe('toUserMessage', () => {
  it('traduit les erreurs de session', () => {
    expect(toUserMessage(new Error('JWT expired'))).toBe('Ta session a expiré, reconnecte-toi.')
    expect(toUserMessage(new Error('token has expired'))).toBe('Ta session a expiré, reconnecte-toi.')
  })

  it('traduit les doublons', () => {
    expect(toUserMessage(new Error('duplicate key value violates unique constraint "x"'))).toBe(
      'Cet élément existe déjà.',
    )
  })

  it('traduit les erreurs de droits/RLS', () => {
    expect(toUserMessage(new Error('new row violates row-level security policy'))).toBe(
      "Tu n'as pas les droits pour effectuer cette action.",
    )
  })

  it('traduit les erreurs réseau', () => {
    expect(toUserMessage(new Error('Failed to fetch'))).toBe('Problème de connexion, réessaie.')
  })

  it('traduit les identifiants invalides', () => {
    expect(toUserMessage(new Error('Invalid login credentials'))).toBe('Email ou mot de passe incorrect.')
  })

  it('laisse passer les messages applicatifs déjà en français', () => {
    expect(toUserMessage(new Error('Deck introuvable.'))).toBe('Deck introuvable.')
    expect(toUserMessage('Connecte-toi pour gérer ta collection.')).toBe('Connecte-toi pour gérer ta collection.')
  })

  it('retombe sur un message générique pour une erreur vide ou inconnue', () => {
    expect(toUserMessage(null)).toBe('Une erreur est survenue, réessaie.')
    expect(toUserMessage(undefined)).toBe('Une erreur est survenue, réessaie.')
    expect(toUserMessage({})).toBe('Une erreur est survenue, réessaie.')
    expect(toUserMessage(new Error(''))).toBe('Une erreur est survenue, réessaie.')
  })
})
