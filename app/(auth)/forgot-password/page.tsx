import { Suspense } from "react";
import Link from "next/link";
import { AuthCarousel } from "@/components/auth/auth-carousel";
import ForgotPasswordForm from "@/components/auth/forgot-password-form";

export default function ForgotPasswordPage() {
  return (
    <div className="grid h-screen md:grid-cols-2">
      {/* Form Side */}
      <div className="flex flex-col items-center justify-center p-6 md:p-10 bg-background">
        <div className="w-full max-w-md space-y-8">
          <div className="flex flex-col space-y-2 text-center">
            <h1 className="text-3xl font-bold tracking-tight">Forgot Password</h1>
            <p className="text-muted-foreground">
              Enter your email to receive a reset link
            </p>
          </div>
          
          <Suspense fallback={<div className="flex justify-center py-8">Loading...</div>}>
            <ForgotPasswordForm />
          </Suspense>
          
          <div className="text-center text-sm">
            Remember your password?{" "}
            <Link 
              href="/login" 
              className="font-medium text-primary hover:underline"
            >
              Back to login
            </Link>
          </div>
        </div>
      </div>
      
      {/* Carousel Side */}
      <div className="hidden md:block bg-primary h-full">
        <AuthCarousel />
      </div>
    </div>
  );
} 