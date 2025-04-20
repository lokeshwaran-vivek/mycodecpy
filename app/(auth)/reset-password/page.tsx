import { Suspense } from "react";
import ResetPassword from "@/components/auth/reset-password";
import { AuthCarousel } from "@/components/auth/auth-carousel";
import { redirect } from "next/navigation";
import NotFound from "@/components/shared/not-found";
import { verifyResetToken } from "../password-reset/actions";

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string; checksum?: string }>;
}) {
  const { token, checksum } = await searchParams;
  
  // If token or checksum is missing, show error page
  if (!token || !checksum) {
    return <NotFound />;
  }
  
  // Verify token on the server before rendering the page
  const verificationResult = await verifyResetToken(token, checksum);
  
  // If the token is invalid, redirect to forgot password page
  if (!verificationResult.success) {
    redirect("/login");
  }
  
  return (
    <div className="grid h-screen md:grid-cols-2">
      {/* Form Side */}
      <div className="flex flex-col items-center justify-center p-6 md:p-10 bg-background">
        <div className="w-full max-w-md space-y-8">
          <div className="flex flex-col space-y-2 text-center">
            <h1 className="text-3xl font-bold tracking-tight">Reset Password</h1>
            <p className="text-muted-foreground">
              Enter your new password
            </p>
          </div>
          
          <Suspense fallback={<div className="flex justify-center py-8">Loading...</div>}>
            <ResetPassword />
          </Suspense>
          
          
        </div>
      </div>
      
      {/* Carousel Side */}
      <div className="hidden md:block bg-primary h-full">
        <AuthCarousel />
      </div>
    </div>
  );
}
