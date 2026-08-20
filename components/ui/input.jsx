import * as React from "react";

import { cn } from "@/lib/utils";

const Input = React.forwardRef(function Input({ className, type, ...props }, ref) {
  return (
    <input
      ref={ref}
      type={type}
      className={cn(
        "flex h-11 w-full rounded-lg border border-white/10 bg-black/10 px-4 py-2 text-sm outline-none transition placeholder:text-slate-500 focus-visible:border-[#78f3c5] focus-visible:ring-2 focus-visible:ring-[#78f3c5]/20 disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    />
  );
});

Input.displayName = "Input";

export { Input };
