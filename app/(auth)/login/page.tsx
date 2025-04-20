import { Suspense } from "react";
import { LoginForm } from "@/components/auth/login-form";
import { AuthCarousel } from "@/components/auth/auth-carousel";
import Link from "next/link";

export default function LoginPage() {
  return (
    <div className="grid h-screen md:grid-cols-2">
      {/* Carousel Side */}
      <div className="hidden md:block bg-primary h-full">
        <AuthCarousel />
      </div>
      
      {/* Form Side */}
      <div className="flex flex-col items-center justify-center p-6 md:p-10 bg-background">
        <div className="w-full max-w-md space-y-8">
          <div className="flex flex-col space-y-2 text-center">
            <h1 className="text-3xl font-bold tracking-tight">Welcome</h1>
            <p className="text-muted-foreground">
              Enter your email and password to access your account
            </p>
          </div>
          
          <Suspense fallback={<div className="flex justify-center py-8">Loading...</div>}>
            <LoginForm />
          </Suspense>
          
          <div className="text-center text-sm">
            Don&apos;t have an account?{" "}
            <Link 
              href="/register" 
              className="font-medium text-primary hover:underline"
            >
              Sign up
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
