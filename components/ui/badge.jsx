import * as React from "react";
import { cva } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium",
  {
    variants: {
      variant: {
        default: "border-transparent bg-[#78f3c5] text-[#10211d]",
        secondary: "border-white/10 bg-white/5 text-slate-200",
        outline: "border-[#78f3c5]/30 bg-[#78f3c5]/5 text-[#78f3c5]",
        warning: "border-amber-300/20 bg-amber-300/10 text-amber-300",
      },
    },
    defaultVariants: { variant: "default" },
  },
);

function Badge({ className, variant, ...props }) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
