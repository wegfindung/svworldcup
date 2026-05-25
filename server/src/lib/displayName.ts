const namedTextEntities: Record<string, string> = {
  amp: '&',
  apos: "'",
  quot: '"',
  nbsp: ' ',
}

function decodeEntity(match: string, entity: string) {
  const normalized = entity.toLowerCase()
  if (normalized.startsWith('#x')) {
    const codePoint = Number.parseInt(normalized.slice(2), 16)
    return Number.isInteger(codePoint) && codePoint >= 0 && codePoint <= 0x10ffff ? String.fromCodePoint(codePoint) : match
  }
  if (normalized.startsWith('#')) {
    const codePoint = Number.parseInt(normalized.slice(1), 10)
    return Number.isInteger(codePoint) && codePoint >= 0 && codePoint <= 0x10ffff ? String.fromCodePoint(codePoint) : match
  }
  return namedTextEntities[normalized] ?? match
}

export function decodeTextEntities(value: string) {
  let decoded = value
  for (let index = 0; index < 3; index += 1) {
    const next = decoded.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, decodeEntity)
    if (next === decoded) {
      return decoded
    }
    decoded = next
  }
  return decoded
}

export function normalizeDisplayName(value: string) {
  return decodeTextEntities(value).replace(/\s+/g, ' ').trim()
}
