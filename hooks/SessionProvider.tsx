"use client";
import { SessionProvider as NextAuthSessionProvider } from "next-auth/react";
import { SessionActivityTracker } from "./SessionActivityTracker";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <NextAuthSessionProvider>
      <SessionActivityTracker />
      {children}
    </NextAuthSessionProvider>
  );
}
