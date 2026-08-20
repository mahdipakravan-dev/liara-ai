import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { convertToModelMessages, streamText } from "ai";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

const MAX_MESSAGES = 30;
const MAX_MESSAGE_LENGTH = 4_000;

const systemPrompt = `
تو «رهیار»، دستیار فارسی‌زبان و صمیمی کنسول ابری لیارا هستی.
به کاربر برای ساخت سرویس، استقرار، بررسی لاگ و رفع خطا کمک کن.
پاسخ‌ها را دقیق، کوتاه و عملی نگه دار و اگر اطلاعات کافی نداری، سؤال روشن بپرس.
هرگز کلید API، متغیر محیطی یا اطلاعات محرمانه درخواست نکن و ادعا نکن عملیاتی را واقعاً اجرا کرده‌ای.
`.trim();

function getConfig() {
  const baseURL = process.env.LIARA_AI_BASE_URL?.replace(/\/$/, "");
  const apiKey = process.env.LIARA_AI_API_KEY;
  const model = process.env.LIARA_AI_MODEL;

  if (!baseURL || !apiKey || !model) return null;
  return { baseURL, apiKey, model };
}

export async function POST(request) {
  const config = getConfig();
  if (!config) {
    return NextResponse.json(
      { error: "تنظیمات سرویس هوش مصنوعی لیارا کامل نیست." },
      { status: 503 },
    );
  }

  const body = await request.json().catch(() => null);
  if (!Array.isArray(body?.messages) || body.messages.length === 0) {
    return NextResponse.json({ error: "پیام معتبر ارسال نشده است." }, { status: 400 });
  }
  if (JSON.stringify(body.messages).length > MAX_MESSAGES * MAX_MESSAGE_LENGTH) {
    return NextResponse.json({ error: "تاریخچه‌ی گفتگو بیش از حد مجاز است." }, { status: 413 });
  }

  try {
    const liara = createOpenAICompatible({
      name: "liara",
      baseURL: config.baseURL,
      apiKey: config.apiKey,
    });

    const result = streamText({
      model: liara.chatModel(config.model),
      system: systemPrompt,
      messages: await convertToModelMessages(body.messages.slice(-MAX_MESSAGES)),
      timeout: 45_000,
      maxRetries: 1,
    });

    return result.toUIMessageStreamResponse({
      onError: (error) => {
        console.error("Liara AI stream failed", error instanceof Error ? error.message : error);
        return "ارتباط با رهیار برقرار نشد. کمی بعد دوباره تلاش کنید.";
      },
    });
  } catch (error) {
    console.error("Liara AI request failed", error instanceof Error ? error.message : error);
    return NextResponse.json({ error: "ارتباط با رهیار برقرار نشد. کمی بعد دوباره تلاش کنید." }, { status: 502 });
  }
}
