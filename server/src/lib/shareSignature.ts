import { createHmac, timingSafeEqual } from 'node:crypto'
import { env } from '../config/env.js'
import { decodeShareSnapshotPayload, encodeShareSnapshotPayload, type ShareSnapshotPayload } from './sharePayload.js'

const shareSignatureVersion = '12'

function shareSecret() {
  return env.SHARE_SNAPSHOT_SECRET ?? env.ADMIN_API_TOKEN ?? env.SESSION_SECRET ?? 'development-share-snapshot-secret'
}

export function signShareSnapshotData(encodedPayload: string) {
  return createHmac('sha256', shareSecret()).update(encodedPayload).digest('base64url')
}

export function verifyShareSnapshotSignature(encodedPayload: string, signature: string) {
  const expected = Buffer.from(signShareSnapshotData(encodedPayload), 'utf8')
  const actual = Buffer.from(signature, 'utf8')
  return expected.length === actual.length && timingSafeEqual(expected, actual)
}

export function createSignedShareSnapshot(payload: ShareSnapshotPayload) {
  const data = encodeShareSnapshotPayload(payload)
  const sig = signShareSnapshotData(data)
  const encodedData = encodeURIComponent(data)
  const encodedSig = encodeURIComponent(sig)

  return {
    data,
    sig,
    snapshotPath: `/share/snapshot?data=${encodedData}&sig=${encodedSig}&v=${shareSignatureVersion}`,
    cardPath: `/api/public/share-card.png?data=${encodedData}&sig=${encodedSig}&v=${shareSignatureVersion}`,
  }
}

export function decodeSignedShareSnapshotPayload(encodedPayload: string, signature: string) {
  if (!encodedPayload || !signature || !verifyShareSnapshotSignature(encodedPayload, signature)) {
    throw new Error('Invalid share signature.')
  }

  return decodeShareSnapshotPayload(encodedPayload)
}
