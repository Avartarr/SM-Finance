import { Suspense } from "react";
import { LoginClient } from "./login-client";

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="grid min-h-screen place-items-center text-white">Loading...</div>}>
      <LoginClient />
    </Suspense>
  );
}
