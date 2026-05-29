// Mirror of the server's publicProfileSlug (server/src/repositories/registrationRepository.ts).
// The public profile route is /profiles/:slug, where slug = slugified-display-name + first 8
// chars of the participant id. Keep both sides in sync.
export function publicProfileSlug(displayName: string, participantId: string): string {
  const base = displayName
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
  return `${base || 'manager'}-${participantId.slice(0, 8)}`
}
