"use client";

import { useEffect, useRef } from "react";

export function TradingViewWidget() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const container = containerRef.current;
    container.innerHTML = "";

    const iframe = document.createElement("iframe");
    const params = new URLSearchParams({
      symbol: "BINANCE:BTCUSDT",
      interval: "D",
      theme: "dark",
      style: "1",
      locale: "br",
      toolbar_bg: "#f1f3f6",
      enable_publishing: "false",
      hide_top_toolbar: "false",
      hide_legend: "false",
      save_image: "false",
      studies: '["MASimple@tv-basicstudies|21","MASimple@tv-basicstudies|50","MASimple@tv-basicstudies|200"]',
      width: "100%",
      height: "500",
    });

    iframe.src = `https://www.tradingview.com/widgetembed/?${params.toString()}`;
    iframe.style.width = "100%";
    iframe.style.height = "500px";
    iframe.style.border = "none";
    iframe.style.borderRadius = "0.5rem";
    iframe.allowFullscreen = true;

    container.appendChild(iframe);

    return () => {
      container.innerHTML = "";
    };
  }, []);

  return (
    <div ref={containerRef} className="w-full rounded-lg overflow-hidden border bg-card" />
  );
}
