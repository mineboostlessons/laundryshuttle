import { Suspense } from "react";
import { LoginForm } from "./login-form";

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="h-[500px]" />}>
      <LoginForm />
    </Suspense>
  );
}
