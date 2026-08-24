import type { Metadata } from "next";
import "./globals.css";
import { TooltipProvider } from "@/components/ui/tooltip";

export const metadata: Metadata = {
  title: {
    default: "AI Trading Analyst",
    template: "%s | AI Trading Analyst",
  },
  description:
    "Personal AI-assisted market-analysis tool for crypto and forex. Evidence-based trade setups with full transparency.",
  keywords: ["trading", "forex", "crypto", "technical analysis", "AI"],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body className="min-h-screen antialiased">
        <TooltipProvider>{children}</TooltipProvider>
      </body>
    </html>
  );
}
