"use client";

import { ArrowLeft, Check, CloudUpload, GitBranch, MapPin, Terminal } from "lucide-react";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

import type { DeploymentMethod } from "./deployment-data";

type Props = {
  method: DeploymentMethod;
  onCancel: () => void;
  onStarted: (deploymentId: string) => void;
};

export function DeploymentFlow({ method, onCancel, onStarted }: Props) {
  const [step, setStep] = useState<2 | 3>(2);
  const [buildCache, setBuildCache] = useState(true);
  const [buildLocation, setBuildLocation] = useState<"iran" | "germany">("iran");
  const [submitting, setSubmitting] = useState(false);

  const startDeployment = async () => {
    setSubmitting(true);
    try {
      const response = await fetch("/api/deployments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ method, buildCache, buildLocation }),
      });
      if (!response.ok) throw new Error("Unable to start deployment");
      const result = (await response.json()) as { id: string };
      onStarted(result.id);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="min-h-dvh bg-background px-5 py-10 lg:py-16">
      <div className="mx-auto flex max-w-4xl flex-col gap-8">
        <Button variant="ghost" className="self-start" onClick={step === 2 ? onCancel : () => setStep(2)}>
          <ArrowLeft data-icon="inline-start" /> بازگشت (ESC)
        </Button>
        <header>
          <Badge variant="outline">مرحله {step} از ۳</Badge>
          <h1 className="mt-3 text-2xl font-bold">{step === 2 ? "بررسی منبع استقرار" : "تنظیمات Build"}</h1>
        </header>

        {step === 2 ? (
          <Card>
            <CardHeader>
              <CardTitle>منبع کد آماده است</CardTitle>
              <CardDescription>پیش از تنظیم Build، اطلاعات منبع انتخاب‌شده را بررسی کنید.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-5">
              <div className="flex items-center gap-4 rounded-xl border bg-secondary/40 p-5">
                <span className="grid size-12 place-items-center rounded-xl bg-primary text-primary-foreground">
                  {method === "GitHub" ? <GitBranch /> : method === "Drag & Drop" ? <CloudUpload /> : <Terminal />}
                </span>
                <div><p className="font-semibold">{method}</p><p className="text-sm text-muted-foreground">negah-store · Next.js · پورت 3000</p></div>
                <Badge className="mr-auto">آماده</Badge>
              </div>
              <ul className="flex flex-col gap-3 text-sm">
                {["فایل‌های پروژه دریافت شدند", "Runtime به‌صورت Next.js تشخیص داده شد", "تنظیمات liara.json بررسی شد"].map((item) => <li key={item} className="flex items-center gap-2"><Check className="text-primary" />{item}</li>)}
              </ul>
            </CardContent>
            <CardFooter className="justify-end"><Button onClick={() => setStep(3)}>ادامه تنظیمات Build</Button></CardFooter>
          </Card>
        ) : (
          <>
            <Card>
              <CardHeader className="flex-row items-center justify-between">
                <div className="flex flex-col gap-2"><CardTitle>Build Cache</CardTitle><CardDescription>این قابلیت باعث افزایش سرعت build می‌شود.</CardDescription></div>
                <Button role="switch" aria-checked={buildCache} variant={buildCache ? "default" : "outline"} size="sm" onClick={() => setBuildCache((value) => !value)}>{buildCache ? "فعال" : "غیرفعال"}</Button>
              </CardHeader>
            </Card>
            <section className="flex flex-col gap-4" aria-labelledby="location-title">
              <div><h2 id="location-title" className="font-semibold">موقعیت Build</h2><p className="mt-2 text-sm text-muted-foreground">اگر پکیج‌ها در ایران در دسترس نیستند، build را در آلمان انجام دهید. برنامه پس از build در ایران اجرا می‌شود.</p></div>
              <div className="grid gap-4 md:grid-cols-2">
                {([{"id":"iran","title":"Build در ایران","caption":"پیشنهادی","benefits":["دسترسی سریع به سرویس‌های ایران","Push سریع پس از Build"]},{"id":"germany","title":"Build در آلمان","caption":"دسترسی جهانی","benefits":["نصب سریع پکیج‌های خارجی","دسترسی به سرویس‌های تحریم‌شده"]}] as const).map((location) => (
                  <Card key={location.id} className={cn(buildLocation === location.id && "ring-2 ring-ring")}>
                    <CardHeader><div className="flex items-center justify-between"><MapPin /><Badge variant="secondary">{location.caption}</Badge></div><CardTitle>{location.title}</CardTitle></CardHeader>
                    <CardContent><ul className="flex flex-col gap-3 text-sm">{location.benefits.map((item) => <li key={item} className="flex items-center gap-2"><Check className="text-primary" />{item}</li>)}</ul></CardContent>
                    <CardFooter><Button className="w-full" variant={buildLocation === location.id ? "default" : "outline"} onClick={() => setBuildLocation(location.id)}>انتخاب</Button></CardFooter>
                  </Card>
                ))}
              </div>
            </section>
            <div className="flex items-center justify-between rounded-xl border p-4"><Button variant="ghost" onClick={() => setStep(2)}>قبلی</Button><div className="h-1.5 flex-1 bg-secondary mx-6"><div className="h-full w-full bg-primary" /></div><Button disabled={submitting} onClick={startDeployment}>{submitting ? "در حال شروع..." : "استقرار"}</Button></div>
          </>
        )}
      </div>
    </main>
  );
}
