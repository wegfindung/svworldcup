import { Component, type ErrorInfo, type ReactNode } from 'react'
import type { AppMessages } from '../i18n/messages'

interface ErrorBoundaryProps {
  copy: AppMessages['errorBoundary']
  children: ReactNode
}

interface ErrorBoundaryState {
  hasError: boolean
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false }

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // No structured logging on the client yet (see stabilization plan E1); console is the only sink.
    console.error('Render error caught by ErrorBoundary', error, info)
  }

  private handleRetry = () => {
    this.setState({ hasError: false })
  }

  render() {
    if (!this.state.hasError) {
      return this.props.children
    }

    const { copy } = this.props
    return (
      <section className="glass-panel rounded-[1.15rem] p-5">
        <div className="space-y-3">
          <h2 className="text-xl font-semibold text-white">{copy.title}</h2>
          <p className="max-w-[60ch] text-sm leading-relaxed text-[var(--color-muted)]">{copy.body}</p>
          <button
            type="button"
            onClick={this.handleRetry}
            className="premium-button h-11 px-6 text-sm font-semibold"
          >
            {copy.retry}
          </button>
        </div>
      </section>
    )
  }
}
