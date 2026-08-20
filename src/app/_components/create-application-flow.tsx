"use client";

import { ArrowLeft, Check, Info, Plus } from "lucide-react";
import { useEffect, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

import { plans, runtimes } from "./deployment-data";

type Props = { onCancel: () => void; onComplete: () => void };

export function CreateApplicationFlow({ onCancel, onComplete }: Props) {
  const [step, setStep] = useState<1 | 2>(1);
  const [runtime, setRuntime] = useState("Node.js");
  const [name, setName] = useState("negah-store");
  const [plan, setPlan] = useState(1);

  useEffect(() => {
    const close = (event: KeyboardEvent) =>
      event.key === "Escape" && onCancel();
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, [onCancel]);

  return (
    <main className="min-h-dvh bg-background px-5 py-10 lg:py-16">
      <div className="mx-auto flex max-w-6xl flex-col gap-8">
        <Button
          variant="ghost"
          className="self-start"
          onClick={step === 1 ? onCancel : () => setStep(1)}
        >
          <ArrowLeft data-icon="inline-start" />
          {step === 1 ? "بازگشت" : "مرحله قبل"}
        </Button>
        <header>
          <Badge variant="outline">مرحله {step} از ۲</Badge>
          <h1 className="mt-3 text-2xl font-bold">
            {step === 1 ? "ساخت برنامه جدید" : "انتخاب منابع برنامه"}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {step === 1
              ? "Runtime و شناسه برنامه را مشخص کنید."
              : "پلن متناسب با نیاز برنامه را انتخاب کنید."}
          </p>
        </header>
        {step === 1 ? (
          <>
            <section aria-labelledby="runtime-heading">
              <h2 id="runtime-heading" className="sr-only">
                انتخاب Runtime
              </h2>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-7">
                {runtimes.map(([label, mark]) => (
                  <Button
                    key={label}
                    aria-pressed={runtime === label}
                    variant={runtime === label ? "default" : "outline"}
                    className="h-28 flex-col"
                    onClick={() => setRuntime(label)}
                  >
                    <span className="text-xl font-black">{mark}</span>
                    {label}
                  </Button>
                ))}
              </div>
            </section>
            <Card>
              <CardHeader>
                <CardTitle>شناسه برنامه</CardTitle>
                <CardDescription>
                  از حروف انگلیسی کوچک، عدد و خط تیره استفاده کنید.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div
                  dir="ltr"
                  className="flex items-center rounded-md border bg-background focus-within:ring-2 focus-within:ring-ring"
                >
                  <span className="px-3 text-sm text-muted-foreground">
                    https://
                  </span>
                  <input
                    aria-label="شناسه برنامه"
                    value={name}
                    onChange={(event) =>
                      setName(event.target.value.replace(/[^a-z0-9-]/g, ""))
                    }
                    className="h-10 min-w-0 flex-1 bg-transparent px-2 outline-none"
                  />
                  <span className="px-3 text-sm text-muted-foreground">
                    .liara.run
                  </span>
                </div>
              </CardContent>
              <CardFooter>
                <Button variant="outline">
                  <Plus data-icon="inline-start" />
                  ساخت شبکه خصوصی
                </Button>
              </CardFooter>
            </Card>
            <Button
              size="lg"
              className="self-end"
              disabled={!name}
              onClick={() => setStep(2)}
            >
              انتخاب پلن
            </Button>
          </>
        ) : (
          <>
            <div className="grid gap-3 sm:grid-cols-2">
              <Card className="gap-2 py-4">
                <CardHeader>
                  <CardDescription className="flex items-center gap-2">
                    <Info />
                    موقعیت تمامی پلن‌ها ایران است.
                  </CardDescription>
                </CardHeader>
              </Card>
              <Card className="gap-2 py-4">
                <CardHeader>
                  <CardDescription className="flex items-center gap-2">
                    <Info />
                    ترافیک تمامی پلن‌ها نامحدود است.
                  </CardDescription>
                </CardHeader>
              </Card>
            </div>
            <section
              aria-label="پلن‌ها"
              className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
            >
              {plans.map((item, index) => (
                <Card
                  key={item.name}
                  className={cn(plan === index && "ring-2 ring-ring")}
                >
                  <CardHeader>
                    <CardTitle>{item.name}</CardTitle>
                    <CardDescription>
                      {item.monthly} تومان / ماه
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <dl className="grid grid-cols-2 gap-3 text-sm">
                      <dt className="text-muted-foreground">RAM</dt>
                      <dd>{item.ram}</dd>
                      <dt className="text-muted-foreground">vCPU</dt>
                      <dd>{item.cpu}</dd>
                      <dt className="text-muted-foreground">Disk</dt>
                      <dd>{item.disk}</dd>
                      <dt className="text-muted-foreground">ساعتی</dt>
                      <dd>{item.hourly}</dd>
                    </dl>
                  </CardContent>
                  <CardFooter>
                    <Button
                      variant={plan === index ? "default" : "outline"}
                      className="w-full"
                      onClick={() => setPlan(index)}
                    >
                      {plan === index && <Check data-icon="inline-start" />}
                      {plan === index ? "انتخاب‌شده" : "انتخاب پلن"}
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </section>
            <Card>
              <CardHeader>
                <CardTitle>کد تخفیف</CardTitle>
                <CardDescription>
                  کد را وارد و قیمت نهایی را بررسی کنید.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <input
                  dir="ltr"
                  aria-label="کد تخفیف"
                  placeholder="LIARA-OFF"
                  className="h-10 w-full rounded-md border bg-background px-3 outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              </CardContent>
            </Card>
            <Button
              size="lg"
              className="self-center px-14"
              onClick={onComplete}
            >
              ایجاد برنامه
            </Button>
          </>
        )}
      </div>
    </main>
  );
}
