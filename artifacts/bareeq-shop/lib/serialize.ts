import type { ShopOrder, ShopProduct, ShopUser } from "./types";

// Explicit allowlists prevent password hashes and internal session fields leaking.
export function publicUser(user: any): ShopUser {
  return {
    id: String(user._id),
    name: user.name,
    email: user.email,
    role: user.role,
    active: user.active,
    createdAt: new Date(user.createdAt).toISOString(),
  };
}

export function publicProduct(product: any): ShopProduct {
  return {
    id: String(product._id),
    name: product.name,
    nameAr: product.nameAr,
    description: product.description,
    descriptionAr: product.descriptionAr,
    price: product.price,
    image: product.image,
    category: product.category,
  };
}

export function publicOrder(order: any): ShopOrder {
  return {
    id: String(order._id),
    items: order.items.map((item: any) => ({
      product: String(item.product),
      name: item.name,
      nameAr: item.nameAr,
      quantity: item.quantity,
      price: item.price,
    })),
    total: order.total,
    status: order.status,
    createdAt: new Date(order.createdAt).toISOString(),
  };
}

// Only admin-authorized routes use this customer-enriched serializer.
export function adminOrder(order: any): ShopOrder {
  return {
    ...publicOrder(order),
    customer: order.user?.email ? publicUser(order.user) : null,
  };
}
