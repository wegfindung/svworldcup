import { useEffect, useState } from 'react'
import { fetchBootstrap } from '../lib/api'
import type { BootstrapPayload } from '../lib/types'

export function useBootstrap() {
  const [data, setData] = useState<BootstrapPayload | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let active = true

    async function load() {
      try {
        const next = await fetchBootstrap()
        if (!active) return
        setData(next)
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
