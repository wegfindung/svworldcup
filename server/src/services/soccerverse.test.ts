import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { _setSvFetchClockForTests, svFetch } from './soccerverse.js'

function mockResponse(body: unknown, init: { status?: number; headers?: Record<string, string> } = {}): Response {
  return new Response(JSON.stringify(body), {
    status: init.status ?? 200,
    headers: { 'content-type': 'application/json', ...(init.headers ?? {}) },
  })
}

interface VirtualClock {
  now(): number
  sleep(ms: number): Promise<void>
  advance(ms: number): void
}

function buildVirtualClock(start = 0): VirtualClock {
  let time = start
  return {
    now: () => time,
    sleep: (ms: number) => {
      time += ms
      return Promise.resolve()
    },
    advance: (ms: number) => {
      time += ms
    },
  }
}

describe('svFetch pacing', () => {
  let clock: VirtualClock
  let fetchMock: ReturnType<typeof vi.fn>

  beforeEach(() => {
    clock = buildVirtualClock(0)
    fetchMock = vi.fn(async () => mockResponse({ ok: true }))
    _setSvFetchClockForTests({
      now: clock.now,
      sleep: clock.sleep,
      fetch: fetchMock as unknown as typeof fetch,
    })
  })

  afterEach(() => {
    _setSvFetchClockForTests({
      now: () => Date.now(),
      sleep: (ms: number) => new Promise((resolve) => setTimeout(resolve, ms)),
      fetch: (input, init) => fetch(input as string, init),
    })
  })

  it('does not delay the first call', async () => {
    const before = clock.now()
    await svFetch('https://example/api')
    expect(clock.now() - before).toBe(0)
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('spaces sequential calls by at least 400ms', async () => {
    await svFetch('https://example/api/1')
    const afterFirst = clock.now()
    await svFetch('https://example/api/2')
    expect(clock.now() - afterFirst).toBe(400)
    await svFetch('https://example/api/3')
    expect(clock.now() - afterFirst).toBe(800)
    expect(fetchMock).toHaveBeenCalledTimes(3)
  })

  it('queues concurrent callers in arrival order', async () => {
    const calls: number[] = []
    const wrappedFetch = vi.fn(async (input: RequestInfo) => {
      calls.push(Number(String(input).slice(-1)))
      return mockResponse({})
    })
    _setSvFetchClockForTests({ now: clock.now, sleep: clock.sleep, fetch: wrappedFetch as unknown as typeof fetch })

    await Promise.all([svFetch('https://example/1'), svFetch('https://example/2'), svFetch('https://example/3')])
    expect(calls).toEqual([1, 2, 3])
    // 3 paced calls: 0, 400, 800
    expect(clock.now()).toBe(800)
  })
})

describe('svFetch 429 backoff', () => {
  let clock: VirtualClock

  beforeEach(() => {
    clock = buildVirtualClock(0)
  })

  afterEach(() => {
    _setSvFetchClockForTests({
      now: () => Date.now(),
      sleep: (ms: number) => new Promise((resolve) => setTimeout(resolve, ms)),
      fetch: (input, init) => fetch(input as string, init),
    })
  })

  it('retries with exponential backoff on 429 and returns 2xx when it eventually succeeds', async () => {
    let calls = 0
    const fetchMock = vi.fn(async () => {
      calls += 1
      if (calls < 3) {
        return new Response('STOP SPAMMING', { status: 429 })
      }
      return mockResponse({ ok: true })
    })
    _setSvFetchClockForTests({ now: clock.now, sleep: clock.sleep, fetch: fetchMock as unknown as typeof fetch })

    const response = await svFetch('https://example/api')
    expect(response.status).toBe(200)
    expect(calls).toBe(3)
    // First call at t=0 (pace consumed). Retry #1: backoff 1000ms (2^0), no extra pace
    // wait because backoff already exceeds the 400ms slot. Retry #2: backoff 2000ms.
    // Total elapsed = 1000 + 2000 = 3000ms.
    expect(clock.now()).toBe(3000)
  })

  it('honours numeric Retry-After (in seconds) instead of exponential backoff', async () => {
    let calls = 0
    const fetchMock = vi.fn(async () => {
      calls += 1
      if (calls === 1) {
        return new Response('STOP SPAMMING', { status: 429, headers: { 'retry-after': '5' } })
      }
      return mockResponse({ ok: true })
    })
    _setSvFetchClockForTests({ now: clock.now, sleep: clock.sleep, fetch: fetchMock as unknown as typeof fetch })

    await svFetch('https://example/api')
    // First call at t=0. Retry-After: 5s = 5000ms backoff. No extra pace wait because
    // the 5000ms backoff swamps the 400ms slot.
    expect(clock.now()).toBe(5000)
  })

  it('gives up after 4 retries and returns the final 429', async () => {
    const fetchMock = vi.fn(async () => new Response('STOP SPAMMING', { status: 429 }))
    _setSvFetchClockForTests({ now: clock.now, sleep: clock.sleep, fetch: fetchMock as unknown as typeof fetch })

    const response = await svFetch('https://example/api')
    expect(response.status).toBe(429)
    // 1 initial + 4 retries = 5 fetch calls
    expect(fetchMock).toHaveBeenCalledTimes(5)
  })
})
