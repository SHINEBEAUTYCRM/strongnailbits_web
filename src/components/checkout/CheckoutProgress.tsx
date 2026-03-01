"use client";

import { Fragment } from "react";
import { User, Truck, CreditCard, Check } from "lucide-react";

const STEPS = [
  { icon: User, label: "Контакт" },
  { icon: Truck, label: "Доставка" },
  { icon: CreditCard, label: "Оплата" },
];

interface CheckoutProgressProps {
  activeStep: number;
}

export function CheckoutProgress({ activeStep }: CheckoutProgressProps) {
  return (
    <div className="sticky top-[72px] z-40 -mx-4 mb-6 bg-[var(--bg)]/90 px-4 py-3 backdrop-blur-xl sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
      <div className="mx-auto flex max-w-md items-center">
        {STEPS.map((step, i) => {
          const Icon = step.icon;
          const isActive = i + 1 === activeStep;
          const isCompleted = i + 1 < activeStep;
          const nextCompleted = i + 1 < activeStep;
          const nextActive = i + 1 === activeStep - 1 || i + 1 < activeStep;

          return (
            <Fragment key={i}>
              <div className="flex flex-col items-center gap-1">
                <div
                  className={`flex h-8 w-8 items-center justify-center rounded-full transition-all duration-300 ${
                    isCompleted
                      ? "bg-green text-white"
                      : isActive
                        ? "bg-coral text-white shadow-md shadow-coral/30"
                        : "bg-[var(--card)] text-[var(--t3)] ring-1 ring-[var(--border)]"
                  }`}
                >
                  {isCompleted ? (
                    <Check size={14} />
                  ) : (
                    <Icon size={14} />
                  )}
                </div>
                <span
                  className={`text-[10px] font-semibold transition-colors ${
                    isCompleted
                      ? "text-green"
                      : isActive
                        ? "text-coral"
                        : "text-[var(--t3)]"
                  }`}
                >
                  {step.label}
                </span>
              </div>
              {i < STEPS.length - 1 && (
                <div className="mx-2 h-0.5 flex-1 overflow-hidden rounded-full bg-[var(--border)]">
                  <div
                    className="h-full rounded-full bg-green transition-all duration-500"
                    style={{ width: i + 2 <= activeStep ? "100%" : "0%" }}
                  />
                </div>
              )}
            </Fragment>
          );
        })}
      </div>
    </div>
  );
}
