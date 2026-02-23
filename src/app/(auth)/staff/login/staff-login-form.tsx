"use client";

import { useActionState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { loginAction, type AuthState } from "../../actions";

const initialState: AuthState = {};

export function StaffLoginForm({ tenantSlug }: { tenantSlug?: string }) {
  const [state, formAction, isPending] = useActionState(loginAction, initialState);
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/dashboard";
  const error = searchParams.get("error");

  useEffect(() => {
    if (state.success) {
      router.push(callbackUrl);
      router.refresh();
    }
  }, [state.success, router, callbackUrl]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <svg className="h-6 w-6 text-primary" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25a3 3 0 0 1 3 3m3 0a6 6 0 0 1-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1 1 21.75 8.25Z" />
            </svg>
          </div>
          <CardTitle>Staff Login</CardTitle>
          <CardDescription>
            Sign in to access your staff dashboard (Owner, Manager, Attendant, or Driver)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {(state.error || error) && (
            <div className="mb-4 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              {state.error || (error === "tenant_mismatch" ? "You don't have access to this business." : "Authentication failed. Please try again.")}
            </div>
          )}

          <form action={formAction} className="space-y-4">
            {tenantSlug && tenantSlug !== "__platform__" && (
              <input type="hidden" name="tenantSlug" value={tenantSlug} />
            )}
            <input type="hidden" name="callbackUrl" value={callbackUrl} />

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="staff@yourbusiness.com"
                required
                autoComplete="email"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
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

          <div className="mt-6 text-center text-sm text-muted-foreground">
            <p>
              Customer?{" "}
              <a href="/login" className="font-medium text-primary hover:underline">
                Sign in here
              </a>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
