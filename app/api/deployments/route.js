import { NextResponse } from "next/server";

import { findDeployment, latestDeployment, startDeployment } from "@/lib/deployment-store";

export async function POST(request) {
  const payload = await request.json();
  if (!payload.port || !payload.zone) return NextResponse.json({ message: "port and zone are required" }, { status: 400 });

  return NextResponse.json(startDeployment(payload), { status: 202 });
}

/** Lets the tool layer read back a deployment the same way a real API would. */
export async function GET(request) {
  const id = new URL(request.url).searchParams.get("id");
  const deployment = id ? findDeployment(id) : latestDeployment();

  if (!deployment) return NextResponse.json({ message: "deployment not found" }, { status: 404 });
  return NextResponse.json(deployment);
}
