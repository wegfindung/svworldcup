import { useEffect, useState } from 'react'
import { fetchBootstrap } from '../lib/api'
import type { BootstrapPayload } from '../lib/types'

const BOOTSTRAP_RETRY_DELAY_MS = 30_000

let cachedBootstrap: BootstrapPayload | null = null
let bootstrapPromise: Promise<BootstrapPayload> | null = null
let cachedBootstrapError = 'Unknown bootstrap error'
let bootstrapFailedAt = 0

function loadBootstrapOnce() {
  if (cachedBootstrap) {
    return Promise.resolve(cachedBootstrap)
  }

  if (bootstrapPromise) {
    return bootstrapPromise
  }

  if (bootstrapFailedAt && Date.now() - bootstrapFailedAt < BOOTSTRAP_RETRY_DELAY_MS) {
    return Promise.reject(new Error(cachedBootstrapError))
  }

  bootstrapPromise = fetchBootstrap()
    .then((payload) => {
      cachedBootstrap = payload
      cachedBootstrapError = ''
      bootstrapFailedAt = 0
      return payload
    })
    .catch((loadError) => {
      cachedBootstrapError = loadError instanceof Error ? loadError.message : 'Unknown bootstrap error'
      bootstrapFailedAt = Date.now()
      throw new Error(cachedBootstrapError)
    })
    .finally(() => {
      bootstrapPromise = null
    })

  return bootstrapPromise
}

export function useBootstrap() {
  const [data, setData] = useState<BootstrapPayload | null>(cachedBootstrap)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(!cachedBootstrap)

  useEffect(() => {
    let active = true

    async function load() {
      try {
        const next = await loadBootstrapOnce()
        if (!active) return
        setData(next)
        setError(null)
      } catch (loadError) {
        if (!active) return
        setError(loadError instanceof Error ? loadError.message : 'Unknown bootstrap error')
      } finally {
        if (active) {
          setIsLoading(false)
        }
      }
    }

    void load()
    return () => {
      active = false
    }
  }, [])

  return { data, error, isLoading }
}
