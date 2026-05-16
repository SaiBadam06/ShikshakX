import React from 'react';
import { ArrowPathIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';

interface PageErrorBoundaryProps {
  children: React.ReactNode;
}

interface PageErrorBoundaryState {
  hasError: boolean;
}

class PageErrorBoundary extends React.Component<PageErrorBoundaryProps, PageErrorBoundaryState> {
  constructor(props: PageErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): PageErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error) {
    console.error('Page rendering error:', error);
  }

  handleReload = () => {
    this.setState({ hasError: false });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="app-panel-strong hero-gradient flex min-h-[60vh] items-center justify-center rounded-[2rem] p-8 text-center">
          <div className="max-w-xl">
            <div className="mx-auto mb-5 inline-flex h-16 w-16 items-center justify-center rounded-[1.5rem] bg-red-50 text-red-600">
              <ExclamationTriangleIcon className="h-8 w-8" />
            </div>
            <h2 className="text-3xl font-extrabold tracking-tight text-slate-950">This page ran into a problem.</h2>
            <p className="mt-4 text-sm leading-7 text-slate-600">
              I added this safety layer so the app shows a useful recovery state instead of a blank screen when a route crashes.
            </p>
            <button
              type="button"
              onClick={this.handleReload}
              className="app-button-primary mt-6 px-5 py-3 text-sm"
            >
              <ArrowPathIcon className="h-5 w-5" />
              Reload page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default PageErrorBoundary;
