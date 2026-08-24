import { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Dashboard",
};

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="glass-strong p-8 rounded-2xl border border-primary/20 bg-primary/5">
        <h2 className="text-2xl font-bold tracking-tight mb-2">
          Welcome to AI Trading Analyst
        </h2>
        <p className="text-muted-foreground">
          You are signed in as <span className="text-foreground font-medium">{user?.email}</span>
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="glass p-6 rounded-xl space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-lg">Phase 1 Status</h3>
            <span className="px-2.5 py-0.5 rounded-full bg-primary/20 text-primary text-xs font-medium">
              Complete
            </span>
          </div>
          <p className="text-sm text-muted-foreground">
            The application foundation is in place. You can now authenticate, navigate, and view protected routes.
          </p>
        </div>

        <div className="glass p-6 rounded-xl space-y-3 border-dashed border-2 border-border/50">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-lg">Phase 2: Database</h3>
            <span className="px-2.5 py-0.5 rounded-full bg-muted text-muted-foreground text-xs font-medium">
              Pending
            </span>
          </div>
          <p className="text-sm text-muted-foreground">
            The next phase will establish the Supabase database schema, Row Level Security policies, and user profiles.
          </p>
        </div>
      </div>
    </div>
  );
}
