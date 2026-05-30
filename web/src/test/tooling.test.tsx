import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

describe('web test tooling', () => {
  it('renders into jsdom with jest-dom matchers', () => {
    render(<h1>Grand Tournament</h1>)
    expect(screen.getByRole('heading', { name: 'Grand Tournament' })).toBeInTheDocument()
  })
})
