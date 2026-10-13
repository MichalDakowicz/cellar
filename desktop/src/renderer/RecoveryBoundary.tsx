import { Component, type ReactNode } from "react";

export class RecoveryBoundary extends Component<
  { children: ReactNode },
  { error: string | null }
> {
  state = { error: null as string | null };
  static getDerivedStateFromError(error: unknown) {
    return { error: error instanceof Error ? error.message : String(error) };
  }
  render() {
    if (this.state.error)
      return (
        <main className="page stack" role="alert">
          <h1>Cellar could not open this view</h1>
          <p>{this.state.error}</p>
          <p className="muted">
            Saved account, preferences and pending controls remain intact.
          </p>
          <button onClick={() => location.reload()}>try opening again</button>
        </main>
      );
    return this.props.children;
  }
}
