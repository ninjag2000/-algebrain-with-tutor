import React, { Component, type ReactNode } from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { LocalizationProvider } from './contexts/LocalizationContext';

interface ErrorBoundaryProps { children: ReactNode }
interface ErrorBoundaryState { error: Error | null }

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  override state: ErrorBoundaryState = { error: null };
  static getDerivedStateFromError(error: Error): ErrorBoundaryState { return { error }; }
  componentDidCatch(error: Error) {
    console.error('App error:', error);
  }
  override render() {
    if (this.state.error) {
      return (
        <div style={{ padding: 24, minHeight: '100%', background: '#0B0F1A', color: '#E6E9F2', fontFamily: 'Inter, sans-serif' }}>
          <h1 style={{ fontSize: 20, marginBottom: 12 }}>Something went wrong</h1>
          <p style={{ color: '#9AA3B2', fontSize: 14 }}>{this.state.error.message}</p>
          <button
            type="button"
            onClick={() => this.setState({ error: null })}
            style={{ marginTop: 16, padding: '10px 20px', background: '#3A8DFF', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 600 }}
          >
            Try again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <ErrorBoundary>
      <LocalizationProvider>
        <App />
      </LocalizationProvider>
    </ErrorBoundary>
  </React.StrictMode>
);

// Hide native splash as soon as the app has mounted (fixes infinite splash on Android)
import('@capacitor/splash-screen').then(({ SplashScreen }) => {
  SplashScreen.hide().catch(() => {});
}).catch(() => {});