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

function showBootError(message: string, detail?: string) {
  const el = document.getElementById('root');
  if (el) {
    el.innerHTML = `<div style="padding:24px;min-height:100%;background:#0B0F1A;color:#E6E9F2;font-family:system-ui,sans-serif;"><p style="color:#9AA3B2;margin-bottom:8px;">${escapeHtml(message)}</p>${detail ? `<pre style="font-size:12px;overflow:auto;color:#9AA3B2;">${escapeHtml(detail)}</pre>` : ''}<button type="button" onclick="location.reload()" style="margin-top:16px;padding:10px 20px;background:#3A8DFF;color:#fff;border:none;border-radius:8px;font-weight:600;">Обновить</button></div>`;
  }
}
function escapeHtml(s: string) {
  const div = document.createElement('div');
  div.textContent = s;
  return div.innerHTML;
}

const rootElement = document.getElementById('root');
if (!rootElement) {
  showBootError('Не найден элемент #root');
  throw new Error("Could not find root element to mount to");
}

try {
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
} catch (err) {
  const e = err instanceof Error ? err : new Error(String(err));
  showBootError('Ошибка при запуске', e.message + (e.stack ? '\n' + e.stack : ''));
  console.error(e);
}