import { NextResponse } from "next/server";

export async function POST(request) {
  const payload = await request.json();
  if (!payload.port || !payload.zone) return NextResponse.json({ message: "port and zone are required" }, { status: 400 });

  const hasMockError = payload.zone === "germany";

  return NextResponse.json({
    id: `dep_${Date.now()}`,
    status: hasMockError ? "error" : "deploying",
    error: hasMockError ? "Build failed: dependency installation timed out." : null,
    version: "v1",
    port: payload.port,
    zone: payload.zone,
    zoneLabel: payload.zone === "iran" ? "ایران" : "آلمان",
    createdAt: new Date().toISOString(),
  }, { status: 202 });
}
