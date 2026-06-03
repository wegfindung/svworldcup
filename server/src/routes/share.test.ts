import { describe, expect, it } from 'vitest'
import { loadShareFonts, shareTextFontFamily } from './share.js'

describe('share card fonts', () => {
  it('loads Latin Extended fallback fonts for player names with diacritics', async () => {
    const fonts = await loadShareFonts()

    expect(shareTextFontFamily).toContain('OutfitLatinExt')
    expect(fonts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: 'OutfitLatinExt', weight: 500 }),
        expect.objectContaining({ name: 'OutfitLatinExt', weight: 700 }),
      ]),
    )
    expect(fonts.every((font) => font.data.byteLength > 0)).toBe(true)
  })
})
