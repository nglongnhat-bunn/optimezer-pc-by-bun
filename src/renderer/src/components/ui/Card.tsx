import { cn } from "@/lib/utils"

function Card({ children, className, ...props }) {
  return (
    <div
      className={cn(
        "bg-sparkle-card border border-sparkle-border rounded-xl hover:border-sparkle-primary transition group",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  )
}

export default Card
