"use client";

import { Component, ErrorInfo, ReactNode, useEffect } from "react";
import { submitErrorReport } from "@/lib/api";

// ─── Get current user ID from localStorage (safe) ───
function getCurrentUserId(): string | undefined {
  try {
    const raw = typeof window !== "undefined" ? localStorage.getItem("user") : null;
    return raw ? JSON.parse(raw)?.id : undefined;
  } catch {
    return undefined;
  }
}

// ─── React Error Boundary ───
interface Props { children: ReactNode }
interface State { hasError: boolean; errorMessage: string }

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, errorMessage: "" };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, errorMessage: error.message || "Unknown error" };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    submitErrorReport({
      message: error.message || "React render error",
      stack: [error.stack, errorInfo.componentStack].filter(Boolean).join("\n---\n"),
      source: typeof window !== "undefined" ? window.location.href : undefined,
      userAgent: typeof navigator !== "undefined" ? navigator.userAgent : undefined,
      userId: getCurrentUserId(),
    });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-[60vh] flex items-center justify-center p-8">
          <div className="max-w-md text-center space-y-4">
            <div className="text-5xl">😔</div>
            <h2 className="text-xl font-bold text-slate-800">Terjadi Kesalahan</h2>
            <p className="text-slate-500 text-sm">
              Maaf, halaman ini mengalami masalah teknis. Tim kami sudah menerima laporan otomatis.
            </p>
            <button
              onClick={() => {
                this.setState({ hasError: false, errorMessage: "" });
                window.location.reload();
              }}
              className="px-6 py-2.5 bg-emerald-600 text-white rounded-xl font-semibold hover:bg-emerald-700 transition-colors"
            >
              Muat Ulang
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

// ─── Global JS Error Handler (catches errors outside React tree) ───
export function GlobalErrorListener() {
  useEffect(() => {
    // Debounce: don't send the same error within 5 seconds
    const recentErrors = new Set<string>();

    const handleError = (event: ErrorEvent) => {
      const key = `${event.message}|${event.filename}`;
      if (recentErrors.has(key)) return;
      recentErrors.add(key);
      setTimeout(() => recentErrors.delete(key), 5000);

      submitErrorReport({
        message: event.message || "Unhandled error",
        stack: event.error?.stack || `at ${event.filename}:${event.lineno}:${event.colno}`,
        source: typeof window !== "undefined" ? window.location.href : undefined,
        userAgent: typeof navigator !== "undefined" ? navigator.userAgent : undefined,
        userId: getCurrentUserId(),
      });
    };

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      const message = event.reason?.message || String(event.reason) || "Unhandled promise rejection";
      const key = `promise|${message}`;
      if (recentErrors.has(key)) return;
      recentErrors.add(key);
      setTimeout(() => recentErrors.delete(key), 5000);

      submitErrorReport({
        message,
        stack: event.reason?.stack || undefined,
        source: typeof window !== "undefined" ? window.location.href : undefined,
        userAgent: typeof navigator !== "undefined" ? navigator.userAgent : undefined,
        userId: getCurrentUserId(),
      });
    };

    window.addEventListener("error", handleError);
    window.addEventListener("unhandledrejection", handleUnhandledRejection);

    return () => {
      window.removeEventListener("error", handleError);
      window.removeEventListener("unhandledrejection", handleUnhandledRejection);
    };
  }, []);

  return null; // Invisible component
}
