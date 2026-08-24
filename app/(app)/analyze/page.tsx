import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Analyze",
};

export default function AnalyzePage() {
  return (
    <div className="max-w-4xl mx-auto">
      <div className="glass p-12 rounded-2xl flex flex-col items-center justify-center text-center min-h-[400px] border-dashed border-2 border-border/50">
        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-primary mb-6">
          <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21.21 15.89A10 10 0 1 1 8 2.83"/><path d="M22 12A10 10 0 0 0 12 2v10z"/></svg>
        </div>
        <h2 className="text-2xl font-bold tracking-tight mb-3">Market Analysis</h2>
        <p className="text-muted-foreground max-w-md">
          This feature is scheduled for Phase 5 (AI Analysis Engine) and Phase 6 (Analysis UI). Check the project specification for details.
        </p>
      </div>
    </div>
  );
}
