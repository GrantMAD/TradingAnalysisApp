import { Metadata } from "next";
import { SignupForm } from "@/components/auth/SignupForm";

export const metadata: Metadata = {
  title: "Sign Up",
};

export default function SignupPage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold tracking-tight mb-2 text-foreground">
            Create an account
          </h1>
          <p className="text-sm text-muted-foreground">
            Get started with AI Trading Analyst
          </p>
        </div>
        
        <div className="glass-strong p-8 rounded-2xl shadow-xl shadow-black/20">
          <SignupForm />
        </div>
      </div>
    </div>
  );
}
