/**
 * پیکربندی مرکزی سایت — تک‌منبع حقیقت (Single Source of Truth)
 * برای متادیتا، sitemap ،JSON-LD و لینک‌های canonical.
 *
 * این ماژول «Shared» است و در layout ،sitemap ،robots و صفحات استفاده می‌شود.
 */
export const siteConfig = {
  name: "لیارا",
  nameEn: "Liara",
  description: "لیارا",
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "https://.ir",
  locale: "fa_IR",
  twitterHandle: "@liara",
} as const;

export type SiteConfig = typeof siteConfig;
