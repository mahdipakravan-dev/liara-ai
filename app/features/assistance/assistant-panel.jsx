"use client";

import { useChat } from "@ai-sdk/react";
import { lastAssistantMessageIsCompleteWithApprovalResponses } from "ai";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  ChevronDown,
  GitBranch,
  GripVertical,
  LoaderCircle,
  ShieldCheck,
  Terminal,
  UploadCloud,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { createAgentContext } from "@/lib/agent/context";
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
import {
  Source,
  Sources,
  SourcesContent,
  SourcesTrigger,
} from "@/app/components/ai-elements/sources";
import {
  Confirmation,
  ConfirmationAccepted,
  ConfirmationAction,
  ConfirmationActions,
  ConfirmationRejected,
  ConfirmationRequest,
  ConfirmationTitle,
} from "@/app/components/ai-elements/confirmation";

const scenarios = {
  overview: {
    image: "/images/assistant/rahiyar-hello.png",
    status: "همراه هوشمند شما در استقرار",
    text: "برای استقرار برنامه‌ات اینجام هستم؛ هر جا نیاز داشتی کنارت می‌مونم.",
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

/** Icons for the guided workflow cards; ids come from METHOD_OPTIONS. */
const optionIcons = {
  github: GitBranch,
  "drag-drop": UploadCloud,
  cli: Terminal,
};

/**
 * The guided deployment step, driven by the `data-workflow` part the server
 * streams. Picking a card just sends its label as a message, so the workflow
 * advances through the same path as typing the answer.
 */
function WorkflowStep({ workflow, onPick, disabled }) {
  if (!workflow?.active) return null;
  const { progress, options, optionKind, nextStep, label } = workflow;

  return (
    <div className="mt-3 shrink-0 rounded-2xl border border-[#78f3c5]/25 bg-[#78f3c5]/5 p-3">
      {options.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {options.map((option) => {
            const Icon = optionIcons[option.id];
            return (
              <button
                key={option.id}
                type="button"
                disabled={disabled}
                onClick={() => onPick(option, optionKind)}
                title={option.hint}
                className="flex items-center gap-2 rounded-xl border border-white/10 bg-[#0d1f29] px-3 py-2 text-right text-xs transition hover:border-[#78f3c5]/50 hover:bg-[#78f3c5]/10 disabled:opacity-50"
              >
                {Icon && <Icon size={14} className="shrink-0 text-[#78f3c5]" />}
                <span className="font-medium">{option.label}</span>
                <span className="text-[10px] text-slate-400">
                  {option.hint}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

/** Official Liara docs the answer was grounded in, streamed ahead of the text. */
function MessageSources({ parts, isStreaming = false }) {
  const sources = parts.filter((part) => part.type === "source-url");
  if (sources.length === 0) return null;

  if (isStreaming) {
    return (
      <div className="mt-3 flex items-center gap-2 rounded-xl bg-[#78f3c5]/8 px-3 py-2 text-xs text-[#78f3c5]">
        <LoaderCircle className="size-3.5 animate-spin" />
        <span>
          در حال بررسی {sources.length.toLocaleString("fa-IR")} منبع و
          آماده‌کردن پاسخ...
        </span>
      </div>
    );
  }

  return (
    <Sources className="mt-3 mb-0 text-[#78f3c5]">
      <SourcesTrigger count={sources.length}>
        <p className="font-medium">
          منابع پاسخ ({sources.length.toLocaleString("fa-IR")})
        </p>
        <ChevronDown size={14} />
      </SourcesTrigger>
      <SourcesContent className="text-slate-300">
        {sources.map((source) => (
          <Source
            key={source.sourceId}
            href={source.url}
            title={source.title}
            className="hover:text-[#78f3c5]"
          />
        ))}
      </SourcesContent>
    </Sources>
  );
}

/**
 * The API returns `{ error, code, requestId }`; the SDK surfaces the raw body as
 * the error message. Show the Persian sentence, not the JSON.
 */
function friendlyError(error) {
  if (!error) return null;
  try {
    const parsed = JSON.parse(error.message);
    return parsed.error ?? error.message;
  } catch {
    return error.message || "ارتباط با رهیار برقرار نشد.";
  }
}

const readToolLabels = {
  "tool-get_deployment": "بررسی وضعیت استقرار",
  "tool-get_logs": "خواندن لاگ‌های استقرار",
};

/** Read-only tools run without asking, so the UI just reports that they ran. */
function ReadToolTrace({ part }) {
  const label = readToolLabels[part.type];
  if (!label) return null;

  const done = part.state === "output-available";
  const failed = done && part.output?.ok === false;

  return (
    <p className="mt-2 flex items-center gap-2 text-[11px] text-slate-400">
      <ShieldCheck
        size={12}
        className={failed ? "text-amber-400" : "text-[#78f3c5]"}
      />
      <span className={done ? "" : "shimmer"}>
        {label}
        {failed ? ` — ${part.output.error.message}` : done ? " ✓" : "..."}
      </span>
    </p>
  );
}

/**
 * The write action. Two deliberate stages: Rahyar proposes, the user arms the
 * action, and only the second click sends the approval that lets the server run
 * it. Nothing here executes the tool — it only answers the approval request.
 */
function RetryConfirmation({ part, onRespond }) {
  const [armed, setArmed] = useState(false);
  if (part.type !== "tool-retry_deployment") return null;

  const failed = part.state === "output-available" && part.output?.ok === false;
  const result = part.output?.data;

  return (
    <Confirmation
      approval={part.approval}
      state={part.state}
      className="mt-3 border-[#78f3c5]/30 bg-[#78f3c5]/5 text-right"
    >
      <ConfirmationTitle>
        {armed
          ? "آیا از استقرار مجدد مطمئن هستی؟ یک استقرار تازه شروع می‌شود."
          : `می‌توانم استقرار را دوباره اجرا کنم${part.input?.reason ? ` (${part.input.reason})` : ""}.`}
      </ConfirmationTitle>
      <ConfirmationRequest>
        <ConfirmationActions>
          {armed ? (
            <>
              <ConfirmationAction
                variant="ghost"
                onClick={() => {
                  setArmed(false);
                  onRespond(part.approval.id, false);
                }}
              >
                لغو
              </ConfirmationAction>
              <ConfirmationAction
                onClick={() => onRespond(part.approval.id, true)}
              >
                تأیید
              </ConfirmationAction>
            </>
          ) : (
            <ConfirmationAction onClick={() => setArmed(true)}>
              استقرار مجدد
            </ConfirmationAction>
          )}
        </ConfirmationActions>
      </ConfirmationRequest>
      <ConfirmationAccepted>
        <p className="text-xs text-[#78f3c5]">
          {failed
            ? `اجرای دوباره ممکن نشد: ${part.output.error.message}`
            : result
              ? `استقرار تازه با شناسه ${result.id} شروع شد (نسخه ${result.version}).`
              : "در حال شروع استقرار تازه..."}
        </p>
      </ConfirmationAccepted>
      <ConfirmationRejected>
        <p className="text-xs text-slate-400">
          استقرار مجدد لغو شد؛ چیزی تغییر نکرد.
        </p>
      </ConfirmationRejected>
    </Confirmation>
  );
}

function MessageTools({ parts, onRespond }) {
  return parts
    .filter(
      (part) => typeof part.type === "string" && part.type.startsWith("tool-"),
    )
    .map((part) =>
      part.type === "tool-retry_deployment" ? (
        <RetryConfirmation
          key={part.toolCallId}
          part={part}
          onRespond={onRespond}
        />
      ) : (
        <ReadToolTrace key={part.toolCallId} part={part} />
      ),
    );
}

export function AssistantPanel({
  open,
  onOpen,
  onClose,
  mode = "docked",
  onSelect = () => {},
  scenario = "overview",
  standalone = false,
  context,
  autoMessage,
}) {
  // Approving a write action resumes the paused run automatically.
  const {
    messages,
    sendMessage,
    status,
    error,
    stop,
    addToolApprovalResponse,
  } = useChat({
    sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithApprovalResponses,
  });
  const [anchor, setAnchor] = useState({ x: 24, y: 240 });
  // Latest snapshot the server streamed. Living in the message history is what
  // keeps the guided flow alive across turns.
  const workflow = useMemo(() => {
    for (let index = messages.length - 1; index >= 0; index -= 1) {
      const part = messages[index].parts?.findLast?.(
        (item) => item.type === "data-workflow",
      );
      if (part) return part.data;
    }
    return null;
  }, [messages]);
  const [viewport, setViewport] = useState({ width: 0, height: 0 });
  const drag = useRef(null);
  const sentAutoMessages = useRef(new Set());
  const content = scenarios[scenario] || scenarios.overview;

  useEffect(() => {
    function syncViewport() {
      setViewport({ width: window.innerWidth, height: window.innerHeight });
      setAnchor((point) => ({
        x: Math.min(point.x, window.innerWidth - 72),
        y: Math.min(point.y, window.innerHeight - 72),
      }));
    }
    syncViewport();
    window.addEventListener("resize", syncViewport);
    return () => window.removeEventListener("resize", syncViewport);
  }, []);

  function startDragging(event) {
    drag.current = {
      id: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      x: anchor.x,
      y: anchor.y,
      moved: false,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function moveAnchor(event) {
    if (!drag.current || drag.current.id !== event.pointerId) return;
    const dx = event.clientX - drag.current.startX;
    const dy = event.clientY - drag.current.startY;
    if (Math.abs(dx) + Math.abs(dy) > 5) drag.current.moved = true;
    setAnchor({
      x: Math.max(12, Math.min(viewport.width - 68, drag.current.x + dx)),
      y: Math.max(12, Math.min(viewport.height - 68, drag.current.y + dy)),
    });
  }

  function finishDragging(event) {
    if (!drag.current || drag.current.id !== event.pointerId) return;
    const moved = drag.current.moved;
    drag.current = null;
    if (!moved) open ? onClose() : onOpen();
  }

  const popoverWidth = Math.min(440, Math.max(320, viewport.width - 40));
  const popoverHeight = Math.min(560, Math.max(360, viewport.height - 40));
  const popoverTop =
    anchor.y + 68 + popoverHeight <= viewport.height - 20
      ? anchor.y + 68
      : Math.max(20, anchor.y - popoverHeight - 12);
  const popoverStyle =
    mode === "popover"
      ? {
          left: Math.max(
            20,
            Math.min(anchor.x, viewport.width - popoverWidth - 20),
          ),
          top: popoverTop,
          bottom: "auto",
          width: popoverWidth,
          height: popoverHeight,
        }
      : undefined;

  const busy = status === "submitted" || status === "streaming";
  const latestMessage = messages.at(-1);
  const latestIsAssistant = latestMessage?.role === "assistant";
  const latestHasText =
    latestIsAssistant &&
    latestMessage.parts?.some(
      (part) => part.type === "text" && part.text?.trim(),
    );
  const latestHasSources =
    latestIsAssistant &&
    latestMessage.parts?.some((part) => part.type === "source-url");

  useEffect(() => {
    if (!autoMessage?.id || !autoMessage.text || busy || sentAutoMessages.current.has(autoMessage.id)) return;
    sentAutoMessages.current.add(autoMessage.id);
    onOpen();
    sendMessage(
      { text: autoMessage.text },
      {
        body: {
          context: createAgentContext({ scenario, ...context }),
          workflow,
        },
      },
    );
  }, [autoMessage, busy, context, onOpen, scenario, sendMessage, workflow]);

  function send(value) {
    sendMessage(
      { text: value },
      {
        body: {
          context: createAgentContext({ scenario, ...context }),
          workflow,
        },
      },
    );
  }

  function handleSubmit({ text }) {
    const value = text.trim();
    if (!value || busy) return;
    send(value);
  }

  function handleWorkflowPick(option, kind) {
    if (busy) return;
    if (kind === "method") onSelect(option.label);
    send(option.label);
  }

  return (
    <>
      {(!open || mode === "popover") && (
        <button
          type="button"
          aria-label={open ? "بستن رهیار" : "بازکردن رهیار"}
          title="برای جابه‌جایی بکشید"
          onPointerDown={startDragging}
          onPointerMove={moveAnchor}
          onPointerUp={finishDragging}
          style={{ left: anchor.x, top: anchor.y, touchAction: "none" }}
          className="orb fixed z-50 grid size-14 cursor-grab place-items-center rounded-full active:cursor-grabbing "
        >
          <GripVertical size={20} />
        </button>
      )}
      <section
        aria-label="دستیار استقرار"
        aria-hidden={!open}
        className={cn(
          "fixed bottom-5 left-5 z-50 flex max-h-[calc(100vh-40px)] w-[calc(100%-40px)] origin-bottom-left flex-col overflow-hidden rounded-[26px] border border-[#78f3c5]/45 bg-[#07141d]/98 p-5 shadow-[0_24px_90px_rgba(0,0,0,.65)] backdrop-blur-2xl transition duration-500 ease-out md:bottom-5 md:left-5 md:z-30 md:max-h-none md:w-[calc(50vw-40px)] md:p-7",
          standalone ? "md:top-5" : "md:top-[154px]",
          mode === "popover" &&
            "md:top-auto md:bottom-auto md:left-auto md:w-auto md:p-5",
          open
            ? "assistant-attention scale-100 opacity-100"
            : "pointer-events-none translate-y-8 scale-95 opacity-0",
        )}
        style={popoverStyle}
      >
        <Button
          aria-label="بستن دستیار"
          title="بستن دستیار"
          variant="ghost"
          size="icon"
          onClick={onClose}
          className="absolute top-4 left-4 z-10"
        >
          <X data-icon="inline-start" />
        </Button>

        <div className="grid min-h-0 flex-1 gap-6 md:grid-cols-[minmax(0,1fr)_minmax(220px,.9fr)]">
          <div className="flex min-h-0 min-w-0 flex-col overflow-hidden pt-8 md:pt-5">
            <header className="shrink-0 border-b border-white/8 pb-4">
              <div className="flex items-center gap-3">
                <div className="orb relative size-10 rounded-full mr-6" />
                <div>
                  <h1 className="text-sm font-bold">رهیار</h1>
                  <p className="mt-0.5 flex items-center gap-1.5 text-[11px] text-slate-400">
                    <span
                      className={cn(
                        "size-1.5 rounded-full",
                        busy ? "animate-pulse bg-amber-400" : "bg-[#78f3c5]",
                      )}
                    />
                    {busy ? "در حال پاسخ‌گویی" : "آنلاین"}
                  </p>
                </div>
              </div>
            </header>

            <Conversation className="assistant-scrollbars-hidden scroll-fade mt-2 min-h-32 flex-1">
              <ConversationContent className="gap-3 px-2 py-8">
                {messages.length === 0 && (
                  <div className="m-auto flex w-full max-w-sm flex-col gap-2 px-2">
                    <p className="mb-1 text-center text-xs text-slate-400">
                      از کجا شروع کنیم؟
                    </p>
                    {[
                      "وضعیت آخرین استقرار را بررسی کن",
                      "خطای استقرار را از روی لاگ‌ها پیدا کن",
                    ].map((suggestion) => (
                      <button
                        key={suggestion}
                        type="button"
                        onClick={() => send(suggestion)}
                        className="rounded-xl border border-white/10 bg-white/[.03] px-3 py-2.5 text-right text-xs text-slate-200 transition hover:border-[#78f3c5]/40 hover:bg-[#78f3c5]/8"
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
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
                      {chatMessage.role === "assistant" &&
                        status !== "streaming" &&
                        !chatMessage.parts.some(
                          (part) =>
                            (part.type === "text" && part.text) ||
                            part.type?.startsWith("tool-"),
                        ) && (
                          <span className="text-slate-400">
                            پاسخ رهیار ناتمام ماند. دوباره بپرس.
                          </span>
                        )}
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
                      <MessageTools
                        parts={chatMessage.parts}
                        onRespond={(id, approved) =>
                          addToolApprovalResponse({ id, approved })
                        }
                      />
                      <MessageSources
                        parts={chatMessage.parts}
                        isStreaming={
                          status === "streaming" &&
                          messageIndex === messages.length - 1
                        }
                      />
                    </MessageContent>
                  </Message>
                ))}
                {busy && !latestHasText && !latestHasSources && (
                  <Message from="assistant" className="items-start self-start">
                    <MessageContent
                      dir="rtl"
                      className="rounded-2xl rounded-bl-sm border border-white/10 bg-[#202b35] px-4 py-3"
                    >
                      <span className="flex items-center gap-2 text-slate-300">
                        <LoaderCircle className="size-4 animate-spin text-[#78f3c5]" />
                        در حال فکر کردن...
                      </span>
                    </MessageContent>
                  </Message>
                )}
              </ConversationContent>
              <ConversationScrollButton />
            </Conversation>

            {error && (
              <p role="alert" className="mt-2 text-xs text-red-400">
                {friendlyError(error)}
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
                <span aria-live="polite" className="text-[11px] text-slate-500">
                  {busy ? "رهیار در حال نوشتن پاسخ است" : ""}
                </span>
                <PromptInputSubmit status={status} onStop={stop} />
              </PromptInputFooter>
            </PromptInput>
          </div>

          <div
            role="img"
            aria-label="تصویر دستیار رهیار"
            className="hidden min-h-72 rounded-2xl bg-[position:center_top] bg-contain bg-no-repeat md:block md:min-h-0 md:bg-[position:center_bottom]"
            style={{
              backgroundImage: `linear-gradient(to top, #07141d 0%, transparent 32%), url(${content.image})`,
            }}
          />
        </div>
      </section>
    </>
  );
}
