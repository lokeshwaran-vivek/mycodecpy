import { AuthCarousel } from "@/components/auth/auth-carousel";
import { Suspense } from "react";
import EmailVerificationPending from "@/components/auth/email-verification-pending";

export default async function EmailVerificationPendingPage({
  searchParams,
}: {
  searchParams: Promise<{ emailAddress?: string }>;
}) {
  const { emailAddress } = await searchParams;
  return (
    <div className="grid h-screen md:grid-cols-2">
      {/* Form Side */}
      <div className="flex flex-col items-center justify-center p-6 md:p-10 bg-background">
        <div className="w-full max-w-md space-y-8">
          <div className="flex flex-col space-y-2 text-center">
            <h1 className="text-3xl font-bold tracking-tight">
              Email Verification Pending
            </h1>
            <p className="text-muted-foreground">
              Please verify your email address to continue
            </p>
          </div>

          <Suspense
            fallback={
              <div className="flex justify-center py-8">Loading...</div>
            }
          >
            <EmailVerificationPending emailAddress={emailAddress || ""} />
          </Suspense>
        </div>
      </div>

      {/* Carousel Side */}
      <div className="hidden md:block bg-primary h-full order-first md:order-last">
        <AuthCarousel />
      </div>
    </div>
  );
}
