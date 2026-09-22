import React, { Component, type ReactNode } from "react"
import log from "electron-log/renderer"
import { invoke } from "../lib/electron"
import Button from "./ui/button"
import TitleBar from "./titlebar"

const GITHUB_ISSUES = "https://github.com/nglongnhat-bunn/optimezer-pc-by-bun/issues"
const DISCORD_INVITE = "https://discord.com/invite/En5YJYWj3Z"

type Props = {
  children: ReactNode
}

type State = {
  hasError: boolean
  error: Error | null
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    log.error("React Error Boundary caught an error:", error, errorInfo)
  }

  handleOpenLogFolder = async () => {
    await invoke({ channel: "open-log-folder" })
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null })
  }

  render() {
    if (this.state.hasError && this.state.error) {
      const errorMessage =
        this.state.error instanceof Error ? this.state.error.message : String(this.state.error)
      const errorStack = this.state.error instanceof Error ? this.state.error.stack : undefined

      return (
        <div className="flex flex-col h-screen bg-sparkle-bg text-sparkle-text items-center justify-center p-8">
          {/* @ts-expect-error */}
          <TitleBar />
          <div className="max-w-xl w-full rounded-2xl border border-sparkle-border bg-sparkle-card p-8">
            <h1 className="text-2xl font-semibold text-red-500 mb-2">Something went wrong</h1>
            <p className="text-sparkle-text-secondary mb-4">
              LongNhat encountered an unexpected error. Please help us fix it by reporting this
              issue.
            </p>
            <pre className="mb-6 p-4 rounded-lg bg-sparkle-accent text-xs text-sparkle-text overflow-x-auto overflow-y-auto max-h-40 border border-sparkle-border select-all">
              {errorMessage}
              {errorStack && `\n\n${errorStack}`}
            </pre>
            <div className="flex flex-wrap gap-3 mb-6">
              <Button variant="primary" onClick={this.handleOpenLogFolder} size="md">
                Open Log Folder
              </Button>
              <Button variant="secondary" onClick={this.handleRetry} size="md">
                Try Again
              </Button>
            </div>
            <p className="text-sm text-sparkle-text-muted">
              Please{" "}
              <a
                href={GITHUB_ISSUES}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sparkle-primary hover:underline"
              >
                create a GitHub issue
              </a>{" "}
              or share the error and log file in our{" "}
              <a
                href={DISCORD_INVITE}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sparkle-primary hover:underline"
              >
                Discord
              </a>{" "}
              so we can fix it.
            </p>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

export default ErrorBoundary
