"use client";

import { useEffect, useState } from "react";
import {
  Activity,
  Bell,
  Blocks,
  Box,
  Check,
  ChevronDown,
  Cloud,
  Command,
  Database,
  Download,
  FileText,
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
  Rocket,
  Search,
  Server,
  Settings,
  SlidersHorizontal,
  Sparkles,
  Terminal,
  UploadCloud,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { AssistantPanel } from "@/app/features/assistance/assistant-panel";
import { CreateFlow } from "@/app/features/create-application/create-flow";
import { DeploymentFlow } from "@/app/features/deployment/deployment-flow";
import { HistoryView } from "@/app/features/deployment/history-view";
import { isFailedDeployment, resolveDeployment } from "@/lib/deployment";

const defaultApplication = { name: "assistance", runtime: "next" };

const dashboardPages = {
  overview: "اطلاعات کلی",
  deploy: "استقرار جدید",
  events: "رویدادها",
  history: "تاریخچه",
  reports: "گزارشات",
  logs: "لاگ‌ها",
  terminal: "خط فرمان",
  disks: "دیسک‌ها",
  domains: "دامنه‌ها",
  resize: "تغییر اندازه",
  settings: "تنظیمات",
};

const dashboardPageSlugs = Object.fromEntries(
  Object.entries(dashboardPages).map(([slug, label]) => [label, slug]),
);

function IconButton({ label, children, className = "", ...props }) {
  return (
    <button
      aria-label={label}
      title={label}
      className={cn(
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
            className={cn(
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
      className={cn(
        "fixed bottom-0 right-0 z-30 hidden border-l border-white/6 bg-[#202129] transition-[width] duration-300 md:block",
        collapsed ? "w-[76px]" : "w-[236px]",
      )}
      style={{ top: 134 }}
    >
      <div className="flex h-full flex-col py-4">
        <div
            className={cn(
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
              className={cn(
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

function DeployVisual({ method, onDeploy }) {
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
      <Button onClick={() => onDeploy(method)} className="mt-6">دپلوی</Button>
    </div>
  );
}

function DeployDashboard({ onCreate, onDeploy, initialActive = "استقرار جدید", deployment, application = defaultApplication }) {
  const [collapsed, setCollapsed] = useState(false);
  const [active, setActive] = useState(initialActive);
  const [method, setMethod] = useState("GitHub");
  const [assistant, setAssistant] = useState(true);
  const [assistantMode, setAssistantMode] = useState("docked");
  const contentMargin = collapsed ? "md:mr-[76px]" : "md:mr-[236px]";

  useEffect(() => {
    function restoreDashboardPage() {
      const slug = new URLSearchParams(window.location.search).get("dashboard");
      if (dashboardPages[slug]) {
        setActive(dashboardPages[slug]);
        return;
      }

      const url = new URL(window.location.href);
      url.searchParams.set("dashboard", dashboardPageSlugs[initialActive]);
      window.history.replaceState({}, "", url);
    }

    restoreDashboardPage();
    window.addEventListener("popstate", restoreDashboardPage);
    return () => window.removeEventListener("popstate", restoreDashboardPage);
  }, [initialActive]);

  function selectDashboardPage(label) {
    const url = new URL(window.location.href);
    url.searchParams.set("page", "dashboard");
    url.searchParams.set("dashboard", dashboardPageSlugs[label]);
    window.history.pushState({}, "", url);
    setActive(label);
  }

  const onHistory = active === "تاریخچه";
  const failed = isFailedDeployment(deployment?.status);
  const scenario = onHistory ? (failed ? "error" : "history") : "overview";
  // Logs travel with the deployment so Rahyar can debug a failure from any page.
  const current = deployment ? resolveDeployment(deployment) : null;
  const assistantContext = {
    currentPage: onHistory ? "deployment-history" : dashboardPageSlugs[active],
    currentStep: active,
    applicationName: current?.applicationName ?? application?.name,
    runtime: current?.runtime ?? application?.runtime,
    deploymentMethod: current?.method ?? method,
    deploymentStatus: current?.status,
    deploymentId: current?.id,
    port: current?.port,
    zone: current?.zoneLabel,
    logs: current?.logs,
  };

  return (
    <div className="min-h-screen bg-[#18191f]">
      <TopHeader onCreate={onCreate} />
      <Sidebar
        collapsed={collapsed}
        setCollapsed={setCollapsed}
        active={active}
        setActive={selectDashboardPage}
      />
      <main
        className={cn(
          "min-h-[calc(100vh-134px)] transition-[margin] duration-500 ease-out",
          contentMargin,
          assistant && assistantMode === "docked" && "md:ml-[50vw]",
        )}
      >
        {onHistory ? <HistoryView deployment={deployment} /> : <div className="mx-auto max-w-[980px] px-5 py-10 lg:px-8 lg:py-16">
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
                className={cn(
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
          <DeployVisual method={method} onDeploy={onDeploy} />
        </div>
        }
      </main>
      <AssistantPanel
        open={assistant}
        onOpen={() => setAssistant(true)}
        mode={assistantMode}
        onModeChange={setAssistantMode}
        scenario={scenario}
        context={assistantContext}
        onClose={() => setAssistant(false)}
        onSelect={setMethod}
      />
    </div>
  );
}

export default function App() {
  const [view, setView] = useState("dashboard");
  const [method, setMethod] = useState("Liara CLI");
  const [deployment, setDeployment] = useState(null);
  const [application, setApplication] = useState(defaultApplication);

  useEffect(() => {
    const validViews = new Set(["dashboard", "create", "deploy"]);

    function restoreViewFromUrl() {
      const page = new URLSearchParams(window.location.search).get("page");
      setView(validViews.has(page) ? page : "dashboard");
    }

    restoreViewFromUrl();
    window.addEventListener("popstate", restoreViewFromUrl);
    return () => window.removeEventListener("popstate", restoreViewFromUrl);
  }, []);

  function navigate(page, { replace = false, dashboard } = {}) {
    const url = new URL(window.location.href);
    url.searchParams.set("page", page);
    if (dashboard) url.searchParams.set("dashboard", dashboard);
    window.history[replace ? "replaceState" : "pushState"]({}, "", url);
    setView(page);
  }

  if (view === "deploy") {
    return <DeploymentFlow method={method} application={application} onCancel={() => navigate("dashboard")} onComplete={(result) => { setDeployment(result); navigate("dashboard", { replace: true, dashboard: "history" }); }} />;
  }

  return view === "dashboard" ? (
    <DeployDashboard
      onCreate={() => navigate("create")}
      onDeploy={(selectedMethod) => { setMethod(selectedMethod); navigate("deploy"); }}
      initialActive={deployment ? "تاریخچه" : "استقرار جدید"}
      deployment={deployment}
      application={application}
    />
  ) : (
    <CreateFlow
      onCancel={() => navigate("dashboard")}
      onComplete={(created) => { setApplication(created); navigate("dashboard", { replace: true }); }}
    />
  );
}
