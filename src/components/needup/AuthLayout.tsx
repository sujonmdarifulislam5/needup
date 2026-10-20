import type { ReactNode } from "react";
import { Logo } from "./AppShell";
import village from "@/assets/village.jpg";

export function AuthLayout({ title, sub, children }: { title: string; sub?: string; children: ReactNode }) {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="relative hidden lg:block">
        <img src={village} alt="" className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-0 bg-brand opacity-60" />
        <div className="absolute bottom-12 left-12 right-12 text-primary-foreground">
          <p className="text-4xl font-extrabold leading-tight">Ask. Offer. Connect.<br />Right in your neighborhood.</p>
        </div>
      </div>
      <div className="flex flex-col items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm">
          <div className="flex justify-center"><Logo size="lg" /></div>
          <h1 className="mt-8 text-center text-3xl font-extrabold tracking-tight">{title}</h1>
          {sub && <p className="mt-2 text-center text-lg text-muted-foreground">{sub}</p>}
          <div className="mt-8">{children}</div>
        </div>
      </div>
    </div>
  );
}

export function Field({ label, ...props }: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-semibold">{label}</span>
      <input {...props} className="w-full rounded-2xl border bg-card px-4 py-3.5 text-base outline-none transition focus:border-primary" />
    </label>
  );
}

export const primaryBtn = "flex w-full items-center justify-center gap-3 rounded-2xl bg-brand py-4 font-semibold text-primary-foreground shadow-lift disabled:opacity-60";
