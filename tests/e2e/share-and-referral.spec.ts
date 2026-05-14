import { createHmac } from 'node:crypto'
import { expect, test } from '@playwright/test'

const shareSecret = 'share-secret-e2e'

const sharePayload = {
  version: 1,
  locale: 'en',
  managerName: 'Haribobo123',
  referrerUsername: 'Libertaerx',
  statement: 'My 3 top picks for the World Cup.',
  featuredPlayers: [
    {
      playerId: 1,
      displayName: 'Gabriel Magalhaes',
      shareLabel: 'Gabriel Magalhaes',
      teamCode: 'BRA',
      imageUrl: 'https://example.com/gabriel.png',
      slotClass: 'DEF',
      rating: 89,
    },
    {
      playerId: 2,
      displayName: 'Marquinhos',
      shareLabel: 'Marquinhos',
      teamCode: 'BRA',
      imageUrl: 'https://example.com/marquinhos.png',
      slotClass: 'DEF',
      rating: 88,
    },
  ],
}

function encodePayload(payload: unknown) {
  return Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url')
}

function signPayload(data: string) {
  return createHmac('sha256', shareSecret).update(data).digest('base64url')
}

test('keeps referral parameter when visitors move from landing page to builder', async ({ page }) => {
  await page.goto('/?ref=Libertaerx')
  await page.getByRole('link', { name: 'Builder' }).click()
  await expect(page).toHaveURL(/\/builder\?ref=Libertaerx$/)
})

test('renders signed public share preview and copy behavior without inline handlers', async ({ page }) => {
  const data = encodePayload(sharePayload)
  const sig = signPayload(data)
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: {
        writeText: async (text: string) => {
          const testWindow = window as Window & { copiedShareText?: string }
          testWindow.copiedShareText = text
        },
      },
    })
  })

  await page.goto(`/share/snapshot?data=${encodeURIComponent(data)}&sig=${encodeURIComponent(sig)}&v=9`)
  await expect(page.getByText('Show that you have the best soccer knowledge')).toBeVisible()
  await page.getByRole('button', { name: 'Copy invite text' }).click()

  const copiedText = await page.evaluate(() => (window as Window & { copiedShareText?: string }).copiedShareText)
  expect(copiedText).toContain('join the competition')
  expect(copiedText).toContain('ref=Libertaerx')
})

test('rejects manipulated share snapshots and produces a non-empty signed card image', async ({ request }) => {
  const data = encodePayload(sharePayload)
  const badResponse = await request.get(`/share/snapshot?data=${encodeURIComponent(data)}&sig=invalid&v=9`)
  expect(badResponse.status()).toBe(400)

  const sig = signPayload(data)
  const imageResponse = await request.get(`/api/public/share-card.png?data=${encodeURIComponent(data)}&sig=${encodeURIComponent(sig)}&v=9`)
  expect(imageResponse.ok()).toBeTruthy()
  expect(imageResponse.headers()['content-type']).toContain('image/png')
  expect((await imageResponse.body()).byteLength).toBeGreaterThan(10_000)
})
