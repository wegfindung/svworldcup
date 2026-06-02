import { describe, expect, it } from 'vitest'
import { renderIndexSocialMeta } from './socialMeta.js'

const indexHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>The Grand Tournament</title>
    <meta name="description" content="old" />
    <meta property="og:locale" content="en_US" />
    <meta property="og:url" content="https://worldcup.svtool.info/" />
    <meta property="og:title" content="old" />
    <meta property="og:description" content="old" />
    <meta property="og:image" content="https://worldcup.svtool.info/brand/og-image.jpg" />
    <meta property="og:image:alt" content="old" />
    <meta name="twitter:title" content="old" />
    <meta name="twitter:description" content="old" />
    <meta name="twitter:image" content="https://worldcup.svtool.info/brand/og-image.jpg" />
    <meta name="twitter:image:alt" content="old" />
  </head>
</html>
`

describe('renderIndexSocialMeta', () => {
  it('uses the current request origin for home preview image URLs', () => {
    const html = renderIndexSocialMeta(indexHtml, 'en', 'https://event.svtool.info/?share_locale=en')

    expect(html).toContain('property="og:url" content="https://event.svtool.info/?share_locale=en"')
    expect(html).toContain('property="og:image" content="https://event.svtool.info/brand/og-image.jpg"')
    expect(html).toContain('name="twitter:image" content="https://event.svtool.info/brand/og-image.jpg"')
    expect(html).not.toContain('https://worldcup.svtool.info/brand/og-image.jpg')
  })
})
