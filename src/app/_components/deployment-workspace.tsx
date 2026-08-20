"use client";

import { Check, Download, GitBranch, Play, Terminal, UploadCloud } from "lucide-react";
import { useState } from "react";

import { AppHeader } from "@/app/_components/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { deploymentMethods, type DeploymentMethod, workspaceNavigation } from "./deployment-data";
import { DeploymentHistory } from "./deployment-history";

const methodCopy: Record<DeploymentMethod, { title: string; description: string; features: string[] }> = {
  GitHub: { title: "حساب گیت‌هاب شما متصل نیست.", description: "حساب خود را متصل کنید تا هر Push یک استقرار تازه بسازد.", features: ["استقرار ساده", "آپلود سریع‌تر سورس کد", "استقرار خودکار آخرین Commit"] },
  "Drag & Drop": { title: "پروژه‌تان را بارگذاری کنید.", description: "فایل ZIP پروژه را انتخاب کنید تا Runtime به‌صورت خودکار تشخیص داده شود.", features: ["بدون نیاز به Git", "تشخیص خودکار Runtime", "نمایش زنده وضعیت آپلود"] },
  "Liara CLI": { title: "با یک فرمان مستقر کنید.", description: "CLI لیارا مسیر مستقیم استقرار از ترمینال و CI/CD است.", features: ["قابل استفاده در CI/CD", "تنظیمات در liara.json", "گزارش زنده فرایند"] },
};

type Props = {
  onCreate: () => void;
  onStartDeployment: (method: DeploymentMethod) => void;
  initialActiveItem?: string;
  deploymentId: string | undefined;
};

export function DeploymentWorkspace({ onCreate, onStartDeployment, initialActiveItem = "استقرار جدید", deploymentId }: Props) {
  const [method, setMethod] = useState<DeploymentMethod>("GitHub");
  const [activeItem, setActiveItem] = useState(initialActiveItem);
  const copy = methodCopy[method];

  return (
    <div className="min-h-dvh bg-background">
      <AppHeader onCreate={onCreate} />
      <div className="grid md:grid-cols-[236px_minmax(0,1fr)]">
        <aside className="hidden min-h-[calc(100dvh-134px)] border-l border-white/6 bg-[#202129] p-3 md:block">
          <p className="px-3 py-2 text-xs text-muted-foreground">فضای برنامه</p>
          <nav aria-label="ناوبری برنامه" className="flex flex-col gap-1">
            {workspaceNavigation.map(({ label, icon: Icon }) => (
              <Button key={label} variant={activeItem === label ? "secondary" : "ghost"} className="justify-start" onClick={() => setActiveItem(label)}>
                <Icon data-icon="inline-start" /> {label}
              </Button>
            ))}
          </nav>
          <Card className="mt-6 gap-3 py-4">
            <CardHeader className="px-4"><CardTitle className="text-sm">مصرف این ماه</CardTitle><CardDescription>۳۸٪ از منابع</CardDescription></CardHeader>
            <CardContent className="px-4"><div className="h-2 overflow-hidden rounded-full bg-secondary"><div className="h-full w-[38%] bg-primary" /></div></CardContent>
          </Card>
        </aside>
        <main className="min-w-0 px-5 py-10 lg:px-8 lg:py-16">
          <div className="mx-auto flex max-w-[980px] flex-col gap-8">
            {activeItem === "تاریخچه" ? <DeploymentHistory deploymentId={deploymentId} /> : <>
            <header className="flex items-start justify-between gap-4">
              <div><p className="text-xs text-muted-foreground">برنامه / فروشگاه نگاه</p><h1 className="mt-2 text-2xl font-bold">استقرار جدید</h1></div>
              <Badge variant="outline">● سرویس آماده</Badge>
            </header>
            <div role="tablist" aria-label="روش استقرار" className="grid grid-cols-3 rounded-lg bg-secondary p-1">
              {deploymentMethods.map((item) => <Button key={item} role="tab" aria-selected={method === item} variant={method === item ? "default" : "ghost"} onClick={() => setMethod(item)}>{item}</Button>)}
            </div>
            <Card className="border-0 bg-transparent shadow-none">
              <CardHeader className="flex-row items-start justify-between gap-4">
                <div className="flex flex-col gap-2"><CardDescription>استقرار با استفاده از</CardDescription><CardTitle>{method}</CardTitle></div>
                <div className="flex gap-2"><Button variant="secondary" size="sm"><Play data-icon="inline-start" />آموزش</Button><Button variant="outline" size="sm"><Download data-icon="inline-start" />liara.json</Button></div>
              </CardHeader>
              <CardContent className="flex flex-col items-center gap-6 py-6 text-center">
                <span className="grid size-24 place-items-center rounded-full bg-secondary text-primary">
                  {method === "GitHub" ? <GitBranch /> : method === "Drag & Drop" ? <UploadCloud /> : <Terminal />}
                </span>
                <div><h2 className="font-semibold">{copy.title}</h2><p className="mt-2 text-sm text-muted-foreground">{copy.description}</p></div>
                <ul className="flex flex-col gap-3 text-sm">{copy.features.map((feature) => <li key={feature} className="flex items-center gap-2"><Check className="text-primary" />{feature}</li>)}</ul>
              </CardContent>
              <CardFooter className="justify-center"><Button onClick={() => onStartDeployment(method)}>{method === "GitHub" ? "اتصال حساب و ادامه" : method === "Drag & Drop" ? "انتخاب فایل و ادامه" : "ادامه با CLI"}</Button></CardFooter>
            </Card>
            </>}
          </div>
        </main>
      </div>
    </div>
  );
}
