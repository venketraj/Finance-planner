"use client";

import { useState } from "react";
import { FireForm } from "@/components/fire/FireForm";
import { FireProjection } from "@/components/fire/FireProjection";
import { useFireProjection } from "@/lib/queries/useFire";
import type { FireResult } from "@/lib/types";

export default function FirePage() {
  const [simulationResult, setSimulationResult] = useState<FireResult | null>(null);
  const { data: profileProjection, isLoading } = useFireProjection();

  const activeResult = simulationResult ?? profileProjection;

  return (
    <div className="space-y-6 p-6">
      <h1 className="text-3xl font-bold">FIRE Calculator</h1>
      <p className="text-muted-foreground">
        Financial Independence, Retire Early — calculate how long until you reach
        financial freedom.
      </p>

      <FireForm onResult={setSimulationResult} />

      {isLoading && !simulationResult && (
        <p className="text-muted-foreground">Loading your projection...</p>
      )}

      {activeResult && <FireProjection result={activeResult} />}
    </div>
  );
}
