"use client";

import { useTheme } from "next-themes";
import { Toaster as Sonner, type ToasterProps } from "sonner";
import { GqaiIcon } from "@/components/common/gqai-icon";

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme();

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      icons={{
        success: <GqaiIcon name="status-success" className="size-5" />,
        info: <GqaiIcon name="status-info" className="size-5" />,
        warning: <GqaiIcon name="status-warning" className="size-5" />,
        error: <GqaiIcon name="status-error" className="size-5" />,
        loading: (
          <GqaiIcon name="status-loading" className="size-5 animate-spin" />
        ),
      }}
      style={
        {
          "--normal-bg": "var(--popover)",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "var(--border)",
          "--border-radius": "8px",
        } as React.CSSProperties
      }
      toastOptions={{
        classNames: {
          toast: "cn-toast",
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
