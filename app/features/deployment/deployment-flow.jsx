"use client";

import { useState } from "react";
import { ArrowLeft, Check, ChevronLeft, MapPin, Server } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { AssistantPanel } from "@/app/features/assistance/assistant-panel";

const zones = [
  { id: "iran", title: "ایران", description: "کمترین تأخیر برای کاربران داخل ایران", ping: "۱۲ ms" },
  { id: "germany", title: "آلمان", description: "مناسب کاربران اروپا و سرویس‌های بین‌المللی", ping: "۷۸ ms" },
];

export function DeploymentFlow({ method, application = {}, onCancel, onComplete }) {
  const [step, setStep] = useState(1);
  const [port, setPort] = useState("3000");
  const [zone, setZone] = useState("iran");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [assistantOpen, setAssistantOpen] = useState(true);
  const [assistantMode, setAssistantMode] = useState("docked");

  async function deploy() {
    setIsSubmitting(true);
    setError("");
    try {
      const response = await fetch("/api/deployments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ application: "assistance", runtime: "next", method, port, zone }),
      });
      if (!response.ok) throw new Error("deployment_failed");
      onComplete(await response.json());
    } catch {
      setError("شروع استقرار ممکن نشد. دوباره تلاش کنید.");
      setIsSubmitting(false);
    }
  }

  const assistantContext = {
    currentPage: "deployment-setup",
    currentStep: step === 1 ? "تنظیمات و پورت (مرحله ۱ از ۲)" : "انتخاب منطقه‌ی ساخت (مرحله ۲ از ۲)",
    applicationName: application.name,
    runtime: application.runtime,
    deploymentMethod: method,
    deploymentStatus: isSubmitting ? "in-progress" : error ? "failed" : "draft",
    port,
    zone: zones.find((item) => item.id === zone)?.title,
  };

  return (
    <>
    <main className={cn("soft-grid min-h-screen bg-[#18191f] px-5 py-12 text-slate-100 transition-[margin] duration-500 ease-out", assistantOpen && assistantMode === "docked" && "md:ml-[50vw]")}>
      <div className="mx-auto w-full max-w-2xl">
        <Button variant="ghost" onClick={onCancel}><ArrowLeft data-icon="inline-start" /> بازگشت به پنل</Button>
        <section className="mt-16 border-r border-dashed border-white/15 pr-6 sm:pr-10">
          <Badge variant="outline">مرحله {step} از ۲</Badge>
          <h1 className="mt-4 text-2xl font-bold">{step === 1 ? "آماده‌سازی و تنظیمات این استقرار" : "انتخاب منطقه‌ی ساخت"}</h1>
          <p className="mt-3 text-sm leading-7 text-slate-400">
            {step === 1 ? "فایل liara.json برای دپلوی از طریق Liara CLI الزامی است. تنظیمات لازم را بررسی کنید." : "منطقه‌ای را انتخاب کنید که نزدیک‌ترین موقعیت را به کاربران برنامه دارد."}
          </p>

          {step === 1 ? (
            <div className="mt-9 flex flex-col gap-8">
              <div className="flex items-center justify-between rounded-xl border border-white/8 bg-white/[.02] p-4">
                <div><p className="text-sm font-semibold">شناسه‌ی برنامه</p><p className="mt-1 text-xs text-slate-500">مقصد استقرار</p></div>
                <strong dir="ltr" className="text-sm"><span className="text-[#78f3c5]">NEXT.js</span> assistance</strong>
              </div>
              <div>
                <label htmlFor="deployment-port" className="font-semibold">پورت</label>
                <p id="deployment-port-help" className="mt-2 text-sm text-slate-400">پورتی که برنامه‌ی شما روی آن listen می‌کند.</p>
                <Input id="deployment-port" aria-describedby="deployment-port-help" inputMode="numeric" dir="ltr" value={port} onChange={(event) => setPort(event.target.value.replace(/\D/g, ""))} className="mt-3" />
              </div>
            </div>
          ) : (
            <div className="mt-9 grid gap-3 sm:grid-cols-2">
              {zones.map((item) => (
                <button key={item.id} type="button" aria-pressed={zone === item.id} onClick={() => setZone(item.id)} className={cn("rounded-2xl border p-5 text-right transition", zone === item.id ? "border-[#78f3c5] bg-[#78f3c5]/10" : "border-white/10 bg-[#292b35] hover:border-white/20")}>
                  <div className="flex items-start justify-between"><span className="grid size-10 place-items-center rounded-xl bg-white/5"><MapPin size={19} /></span>{zone === item.id && <Check className="text-[#78f3c5]" size={19} />}</div>
                  <h2 className="mt-5 font-bold">{item.title}</h2><p className="mt-2 text-xs leading-6 text-slate-400">{item.description}</p>
                  <Badge variant="secondary" className="mt-4"><Server size={12} /> {item.ping}</Badge>
                </button>
              ))}
            </div>
          )}

          {error && <p role="alert" className="mt-5 text-sm text-red-400">{error}</p>}
          <footer className="mt-14 flex items-center gap-4 rounded-xl border border-white/10 bg-[#292b35]/90 p-2 shadow-2xl">
            <Button disabled={!port || isSubmitting} onClick={step === 1 ? () => setStep(2) : deploy}>
              {isSubmitting ? "در حال دپلوی..." : step === 1 ? "بعدی" : "دپلوی"}<ChevronLeft data-icon="inline-end" />
            </Button>
            <div className="h-1 flex-1 overflow-hidden rounded-full bg-white/10"><div className={cn("h-full bg-[#78f3c5] transition-all", step === 1 ? "w-1/2" : "w-full")} /></div>
            <Button variant="ghost" disabled={step === 1 || isSubmitting} onClick={() => setStep(1)}>قبلی</Button>
          </footer>
        </section>
      </div>
    </main>
    <AssistantPanel open={assistantOpen} onOpen={() => setAssistantOpen(true)} onClose={() => setAssistantOpen(false)} mode={assistantMode} onModeChange={setAssistantMode} scenario="deploy" context={assistantContext} standalone />
    </>
  );
}
