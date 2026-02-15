"use client";

import { CrisisMap } from "@/components/crisis-map";

export default function MapPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Crisis Map</h1>
        <p className="text-muted-foreground">
          Real-time sightings, shelter locations, and missing person cases
        </p>
      </div>
      <CrisisMap height="calc(100vh - 200px)" />
    </div>
  );
}
