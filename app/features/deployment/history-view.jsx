import { Badge } from "@/components/ui/badge";

export function HistoryView({ deployment }) {
  const logs = ["Using cache", "Installing dependencies", "Building Next.js application", "Uploading image", "Deployment queued in build zone"];
  return (
    <div className="mx-auto max-w-[980px] px-5 py-10 lg:px-8 lg:py-16">
      <div className="flex items-center justify-between"><div><p className="text-xs text-slate-500">برنامه / assistance</p><h1 className="mt-2 text-xl font-bold">تاریخچه‌ی استقرار</h1></div><Badge variant="outline">در حال دپلوی</Badge></div>
      <article className="mt-8 overflow-hidden rounded-2xl border border-white/10 bg-[#202129]">
        <header className="flex items-center justify-between bg-[#292b35] px-5 py-4"><strong>عملیات استقرار</strong><Badge variant="warning">در حال ساخت</Badge></header>
        <dl className="grid grid-cols-2 gap-px bg-white/5 text-sm sm:grid-cols-4">
          {[['پلتفرم','next'],['پورت',deployment?.port || '3000'],['موقعیت Build',deployment?.zoneLabel || 'ایران'],['نسخه',deployment?.version || 'v1']].map(([label,value]) => <div key={label} className="bg-[#252731] p-4"><dt className="text-xs text-slate-500">{label}</dt><dd className="mt-2 font-medium">{value}</dd></div>)}
        </dl>
        <div className="p-5"><h2 className="border-b border-cyan-400 pb-3 text-sm">لاگ‌های استقرار</h2><pre dir="ltr" className="mt-3 max-h-64 overflow-auto rounded-xl bg-[#18191f] p-4 text-left text-sm leading-7 text-slate-200">{logs.map((log,index) => `2026-08-20 11:34:0${index} |  ---> ${log}`).join('\n')}</pre></div>
      </article>
    </div>
  );
}
