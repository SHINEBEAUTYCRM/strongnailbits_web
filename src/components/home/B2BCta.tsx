import Link from "next/link";

const DEFAULT_PERKS = [
  "Знижки до -42%",
  "Відтермінування оплати",
  "Швидке замовлення по SKU",
  "Персональний менеджер",
];

interface B2BCtaProps {
  data?: {
    badge?: string;
    title?: string;
    description?: string;
    button_text?: string;
    button_href?: string;
    perks?: string[];
  };
}

export function B2BCta({ data }: B2BCtaProps = {}) {
  const badge = data?.badge ?? "B2B";
  const title = data?.title ?? "Оптовим клієнтам — спеціальні умови";
  const description = data?.description ?? "Реєструйтесь як B2B клієнт і отримуйте доступ до оптових цін, персонального менеджера та розширеного каталогу.";
  const buttonText = data?.button_text ?? "Стати оптовиком";
  const buttonHref = data?.button_href ?? "/wholesale";
  const PERKS = data?.perks ?? DEFAULT_PERKS;
  return (
    <div className="relative overflow-hidden rounded-2xl bg-white px-6 py-12 text-center shadow-[0_1px_4px_rgba(0,0,0,0.04)] sm:px-12 sm:py-16">
      {/* Glow */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-1/2 h-[400px] w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-violet opacity-[0.04] blur-[200px]" />
      </div>

      <div className="relative">
        <span className="font-unbounded mb-2 inline-block text-[10px] font-extrabold uppercase tracking-[3px] text-violet">
          {badge}
        </span>

        <h2 className="font-unbounded mx-auto max-w-lg text-2xl font-black text-[#1a1a1a] sm:text-3xl">
          {title}
        </h2>

        <p className="mx-auto mt-4 max-w-md text-sm leading-relaxed text-[#6b6b7b]">
          {description}
        </p>

        <div className="mt-6 flex flex-wrap justify-center gap-2">
          {PERKS.map((perk) => (
            <span
              key={perk}
              className="rounded-full border border-violet/15 bg-violet/5 px-4 py-2 text-[12px] font-medium text-violet"
            >
              {perk}
            </span>
          ))}
        </div>

        <div className="mt-8">
          <Link
            href={buttonHref}
            className="font-unbounded inline-flex h-12 items-center gap-2 rounded-full bg-violet px-8 text-[13px] font-bold text-white transition-all hover:glow-violet hover:opacity-90"
          >
            {buttonText}
          </Link>
        </div>
      </div>
    </div>
  );
}
