"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Optionally log the error to an error reporting service
    console.error(error);
  }, [error]);

  return (
    <div className="flex h-screen w-full flex-col items-center justify-center bg-background p-4 text-center">
      <div className="glass-strong p-8 rounded-2xl max-w-md w-full border-destructive/20 space-y-6">
        <div className="w-16 h-16 rounded-full bg-destructive/10 text-destructive flex items-center justify-center mx-auto">
          <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
        </div>
        
        <div>
          <h2 className="text-xl font-bold tracking-tight mb-2">Something went wrong!</h2>
          <p className="text-sm text-muted-foreground">
            {error.message || "An unexpected error occurred while rendering this page."}
          </p>
        </div>
        
        <Button
          onClick={() => reset()}
          variant="outline"
          className="w-full border-primary/20 hover:bg-primary/10 hover:text-primary"
        >
          Try again
        </Button>
      </div>
    </div>
  );
}
