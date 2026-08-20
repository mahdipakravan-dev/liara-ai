import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva } from 'class-variance-authority';
import { cn } from '../../lib/utils';

const buttonVariants = cva(
  'inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-bold transition-all outline-none focus-visible:ring-2 focus-visible:ring-[#78f3c5] focus-visible:ring-offset-2 focus-visible:ring-offset-[#18191f] disabled:pointer-events-none disabled:opacity-40 [&_svg]:pointer-events-none [&_svg]:size-4',
  {
    variants: {
      variant: {
        default: 'bg-gradient-to-l from-[#78f3c5] to-[#2bc3ee] text-[#10211d] shadow-[0_10px_30px_rgba(50,203,216,.12)] hover:-translate-y-0.5 hover:brightness-105',
        secondary: 'border border-white/10 bg-[#292b35] text-slate-100 hover:bg-white/10',
        outline: 'border border-[#78f3c5]/60 bg-transparent text-[#78f3c5] hover:bg-[#78f3c5]/8',
        ghost: 'text-slate-300 hover:bg-white/7 hover:text-white',
      },
      size: {
        default: 'h-10 px-4 py-2',
        sm: 'h-9 rounded-lg px-3',
        lg: 'h-12 px-8',
        icon: 'size-10 p-0',
      },
    },
    defaultVariants: { variant: 'default', size: 'default' },
  }
);

const Button = React.forwardRef(function Button(
  { className, variant, size, asChild = false, ...props },
  ref
) {
  const Comp = asChild ? Slot : 'button';
  return <Comp ref={ref} className={cn(buttonVariants({ variant, size, className }))} {...props} />;
});

Button.displayName = 'Button';

export { Button, buttonVariants };
