"use client";

import dynamic from "next/dynamic";

const ServiceAreaView = dynamic(
  () => import("./service-area-view").then((m) => m.ServiceAreaView),
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

export { ServiceAreaView };
