import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-medium transition-all duration-300 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:ring-offset-2 focus:ring-offset-slate-900 transform hover:scale-105 active:scale-95",
  {
    variants: {
      variant: {
        default:
          "bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white shadow-lg hover:shadow-xl hover:shadow-blue-500/25",
        destructive:
          "bg-gradient-to-r from-red-600 to-pink-600 hover:from-red-500 hover:to-pink-500 text-white shadow-lg hover:shadow-xl hover:shadow-red-500/25",
        outline:
          "border border-slate-700/50 bg-slate-800/50 hover:bg-slate-700/50 text-slate-300 shadow-lg hover:shadow-xl backdrop-blur-sm",
        secondary:
          "bg-gradient-to-r from-slate-700 to-slate-600 hover:from-slate-600 hover:to-slate-500 text-white shadow-lg hover:shadow-xl",
        ghost:
          "hover:bg-slate-800/50 text-slate-300 hover:text-slate-100",
        link: 
          "text-blue-400 underline-offset-4 hover:underline hover:text-blue-300",
        success:
          "bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-lg hover:shadow-xl hover:shadow-emerald-500/25",
      },
      size: {
        default: "h-11 px-6 py-3 has-[>svg]:px-5",
        sm: "h-9 rounded-lg gap-1.5 px-4 has-[>svg]:px-3.5 text-xs",
        lg: "h-12 rounded-xl px-8 has-[>svg]:px-7 text-base",
        icon: "size-11",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot : "button"

  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
