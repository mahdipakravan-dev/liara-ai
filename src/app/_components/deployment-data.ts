import {
  Activity,
  Blocks,
  Cloud,
  Database,
  FileText,
  Globe2,
  HardDrive,
  History,
  Info,
  LayoutGrid,
  Network,
  Rocket,
  Server,
  Settings,
  SlidersHorizontal,
  Sparkles,
  Terminal,
  type LucideIcon,
} from "lucide-react";

export type DeploymentMethod = "GitHub" | "Drag & Drop" | "Liara CLI";

export const deploymentMethods: DeploymentMethod[] = [
  "GitHub",
  "Drag & Drop",
  "Liara CLI",
];

export const services: Array<{ label: string; icon: LucideIcon }> = [
  { label: "پلتفرم", icon: Cloud },
  { label: "دیتابیس", icon: Database },
  { label: "سرور مجازی ابری", icon: Server },
  { label: "وردپرس اختصاصی", icon: Globe2 },
  { label: "برنامه‌های آماده", icon: Blocks },
  { label: "ذخیره‌سازی ابری", icon: HardDrive },
  { label: "DNS", icon: Network },
  { label: "ایمیل", icon: FileText },
  { label: "هوش مصنوعی", icon: Sparkles },
];

export const workspaceNavigation: Array<{
  label: string;
  icon: LucideIcon;
}> = [
  { label: "اطلاعات کلی", icon: Info },
  { label: "استقرار جدید", icon: Rocket },
  { label: "رویدادها", icon: LayoutGrid },
  { label: "تاریخچه", icon: History },
  { label: "گزارشات", icon: Activity },
  { label: "لاگ‌ها", icon: FileText },
  { label: "خط فرمان", icon: Terminal },
  { label: "دیسک‌ها", icon: HardDrive },
  { label: "دامنه‌ها", icon: Globe2 },
  { label: "تغییر اندازه", icon: SlidersHorizontal },
  { label: "تنظیمات", icon: Settings },
];

export const runtimes = [
  ["Node.js", "JS"], ["Next.js", "NEXT"], ["Laravel", "L"],
  ["PHP", "php"], ["Python", "Py"], ["Django", "dj"], ["Flask", "Fl"],
  [".NET", ".NET"], ["React", "⚛"], ["Angular", "A"], ["Vue", "V"],
  ["Static", "5"], ["Go", "GO"], ["Docker", "◆"],
] as const;

export const plans = [
  { name: "زمین", monthly: "۷۰۰,۰۰۰", hourly: "۹۷۲", ram: "512 MB", cpu: "0.5 Core", disk: "5 GB" },
  { name: "مریخ", monthly: "۱,۲۰۰,۰۰۰", hourly: "۱,۶۶۶", ram: "1 GB", cpu: "1 Core", disk: "10 GB" },
  { name: "مشتری", monthly: "۲,۱۰۰,۰۰۰", hourly: "۲,۹۱۶", ram: "2 GB", cpu: "1 Core", disk: "20 GB" },
  { name: "زحل", monthly: "۳,۸۰۰,۰۰۰", hourly: "۵,۲۷۶", ram: "4 GB", cpu: "2 Core", disk: "40 GB" },
  { name: "اورانوس", monthly: "۶,۶۰۰,۰۰۰", hourly: "۹,۱۶۶", ram: "8 GB", cpu: "4 Core", disk: "80 GB" },
  { name: "نپتون", monthly: "۱۱,۵۰۰,۰۰۰", hourly: "۱۵,۹۷۲", ram: "16 GB", cpu: "8 Core", disk: "160 GB" },
  { name: "پلوتون", monthly: "۲۰,۱۰۰,۰۰۰", hourly: "۲۷,۹۱۶", ram: "32 GB", cpu: "16 Core", disk: "320 GB" },
] as const;
