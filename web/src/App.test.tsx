import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'

vi.mock('./lib/api', () => ({ recordReferralClick: vi.fn() }))

const bootstrapResult = { data: null as unknown, error: null as string | null, isLoading: false }
vi.mock('./hooks/useBootstrap', () => ({
  useBootstrap: () => bootstrapResult,
}))

import App from './App'

function renderApp() {
  return render(
    <MemoryRouter initialEntries={['/']}>
      <App />
    </MemoryRouter>,
  )
}

describe('App bootstrap degraded-state notice', () => {
  it('shows a localized notice when the bootstrap fetch fails', () => {
    bootstrapResult.error = 'Network down'
    renderApp()
    expect(screen.getByText(/Live tournament data could not be loaded/i)).toBeInTheDocument()
  })

  it('shows no notice when the bootstrap fetch succeeds', () => {
    bootstrapResult.error = null
    renderApp()
    expect(screen.queryByText(/Live tournament data could not be loaded/i)).not.toBeInTheDocument()
  })
})
