import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium ring-offset-background transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-btn-primary text-btn-primary-foreground hover:bg-btn-primary-hover hover:shadow-md active:scale-[0.98]",
        destructive: "bg-btn-destructive text-btn-destructive-foreground hover:bg-btn-destructive-hover hover:shadow-md active:scale-[0.98]",
        outline: "border border-btn-outline-border bg-background hover:bg-btn-outline-hover hover:border-btn-outline-hover-border hover:text-foreground",
        secondary: "bg-btn-secondary text-btn-secondary-foreground hover:bg-btn-secondary-hover",
        ghost: "hover:bg-btn-ghost-hover hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
        hero: "bg-gradient-primary text-primary-foreground hover:shadow-lg active:scale-[0.98] font-semibold",
        "hero-outline": "border-2 border-primary-foreground/30 text-primary-foreground bg-transparent hover:bg-primary-foreground/10 hover:border-primary-foreground/50 font-semibold",
        success: "bg-btn-success text-btn-success-foreground hover:bg-btn-success-hover hover:shadow-md active:scale-[0.98]",
        warning: "bg-btn-warning text-btn-warning-foreground hover:bg-btn-warning-hover hover:shadow-md active:scale-[0.98]",
        accent: "bg-accent text-accent-foreground hover:bg-accent/90 hover:shadow-md active:scale-[0.98]",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-12 rounded-lg px-8 text-base",
        xl: "h-14 rounded-xl px-10 text-lg",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
