import { Component, ReactNode, StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: unknown) {
    console.error('Playa Buche ErrorBoundary capturó un fallo:', error, errorInfo);
  }

  handleReset = () => {
    try {
      localStorage.clear();
      sessionStorage.clear();
    } catch {}
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#002546] text-white flex flex-col items-center justify-center p-6 text-center">
          <div className="w-16 h-16 rounded-2xl bg-[#57d1fd] text-[#002546] font-black text-2xl flex items-center justify-center mb-4 shadow-xl">
            🏖️
          </div>
          <h1 className="text-xl font-black mb-2 text-white">Playa Buche · Virgen del Valle</h1>
          <p className="text-sm text-white/80 max-w-sm mb-6">
            Ocurrió un detalle al inicializar la aplicación. Haz clic abajo para reanudar el sistema.
          </p>
          <button
            onClick={this.handleReset}
            className="px-6 py-3 rounded-xl bg-[#57d1fd] text-[#002546] font-black text-sm uppercase tracking-wider shadow-lg active:scale-95 transition-transform"
          >
            🔄 Recargar y Continuar
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);
