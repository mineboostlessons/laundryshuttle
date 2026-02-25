"use client";

import { useActionState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { loginAction, oauthSignIn, type AuthState } from "../actions";

const initialState: AuthState = {};

export function LoginForm({ tenantSlug }: { tenantSlug?: string }) {
  const [state, formAction, isPending] = useActionState(loginAction, initialState);
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl");
  const error = searchParams.get("error");

  useEffect(() => {
    if (state.success) {
      // Determine the right redirect based on the user's role and tenant
      const role = state.role;
      const userTenantSlug = state.tenantSlug;

      let redirect = callbackUrl || "/";

      if (!callbackUrl) {
        // No explicit callback — redirect based on role
        if (role === "platform_admin") {
          redirect = "/admin";
        } else if (role === "owner") {
          redirect = "/dashboard";
        } else if (role === "manager") {
          redirect = "/manager";
        } else if (role === "attendant") {
          redirect = "/attendant";
        } else if (role === "driver") {
          redirect = "/driver";
        } else if (role === "customer") {
          redirect = "/customer";
        }
      }

      // If the user belongs to a tenant but we're on the platform domain,
      // redirect to their subdomain
      if (userTenantSlug) {
        const currentHostname = window.location.hostname;
        const alreadyOnSubdomain = currentHostname.startsWith(`${userTenantSlug}.`);

        if (!alreadyOnSubdomain && (!tenantSlug || tenantSlug === "__platform__")) {
          window.location.href = `${window.location.protocol}//${userTenantSlug}.${currentHostname}${redirect}`;
          return;
        }
      }

      router.push(redirect);
      router.refresh();
    }
  }, [state.success, state.role, state.tenantSlug, router, callbackUrl, tenantSlug]);

  return (
    <Card>
      <CardHeader className="text-center">
        <CardTitle>Welcome Back</CardTitle>
        <CardDescription>Sign in to your Laundry Shuttle account</CardDescription>
      </CardHeader>
      <CardContent>
        {(state.error || error) && (
          <div className="mb-4 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
            {state.error || "Authentication failed. Please try again."}
          </div>
        )}

        <form action={formAction} className="space-y-4">
          {tenantSlug && tenantSlug !== "__platform__" && (
            <input type="hidden" name="tenantSlug" value={tenantSlug} />
          )}
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              placeholder="you@example.com"
              required
              autoComplete="email"
            />
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="password">Password</Label>
              <Link
                href="/forgot-password"
                className="text-xs text-primary hover:underline"
              >
                Forgot password?
              </Link>
            </div>
            <Input
              id="password"
              name="password"
              type="password"
              placeholder="Enter your password"
              required
              autoComplete="current-password"
            />
          </div>
          <Button type="submit" className="w-full" disabled={isPending}>
            {isPending ? "Signing in..." : "Sign In"}
          </Button>
        </form>

        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-card px-2 text-muted-foreground">Or continue with</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <form action={() => oauthSignIn("google")}>
            <Button variant="outline" className="w-full" type="submit">
              <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                <path
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                  fill="#4285F4"
                />
                <path
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  fill="#34A853"
                />
                <path
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  fill="#FBBC05"
                />
                <path
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  fill="#EA4335"
                />
              </svg>
              Google
            </Button>
          </form>
          <form action={() => oauthSignIn("facebook")}>
            <Button variant="outline" className="w-full" type="submit">
              <svg className="mr-2 h-4 w-4" fill="#1877F2" viewBox="0 0 24 24">
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
              </svg>
              Facebook
            </Button>
          </form>
        </div>
      </CardContent>
      <CardFooter className="justify-center">
        <p className="text-sm text-muted-foreground">
          Don&apos;t have an account?{" "}
          <Link href="/register" className="text-primary hover:underline">
            Sign up
          </Link>
        </p>
      </CardFooter>
    </Card>
  );
}
