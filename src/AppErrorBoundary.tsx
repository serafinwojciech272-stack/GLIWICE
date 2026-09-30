import { Component, type ErrorInfo, type ReactNode } from 'react';

type Props = { children: ReactNode };
type State = { hasError: boolean };

export class AppErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Extra Szpieg UI error', error, info);
  }

  private reset = () => {
    this.setState({ hasError: false });
  };

  render() {
    if (!this.state.hasError) return this.props.children;
    return (
      <main className="appError">
        <section>
          <div className="eyebrow">CORE SAFETY FALLBACK</div>
          <h1>Szpieg napotkał błąd interfejsu.</h1>
          <p>Stan zapisany lokalnie nie został usunięty. Spróbuj ponownie załadować centrum.</p>
          <button onClick={this.reset}>WRÓĆ DO CENTRUM</button>
          <button className="ghostButton" onClick={() => window.location.reload()}>ODŚWIEŻ APLIKACJĘ</button>
        </section>
      </main>
    );
  }
}
