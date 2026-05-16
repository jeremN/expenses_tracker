import { describe, it, expect } from 'vitest'
import { parseAcceptLanguage, translate } from './index'
import en from './en.json'
import fr from './fr.json'

describe('parseAcceptLanguage', () => {
  it('returns fr when French is the first subtag', () => {
    expect(parseAcceptLanguage('fr-FR,fr;q=0.9,en;q=0.8')).toBe('fr')
    expect(parseAcceptLanguage('fr')).toBe('fr')
    expect(parseAcceptLanguage('FR-ca')).toBe('fr')
  })
  it('returns en for English or anything unsupported', () => {
    expect(parseAcceptLanguage('en-US,en;q=0.9')).toBe('en')
    expect(parseAcceptLanguage('de-DE,de;q=0.9')).toBe('en')
    expect(parseAcceptLanguage('')).toBe('en')
    expect(parseAcceptLanguage(null)).toBe('en')
  })
})

describe('translate', () => {
  it('returns the string for the active locale', () => {
    expect(translate('en', 'common.save')).toBe('Save')
    expect(translate('fr', 'common.save')).toBe('Sauvegarder')
  })
  it('falls back to English when the French key is missing', () => {
    expect(translate('fr', 'common.save')).toBe(fr['common.save'])
  })
  it('returns the key itself when it is missing everywhere', () => {
    expect(translate('en', 'totally.missing.key')).toBe('totally.missing.key')
    expect(translate('fr', 'totally.missing.key')).toBe('totally.missing.key')
  })
  it('substitutes {vars}', () => {
    expect(
      translate('en', 'import.result', { imported: 3, total: 5, filename: 'x.csv' }),
    ).toBe('Successfully imported 3 of 5 transactions from x.csv.')
  })
})

describe('en/fr key parity', () => {
  it('en.json and fr.json have the exact same key set', () => {
    expect(Object.keys(en).sort()).toEqual(Object.keys(fr).sort())
  })
})
