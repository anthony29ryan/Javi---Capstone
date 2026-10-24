import { Component } from 'react';

import ScreenState from './ScreenState';

/**
 * Catches a crash while drawing any screen, so one bad screen shows a message
 * instead of closing the app. A class on purpose: React has no hook that can
 * catch render errors, so this is the one exception to "no class components".
 * Try again redraws the app from its first screen; saved progress is untouched.
 */
export default class ErrorBoundary extends Component {
  state = { crashed: false };

  static getDerivedStateFromError() {
    return { crashed: true };
  }

  componentDidCatch(error) {
    console.error('ErrorBoundary caught', error);
  }

  render() {
    if (this.state.crashed) {
      return (
        <ScreenState
          error="Javi hit a problem showing this screen. Your progress is saved."
          onRetry={() => this.setState({ crashed: false })}
        />
      );
    }
    return this.props.children;
  }
}
