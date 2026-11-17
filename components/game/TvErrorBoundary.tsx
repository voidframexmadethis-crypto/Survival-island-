'use client';

import React from 'react';
import { AlertTriangle, RotateCcw, Shield, X } from 'lucide-react';

interface TvErrorBoundaryProps {
  variant: 'modal' | 'overlay';
  onResetTv: () => void;
  onEnableSafeMiniTv?: () => void;
  onCloseModal?: () => void;
  children: React.ReactNode;
}

interface TvErrorBoundaryState {
  hasError: boolean;
  errorMessage: string;
}

export class TvErrorBoundary extends React.Component<
  TvErrorBoundaryProps,
  TvErrorBoundaryState
> {
  constructor(props: TvErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, errorMessage: '' };
  }

  static getDerivedStateFromError(error: unknown): TvErrorBoundaryState {
    const msg =
      error instanceof Error && error.message
        ? error.message
        : 'Smart TV signal encountered an unexpected interruption.';
    return { hasError: true, errorMessage: msg };
  }

  componentDidCatch(): void {
    // Contained safely inside TV boundary so game loop & world session stay active
  }

  private handleReset = () => {
    this.props.onResetTv();
    this.setState({ hasError: false, errorMessage: '' });
  };

  private handleSafeModeAndReset = () => {
    this.props.onEnableSafeMiniTv?.();
    this.props.onResetTv();
    this.setState({ hasError: false, errorMessage: '' });
  };

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    if (this.props.variant === 'overlay') {
      return (
        <div
          onPointerDown={(e) => e.stopPropagation()}
          className="fixed top-[72px] right-4 z-40 w-[min(90vw,310px)] rounded-xl bg-stone-950/95 border border-amber-500/60 p-3 shadow-2xl space-y-2"
        >
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2 text-amber-300">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span className="text-xs font-bold">TV Signal Interrupted</span>
            </div>
            <button
              type="button"
              onClick={this.handleReset}
              className="w-6 h-6 rounded-md bg-stone-800 hover:bg-stone-700 text-stone-300 flex items-center justify-center"
              aria-label="Dismiss TV Recovery"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          <p className="text-[11px] text-stone-300 leading-snug">
            Your game stayed safe. Reset the TV player or switch to Safe Mini-TV.
          </p>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={this.handleReset}
              className="flex-1 min-h-[34px] px-2.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-stone-950 font-bold text-[11px] flex items-center justify-center gap-1"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset TV</span>
            </button>
            {this.props.onEnableSafeMiniTv && (
              <button
                type="button"
                onClick={this.handleSafeModeAndReset}
                className="flex-1 min-h-[34px] px-2.5 rounded-lg bg-stone-800 hover:bg-stone-700 border border-stone-600 text-stone-100 font-semibold text-[11px] flex items-center justify-center gap-1"
              >
                <Shield className="w-3 h-3 text-emerald-400" />
                <span>Safe Mini-TV</span>
              </button>
            )}
          </div>
        </div>
      );
    }

    return (
      <div
        onPointerDown={(e) => e.stopPropagation()}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4"
      >
        <div className="w-full max-w-md rounded-2xl bg-stone-950/95 border border-amber-500/60 p-5 shadow-2xl space-y-4">
          <div className="flex items-center justify-between gap-2 border-b border-stone-800 pb-3">
            <div className="flex items-center gap-2 text-amber-300">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              <h3 className="font-display text-base font-bold">
                TV Signal Interrupted
              </h3>
            </div>
            {this.props.onCloseModal && (
              <button
                type="button"
                onClick={() => {
                  this.handleReset();
                  this.props.onCloseModal?.();
                }}
                className="min-w-[40px] min-h-[40px] rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 flex items-center justify-center"
                aria-label="Close TV Remote"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          <p className="text-xs text-stone-300 leading-relaxed">
            The Smart TV tuner caught an error so your expedition did not crash or reset. ({this.state.errorMessage})
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={this.handleReset}
              className="flex-1 min-h-[42px] px-3 rounded-xl bg-amber-600 hover:bg-amber-500 text-stone-950 font-bold text-xs flex items-center justify-center gap-1.5"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Reset TV Tuner</span>
            </button>
            {this.props.onEnableSafeMiniTv && (
              <button
                type="button"
                onClick={this.handleSafeModeAndReset}
                className="flex-1 min-h-[42px] px-3 rounded-xl bg-stone-800 hover:bg-stone-700 border border-stone-600 text-stone-100 font-semibold text-xs flex items-center justify-center gap-1.5"
              >
                <Shield className="w-4 h-4 text-emerald-400" />
                <span>Switch to Safe Mini-TV</span>
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }
}
