"use client";

import { useChat } from "@ai-sdk/react";
import { useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  GitBranch,
  GripVertical,
  PanelLeft,
  PictureInPicture2,
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

export function AssistantPanel({
  open,
  onOpen,
  onClose,
  mode = "docked",
  onModeChange,
  onSelect = () => {},
  scenario = "overview",
  standalone = false,
}) {
  const { messages, sendMessage, status, error, stop } = useChat();
  const [anchor, setAnchor] = useState({ x: 24, y: 240 });
  const [viewport, setViewport] = useState({ width: 0, height: 0 });
  const drag = useRef(null);
  const content = scenarios[scenario] || scenarios.overview;

  useEffect(() => {
    function syncViewport() {
      setViewport({ width: window.innerWidth, height: window.innerHeight });
      setAnchor((point) => ({ x: Math.min(point.x, window.innerWidth - 72), y: Math.min(point.y, window.innerHeight - 72) }));
    }
    syncViewport();
    window.addEventListener("resize", syncViewport);
    return () => window.removeEventListener("resize", syncViewport);
  }, []);

  function startDragging(event) {
    drag.current = { id: event.pointerId, startX: event.clientX, startY: event.clientY, x: anchor.x, y: anchor.y, moved: false };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function moveAnchor(event) {
    if (!drag.current || drag.current.id !== event.pointerId) return;
    const dx = event.clientX - drag.current.startX;
    const dy = event.clientY - drag.current.startY;
    if (Math.abs(dx) + Math.abs(dy) > 5) drag.current.moved = true;
    setAnchor({ x: Math.max(12, Math.min(viewport.width - 68, drag.current.x + dx)), y: Math.max(12, Math.min(viewport.height - 68, drag.current.y + dy)) });
  }

  function finishDragging(event) {
    if (!drag.current || drag.current.id !== event.pointerId) return;
    const moved = drag.current.moved;
    drag.current = null;
    if (!moved) open ? onClose() : onOpen();
  }

  const popoverWidth = Math.min(440, Math.max(320, viewport.width - 40));
  const popoverHeight = Math.min(560, Math.max(360, viewport.height - 40));
  const popoverTop = anchor.y + 68 + popoverHeight <= viewport.height - 20
    ? anchor.y + 68
    : Math.max(20, anchor.y - popoverHeight - 12);
  const popoverStyle = mode === "popover" ? {
    left: Math.max(20, Math.min(anchor.x, viewport.width - popoverWidth - 20)),
    top: popoverTop,
    bottom: "auto",
    width: popoverWidth,
    height: popoverHeight,
  } : undefined;

  function handleSubmit({ text }) {
    const value = text.trim();
    if (!value || status === "submitted" || status === "streaming") return;
    sendMessage({ text: value });
  }

  return (<>
    {(!open || mode === "popover") && <button type="button" aria-label={open ? "بستن رهیار" : "بازکردن رهیار"} title="برای جابه‌جایی بکشید" onPointerDown={startDragging} onPointerMove={moveAnchor} onPointerUp={finishDragging} style={{ left: anchor.x, top: anchor.y, touchAction: "none" }} className="orb fixed z-50 grid size-14 cursor-grab place-items-center rounded-full active:cursor-grabbing"><GripVertical size={20} /></button>}
    <section
      aria-label="دستیار استقرار"
      aria-hidden={!open}
      className={cn(
        "fixed bottom-5 left-5 z-50 flex max-h-[calc(100vh-40px)] w-[calc(100%-40px)] origin-bottom-left flex-col overflow-hidden rounded-[26px] border border-[#78f3c5]/45 bg-[#07141d]/98 p-5 shadow-[0_24px_90px_rgba(0,0,0,.65)] backdrop-blur-2xl transition duration-500 ease-out md:bottom-5 md:left-5 md:z-30 md:max-h-none md:w-[calc(50vw-40px)] md:p-7",
        standalone ? "md:top-5" : "md:top-[154px]",
        mode === "popover" && "md:top-auto md:bottom-auto md:left-auto md:w-auto md:p-5",
        open
          ? "assistant-attention scale-100 opacity-100"
          : "pointer-events-none translate-y-8 scale-95 opacity-0",
      )}
      style={popoverStyle}
    >
      <div className="absolute top-4 left-4 flex gap-1"><Button
        aria-label="بستن دستیار"
        title="بستن دستیار"
        variant="ghost"
        size="icon"
        onClick={onClose}
        className="absolute top-4 left-4"
      >
        <X data-icon="inline-start" />
      </Button><Button aria-label={mode === "docked" ? "نمایش پاپ‌اور" : "نمایش نیم‌صفحه"} title={mode === "docked" ? "نمایش پاپ‌اور" : "نمایش نیم‌صفحه"} variant="ghost" size="icon" onClick={() => onModeChange(mode === "docked" ? "popover" : "docked")}>{mode === "docked" ? <PictureInPicture2 data-icon="inline-start" /> : <PanelLeft data-icon="inline-start" />}</Button></div>

      <div className="grid min-h-0 flex-1 gap-6 md:grid-cols-[minmax(0,1fr)_minmax(220px,.9fr)]">
        <div className="flex min-h-0 min-w-0 flex-col overflow-hidden pt-8 md:pt-5">
          <header className="shrink-0">
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

          <div className="mt-6 shrink-0 text-sm leading-7 text-slate-200">
            <p>سلام مهدی جان! 👋</p>
            <p>من رهیارم؛ دستیار هوشمند لیارا.</p>
            <p>{content.text}</p>
            {content.link && (
              <p className="mt-3">
                <a
                  href={content.link}
                  target="_blank"
                  rel="noreferrer"
                  className="font-semibold text-[#78f3c5] underline-offset-4 hover:underline"
                >
                  مشاهده‌ی داکیومنتیشن دپلوی
                </a>
                <span className="mr-2 text-xs text-slate-400">
                  همچنان در چت پاسخگو هستم.
                </span>
              </p>
            )}
          </div>

          <Conversation className="scroll-fade mt-4 min-h-32 flex-1">
            <ConversationContent className="gap-3 px-2 py-8">
              {messages.length === 0 && (
                <p className="m-auto text-center text-xs leading-6 text-slate-500">
                  سؤالت درباره‌ی ساخت سرویس، دپلوی یا خطاهای استقرار را از رهیار
                  بپرس.
                </p>
              )}
              {messages.map((chatMessage, messageIndex) => (
                <Message
                  from={chatMessage.role}
                  key={chatMessage.id}
                  className={
                    chatMessage.role === "user"
                      ? "items-end self-end"
                      : "items-start self-start"
                  }
                >
                  <MessageContent
                    dir="rtl"
                    className={cn(
                      "max-w-[88%] rounded-2xl  px-4 py-3 text-right shadow-lg",
                      chatMessage.role === "user"
                        ? "rounded-br-sm border-[#78f3c5]/25 bg-[#78f3c5]/10"
                        : "rounded-bl-sm border-white/10 bg-[#202b35]",
                    )}
                  >
                    {chatMessage.parts
                      .filter((part) => part.type === "text")
                      .map((part, partIndex) =>
                        chatMessage.role === "assistant" ? (
                          <MessageResponse
                            isAnimating={
                              status === "streaming" &&
                              messageIndex === messages.length - 1
                            }
                            key={`${chatMessage.id}-${partIndex}`}
                          >
                            {part.text}
                          </MessageResponse>
                        ) : (
                          <span key={`${chatMessage.id}-${partIndex}`}>
                            {part.text}
                          </span>
                        ),
                      )}
                  </MessageContent>
                </Message>
              ))}
              {status === "submitted" && (
                <Message from="assistant" className="items-start self-start">
                  <MessageContent
                    dir="rtl"
                    className="rounded-2xl rounded-bl-sm border border-white/10 bg-[#202b35] px-4 py-3"
                  >
                    <span className="shimmer">
                      رهیار در حال فکر کردن است...
                    </span>
                  </MessageContent>
                </Message>
              )}
            </ConversationContent>
            <ConversationScrollButton />
          </Conversation>

          {error && (
            <p role="alert" className="mt-2 text-xs text-red-400">
              {error.message || "ارتباط با رهیار برقرار نشد."}
            </p>
          )}

          <PromptInput onSubmit={handleSubmit} className="mt-3 shrink-0">
            <PromptInputBody>
              <PromptInputTextarea
                aria-label="پیام به دستیار رهیار"
                placeholder="از رهیار بپرس..."
              />
            </PromptInputBody>
            <PromptInputFooter>
              <span className="text-[11px] text-slate-500">
                Enter برای ارسال · Shift+Enter خط جدید
              </span>
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
    </section>
  </>);
}
