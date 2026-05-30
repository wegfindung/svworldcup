import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ErrorBoundary } from './ErrorBoundary'

const copy = {
  title: 'Something went wrong.',
  body: 'An unexpected error interrupted this page. You can try again.',
  retry: 'Try again',
}

function Bomb({ explode }: { explode: boolean }) {
  if (explode) {
    throw new Error('boom')
  }
  return <div>safe content</div>
}

describe('ErrorBoundary', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
  })
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('renders the localized fallback when a child throws', () => {
    render(
      <ErrorBoundary copy={copy}>
        <Bomb explode />
      </ErrorBoundary>,
    )
    expect(screen.getByRole('heading', { name: copy.title })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: copy.retry })).toBeInTheDocument()
  })

  it('recovers after retry once the child stops throwing', async () => {
    const user = userEvent.setup()
    let explode = true
    function Harness() {
      return (
        <ErrorBoundary copy={copy}>
          <Bomb explode={explode} />
        </ErrorBoundary>
      )
    }
    const { rerender } = render(<Harness />)
    expect(screen.getByRole('heading', { name: copy.title })).toBeInTheDocument()

    // The underlying cause must be gone before retry can succeed: update the child to stop throwing
    // (still showing the fallback because hasError is latched), then clear the boundary via retry.
    explode = false
    rerender(<Harness />)
    expect(screen.getByRole('heading', { name: copy.title })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: copy.retry }))
    expect(screen.getByText('safe content')).toBeInTheDocument()
  })

  it('passes children through when nothing throws', () => {
    render(
      <ErrorBoundary copy={copy}>
        <Bomb explode={false} />
      </ErrorBoundary>,
    )
    expect(screen.getByText('safe content')).toBeInTheDocument()
  })
})
