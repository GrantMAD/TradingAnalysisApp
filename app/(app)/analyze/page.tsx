import { Metadata } from "next";
import { ChartContainer } from "@/components/charts/ChartContainer";

export const metadata: Metadata = {
  title: "Analyze — AI Trading Analyst",
  description: "View live market charts and run AI-assisted trade analysis.",
};

export default function AnalyzePage() {
  return (
    <div className="flex flex-col gap-4 h-full">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Market Analysis</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Select an instrument and timeframe to view price action. AI analysis arrives in Phase 5.
          </p>
        </div>
      </div>

      {/* Main chart — fills remaining vertical space */}
      <ChartContainer className="flex-1 min-h-[520px]" />
    </div>
  );
}
