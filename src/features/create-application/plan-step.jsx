import { ArrowLeft, Info } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

import { plans } from "./create-application.data";

const planMetrics = [
  ["قیمت ماهانه", "monthly"],
  ["قیمت ساعتی", "hourly"],
  ["RAM", "ram"],
  ["vCPU", "cpu"],
  ["Disk", "disk"],
];

export function PlanStep({ selected, setSelected, onBack, onCreate }) {
  return (
    <div className="mx-auto max-w-[1070px] px-5 py-10 lg:py-16">
      <Button onClick={onBack} variant="ghost">
        <ArrowLeft data-icon="inline-start" /> مرحله قبل
      </Button>

      <header className="mt-9 text-right">
        <Badge variant="outline">مرحله ۲ از ۲</Badge>
        <h1 className="mt-3 text-2xl font-bold">انتخاب منابع برنامه</h1>
        <p className="mt-2 text-sm text-slate-400">یکی از پلن‌های زیر را متناسب با نیاز برنامه انتخاب کنید.</p>
      </header>

      <div className="mt-7 flex flex-col justify-between gap-3 text-xs text-cyan-300 sm:flex-row">
        <span><Info className="ml-1 inline" size={15} /> موقعیت تمامی پلن‌ها ایران است.</span>
        <span><Info className="ml-1 inline" size={15} /> ترافیک تمامی پلن‌ها نامحدود است.</span>
      </div>

      <div className="mx-auto mt-8 grid max-w-sm grid-cols-3 rounded-2xl border border-white/10 bg-[#24252d] p-1" aria-label="رده پلن">
        <Button variant="ghost">پایه</Button>
        <Button variant="outline">نقره‌ای</Button>
        <Button variant="ghost">طلایی</Button>
      </div>

      <div className="mt-8 overflow-x-auto rounded-xl border border-white/10">
        <table className="w-full min-w-[900px] border-collapse text-center text-sm">
          <thead><tr>{plans.map((plan, index) => (
            <th key={plan.name} scope="col" onClick={() => setSelected(index)} className={cn("cursor-pointer border-l border-white/10 p-0 last:border-l-0", selected === index ? "bg-[#78f3c5]/10" : "bg-[#202129]")}>
              <div className="relative h-20 overflow-hidden">
                <div className="absolute -top-16 left-1/2 size-32 -translate-x-1/2 rounded-full shadow-[inset_-20px_-20px_30px_rgba(0,0,0,.45)]" style={{ background: `radial-gradient(circle at 35% 30%, #fff9, ${plan.tone} 35%, #14151a 80%)` }} />
                <span className="absolute inset-x-0 bottom-3 font-bold">{plan.name}</span>
              </div>
            </th>
          ))}</tr></thead>
          <tbody>{planMetrics.map(([label, key]) => (
            <tr key={key}>{plans.map((plan, index) => (
              <td key={plan.name} onClick={() => setSelected(index)} className={cn("cursor-pointer border-l border-t border-white/10 px-3 py-4 last:border-l-0", selected === index ? "bg-[#78f3c5]/10 text-white" : "text-slate-300")}>
                <span className="block text-[10px] text-slate-500">{label}</span>
                <strong className="mt-1 block font-medium">{plan[key]} {(key === "monthly" || key === "hourly") && <small>تومان</small>}</strong>
              </td>
            ))}</tr>
          ))}</tbody>
        </table>
      </div>

      <div className="mt-6 flex flex-col gap-2 text-xs">
        <p className="text-cyan-300"><Badge variant="outline" className="ml-2">توجه</Badge>مبلغ مالیات بر ارزش افزوده به هزینه‌ی پلن اضافه می‌شود.</p>
        <p className="text-amber-300"><Badge variant="warning" className="ml-2">توجه</Badge>برای اجرای Next.js منابع پلن رایگان ممکن است کافی نباشد.</p>
      </div>

      <section className="mt-7 flex flex-col gap-4 rounded-xl border border-white/10 bg-[#292b35] p-4 sm:flex-row sm:items-center">
        <div>
          <label htmlFor="discount-code" className="font-semibold">کد تخفیف</label>
          <p id="discount-code-help" className="mt-1 text-xs text-slate-400">کد را وارد و قیمت نهایی را بررسی کنید.</p>
        </div>
        <Input id="discount-code" aria-describedby="discount-code-help" dir="ltr" placeholder="برای مثال LIARA-OFF" className="flex-1" />
      </section>

      <div className="mt-8 flex justify-center"><Button onClick={onCreate} size="lg">ایجاد برنامه</Button></div>
    </div>
  );
}
