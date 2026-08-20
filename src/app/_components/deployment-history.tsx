"use client";

import { CheckCircle2, Download, Rocket } from "lucide-react";
import { useEffect, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type DeploymentStatus = {
  id: string;
  progress: number;
  status: "building" | "success";
  version: string;
  platform: string;
  port: number;
  buildLocation: "iran" | "germany";
  logs: string[];
};

export function DeploymentHistory({ deploymentId }: { deploymentId: string | undefined }) {
  const [deployment, setDeployment] = useState<DeploymentStatus | null>(null);

  useEffect(() => {
    if (!deploymentId) return;
    let timer: ReturnType<typeof setTimeout>;
    let cancelled = false;

    const poll = async () => {
      const response = await fetch(`/api/deployments?id=${deploymentId}`, { cache: "no-store" });
      if (!response.ok || cancelled) return;
      const next = (await response.json()) as DeploymentStatus;
      setDeployment(next);
      if (next.status !== "success") timer = setTimeout(poll, 700);
    };

    void poll();
    return () => { cancelled = true; clearTimeout(timer); };
  }, [deploymentId]);

  if (!deploymentId) {
    return <Card><CardHeader><CardTitle>تاریخچه استقرار</CardTitle><CardDescription>هنوز استقراری ثبت نشده است.</CardDescription></CardHeader></Card>;
  }

  return (
    <div className="flex flex-col gap-5">
      <header className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3"><span className="grid size-11 place-items-center rounded-xl bg-primary text-primary-foreground"><Rocket /></span><div><p className="text-xs text-muted-foreground">همین الآن</p><h1 className="text-xl font-bold">عملیات استقرار {deployment?.version ?? "v1"}</h1></div></div>
        <Button variant="outline" size="sm"><Download data-icon="inline-start" />دریافت سورس‌کد</Button>
      </header>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-4"><CardTitle>وضعیت استقرار</CardTitle><Badge variant={deployment?.status === "success" ? "default" : "secondary"}>{deployment?.status === "success" ? "با موفقیت انجام شد" : "در حال ساختن..."}</Badge></div>
          <CardDescription>{deployment?.progress ?? 0}٪ تکمیل شده</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-6">
          <div className="h-2 overflow-hidden rounded-full bg-secondary"><div className="h-full bg-primary transition-[width] duration-500" style={{ width: `${deployment?.progress ?? 0}%` }} /></div>
          <dl className="grid grid-cols-2 gap-4 text-sm md:grid-cols-4"><div><dt className="text-muted-foreground">پلتفرم</dt><dd className="mt-1">{deployment?.platform ?? "next"}</dd></div><div><dt className="text-muted-foreground">پورت</dt><dd className="mt-1">{deployment?.port ?? 3000}</dd></div><div><dt className="text-muted-foreground">موقعیت Build</dt><dd className="mt-1">{deployment?.buildLocation === "germany" ? "آلمان" : "ایران"}</dd></div><div><dt className="text-muted-foreground">نسخه</dt><dd className="mt-1">{deployment?.version ?? "v1"}</dd></div></dl>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>لاگ‌های استقرار</CardTitle><CardDescription>خروجی زنده فرایند Build و انتشار</CardDescription></CardHeader>
        <CardContent><div dir="ltr" aria-live="polite" className="h-64 overflow-auto rounded-lg bg-[#2a2c36] p-4 font-mono text-sm text-white"><div className="flex flex-col gap-2">{(deployment?.logs ?? ["Waiting for deployment worker..."]).map((log, index) => <p key={`${index}-${log}`}><span className="text-slate-500">۲۰۲۶-۰۸-۲۰ ۱۰:۵۱:{String(41 + index).padStart(2, "0")} | </span>{log}</p>)}</div></div></CardContent>
      </Card>
      {deployment?.status === "success" && <div className="flex items-center justify-center gap-2 text-sm text-primary"><CheckCircle2 />برنامه با موفقیت منتشر شد.</div>}
    </div>
  );
}
