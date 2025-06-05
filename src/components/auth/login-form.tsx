import { SignIn } from "@clerk/nextjs";

export function LoginForm() {
  return (
    <div className="w-full max-w-[400px] mx-auto p-6">
      <SignIn />
    </div>
  );
}
