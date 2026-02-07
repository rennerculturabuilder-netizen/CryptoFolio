"use client";

import { Toaster as SonnerToaster } from "sonner";

export function Toaster() {
  return (
    <SonnerToaster
      theme="dark"
      position="bottom-right"
      toastOptions={{
        style: {
          background: "hsl(222 47% 8% / 0.9)",
          border: "1px solid hsl(217 33% 16% / 0.6)",
          color: "hsl(210 40% 98%)",
          backdropFilter: "blur(12px)",
        },
      }}
      richColors
      closeButton
    />
  );
}
