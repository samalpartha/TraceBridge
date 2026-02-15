"use client";

import { CaseIntakeForm } from "@/components/case-intake-form";
import { Heart } from "lucide-react";

export default function NewCasePage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-8 space-y-6">
      <div className="text-center">
        <div className="flex justify-center mb-4">
          <div className="rounded-full bg-red-100 p-3">
            <Heart className="h-6 w-6 text-red-500" />
          </div>
        </div>
        <h1 className="text-2xl font-bold">Report a Missing Person</h1>
        <p className="text-muted-foreground mt-1">
          Provide as much detail as possible. Our AI agents will search across
          multiple data sources to find potential matches.
        </p>
      </div>

      <CaseIntakeForm />
    </div>
  );
}
