"use client";

import React, { useEffect, useState } from "react";
import {
  Activity,
  ArrowLeft,
  Bell,
  Blocks,
  Bot,
  Box,
  Check,
  ChevronDown,
  CircleHelp,
  Cloud,
  Code2,
  Command,
  Database,
  Download,
  ExternalLink,
  FileText,
  FolderClock,
  Gauge,
  GitBranch,
  Globe2,
  HardDrive,
  History,
  Info,
  LayoutGrid,
  Menu,
  Network,
  PanelRightClose,
  PanelRightOpen,
  Play,
  Plus,
  Rocket,
  Search,
  Server,
  Settings,
  SlidersHorizontal,
  Sparkles,
  Terminal,
  UploadCloud,
  X,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";

const cx = (...items) => items.filter(Boolean).join(" ");

const runtimes = [
  ["Node.js", "JS", "#57e0a1"],
  ["Next.js", "NEXT", "#d7fffa"],
  ["Laravel", "L", "#ff5f63"],
  ["PHP", "php", "#67d6e8"],
  ["Python", "Py", "#ffd36a"],
  ["Django", "dj", "#69dee0"],
  ["Flask", "Fl", "#76eddf"],
  [".NET", ".NET", "#d18afe"],
  ["React", "⚛", "#49b7ff"],
  ["Angular", "A", "#ff6b68"],
  ["Vue", "V", "#56dfa0"],
  ["Static", "5", "#ff795c"],
  ["Go", "GO", "#63d8e6"],
  ["Docker", "◆", "#3bb0ff"],
];
const plans = [
  {
    name: "زمین",
    monthly: "۷۰۰,۰۰۰",
    hourly: "۹۷۲",
    ram: "512 MB",
    cpu: "0.5 Core",
    disk: "5 GB",
    tone: "#315e8d",
  },
  {
    name: "مریخ",
    monthly: "۱,۲۰۰,۰۰۰",
    hourly: "۱,۶۶۶",
    ram: "1 GB",
    cpu: "1 Core",
    disk: "10 GB",
    tone: "#a9563d",
  },
  {
    name: "مشتری",
    monthly: "۲,۱۰۰,۰۰۰",
    hourly: "۲,۹۱۶",
    ram: "2 GB",
    cpu: "1 Core",
    disk: "20 GB",
    tone: "#b7965a",
  },
  {
    name: "زحل",
    monthly: "۳,۸۰۰,۰۰۰",
    hourly: "۵,۲۷۶",
    ram: "4 GB",
    cpu: "2 Core",
    disk: "40 GB",
    tone: "#c7a76a",
  },
  {
    name: "اورانوس",
    monthly: "۶,۶۰۰,۰۰۰",
    hourly: "۹,۱۶۶",
    ram: "8 GB",
    cpu: "4 Core",
    disk: "80 GB",
    tone: "#75a5c3",
  },
  {
    name: "نپتون",
    monthly: "۱۱,۵۰۰,۰۰۰",
    hourly: "۱۵,۹۷۲",
    ram: "16 GB",
    cpu: "8 Core",
    disk: "160 GB",
    tone: "#29778a",
  },
  {
    name: "پلوتون",
    monthly: "۲۰,۱۰۰,۰۰۰",
    hourly: "۲۷,۹۱۶",
    ram: "32 GB",
    cpu: "16 Core",
    disk: "320 GB",
    tone: "#8a674f",
  },
];

function IconButton({ label, children, className = "", ...props }) {
  return (
    <button
      aria-label={label}
      title={label}
      className={cx(
        "grid size-10 place-items-center rounded-xl text-slate-300 transition hover:bg-white/7 hover:text-white",
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}

function Brand() {
  return (
    <div className="flex items-center gap-2.5" aria-label="لیارا">
      <div className="relative grid size-9 place-items-center rounded-xl bg-gradient-to-br from-[#72f2c2] to-[#25bfe8] text-[#14211e] shadow-[0_0_24px_rgba(54,211,205,.18)]">
        <Box size={21} />
      </div>
      <span className="text-xl font-black tracking-tight text-white">
        لیارا
      </span>
    </div>
  );
}

function TopHeader({ onCreate }) {
  const services = [
    ["پلتفرم", Cloud],
    ["دیتابیس", Database],
    ["سرور مجازی ابری", Server],
    ["وردپرس اختصاصی", Globe2],
    ["برنامه‌های آماده", Blocks],
    ["ذخیره‌سازی ابری", HardDrive],
    ["DNS", Network],
    ["ایمیل", FileText],
    ["هوش مصنوعی", Sparkles],
  ];
  return (
    <header className="sticky top-0 z-40 border-b border-white/8 bg-[#202129]/95 backdrop-blur-xl">
      <div className="flex h-[72px] items-center justify-between gap-5 px-5 lg:px-7">
        <div className="flex items-center gap-7">
          <Brand />
          <button className="hidden items-center gap-2 border-r border-white/10 pr-6 text-sm lg:flex">
            NegahVengers{" "}
            <span className="size-5 rounded-full bg-gradient-to-b from-lime-400 to-amber-400" />
            <ChevronDown size={14} />
          </button>
        </div>
        <nav
          aria-label="ناوبری اصلی"
          className="hidden items-center gap-7 text-sm text-slate-200 xl:flex"
        >
          <a href="#support" className="hover:text-[#78f3c5]">
            پشتیبانی
          </a>
          <a href="#guide" className="hover:text-[#78f3c5]">
            راهنما
          </a>
          <a href="#docs" className="hover:text-[#78f3c5]">
            مستندات
          </a>
          <a href="#learn" className="hover:text-[#78f3c5]">
            آموزش
          </a>
          <a href="#cicd" className="hover:text-[#78f3c5]">
            CI/CD
          </a>
          <a href="#api" className="hover:text-[#78f3c5]">
            API
          </a>
        </nav>
        <div className="flex items-center gap-2">
          <div className="hidden items-center gap-2 rounded-xl border border-white/10 bg-black/15 px-3 py-2 text-xs text-slate-300 md:flex">
            <Search size={15} />
            <span>جستجو</span>
            <kbd className="rounded border border-white/15 px-1.5">⌘K</kbd>
          </div>
          <span className="hidden rounded-full border border-emerald-400/20 bg-emerald-500/8 px-3 py-1.5 text-xs text-emerald-300 lg:inline">
            ● عملیاتی
          </span>
          <IconButton label="اعلان‌ها">
            <Bell size={19} />
          </IconButton>
          <button
            onClick={onCreate}
            className="hidden rounded-xl border border-white/10 px-3 py-2 text-sm hover:bg-white/5 sm:block"
          >
            ساخت برنامه
          </button>
          <button className="hidden items-center gap-2 rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm sm:flex">
            <span className="grid size-6 place-items-center rounded-full bg-gradient-to-br from-cyan-400 to-indigo-500 text-[10px]">
              م
            </span>{" "}
            مهدی پاکروان <ChevronDown size={14} />
          </button>
          <IconButton label="منو" className="xl:hidden">
            <Menu size={21} />
          </IconButton>
        </div>
      </div>
      <div className="flex h-[62px] items-center gap-2 overflow-x-auto border-t border-white/7 bg-[#292b35] px-4 lg:justify-center">
        {services.map(([label, I], i) => (
          <button
            key={label}
            className={cx(
              "flex shrink-0 items-center gap-2 rounded-xl px-3.5 py-2 text-sm transition",
              i === 0
                ? "bg-[#78f3c5]/8 text-[#78f3c5]"
                : "text-slate-300 hover:bg-white/5 hover:text-white",
            )}
          >
            <I size={17} />
            {label}
          </button>
        ))}
      </div>
    </header>
  );
}

function Sidebar({ collapsed, setCollapsed, active, setActive }) {
  const items = [
    ["اطلاعات کلی", Info],
    ["استقرار جدید", Rocket],
    ["رویدادها", LayoutGrid],
    ["تاریخچه", History],
    ["گزارشات", Activity],
    ["لاگ‌ها", FileText],
    ["خط فرمان", Terminal],
    ["دیسک‌ها", HardDrive],
    ["دامنه‌ها", Globe2],
    ["تغییر اندازه", SlidersHorizontal],
    ["تنظیمات", Settings],
  ];
  return (
    <aside
      className={cx(
        "fixed bottom-0 right-0 z-30 hidden border-l border-white/6 bg-[#202129] transition-[width] duration-300 md:block",
        collapsed ? "w-[76px]" : "w-[236px]",
      )}
      style={{ top: 134 }}
    >
      <div className="flex h-full flex-col py-4">
        <div
          className={cx(
            "mb-3 flex items-center text-[11px] text-slate-500",
            collapsed ? "justify-center" : "justify-between px-5",
          )}
        >
          <span className={collapsed ? "hidden" : ""}>فضای برنامه</span>
          <IconButton
            label={collapsed ? "بازکردن سایدبار" : "بستن سایدبار"}
            onClick={() => setCollapsed((v) => !v)}
          >
            {collapsed ? (
              <PanelRightOpen size={18} />
            ) : (
              <PanelRightClose size={18} />
            )}
          </IconButton>
        </div>
        <nav className="flex-1 space-y-1" aria-label="ناوبری برنامه">
          {items.map(([label, I]) => (
            <button
              key={label}
              onClick={() => setActive(label)}
              title={collapsed ? label : undefined}
              className={cx(
                "flex h-12 w-full items-center gap-3 border-r-2 px-5 text-sm transition",
                active === label
                  ? "border-[#78f3c5] bg-gradient-to-l from-[#78f3c5]/18 to-transparent text-white"
                  : "border-transparent text-slate-300 hover:bg-white/5 hover:text-white",
                collapsed ? "justify-center px-0" : "",
              )}
            >
              <I
                size={19}
                className={active === label ? "text-[#78f3c5]" : ""}
              />
              <span className={collapsed ? "hidden" : ""}>{label}</span>
            </button>
          ))}
        </nav>
        {!collapsed && (
          <div className="mx-4 rounded-2xl border border-white/8 bg-black/15 p-4">
            <div className="mb-2 flex items-center justify-between text-xs">
              <span className="text-slate-400">مصرف این ماه</span>
              <span>۳۸٪</span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-white/8">
              <div className="h-full w-[38%] rounded-full bg-gradient-to-l from-[#78f3c5] to-[#2bc3ee]" />
            </div>
            <p className="mt-3 text-[11px] text-slate-500">
              ۲۲ روز تا تمدید منابع
            </p>
          </div>
        )}
      </div>
    </aside>
  );
}

function AssistantPanel({ open, onClose, onSelect }) {
  return (
    <section
      aria-label="دستیار استقرار"
      className={cx(
        "fixed bottom-5 left-5 z-50 w-[calc(100%-40px)] max-w-[370px] origin-bottom-left rounded-[26px] border border-[#78f3c5]/20 bg-[#22242d]/96 p-5 shadow-[0_24px_80px_rgba(0,0,0,.55)] backdrop-blur-2xl transition duration-300",
        open
          ? "scale-100 opacity-100"
          : "pointer-events-none scale-90 opacity-0",
      )}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="orb relative size-12 rounded-full" />
          <div>
            <p className="font-bold">دستیار لیارا</p>
            <span className="text-xs text-[#78f3c5]">آماده‌ی کمک</span>
          </div>
        </div>
        <IconButton label="بستن دستیار" onClick={onClose}>
          <X size={18} />
        </IconButton>
      </div>
      <div className="mt-5 rounded-2xl bg-black/20 p-4">
        <h2 className="text-lg font-bold">بسیار خب!</h2>
        <p className="mt-2 text-sm leading-7 text-slate-300">
          من منتظرم کدهات رو روی لیارا آپلود کنی. یکی از روش‌های زیر رو انتخاب
          کن؛ اگر سؤالی داشتی، روی همون روش کلیک کن.
        </p>
      </div>
      <div className="relative mt-4 grid grid-cols-3 gap-2 before:absolute before:right-[16%] before:left-[16%] before:top-5 before:h-px before:bg-white/10">
        {[
          ["GitHub", GitBranch],
          ["Drag & Drop", UploadCloud],
          ["Liara CLI", Terminal],
        ].map(([label, I]) => (
          <button
            key={label}
            onClick={() => onSelect(label)}
            className="relative z-10 flex flex-col items-center gap-2 rounded-xl p-2 text-[11px] text-slate-300 transition hover:bg-white/5 hover:text-white"
          >
            <span className="grid size-10 place-items-center rounded-xl border border-white/10 bg-[#292b35]">
              <I size={18} />
            </span>
            {label}
          </button>
        ))}
      </div>
    </section>
  );
}

function DeployVisual({ method }) {
  const copy =
    method === "GitHub"
      ? [
          "حساب گیت‌هاب شما متصل نیست.",
          "برای متصل کردن حساب، روی دکمه‌ی اتصال حساب کلیک کنید.",
        ]
      : method === "Drag & Drop"
        ? [
            "پروژه‌ات را اینجا رها کن.",
            "فایل ZIP پروژه را بکش و در این ناحیه رها کن یا از سیستم انتخابش کن.",
          ]
        : [
            "با یک فرمان مستقر کن.",
            "CLI لیارا سریع‌ترین مسیر برای استقرار مستقیم از ترمینال شماست.",
          ];
  return (
    <div className="mx-auto mt-14 flex max-w-xl flex-col items-center text-center">
      <div className="relative h-44 w-72">
        <div className="absolute inset-x-8 top-6 h-36 -rotate-6 rounded-[38px] border border-[#78f3c5]/70 bg-gradient-to-br from-[#17242b] to-[#232432]" />
        <div className="absolute right-5 top-12 space-y-3">
          {[220, 140, 140].map((w, i) => (
            <div
              key={i}
              className="flex h-10 items-center gap-2 rounded-lg bg-[#383b49] p-1.5 shadow-xl"
              style={{ width: w }}
            >
              <span className="grid size-7 place-items-center rounded-md bg-gradient-to-br from-[#78f3c5] to-[#2bc3ee] text-[#13231f]">
                {method === "GitHub" ? (
                  <Server size={14} />
                ) : method === "Drag & Drop" ? (
                  <UploadCloud size={14} />
                ) : (
                  <Terminal size={14} />
                )}
              </span>
              <i className="h-2 flex-1 rounded bg-white/15" />
              <i className="size-2 rounded-full bg-white/20" />
            </div>
          ))}
        </div>
        <div className="absolute bottom-2 left-7 grid size-20 place-items-center rounded-full border border-[#2bc3ee]/70 bg-[#1c222d]">
          {method === "GitHub" ? (
            <GitBranch size={45} strokeWidth={1} />
          ) : method === "Drag & Drop" ? (
            <UploadCloud size={43} strokeWidth={1} />
          ) : (
            <Command size={43} strokeWidth={1} />
          )}
        </div>
      </div>
      <p className="mt-5 text-base font-medium">{copy[0]}</p>
      <p className="mt-1 text-sm text-slate-300">{copy[1]}</p>
      <ul className="mt-7 space-y-3 text-right text-sm text-slate-200">
        {(method === "GitHub"
          ? [
              "استقرار ساده",
              "آپلود سریع‌تر سورس کد",
              "استقرار خودکار آخرین Commit با هر Push",
            ]
          : method === "Drag & Drop"
            ? [
                "بدون نیاز به Git",
                "تشخیص خودکار Runtime",
                "نمایش زنده‌ی وضعیت آپلود",
              ]
            : [
                "قابل استفاده در CI/CD",
                "تنظیمات در liara.json",
                "گزارش زنده‌ی فرایند",
              ]
        ).map((x) => (
          <li key={x} className="flex items-center justify-end gap-3">
            <span>{x}</span>
            <span className="grid size-7 place-items-center rounded-lg bg-amber-300/10 text-amber-300">
              <Check size={15} />
            </span>
          </li>
        ))}
      </ul>
      <button
        onClick={() =>
          alert(
            method === "GitHub"
              ? "اتصال امن حساب گیت‌هاب آغاز شد."
              : method === "Drag & Drop"
                ? "انتخاب فایل پروژه باز می‌شود."
                : "npm i -g @liara/cli",
          )
        }
        className="primary-gradient mt-6 rounded-xl px-6 py-3 text-sm font-bold shadow-[0_10px_30px_rgba(50,203,216,.12)] transition hover:-translate-y-0.5"
      >
        {method === "GitHub"
          ? "اتصال حساب"
          : method === "Drag & Drop"
            ? "انتخاب فایل"
            : "کپی فرمان نصب"}
      </button>
    </div>
  );
}

function DeployDashboard({ onCreate }) {
  const [collapsed, setCollapsed] = useState(false);
  const [active, setActive] = useState("استقرار جدید");
  const [method, setMethod] = useState("GitHub");
  const [assistant, setAssistant] = useState(true);
  const contentMargin = collapsed ? "md:mr-[76px]" : "md:mr-[236px]";
  return (
    <div className="min-h-screen bg-[#18191f]">
      <TopHeader onCreate={onCreate} />
      <Sidebar
        collapsed={collapsed}
        setCollapsed={setCollapsed}
        active={active}
        setActive={setActive}
      />
      <main
        className={cx(
          "min-h-[calc(100vh-134px)] transition-[margin] duration-300",
          contentMargin,
        )}
      >
        <div className="mx-auto max-w-[980px] px-5 py-10 lg:px-8 lg:py-16">
          <div className="mb-7 flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-500">برنامه / فروشگاه نگــاه</p>
              <h1 className="mt-2 text-xl font-bold">استقرار جدید</h1>
            </div>
            <span className="flex items-center gap-2 rounded-full border border-emerald-400/15 bg-emerald-400/5 px-3 py-1.5 text-xs text-emerald-300">
              <span className="size-2 rounded-full bg-emerald-400" />
              سرویس آماده
            </span>
          </div>
          <div className="flex border-b border-white/10" role="tablist">
            {["GitHub", "Drag & Drop", "Liara CLI"].map((x) => (
              <button
                role="tab"
                aria-selected={method === x}
                onClick={() => setMethod(x)}
                key={x}
                className={cx(
                  "relative px-6 py-4 text-sm transition after:absolute after:inset-x-0 after:-bottom-px after:h-0.5",
                  method === x
                    ? "text-[#78f3c5] after:bg-[#78f3c5]"
                    : "text-slate-400 after:bg-transparent hover:text-white",
                )}
              >
                {x}
              </button>
            ))}
          </div>
          <div className="mt-8 flex flex-wrap items-center justify-between gap-4">
            <div>
              <span className="text-xs text-slate-500">
                استقرار با استفاده از
              </span>
              <h2 className="mt-1 text-xl font-semibold">{method}</h2>
            </div>
            <div className="flex gap-2">
              <button className="flex items-center gap-2 rounded-lg bg-[#242b35] px-3 py-2 text-xs text-cyan-300 hover:bg-[#2b3440]">
                <Play size={14} /> آموزش ویدیویی
              </button>
              <button className="flex items-center gap-2 rounded-lg border border-cyan-400/70 px-3 py-2 text-xs text-cyan-300 hover:bg-cyan-400/8">
                <Download size={14} /> liara.json
              </button>
            </div>
          </div>
          <DeployVisual method={method} />
        </div>
      </main>
      <button
        onClick={() => setAssistant(true)}
        aria-label="بازکردن دستیار"
        className={cx(
          "orb fixed bottom-7 left-7 z-40 grid size-14 place-items-center rounded-full transition hover:scale-105",
          assistant ? "scale-0 opacity-0" : "scale-100 opacity-100",
        )}
      >
        <div className="flex h-5 items-center gap-1">
          {[14, 22, 17].map((h, i) => (
            <i
              key={i}
              className="voice-bar w-1 rounded-full bg-white"
              style={{ height: h }}
            />
          ))}
        </div>
      </button>
      <AssistantPanel
        open={assistant}
        onClose={() => setAssistant(false)}
        onSelect={(m) => {
          setMethod(m);
          setAssistant(false);
        }}
      />
    </div>
  );
}

function RuntimeStep({
  selected,
  setSelected,
  name,
  setName,
  onNext,
  onCancel,
}) {
  return (
    <div className="mx-auto max-w-[1070px] px-5 py-10 lg:py-16">
      <button
        onClick={onCancel}
        className="mb-10 flex items-center gap-2 text-sm text-slate-400 hover:text-white"
      >
        <ArrowLeft size={17} /> بازگشت <span className="text-xs">(ESC)</span>
      </button>
      <div className="text-right">
        <p className="text-xs text-[#78f3c5]">مرحله ۱ از ۲</p>
        <h1 className="mt-3 text-2xl font-bold">ساخت برنامه‌ی جدید</h1>
        <p className="mt-2 text-sm text-slate-400">
          لطفاً نوع برنامه‌ی خود را انتخاب کنید.
        </p>
      </div>
      <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-7">
        {runtimes.map(([label, mark, color]) => (
          <button
            aria-pressed={selected === label}
            onClick={() => setSelected(label)}
            key={label}
            className={cx(
              "flex min-h-36 flex-col items-center justify-center gap-5 rounded-xl border bg-[#292b35] p-4 transition hover:-translate-y-1 hover:border-white/20",
              selected === label
                ? "border-[#78f3c5] bg-[#173633]/70 shadow-[0_0_24px_rgba(120,243,197,.08)]"
                : "border-transparent",
            )}
          >
            <span
              style={{ color }}
              className="text-3xl font-black drop-shadow-lg"
            >
              {mark}
            </span>
            <span
              className={cx(
                "text-xs font-medium uppercase",
                selected === label ? "text-[#78f3c5]" : "text-slate-100",
              )}
            >
              {label}
            </span>
          </button>
        ))}
      </div>
      <p className="mt-3 text-left text-xs leading-6 text-cyan-300">
        <span className="rounded border border-cyan-400 px-1.5 py-1">نکته</span>{" "}
        پلتفرم {selected} لیارا از فریم‌ورک‌های محبوب و استاندارد پشتیبانی
        می‌کند.
      </p>
      <section className="mt-9">
        <h2 className="text-lg font-semibold">شناسه‌ی برنامه</h2>
        <p className="mt-2 text-sm leading-7 text-slate-400">
          شناسه، همان Subdomain برنامه‌ی شماست. از حروف انگلیسی کوچک، اعداد و خط
          تیره استفاده کنید.
        </p>
        <div
          dir="ltr"
          className="mt-5 flex h-12 overflow-hidden rounded-xl border border-white/10 bg-[#292b35] focus-within:border-[#78f3c5]"
        >
          <span className="grid place-items-center border-r border-white/7 px-4 font-mono text-sm">
            https://
          </span>
          <input
            aria-label="شناسه برنامه"
            value={name}
            onChange={(e) => setName(e.target.value.replace(/[^a-z0-9-]/g, ""))}
            placeholder="my-website"
            className="min-w-0 flex-1 bg-transparent px-4 text-left outline-none"
          />
          <span className="grid place-items-center border-l border-white/7 px-4 font-mono text-sm">
            .liara.run
          </span>
        </div>
      </section>
      <section className="mt-10 border-t border-white/7 pt-8">
        <h2 className="text-lg font-semibold">شبکه خصوصی</h2>
        <p className="mt-2 text-sm text-slate-400">
          برنامه‌ها و دیتابیس‌هایی که نیاز به ارتباط داخلی دارند را در یک شبکه
          خصوصی قرار دهید.
        </p>
        <button className="mt-5 flex items-center gap-2 rounded-xl border border-[#78f3c5]/60 px-4 py-2.5 text-sm text-[#78f3c5] hover:bg-[#78f3c5]/8">
          <Plus size={16} /> ساخت شبکه خصوصی جدید
        </button>
      </section>
      <div className="sticky bottom-4 mt-12 flex justify-end">
        <Button disabled={!name} onClick={onNext} size="lg">
          انتخاب پلن
        </Button>
      </div>
    </div>
  );
}

function PlanStep({ selected, setSelected, onBack, onCreate }) {
  return (
    <div className="mx-auto max-w-[1070px] px-5 py-10 lg:py-16">
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-sm text-slate-400 hover:text-white"
      >
        <ArrowLeft size={17} /> مرحله قبل
      </button>
      <div className="mt-9 text-right">
        <p className="text-xs text-[#78f3c5]">مرحله ۲ از ۲</p>
        <h1 className="mt-3 text-2xl font-bold">انتخاب منابع برنامه</h1>
        <p className="mt-2 text-sm text-slate-400">
          یکی از پلن‌های زیر را متناسب با نیاز برنامه انتخاب کنید.
        </p>
      </div>
      <div className="mt-7 flex flex-col justify-between gap-3 text-xs text-cyan-300 sm:flex-row">
        <span>
          <Info size={15} className="ml-1 inline" /> موقعیت تمامی پلن‌ها ایران
          است.
        </span>
        <span>
          <Info size={15} className="ml-1 inline" /> ترافیک تمامی پلن‌ها نامحدود
          است.
        </span>
      </div>
      <div className="mx-auto mt-8 grid max-w-sm grid-cols-3 rounded-2xl border border-white/10 bg-[#24252d] p-1">
        <button className="rounded-xl px-4 py-3 text-slate-400">پایه</button>
        <button className="rounded-xl border border-[#78f3c5] bg-[#78f3c5]/10 px-4 py-3 text-white">
          نقره‌ای
        </button>
        <button className="rounded-xl px-4 py-3 text-slate-400">طلایی</button>
      </div>
      <div className="mt-8 overflow-x-auto rounded-xl border border-white/10">
        <table className="w-full min-w-[900px] border-collapse text-center text-sm">
          <thead>
            <tr>
              {plans.map((p, i) => (
                <th
                  key={p.name}
                  onClick={() => setSelected(i)}
                  className={cx(
                    "cursor-pointer border-l border-white/10 p-0 last:border-l-0",
                    selected === i ? "bg-[#78f3c5]/10" : "bg-[#202129]",
                  )}
                >
                  <div className="relative h-20 overflow-hidden">
                    <div
                      className="absolute -top-16 left-1/2 size-32 -translate-x-1/2 rounded-full shadow-[inset_-20px_-20px_30px_rgba(0,0,0,.45)]"
                      style={{
                        background: `radial-gradient(circle at 35% 30%, #fff9, ${p.tone} 35%, #14151a 80%)`,
                      }}
                    />
                    <span className="absolute inset-x-0 bottom-3 font-bold">
                      {p.name}
                    </span>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {[
              ["قیمت ماهانه", "monthly"],
              ["قیمت ساعتی", "hourly"],
              ["RAM", "ram"],
              ["vCPU", "cpu"],
              ["Disk", "disk"],
            ].map(([label, key]) => (
              <tr key={key}>
                {plans.map((p, i) => (
                  <td
                    key={p.name}
                    onClick={() => setSelected(i)}
                    className={cx(
                      "cursor-pointer border-l border-t border-white/10 px-3 py-4 last:border-l-0",
                      selected === i
                        ? "bg-[#78f3c5]/10 text-white"
                        : "text-slate-300",
                    )}
                  >
                    <span className="block text-[10px] text-slate-500">
                      {label}
                    </span>
                    <strong className="mt-1 block font-medium">
                      {p[key]}{" "}
                      {key === "monthly" || key === "hourly" ? (
                        <small>تومان</small>
                      ) : (
                        ""
                      )}
                    </strong>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-6 space-y-2 text-xs">
        <p className="text-cyan-300">
          <span className="ml-2 rounded border border-cyan-400 px-1.5 py-0.5">
            توجه
          </span>
          مبلغ مالیات بر ارزش افزوده به هزینه‌ی پلن اضافه می‌شود.
        </p>
        <p className="text-amber-300">
          <span className="ml-2 rounded border border-amber-400 px-1.5 py-0.5">
            توجه
          </span>
          برای اجرای Next.js منابع پلن رایگان ممکن است کافی نباشد.
        </p>
      </div>
      <div className="mt-7 flex flex-col gap-4 rounded-xl border border-white/10 bg-[#292b35] p-4 sm:flex-row sm:items-center">
        <div>
          <h2 className="font-semibold">کد تخفیف</h2>
          <p className="mt-1 text-xs text-slate-400">
            کد را وارد و قیمت نهایی را بررسی کنید.
          </p>
        </div>
        <input
          dir="ltr"
          placeholder="برای مثال LIARA-OFF"
          className="h-11 flex-1 rounded-lg border-b border-white/30 bg-black/10 px-4 outline-none focus:border-[#78f3c5]"
        />
      </div>
      <div className="mt-8 flex justify-center">
        <Button onClick={onCreate} size="lg" className="px-14">
          ایجاد برنامه
        </Button>
      </div>
    </div>
  );
}

function CreateFlow({ onCancel, onComplete }) {
  const [step, setStep] = useState(1);
  const [runtime, setRuntime] = useState("Node.js");
  const [name, setName] = useState("negah-store");
  const [plan, setPlan] = useState(1);
  useEffect(() => {
    const f = (e) => {
      if (e.key === "Escape") onCancel();
    };
    addEventListener("keydown", f);
    return () => removeEventListener("keydown", f);
  }, [onCancel]);
  return (
    <main className="min-h-screen bg-[#18191f] soft-grid">
      {step === 1 ? (
        <RuntimeStep
          selected={runtime}
          setSelected={setRuntime}
          name={name}
          setName={setName}
          onNext={() => setStep(2)}
          onCancel={onCancel}
        />
      ) : (
        <PlanStep
          selected={plan}
          setSelected={setPlan}
          onBack={() => setStep(1)}
          onCreate={onComplete}
        />
      )}
    </main>
  );
}

export default function App() {
  const [view, setView] = useState("dashboard");
  return view === "dashboard" ? (
    <DeployDashboard onCreate={() => setView("create")} />
  ) : (
    <CreateFlow
      onCancel={() => setView("dashboard")}
      onComplete={() => setView("dashboard")}
    />
  );
}
