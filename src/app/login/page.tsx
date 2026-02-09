import type { Metadata } from "next";
import { AuthForm } from "@/components/auth/AuthForm";

export const metadata: Metadata = {
  title: "Увійти",
};

interface LoginPageProps {
  searchParams: Promise<{ redirect?: string }>;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const { redirect } = await searchParams;

  return (
    <div className="mx-auto flex min-h-[60vh] max-w-md items-center px-4 py-12">
      <div className="w-full">
        <div className="mb-8 text-center">
          <h1 className="font-unbounded text-2xl font-black text-dark">
            Вхід в акаунт
          </h1>
          <p className="mt-2 text-sm text-[var(--t2)]">
            Увійдіть, щоб переглядати замовлення та отримувати знижки
          </p>
        </div>

        <div className="rounded-2xl border border-[var(--border)] bg-white p-6 shadow-sm">
          <AuthForm mode="login" redirect={redirect} />
        </div>
      </div>
    </div>
  );
}
