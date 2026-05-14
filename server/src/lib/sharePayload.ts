import { z } from 'zod'

export const supportedShareLocales = ['en', 'es', 'de', 'fr', 'pt', 'ru', 'zh'] as const

export type ShareLocale = (typeof supportedShareLocales)[number]

const featuredPlayerSchema = z.object({
  playerId: z.coerce.number().int().positive(),
  displayName: z.string().trim().min(1).max(120),
  teamCode: z.string().trim().toUpperCase().length(3),
  imageUrl: z.string().trim().url(),
  slotClass: z.enum(['GK', 'DEF', 'MID', 'FWD']),
  rating: z.coerce.number().int().min(0).max(99),
})

const shareSnapshotSchema = z.object({
  version: z.literal(1),
  locale: z.enum(supportedShareLocales),
  managerName: z.string().trim().min(1).max(80),
  statement: z.string().trim().min(1).max(140),
  featuredPlayers: z.array(featuredPlayerSchema).min(2).max(3),
})

export type ShareSnapshotPayload = z.infer<typeof shareSnapshotSchema>

export function decodeShareSnapshotPayload(encoded: string): ShareSnapshotPayload {
  const json = Buffer.from(encoded, 'base64url').toString('utf8')
  const parsed = JSON.parse(json) as unknown
  return shareSnapshotSchema.parse(parsed)
}
