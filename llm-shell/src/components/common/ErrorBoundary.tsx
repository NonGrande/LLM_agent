import { Component, type ErrorInfo, type ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

/** Recover UI after render crashes (e.g. huge diff). */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("UI crash:", error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="flex h-full flex-col items-center justify-center gap-3 bg-bg-primary p-8 text-center">
          <p className="text-[14px] font-medium text-text-primary">UI error (recovered)</p>
          <p className="max-w-md text-[12px] text-text-secondary">{this.state.error.message}</p>
          <button
            type="button"
            className="ui-chrome-btn px-4 py-2"
            onClick={() => this.setState({ error: null })}
          >
            Continue
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
