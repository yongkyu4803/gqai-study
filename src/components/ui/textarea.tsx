import * as React from "react";

import { cn } from "@/lib/utils";

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "flex field-sizing-content min-h-20 w-full rounded-sm border border-input bg-background px-3 py-2.5 text-base leading-6 transition-[border-color,box-shadow,background-color] outline-none placeholder:text-[#9a9a9a] focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-primary/20 disabled:cursor-not-allowed disabled:border-border disabled:bg-muted disabled:text-muted-foreground aria-invalid:border-foreground aria-invalid:ring-3 aria-invalid:ring-foreground/10 md:text-sm",
        className,
      )}
      {...props}
    />
  );
}

export { Textarea };
