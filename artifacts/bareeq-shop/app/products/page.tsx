import { Suspense } from "react";
import { Catalog } from "./catalog";

export const metadata = { title: "The collections | Bareeq Atelier" };

export default function ProductsPage() {
  return <Suspense><Catalog /></Suspense>;
}
