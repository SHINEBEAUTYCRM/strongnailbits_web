import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Бренди",
  description:
    "Повний каталог брендів професійної косметики в SHINE SHOP. Гель-лаки, бази, топи та інструменти від найкращих виробників.",
};

interface Brand {
  id: string;
  slug: string;
  name: string;
  logo_url: string | null;
}

async function getBrands(): Promise<Brand[]> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("brands")
    .select("id, slug, name, logo_url")
    .order("name", { ascending: true });
  return (data ?? []) as Brand[];
}

export default async function BrandsPage() {
  const brands = await getBrands();

  // Group brands alphabetically
  const grouped = new Map<string, Brand[]>();
  for (const brand of brands) {
    const letter = brand.name.charAt(0).toUpperCase();
    if (!grouped.has(letter)) grouped.set(letter, []);
    grouped.get(letter)!.push(brand);
  }

  const letters = Array.from(grouped.keys()).sort();

  return (
    <div className="mx-auto max-w-[1280px] px-4 py-8 sm:px-6">
      <h1 className="font-unbounded text-2xl font-black text-dark sm:text-3xl">
        Бренди
      </h1>
      <p className="mt-2 text-sm text-[var(--t2)]">
        {brands.length} брендів професійної косметики
      </p>

      {/* Alphabet nav */}
      <div className="mt-6 flex flex-wrap gap-1">
        {letters.map((letter) => (
          <a
            key={letter}
            href={`#letter-${letter}`}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-xs font-bold text-[var(--t2)] transition-colors hover:bg-coral hover:text-white"
          >
            {letter}
          </a>
        ))}
      </div>

      {/* Brand groups */}
      <div className="mt-8 flex flex-col gap-10">
        {letters.map((letter) => (
          <section key={letter} id={`letter-${letter}`}>
            <h2 className="font-unbounded mb-4 border-b border-[var(--border)] pb-2 text-lg font-bold text-dark">
              {letter}
            </h2>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
              {grouped.get(letter)!.map((brand) => (
                <Link
                  key={brand.id}
                  href={`/brands/${brand.slug}`}
                  className="group flex flex-col items-center gap-3 rounded-2xl border border-[var(--border)] bg-white p-4 transition-all hover:-translate-y-1 hover:shadow-md"
                >
                  {brand.logo_url ? (
                    <div className="relative h-16 w-full">
                      <Image
                        src={brand.logo_url}
                        alt={brand.name}
                        fill
                        sizes="150px"
                        className="object-contain"
                      />
                    </div>
                  ) : (
                    <div className="flex h-16 w-full items-center justify-center">
                      <span className="font-unbounded text-xs font-bold text-[var(--t3)]">
                        {brand.name.slice(0, 2).toUpperCase()}
                      </span>
                    </div>
                  )}
                  <span className="text-center text-xs font-medium text-dark transition-colors group-hover:text-coral">
                    {brand.name}
                  </span>
                </Link>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
