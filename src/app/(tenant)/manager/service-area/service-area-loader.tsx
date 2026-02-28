"use client";

import { Component, type ReactNode } from "react";
import dynamic from "next/dynamic";

// Error boundary to catch client-side Mapbox crashes
class MapErrorBoundary extends Component<
  { children: ReactNode },
  { hasError: boolean; error: string }
> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false, error: "" };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error: error.message };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-6 lg:p-8">
          <h1 className="text-2xl font-bold">Service Area</h1>
          <p className="text-muted-foreground mt-2">
            The map failed to load. This may be due to a missing Mapbox access token
            or browser compatibility issue.
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Error: {this.state.error}
          </p>
          <button
            onClick={() => this.setState({ hasError: false, error: "" })}
            className="mt-4 rounded-lg bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
          >
            Try Again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

const DynamicServiceAreaView = dynamic(
  () =>
    import("@/app/(tenant)/settings/service-area/service-area-view")
      .then((m) => m.ServiceAreaView)
      .catch((err) => {
        const Fallback = () => (
          <div className="p-6 lg:p-8">
            <h1 className="text-2xl font-bold">Service Area</h1>
            <p className="text-muted-foreground mt-2">
              Failed to load the map component: {err?.message ?? "Unknown error"}
            </p>
          </div>
        );
        Fallback.displayName = "ServiceAreaFallback";
        return Fallback;
      }),
  {
    ssr: false,
    loading: () => (
      <div className="p-6 lg:p-8">
        <h1 className="text-2xl font-bold">Service Area</h1>
        <p className="text-muted-foreground mt-2">Loading map...</p>
      </div>
    ),
  }
);

export function ServiceAreaView(props: Record<string, unknown>) {
  return (
    <MapErrorBoundary>
      <DynamicServiceAreaView {...props} />
    </MapErrorBoundary>
  );
}
