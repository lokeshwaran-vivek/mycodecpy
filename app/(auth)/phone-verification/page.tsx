import { AuthCarousel } from "@/components/auth/auth-carousel";
import { Suspense } from "react";
import { requireAuth } from "@/lib/auth";
import PhoneVerification from "@/components/auth/phone-verification";
export default async function EmailVerificationPendingPage() {
  const { user, error } = await requireAuth();
  if (error) {
    return <div>{error.message}</div>;
  }
  if (!user) {
    return <div>Not found</div>;
  }

  return (
    <div className="grid h-screen md:grid-cols-2">
      {/* Carousel Side */}
      <div className="hidden md:block bg-primary h-full order-first md:order-last">
        <AuthCarousel />
      </div>
      {/* Form Side */}
      <div className="flex flex-col items-center justify-center p-6 md:p-10 bg-background">
        <div className="w-full max-w-md space-y-8">
          <div className="flex flex-col space-y-2 text-center">
            <h1 className="text-3xl font-bold tracking-tight">
              Phone Verification
            </h1>
            <p className="text-muted-foreground">
              OTP has been sent to your phone number. Please enter the OTP to
              continue.
            </p>
          </div>

          <Suspense
            fallback={
              <div className="flex justify-center py-8">Loading...</div>
            }
          >
            <PhoneVerification phoneNumber={user.phone || ""} />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
