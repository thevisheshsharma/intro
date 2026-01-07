import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        destructive:
          "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        outline:
          "border border-input bg-background hover:bg-accent hover:text-accent-foreground",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
        // Brand variants for marketing - warm raspberry primary
        brand: "bg-berri-raspberry hover:bg-berri-raspberry/90 text-white shadow-lg shadow-berri-raspberry/20 hover:shadow-xl hover:shadow-berri-raspberry/30 transition-all",
        brandAction: "bg-berri-raspberry hover:bg-berri-raspberry/90 text-white shadow-lg shadow-berri-raspberry/20 hover:shadow-xl hover:shadow-berri-raspberry/30 transition-all",
        brandAccent: "bg-berri-amber hover:bg-berri-gold text-white shadow-lg shadow-berri-amber/20 hover:shadow-xl hover:shadow-berri-gold/30 transition-all",
        brandOutline: "bg-transparent text-berri-raspberry border border-berri-raspberry hover:bg-berri-raspberry hover:text-white transition-all",
        brandOutlineAccent: "bg-transparent text-berri-amber border border-berri-amber hover:bg-berri-amber hover:text-white transition-all",
        // Dark mode variants for dashboard
        brandActionDark: "bg-gradient-to-r from-berri-raspberry to-berri-coral hover:from-berri-raspberry/90 hover:to-berri-coral/90 text-white shadow-lg shadow-berri-raspberry/30 hover:shadow-xl hover:shadow-berri-raspberry/40 transition-all",
        brandAccentDark: "bg-gradient-to-r from-berri-amber to-berri-gold hover:from-berri-amber/90 hover:to-berri-gold/90 text-white shadow-lg shadow-berri-amber/30 hover:shadow-xl hover:shadow-berri-gold/40 transition-all",
        brandOutlineDark: "bg-transparent text-berri-raspberry border border-berri-raspberry/50 hover:bg-berri-raspberry/10 hover:border-berri-raspberry transition-all",
        brandGhost: "bg-white/5 text-white hover:bg-white/10 border border-white/10 hover:border-white/20 transition-all",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-11 rounded-md px-8",
        icon: "h-10 w-10",
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
