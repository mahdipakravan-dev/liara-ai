import { Bell, Box, ChevronDown, Menu, Search } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

import { services } from "./deployment-data";

export function AppHeader({ onCreate }: { onCreate: () => void }) {
  return (
    <header className="sticky top-0 z-40 border-b border-white/8 bg-[#202129]/95 backdrop-blur-xl">
      <div className="flex h-[72px] items-center justify-between gap-5 px-5 lg:px-7">
        <div className="flex items-center gap-7">
          <div className="flex items-center gap-2.5" aria-label="لیارا">
            <span className="grid size-9 place-items-center rounded-xl bg-gradient-to-br from-[#72f2c2] to-[#25bfe8] text-[#14211e] shadow-[0_0_24px_rgba(54,211,205,.18)]">
              <Box aria-hidden="true" />
            </span>
            <span className="text-xl font-black tracking-tight text-white">لیارا</span>
          </div>
          <Button variant="ghost" className="hidden lg:inline-flex">
            NegahVengers <ChevronDown data-icon="inline-end" />
          </Button>
        </div>
        <nav aria-label="ناوبری اصلی" className="hidden items-center gap-1 xl:flex">
          {["پشتیبانی", "راهنما", "مستندات", "آموزش", "CI/CD", "API"].map((item) => (
            <Button key={item} variant="ghost" size="sm" asChild>
              <a href={`#${item}`}>{item}</a>
            </Button>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="hidden md:inline-flex">
            <Search data-icon="inline-start" /> جستجو <kbd>⌘K</kbd>
          </Button>
          <Badge variant="outline" className="hidden lg:inline-flex">● عملیاتی</Badge>
          <Button variant="ghost" size="icon" aria-label="اعلان‌ها"><Bell /></Button>
          <Button variant="outline" size="sm" onClick={onCreate} className="hidden sm:inline-flex">ساخت برنامه</Button>
          <Button variant="ghost" size="icon" aria-label="منو" className="xl:hidden"><Menu /></Button>
        </div>
      </div>
      <nav aria-label="خدمات" className="flex h-[62px] items-center gap-2 overflow-x-auto border-t border-white/7 bg-[#292b35] px-4 lg:justify-center">
        {services.map(({ label, icon: Icon }, index) => (
          <Button key={label} variant={index === 0 ? "secondary" : "ghost"} size="sm" className="shrink-0">
            <Icon data-icon="inline-start" /> {label}
          </Button>
        ))}
      </nav>
    </header>
  );
}
