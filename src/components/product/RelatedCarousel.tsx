"use client";

import { useRef } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { ProductCard } from "./ProductCard";

interface Item {
  id: string;
  slug: string;
  name: string;
  price: number;
  oldPrice: number | null;
  imageUrl: string | null;
  brand: string | null;
  isNew: boolean;
  status: string;
  quantity: number;
}

interface Props {
  items: Item[];
}

export function RelatedCarousel({ items }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  const scroll = (dir: "left" | "right") => {
    ref.current?.scrollBy({
      left: dir === "left" ? -300 : 300,
      behavior: "smooth",
    });
  };

  return (
    <div className="relative">
      {/* Arrows */}
      <div className="hidden gap-1 md:absolute md:-top-10 md:right-0 md:flex">
        <button
          onClick={() => scroll("left")}
          className="flex h-8 w-8 items-center justify-center rounded-full border border-[#ddd] text-[#999] hover:border-[#222] hover:text-[#222]"
        >
          <ChevronLeft size={16} />
        </button>
        <button
          onClick={() => scroll("right")}
          className="flex h-8 w-8 items-center justify-center rounded-full border border-[#ddd] text-[#999] hover:border-[#222] hover:text-[#222]"
        >
          <ChevronRight size={16} />
        </button>
      </div>

      {/* Carousel */}
      <div
        ref={ref}
        className="scrollbar-none -mx-4 flex gap-3 overflow-x-auto px-4 pb-2 md:-mx-0 md:px-0"
      >
        {items.map((item) => (
          <div key={item.id} className="w-[170px] shrink-0 sm:w-[190px] lg:w-[210px]">
            <ProductCard
              id={item.id}
              slug={item.slug}
              name={item.name}
              price={item.price}
              oldPrice={item.oldPrice}
              imageUrl={item.imageUrl}
              brand={item.brand}
              isNew={item.isNew}
              status={item.status}
              quantity={item.quantity}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
