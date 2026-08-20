import { NextRequest, NextResponse } from "next/server";

type Deployment = {
  id: string;
  method: string;
  buildLocation: "iran" | "germany";
  buildCache: boolean;
  startedAt: number;
};

const deployments = new Map<string, Deployment>();

const stages = [
  "Fetching the source code: 0%",
  "Fetching the source code: 100%",
  "Pulling the base images...",
  "All base images are already pulled.",
  "Preparing the build environment...",
  "Step 1/2 : FROM registry2.iran.liara.ir/platforms/next-platform:release",
  "Using cache",
  "Using Liara mirror to install packages.",
  "Running npm ci...",
  "Creating an optimized production build...",
  "Uploading image to the registry...",
  "Deployment completed successfully.",
];

export async function POST(request: NextRequest) {
  const body = (await request.json()) as Partial<Deployment>;
  const deployment: Deployment = {
    id: crypto.randomUUID(),
    method: body.method ?? "Drag & Drop",
    buildLocation: body.buildLocation === "germany" ? "germany" : "iran",
    buildCache: body.buildCache !== false,
    startedAt: Date.now(),
  };

  deployments.set(deployment.id, deployment);
  return NextResponse.json({ id: deployment.id }, { status: 201 });
}

export async function GET(request: NextRequest) {
  const id = request.nextUrl.searchParams.get("id");
  const deployment = id ? deployments.get(id) : undefined;

  if (!deployment) {
    return NextResponse.json({ message: "Deployment not found" }, { status: 404 });
  }

  const elapsed = Date.now() - deployment.startedAt;
  const progress = Math.min(100, Math.floor(elapsed / 120));
  const visibleLogs = Math.max(1, Math.ceil((progress / 100) * stages.length));

  return NextResponse.json({
    ...deployment,
    progress,
    status: progress === 100 ? "success" : "building",
    version: "v1",
    platform: "next",
    port: 3000,
    logs: stages.slice(0, visibleLogs),
  });
}
