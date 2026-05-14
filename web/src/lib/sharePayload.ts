import type { LocaleCode, SlotClass, TeamPoolPlayer } from './types'

export interface ShareSnapshotPlayer {
  playerId: number
  displayName: string
  shareLabel?: string
  teamCode: string
  imageUrl: string
  slotClass: SlotClass
  rating: number
}

export interface ShareSnapshotPayload {
  version: 1
  locale: LocaleCode
  managerName: string
  statement: string
  featuredPlayers: ShareSnapshotPlayer[]
}

function bytesToBase64(bytes: Uint8Array) {
  let binary = ''
  for (const byte of bytes) {
    binary += String.fromCharCode(byte)
  }
  return btoa(binary)
}

function base64ToBase64Url(value: string) {
  return value.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')
}

export function encodeShareSnapshotPayload(payload: ShareSnapshotPayload) {
  const encoded = new TextEncoder().encode(JSON.stringify(payload))
  return base64ToBase64Url(bytesToBase64(encoded))
}

export function buildShareSnapshotUrl(payload: ShareSnapshotPayload) {
  const encoded = encodeShareSnapshotPayload(payload)
  return `/share/snapshot?data=${encodeURIComponent(encoded)}`
}

export function buildShareCardUrl(payload: ShareSnapshotPayload) {
  const encoded = encodeShareSnapshotPayload(payload)
  return `/api/public/share-card.png?data=${encodeURIComponent(encoded)}`
}

export function createShareSnapshotPlayer(player: TeamPoolPlayer, slotClass: SlotClass, shareLabel?: string): ShareSnapshotPlayer {
  return {
    playerId: player.playerId,
    displayName: player.displayName,
    shareLabel: shareLabel?.trim() ? shareLabel.trim() : undefined,
    teamCode: player.teamCode || player.nationalityCode,
    imageUrl: player.imageUrl,
    slotClass,
    rating: player.rating,
  }
}
