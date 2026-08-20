"use client";

import { useState } from "react";

import { CreateApplicationFlow } from "@/app/_components/create-application-flow";
import { DeploymentFlow } from "@/app/_components/deployment-flow";
import { DeploymentWorkspace } from "@/app/_components/deployment-workspace";
import type { DeploymentMethod } from "@/app/_components/deployment-data";

type AppView = "dashboard" | "create" | "deployment";

/**
 * Root client-side view coordinator.
 * Visual sections and creation phases live in focused components so this file
 * only owns the transition between the dashboard and application wizard.
 */
export default function AppPage() {
  const [view, setView] = useState<AppView>("dashboard");
  const [deploymentMethod, setDeploymentMethod] = useState<DeploymentMethod>("Drag & Drop");
  const [deploymentId, setDeploymentId] = useState<string>();
  const [dashboardSection, setDashboardSection] = useState("استقرار جدید");

  if (view === "create") {
    return (
      <CreateApplicationFlow
        onCancel={() => setView("dashboard")}
        onComplete={() => setView("dashboard")}
      />
    );
  }

  if (view === "deployment") {
    return <DeploymentFlow method={deploymentMethod} onCancel={() => setView("dashboard")} onStarted={(id) => { setDeploymentId(id); setDashboardSection("تاریخچه"); setView("dashboard"); }} />;
  }

  return <DeploymentWorkspace onCreate={() => setView("create")} onStartDeployment={(method) => { setDeploymentMethod(method); setView("deployment"); }} initialActiveItem={dashboardSection} deploymentId={deploymentId} />;
}
