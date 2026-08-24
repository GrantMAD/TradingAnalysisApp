import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex h-screen w-full flex-col items-center justify-center bg-background p-4 text-center">
      <div className="glass-strong p-12 rounded-2xl max-w-md w-full border-primary/10 space-y-6">
        <h1 className="text-6xl font-bold tracking-tighter text-primary/80">404</h1>
        
        <div>
          <h2 className="text-xl font-semibold tracking-tight mb-2">Page not found</h2>
          <p className="text-sm text-muted-foreground">
            The market data you are looking for does not exist or has been moved.
          </p>
        </div>
        
        <div className="pt-4">
          <Button className="w-full bg-primary text-primary-foreground hover:bg-primary/90 glow-cyan">
            <Link href="/dashboard" className="w-full">
              Return to Dashboard
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
