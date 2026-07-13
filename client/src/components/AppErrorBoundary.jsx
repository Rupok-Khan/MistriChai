import React from "react";

export default class AppErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    console.error("Application render error", error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <main className="app-error-page">
          <div className="eco-card app-error-card">
            <div className="app-error-icon">!</div>
            <h1>Something went wrong</h1>
            <p className="small-muted">The page could not be displayed. Your account and saved data are not affected.</p>
            <button className="btn eco-btn" onClick={() => window.location.reload()}>Reload Page</button>
            <a className="btn eco-btn-outline" href="/">Return Home</a>
          </div>
        </main>
      );
    }
    return this.props.children;
  }
}
