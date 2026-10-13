"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { api } from "@/lib/client";
import type { ShopProduct } from "@/lib/types";

const fallbackPhoto = "/bareeq-editorial.jpg";
let productsRequest: Promise<ShopProduct[]> | null = null;
const invalidPhotoUrls = new Set<string>();

function getProducts() {
  if (!productsRequest) {
    productsRequest = api<ShopProduct[]>("/products").finally(() => {
      productsRequest = null;
    });
  }
  return productsRequest;
}

function usableImage(image: string | undefined) {
  return typeof image === "string" && image.trim().length > 0 && !invalidPhotoUrls.has(image);
}

type CollectionPhotoProps = {
  collectionName: ShopProduct["category"];
  language: "en" | "ar";
};

export function CollectionPhoto({ collectionName, language }: CollectionPhotoProps) {
  const [photo, setPhoto] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  const alt = language === "ar"
    ? `صورة مجوهرات فضية من مجموعة ${collectionName}`
    : `Sterling silver jewelry from the ${collectionName} collection`;

  useEffect(() => {
    let live = true;
    setPhoto(null);
    setLoaded(false);
    setFailed(false);

    getProducts().then((products) => {
      if (!live) return;

      const categoryProducts = products.filter((product) => product.category === collectionName);
      const exactProduct = categoryProducts.find(
        (product) => product.name.trim().toLocaleLowerCase() === collectionName.toLocaleLowerCase() && usableImage(product.image),
      );
      const selected = exactProduct ?? categoryProducts.find((product) => usableImage(product.image));

      if (selected && live) setPhoto(selected.image);
    }).catch(() => {
      // The editorial image remains visible when the products API is unavailable.
    });

    return () => {
      live = false;
    };
  }, [collectionName]);

  const showPhoto = Boolean(photo && !failed);

  return (
    <div className="absolute inset-0">
      <Image
        src={fallbackPhoto}
        alt={showPhoto ? "" : alt}
        fill
        sizes="(max-width: 640px) 92vw, (max-width: 1024px) 30vw, 24vw"
        className="object-cover object-center"
        aria-hidden={showPhoto}
      />
      {photo && !failed && (
        <Image
          src={photo}
          alt={alt}
          fill
          sizes="(max-width: 640px) 92vw, (max-width: 1024px) 30vw, 24vw"
          className={`object-cover object-center transition-opacity duration-300 ${loaded ? "opacity-100" : "opacity-0"}`}
          onLoad={() => setLoaded(true)}
          onError={() => {
            invalidPhotoUrls.add(photo);
            setFailed(true);
          }}
        />
      )}
    </div>
  );
}
