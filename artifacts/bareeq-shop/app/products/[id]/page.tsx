import { ProductDetail } from "./product-detail";

export const metadata = { title: "Piece details | Bareeq Atelier" };

export default async function ProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ProductDetail id={id} />;
}
