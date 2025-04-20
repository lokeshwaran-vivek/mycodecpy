import { sendVerificationRequestEmail } from "@/lib/emails/send-verification-request";
import { NextAuthOptions } from "next-auth";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import EmailProvider from "next-auth/providers/email";
import CredentialsProvider from "next-auth/providers/credentials";
import { prisma } from "@/lib/prisma";
import { CustomUser } from "@/lib/types";
import { hash, compare } from "bcryptjs";

// This function can run for a maximum of 180 seconds
export const config = {
  maxDuration: 180,
};

export const authOptions: NextAuthOptions = {
  debug: process.env.NODE_ENV === "development",
  pages: {
    signIn: "/login",
    error: "/login",
    verifyRequest: "/verify",
    newUser: "/complete-profile",
  },
  providers: [
    CredentialsProvider({
      id: "credentials",
      name: "Credentials",
      credentials: {
        name: { label: "Name", type: "text" },
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        phone: { label: "Phone", type: "tel" },
        isRegistering: { label: "Is Registering", type: "boolean" },
        designation: { label: "Designation", type: "string" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Email and password are required");
        }

        const { email, password, isRegistering, phone, designation, name } =
          credentials;

        try {
          // Check if user exists
          const existingUser = await prisma.user.findUnique({
            where: { email },
          });

          // Registration flow
          if (isRegistering === "true") {
            if (existingUser) {
              throw new Error("User already exists");
            }

            // Create new user
            const hashedPassword = await hash(password, 12);
            const user = await prisma.user.create({
              data: {
                email,
                name,
                phone,
                designation,
                password: hashedPassword,
                isProfileComplete: false,
                hasResetPassword: false,
                emailVerified: null,
                Account: {
                  create: {
                    type: "credentials",
                    provider: "credentials",
                    providerAccountId: email,
                  },
                },
              },
            });

            return {
              id: user.id,
              email: user.email,
              name: user.name,
            };
          }

          // Login flow
          if (!existingUser) {
            throw new Error("No user found with this email");
          }

          if (!existingUser.emailVerified) {
            throw new Error("Please verify your email before logging in");
          }

          if (existingUser.status === "INACTIVE") {
            throw new Error("Account is inactive, please contact admin");
          }

          const isPasswordValid = await compare(
            password,
            existingUser.password
          );
          if (!isPasswordValid) {
            throw new Error("Invalid password");
          }

          return {
            id: existingUser.id,
            email: existingUser.email,
            name: existingUser.name,
          };
        } catch (error) {
          throw error;
        }
      },
    }),
    EmailProvider({
      from: process.env.EMAIL_FROM,
      async sendVerificationRequest({ identifier: email, url }) {
        try {
          if (!email || !url) {
            throw new Error("Missing email or verification URL");
          }

          if (process.env.NODE_ENV === "development") {
            console.log("----------------------------------------");
            console.log("Login Link:", url);
            console.log("----------------------------------------");
          }

          await sendVerificationRequestEmail({ url, email });
        } catch (error) {
          console.error("Error sending verification email:", error);
          throw new Error("Failed to send verification email");
        }
      },
    }),
  ],
  adapter: PrismaAdapter(prisma),
  session: {
    strategy: "jwt",
    maxAge: 25 * 60, // 25 minutes of inactivity
    updateAge: 60, // Update session every 60 seconds with activity
  },
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      try {
        if (user) {
          // On sign in
          const dbUser = await prisma.user.findUnique({
            where: { email: user.email || "" },
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
              status: true,
              type: true,
              emailVerified: true,
              phone: true,
              phoneVerified: true,
              isProfileComplete: true,
              businessId: true,
            },
          });

          if (!dbUser) {
            console.error("User not found in database:", user.email);
            return token;
          }

          if (dbUser.status === "INACTIVE") {
            console.error("User account is inactive:", user.email);
            return token;
          }

          token.user = dbUser;
        } else if (trigger === "update" && session?.user) {
          token.user = session.user;
        }

        return token;
      } catch (error) {
        console.error("Error in jwt callback:", error);
        return token;
      }
    },
    async session({ session, token }) {
      try {
        if (token?.user) {
          session.user = token.user as CustomUser;
        }
        return session;
      } catch (error) {
        console.error("Error in session callback:", error);
        return session;
      }
    },
  },
  events: {
    async signIn({ user }) {
      try {
        console.log(`User signed in: ${user.id}`);
      } catch (error) {
        console.error("Error in signIn event:", error);
      }
    },
    async linkAccount({ user }) {
      try {
        console.log(`Account linked for user: ${user.id}`);
      } catch (error) {
        console.error("Error in linkAccount event:", error);
      }
    },
  },
};

export default authOptions;
