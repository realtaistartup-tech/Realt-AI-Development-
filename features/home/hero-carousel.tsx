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
    const id = window.setInterval(() => setIndex((i) => (i + 1) % IMAGES.length), INTERVAL_MS);
    return () => window.clearInterval(id);
  }, [paused, index]);

  return (
    <div
      className="hover-pop motion-ok relative aspect-[4/3] w-full overflow-hidden rounded-2xl border border-border bg-muted shadow-lg"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {IMAGES.map((image, i) => (
        <Image
          key={image.key}
          src={image.src}
          alt={t(image.key)}
          fill
          priority={i === 0}
          sizes="(min-width: 1024px) 700px, 100vw"
          className={`motion-ok object-cover transition-opacity duration-1000 ${
            i === index ? "opacity-100" : "opacity-0"
          }`}
          aria-hidden={i !== index}
        />
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
              i === index ? "w-6 bg-white" : "w-2 bg-white/60 hover:bg-white/80"
            }`}
          />
        ))}
      </div>
    </div>
  );
}
