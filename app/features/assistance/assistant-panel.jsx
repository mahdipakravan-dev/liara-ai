"use client";

import { useChat } from "@ai-sdk/react";
import {
  ArrowLeft,
  GitBranch,
  ShieldCheck,
  Terminal,
  UploadCloud,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from "@/app/components/ai-elements/conversation";
import {
  Message,
  MessageContent,
  MessageResponse,
} from "@/app/components/ai-elements/message";
import {
  PromptInput,
  PromptInputBody,
  PromptInputFooter,
  PromptInputSubmit,
  PromptInputTextarea,
} from "@/app/components/ai-elements/prompt-input";

const scenarios = {
  overview: {
    image: "/images/assistant/rahiyar-hello.png",
    status: "همراه هوشمند شما در استقرار",
    text: "برای استقرار برنامه‌ات اینجام هستم؛ هر جا نیاز داشتی کنارت می‌مونم.",
    showMethods: true,
  },
  deploy: {
    image: "/images/assistant/rahiyar-book.png",
    status: "راهنمای مرحله‌به‌مرحله",
    text: "داکیومنتیشن دپلوی سرویس مورد نظرت اینجا دست منه.",
    link: "https://docs.liara.ir/paas/deploy/",
  },
  history: {
    image: "/images/assistant/rahiyar-look.png",
    status: "در حال پایش استقرار",
    text: "من در حال مشاهده‌ی فرایند هستم؛ نگران نباش، اگر مشکلی پیش بیاد با هم حلش می‌کنیم.",
  },
  error: {
    image: "/images/assistant/rahiyar-error.png",
    status: "خطا را دیدم",
    text: "استقرار به مشکل خورده، اما نگران نباش؛ جزئیات خطا رو بررسی می‌کنم تا با هم حلش کنیم.",
  },
};

const methods = [
  ["GitHub", "اتصال ریپو و استقرار", GitBranch],
  ["Drag & Drop", "آپلود و استقرار", UploadCloud],
  ["Liara CLI", "استقرار با CLI", Terminal],
];

export function AssistantPanel({ open, onClose, onSelect = () => {}, scenario = "overview", standalone = false }) {
  const { messages, sendMessage, status, error, stop } = useChat();
  const content = scenarios[scenario] || scenarios.overview;

  function handleSubmit({ text }) {
    const value = text.trim();
    if (!value || status === "submitted" || status === "streaming") return;
    sendMessage({ text: value });
  }

  return (
    <section
      aria-label="دستیار استقرار"
      aria-hidden={!open}
      className={cn(
        "fixed bottom-5 left-5 z-50 flex max-h-[calc(100vh-40px)] w-[calc(100%-40px)] origin-bottom-left flex-col overflow-y-auto rounded-[26px] border border-[#78f3c5]/45 bg-[#07141d]/98 p-5 shadow-[0_24px_90px_rgba(0,0,0,.65)] backdrop-blur-2xl transition duration-500 ease-out md:bottom-5 md:left-5 md:z-30 md:max-h-none md:w-[calc(50vw-40px)] md:p-7",
        standalone ? "md:top-5" : "md:top-[154px]",
        open
          ? "assistant-attention scale-100 opacity-100"
          : "pointer-events-none translate-y-8 scale-95 opacity-0",
      )}
    >
      <Button
        aria-label="بستن دستیار"
        title="بستن دستیار"
        variant="ghost"
        size="icon"
        onClick={onClose}
        className="absolute top-4 left-4"
      >
        <X data-icon="inline-start" />
      </Button>

      <div className="grid flex-1 gap-6 md:grid-cols-[minmax(0,1fr)_minmax(220px,.9fr)]">
        <div className="flex min-w-0 flex-col pt-8 md:pt-5">
          <header>
            <div className="flex items-center gap-3">
              <div className="orb relative size-12 rounded-full" />
              <h1 className="text-3xl font-black tracking-tight">
                دستیار <span className="text-[#78f3c5]">رهیار</span>
              </h1>
            </div>
            <p className="mt-4 text-base font-semibold text-[#78f3c5]">
              {content.status}
            </p>
          </header>

          <div className="mt-10 text-sm leading-8 text-slate-200">
            <p>سلام مهدی جان! 👋</p>
            <p>من رهیارم؛ دستیار هوشمند لیارا.</p>
            <p>
              {content.text}
            </p>
            {content.link && (
              <p className="mt-3">
                <a href={content.link} target="_blank" rel="noreferrer" className="font-semibold text-[#78f3c5] underline-offset-4 hover:underline">مشاهده‌ی داکیومنتیشن دپلوی</a>
                <span className="mr-2 text-xs text-slate-400">همچنان در چت پاسخگو هستم.</span>
              </p>
            )}
          </div>

          <Conversation className="mt-5 min-h-48 rounded-2xl border border-white/10 bg-black/20">
            <ConversationContent className="gap-4 p-4">
              {messages.length === 0 && <p className="m-auto text-center text-xs leading-6 text-slate-500">سؤالت درباره‌ی ساخت سرویس، دپلوی یا خطاهای استقرار را از رهیار بپرس.</p>}
              {messages.map((chatMessage, messageIndex) => (
                <Message from={chatMessage.role} key={chatMessage.id}>
                  <MessageContent>
                    {chatMessage.parts.filter((part) => part.type === "text").map((part, partIndex) => (
                      chatMessage.role === "assistant"
                        ? <MessageResponse isAnimating={status === "streaming" && messageIndex === messages.length - 1} key={`${chatMessage.id}-${partIndex}`}>{part.text}</MessageResponse>
                        : <span key={`${chatMessage.id}-${partIndex}`}>{part.text}</span>
                    ))}
                  </MessageContent>
                </Message>
              ))}
              {status === "submitted" && <Message from="assistant"><MessageContent><span className="shimmer">رهیار در حال فکر کردن است...</span></MessageContent></Message>}
            </ConversationContent>
            <ConversationScrollButton />
          </Conversation>

          {error && <p role="alert" className="mt-2 text-xs text-red-400">{error.message || "ارتباط با رهیار برقرار نشد."}</p>}

          <PromptInput onSubmit={handleSubmit} className="mt-3">
            <PromptInputBody><PromptInputTextarea aria-label="پیام به دستیار رهیار" placeholder="از رهیار بپرس..." /></PromptInputBody>
            <PromptInputFooter>
              <span className="text-[11px] text-slate-500">Enter برای ارسال · Shift+Enter خط جدید</span>
              <PromptInputSubmit status={status} onStop={stop} />
            </PromptInputFooter>
          </PromptInput>
        </div>

        <div
          role="img"
          aria-label="تصویر دستیار رهیار"
          className="min-h-72 rounded-2xl bg-[position:center_top] bg-contain bg-no-repeat md:min-h-0 md:bg-[position:center_bottom]"
          style={{
            backgroundImage: `linear-gradient(to top, #07141d 0%, transparent 32%), url(${content.image})`,
          }}
        />
      </div>

      {content.showMethods && <section className="mt-6 rounded-2xl border border-[#78f3c5]/35 bg-[#07131b]/90 p-4">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h2 className="font-bold text-[#78f3c5]">روش‌های استقرار</h2>
            <p className="mt-1 text-xs text-slate-400">
              هر روشی که برات راحت‌تره انتخاب کن.
            </p>
          </div>
          <ShieldCheck className="text-[#78f3c5]" size={20} />
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          {methods.map(([label, description, Icon]) => (
            <button
              key={label}
              onClick={() => onSelect(label)}
              className="group flex min-h-28 flex-col items-center justify-center gap-2 rounded-xl border border-[#78f3c5]/25 bg-white/[.025] p-3 text-center transition hover:-translate-y-1 hover:border-[#78f3c5]/70 hover:bg-[#78f3c5]/5"
            >
              <Icon
                className="text-slate-100 transition group-hover:text-[#78f3c5]"
                size={28}
              />
              <strong dir="ltr" className="text-sm">
                {label}
              </strong>
              <span className="text-[11px] text-slate-400">{description}</span>
              <ArrowLeft className="text-[#78f3c5]" size={14} />
            </button>
          ))}
        </div>
      </section>}

      <p className="mt-4 flex items-center justify-center gap-2 text-xs text-[#78f3c5]">
        <ShieldCheck size={16} /> امنیت، سرعت و پایداری با رهیار
      </p>
    </section>
  );
}
