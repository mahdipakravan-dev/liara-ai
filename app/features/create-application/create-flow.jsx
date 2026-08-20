"use client";

import { useEffect, useState } from "react";

import { PlanStep } from "./plan-step";
import { RuntimeStep } from "./runtime-step";

export function CreateFlow({ onCancel, onComplete }) {
  const [step, setStep] = useState(1);
  const [runtime, setRuntime] = useState("Node.js");
  const [name, setName] = useState("negah-store");
  const [plan, setPlan] = useState(1);

  useEffect(() => {
    function handleKeyDown(event) {
      if (event.key === "Escape") onCancel();
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onCancel]);

  return (
    <main className="soft-grid min-h-screen bg-[#18191f]">
      {step === 1 ? (
        <RuntimeStep
          selected={runtime}
          setSelected={setRuntime}
          name={name}
          setName={setName}
          onNext={() => setStep(2)}
          onCancel={onCancel}
        />
      ) : (
        <PlanStep
          selected={plan}
          setSelected={setPlan}
          onBack={() => setStep(1)}
          onCreate={() => onComplete({ name, runtime })}
        />
      )}
    </main>
  );
}
