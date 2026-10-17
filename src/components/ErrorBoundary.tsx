import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, LogOut, Home } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
    };
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary capturó una excepción en React:', error, errorInfo);
  }

  private handleRetry = () => {
    this.setState({ hasError: false, error: null });
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  private handleReload = () => {
    window.location.reload();
  };

  private handleClearAndRestart = () => {
    try {
      sessionStorage.clear();
      // Borrar estados de sesión temporales sin tocar datos permanentes
      localStorage.removeItem('playa_buche_token');
    } catch {}
    window.location.href = window.location.pathname;
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-[50vh] flex flex-col items-center justify-center p-4 text-center">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full border border-rose-200 shadow-xl space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto border border-rose-100 shadow-xs">
              <AlertTriangle className="w-7 h-7" />
            </div>

            <div className="space-y-1">
              <h2 className="text-base font-extrabold text-[#002546]">
                {this.props.fallbackTitle || 'Hubo un inconveniente al cargar esta vista'}
              </h2>
              <p className="text-xs text-gray-600 leading-relaxed">
                La aplicación protegió tu sesión para evitar una pantalla en blanco.
                {this.state.error?.message ? (
                  <span className="block mt-1 font-mono text-[11px] text-rose-700 bg-rose-50 p-2 rounded-lg break-words text-left">
                    Detalle: {this.state.error.message}
                  </span>
                ) : null}
              </p>
            </div>

            <div className="flex flex-col gap-2 pt-2">
              <button
                type="button"
                onClick={this.handleRetry}
                className="w-full py-2.5 px-4 bg-[#006782] hover:bg-[#005870] text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-colors shadow-xs active:scale-98"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Reintentar carga de pantalla</span>
              </button>

              <button
                type="button"
                onClick={this.handleReload}
                className="w-full py-2.5 px-4 bg-[#eff4ff] hover:bg-[#dce9ff] text-[#002546] border border-[#a4c9fc] rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-colors active:scale-98"
              >
                <RefreshCw className="w-3.5 h-3.5 text-[#006782]" />
                <span>Recargar página completa</span>
              </button>

              <button
                type="button"
                onClick={this.handleClearAndRestart}
                className="w-full py-2 px-4 bg-gray-50 hover:bg-gray-100 text-gray-600 rounded-xl text-[11px] font-medium flex items-center justify-center gap-1.5 transition-colors"
              >
                <Home className="w-3.5 h-3.5" />
                <span>Volver al inicio</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
