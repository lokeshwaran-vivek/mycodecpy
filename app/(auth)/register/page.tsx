import { RegisterForm } from "@/components/auth/register-form";
import { AuthCarousel } from "@/components/auth/auth-carousel";
import { Suspense } from "react";
import Link from "next/link";

export default function RegisterPage() {
  return (
    <div className="grid h-screen md:grid-cols-2">
      {/* Form Side */}
      <div className="flex flex-col items-center justify-center p-6 md:p-10 bg-background">
        <div className="w-full max-w-md space-y-8">
          <div className="flex flex-col space-y-2 text-center">
            <h1 className="text-3xl font-bold tracking-tight">Create an account</h1>
            <p className="text-muted-foreground">
              Enter your information to create your account
            </p>
          </div>
          
          <Suspense fallback={<div className="flex justify-center py-8">Loading...</div>}>
            <RegisterForm />
          </Suspense>
          
          <div className="text-center text-sm">
            Already have an account?{" "}
            <Link 
              href="/login" 
              className="font-medium text-primary hover:underline"
            >
              Sign in
            </Link>
          </div>
        </div>
      </div>
      
      {/* Carousel Side */}
      <div className="hidden md:block bg-primary h-full order-first md:order-last">
        <AuthCarousel />
      </div>
    </div>
  );
}
