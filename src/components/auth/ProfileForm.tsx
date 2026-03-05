"use client";

import { useState } from "react";
import { Loader2, Check } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { NpCitySearch } from "@/components/ui/NpCitySearch";
import { NpWarehouseSearch } from "@/components/ui/NpWarehouseSearch";

interface ProfileFormProps {
  userId: string;
  initialData: {
    firstName: string;
    lastName: string;
    phone: string;
    company: string;
    email: string;
    city: string;
    npBranch: string;
    address: string;
  };
}

export function ProfileForm({ userId, initialData }: ProfileFormProps) {
  const [firstName, setFirstName] = useState(initialData.firstName);
  const [lastName, setLastName] = useState(initialData.lastName);
  const [phone, setPhone] = useState(initialData.phone);
  const [company, setCompany] = useState(initialData.company);
  const [email, setEmail] = useState(
    initialData.email?.includes("@phone.strongnailbits.local") ? "" : (initialData.email || ""),
  );
  const [city, setCity] = useState(initialData.city);
  const [cityRef, setCityRef] = useState("");
  const [npBranch, setNpBranch] = useState(initialData.npBranch);
  const [address, setAddress] = useState(initialData.address);
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSaved(false);

    try {
      const supabase = createClient();
      const { error: updateError } = await supabase
        .from("profiles")
        .update({
          first_name: firstName,
          last_name: lastName,
          phone,
          company,
          email: email || null,
          city: city || null,
          np_branch: npBranch || null,
          address: address || null,
        })
        .eq("id", userId);

      if (updateError) throw updateError;

      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Помилка збереження");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSave} className="flex flex-col gap-4">
      {error && (
        <div className="rounded-card border border-red/20 bg-red/5 px-4 py-3 text-sm text-red">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-xs font-medium text-[var(--t2)]">
            Ім&apos;я
          </label>
          <input
            type="text"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            className="h-11 w-full rounded-[10px] border border-[var(--border)] bg-pearl px-3 text-sm text-dark outline-none transition-colors focus:border-coral"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-[var(--t2)]">
            Прізвище
          </label>
          <input
            type="text"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            className="h-11 w-full rounded-[10px] border border-[var(--border)] bg-pearl px-3 text-sm text-dark outline-none transition-colors focus:border-coral"
          />
        </div>
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-[var(--t2)]">
          Телефон
        </label>
        <input
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          className="h-11 w-full rounded-[10px] border border-[var(--border)] bg-pearl px-3 text-sm text-dark outline-none transition-colors focus:border-coral"
          placeholder="+38 (0__) ___-__-__"
        />
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-[var(--t2)]">
          Email
        </label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="your@email.com"
          className="h-11 w-full rounded-[10px] border border-[var(--border)] bg-pearl px-3 text-sm text-dark outline-none transition-colors focus:border-coral"
        />
        <p className="mt-1 text-[11px] text-[var(--t3)]">
          Для отримання чеків та повідомлень
        </p>
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-[var(--t2)]">
          Компанія
        </label>
        <input
          type="text"
          value={company}
          onChange={(e) => setCompany(e.target.value)}
          className="h-11 w-full rounded-[10px] border border-[var(--border)] bg-pearl px-3 text-sm text-dark outline-none transition-colors focus:border-coral"
          placeholder="Назва салону / ФОП"
        />
      </div>

      {/* ── Доставка ── */}
      <div className="border-t border-[var(--border)] pt-4 mt-2">
        <p className="mb-3 text-xs font-semibold text-[var(--t2)] uppercase tracking-wider">
          Доставка
        </p>

        <div className="mb-3">
          <label className="mb-1 block text-xs font-medium text-[var(--t2)]">
            Місто
          </label>
          <NpCitySearch
            value={city}
            onChange={(name, ref) => {
              setCity(name);
              setCityRef(ref);
              setNpBranch("");
            }}
          />
        </div>

        <div className="mb-3">
          <label className="mb-1 block text-xs font-medium text-[var(--t2)]">
            Відділення Нової Пошти
          </label>
          <NpWarehouseSearch
            value={npBranch}
            cityName={city}
            onChange={(name) => setNpBranch(name)}
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-[var(--t2)]">
            Адреса доставки
          </label>
          <input
            type="text"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="вул. Шевченка 10, кв. 5"
            className="h-11 w-full rounded-[10px] border border-[var(--border)] bg-pearl px-3 text-sm text-dark outline-none transition-colors focus:border-coral"
          />
          <p className="mt-1 text-[11px] text-[var(--t3)]">
            Для адресної доставки кур&apos;єром
          </p>
        </div>
      </div>

      <button
        type="submit"
        disabled={loading}
        className="font-unbounded flex h-11 w-full items-center justify-center gap-2 rounded-pill bg-coral text-[13px] font-bold text-white transition-all hover:bg-coral-2 disabled:opacity-60 sm:w-auto sm:px-8"
      >
        {loading ? (
          <Loader2 size={16} className="animate-spin" />
        ) : saved ? (
          <>
            <Check size={16} />
            Збережено
          </>
        ) : (
          "Зберегти"
        )}
      </button>
    </form>
  );
}
