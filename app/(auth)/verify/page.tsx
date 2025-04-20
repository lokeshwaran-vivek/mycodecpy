import Link from "next/link";
import { Button } from "@/components/ui/button";
import { generateChecksum } from "@/lib/utils/generate-checksum";
import NotFound from "@/components/shared/not-found";
import { AuthCarousel } from "@/components/auth/auth-carousel";

export default async function VerifyPage({
  searchParams,
}: {
  searchParams: Promise<{ verification_url?: string; checksum?: string }>;
}) {
  const { verification_url, checksum } = await searchParams;

  if (!verification_url || !checksum) {
    return <NotFound />;
  }

  // Server-side validation
  const isValidVerificationUrl = (url: string, checksum: string): boolean => {
    try {
      const urlObj = new URL(url);
      if (urlObj.origin !== process.env.NEXTAUTH_URL) return false;
      const expectedChecksum = generateChecksum(url);
      return checksum === expectedChecksum;
    } catch {
      return false;
    }
  };

  if (!isValidVerificationUrl(verification_url, checksum)) {
    return <NotFound />;
  }

  return (
    <div className="grid h-screen md:grid-cols-2">
      {/* Content Side */}
      <div className="flex flex-col items-center justify-center p-6 md:p-10 bg-background">
        <div className="w-full max-w-md space-y-8">
          <div className="flex flex-col space-y-3 text-center">
            <h1 className="text-3xl font-bold tracking-tight">Verify Your Login</h1>
            <p className="text-muted-foreground">
              One more step to access your account
            </p>
          </div>
          
          <div className="mt-8">
            <Link href={verification_url}>
              <Button className="w-full">Verify Login</Button>
            </Link>
          </div>
          
          <p className="mt-6 text-xs text-muted-foreground">
            By clicking verify, you acknowledge that you have read and agree to Accountable&apos;s{" "}
            <a href="https://www.accountable.io/terms" target="_blank" className="underline hover:text-primary">
              Terms of Service
            </a>{" "}
            and{" "}
            <a href="https://www.accountable.io/privacy" target="_blank" className="underline hover:text-primary">
              Privacy Policy
            </a>.
          </p>
        </div>
      </div>
      
      {/* Carousel Side */}
      <div className="hidden md:block bg-primary h-full">
        <AuthCarousel />
      </div>
    </div>
  );
}
