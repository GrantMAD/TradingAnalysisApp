import { Metadata } from "next";
import { LoginForm } from "@/components/auth/LoginForm";

export const metadata: Metadata = {
  title: "Sign In",
};

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold tracking-tight mb-2 text-foreground">
            Welcome back
          </h1>
          <p className="text-sm text-muted-foreground">
            Sign in to your AI Trading Analyst account
          </p>
        </div>
        
        <div className="glass-strong p-8 rounded-2xl shadow-xl shadow-black/20">
          <LoginForm />
        </div>
      </div>
    </div>
  );
}
