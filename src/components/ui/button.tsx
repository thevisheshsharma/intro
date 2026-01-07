import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-xl text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-berri-raspberry/20 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        // Primary - Raspberry filled
        default: "bg-berri-raspberry hover:bg-berri-raspberry/90 text-white shadow-md shadow-berri-raspberry/25 hover:shadow-lg",
        primary: "bg-berri-raspberry hover:bg-berri-raspberry/90 text-white shadow-md shadow-berri-raspberry/25 hover:shadow-lg",

        // Secondary - Light background
        secondary: "bg-gray-100 text-gray-900 hover:bg-gray-200",

        // Ghost - Transparent
        ghost: "text-gray-600 hover:text-gray-900 hover:bg-gray-100",

        // Outline - Border only
        outline: "border border-gray-200 bg-white text-gray-900 hover:bg-gray-50 hover:border-gray-300",

        // Destructive - Red
        destructive: "bg-red-500 hover:bg-red-600 text-white shadow-md shadow-red-500/25",

        // Link style
        link: "text-berri-raspberry underline-offset-4 hover:underline",

        // Brand variants - Light mode dashboard
        brand: "bg-berri-raspberry hover:bg-berri-raspberry/90 text-white shadow-md shadow-berri-raspberry/25 hover:shadow-lg",
        brandAction: "bg-berri-raspberry hover:bg-berri-raspberry/90 text-white shadow-md shadow-berri-raspberry/25 hover:shadow-lg hover:scale-[1.02] active:scale-[0.98]",
        brandOutline: "bg-transparent text-berri-raspberry border border-berri-raspberry/30 hover:bg-berri-raspberry/5 hover:border-berri-raspberry",
        brandGhost: "text-berri-raspberry hover:bg-berri-raspberry/10",
        brandAccent: "bg-berri-coral hover:bg-berri-coral/90 text-white shadow-md shadow-berri-coral/25",

        // Subtle variants
        subtle: "bg-berri-raspberry/10 text-berri-raspberry hover:bg-berri-raspberry/20",
        subtleGray: "bg-gray-100 text-gray-700 hover:bg-gray-200",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-lg px-3 text-xs",
        lg: "h-12 rounded-xl px-6 text-base",
        xl: "h-14 rounded-xl px-8 text-base",
        icon: "h-10 w-10 rounded-full",
        iconSm: "h-8 w-8 rounded-full",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
  VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
