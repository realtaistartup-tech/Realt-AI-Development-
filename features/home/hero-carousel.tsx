"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";

const IMAGES = [
  { key: "apartment", src: "/images/hero/modern-apartment.jpg" },
  { key: "house", src: "/images/hero/modern-house.jpg" },
  { key: "balcony", src: "/images/hero/balcony-apartment.jpg" },
  { key: "villa", src: "/images/hero/villa-pool.jpg" },
  { key: "townhouses", src: "/images/hero/townhouses.jpg" },
  { key: "rowHouses", src: "/images/hero/row-houses.jpg" },
] as const;

const INTERVAL_MS = 5000;

export function HeroCarousel() {
  const t = useTranslations("home.hero.images");
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused) return;

    const id = window.setTimeout(() => {
      setIndex((i) => (i + 1) % IMAGES.length);
    }, INTERVAL_MS);

    return () => window.clearTimeout(id);
  }, [paused, index]);

  return (
    <div
      className="hover-pop motion-ok relative aspect-[4/3] w-full overflow-hidden rounded-2xl border border-border bg-muted shadow-lg"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {IMAGES.map((image, i) => (
        <div
          key={image.key}
          className={`motion-ok absolute inset-0 transition-opacity duration-1000 ${
            i === index ? "opacity-100" : "opacity-0"
          }`}
          aria-hidden={i !== index}
        >
          <Image
            src={image.src}
            alt={t(image.key)}
            fill
            preload={i === 0}
            sizes="(max-width: 639px) calc(100vw - 32px), (max-width: 1023px) calc(100vw - 48px), (max-width: 1535px) 50vw, 700px"
            className="object-cover"
          />
        </div>
      ))}

      <div className="absolute inset-x-0 bottom-4 flex justify-center gap-2">
        {IMAGES.map((image, i) => (
          <button
            key={image.key}
            type="button"
            aria-label={t(image.key)}
            aria-current={i === index}
            onClick={() => setIndex(i)}
            className={`h-2 rounded-full transition-all ${
              i === index
                ? "w-6 bg-white"
                : "w-2 bg-white/60 hover:bg-white/80"
            }`}
          />
        ))}
      </div>
    </div>
  );
}