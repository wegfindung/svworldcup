import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { RulesHelpAssistant } from './RulesHelpAssistant'

function renderAssistant() {
  return render(
    <MemoryRouter>
      <RulesHelpAssistant />
    </MemoryRouter>,
  )
}

describe('RulesHelpAssistant', () => {
  it('renders the structured FAQ and answer bot', () => {
    renderAssistant()

    expect(screen.getByRole('heading', { name: 'Ask the community rules desk' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Community rules FAQ' })).toBeInTheDocument()
    expect(screen.getAllByText('Nations Leaderboard').length).toBeGreaterThan(0)
  })

  it('answers a nation visibility question from the controlled rules data', async () => {
    const user = userEvent.setup()
    renderAssistant()

    await user.type(screen.getByLabelText('Question'), 'why is my nation not showing')

    expect(screen.getAllByRole('heading', { name: 'Why is my nation not showing on the table?' }).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/at least 2 manager entries/i).length).toBeGreaterThan(0)
  })
})
