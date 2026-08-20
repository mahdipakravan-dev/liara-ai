import { ArrowLeft, CheckCircle2, Sparkles } from "lucide-react";

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
import App from "./app.page";

const features = [
  "کامپوننت‌های قابل سفارشی‌سازی",
  "توکن‌های رنگی سازگار با حالت تاریک",
  "ساختار دسترس‌پذیر و تایپ‌شده",
];

export default function HomePage() {
  return <App />;
}
