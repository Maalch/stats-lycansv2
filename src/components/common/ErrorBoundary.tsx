import { Component, type ErrorInfo, type ReactNode } from 'react';
import './ErrorBoundary.css';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

/**
 * ErrorBoundary component to catch and display errors gracefully
 * Prevents the entire app from crashing when a component fails
 */
export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: undefined });
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="error-boundary">
          <div className="error-boundary-content">
            <h2>❌ Une erreur est survenue</h2>
            <p className="error-message">
              {this.state.error?.message || 'Une erreur inattendue s\'est produite'}
            </p>
            <button 
              onClick={this.handleReset}
              className="error-boundary-button"
            >
              🔄 Réessayer
            </button>
            <button 
              onClick={() => window.location.reload()}
              className="error-boundary-button secondary"
            >
              ↻ Recharger la page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
