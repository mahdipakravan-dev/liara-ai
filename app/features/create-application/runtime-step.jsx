import { ArrowLeft, Plus } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

import { runtimes } from "./create-application.data";

export function RuntimeStep({ selected, setSelected, name, setName, onNext, onCancel }) {
  return (
    <div className="mx-auto max-w-[1070px] px-5 py-10 lg:py-16">
      <Button onClick={onCancel} variant="ghost" className="mb-10">
        <ArrowLeft data-icon="inline-start" />
        بازگشت <span className="text-xs">(ESC)</span>
      </Button>

      <header className="text-right">
        <Badge variant="outline">مرحله ۱ از ۲</Badge>
        <h1 className="mt-3 text-2xl font-bold">ساخت برنامه‌ی جدید</h1>
        <p className="mt-2 text-sm text-slate-400">لطفاً نوع برنامه‌ی خود را انتخاب کنید.</p>
      </header>

      <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-7" role="group" aria-label="نوع برنامه">
        {runtimes.map(([label, mark, color]) => (
          <button
            type="button"
            aria-pressed={selected === label}
            onClick={() => setSelected(label)}
            key={label}
            className={cn(
              "flex min-h-36 flex-col items-center justify-center gap-5 rounded-xl border bg-[#292b35] p-4 transition hover:-translate-y-1 hover:border-white/20",
              selected === label ? "border-[#78f3c5] bg-[#173633]/70 shadow-[0_0_24px_rgba(120,243,197,.08)]" : "border-transparent",
            )}
          >
            <span style={{ color }} className="text-3xl font-black drop-shadow-lg">{mark}</span>
            <span className={cn("text-xs font-medium uppercase", selected === label ? "text-[#78f3c5]" : "text-slate-100")}>{label}</span>
          </button>
        ))}
      </div>

      <p className="mt-3 text-left text-xs leading-6 text-cyan-300">
        <Badge variant="outline" className="ml-1">نکته</Badge>
        پلتفرم {selected} لیارا از فریم‌ورک‌های محبوب و استاندارد پشتیبانی می‌کند.
      </p>

      <section className="mt-9">
        <label htmlFor="application-name" className="text-lg font-semibold">شناسه‌ی برنامه</label>
        <p id="application-name-help" className="mt-2 text-sm leading-7 text-slate-400">
          شناسه، همان Subdomain برنامه‌ی شماست. از حروف انگلیسی کوچک، اعداد و خط تیره استفاده کنید.
        </p>
        <div dir="ltr" className="mt-5 flex items-center gap-2">
          <span className="font-mono text-sm text-slate-400">https://</span>
          <Input
            id="application-name"
            aria-describedby="application-name-help"
            value={name}
            onChange={(event) => setName(event.target.value.replace(/[^a-z0-9-]/g, ""))}
            placeholder="my-website"
            className="min-w-0 flex-1 text-left"
          />
          <span className="font-mono text-sm text-slate-400">.liara.run</span>
        </div>
      </section>

      <Separator className="mt-10" />
      <section className="pt-8">
        <h2 className="text-lg font-semibold">شبکه خصوصی</h2>
        <p className="mt-2 text-sm text-slate-400">برنامه‌ها و دیتابیس‌هایی که نیاز به ارتباط داخلی دارند را در یک شبکه خصوصی قرار دهید.</p>
        <Button variant="outline" className="mt-5">
          <Plus data-icon="inline-start" /> ساخت شبکه خصوصی جدید
        </Button>
      </section>

      <div className="sticky bottom-4 mt-12 flex justify-end">
        <Button disabled={!name} onClick={onNext} size="lg">انتخاب پلن</Button>
      </div>
    </div>
  );
}
