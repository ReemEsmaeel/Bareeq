import type { ShopOrder, ShopProduct, ShopUser } from "./types";
import { permissionsFor } from "./permissions";

// Explicit allowlists prevent password hashes and internal session fields leaking.
export function publicUser(user: any): ShopUser {
  return {
    id: String(user._id),
    name: user.name,
    email: user.email,
    role: user.role,
    roleId: user.role === "staff" ? String(user.roleId?._id || user.roleId || "") : user.role,
    roleName: user.role === "admin" ? "Administrator" : user.role === "customer" ? "Customer" : user.roleId?.name || "Staff",
    roleNameAr: user.role === "admin" ? "مدير" : user.role === "customer" ? "عميل" : user.roleId?.nameAr || "فريق العمل",
    permissions: permissionsFor(user),
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
    currency: order.currency === "KWD" ? "KWD" : "SAR",
    status: order.status,
    paymentProvider: order.paymentProvider ?? "manual",
    paidAt: order.paidAt ? new Date(order.paidAt).toISOString() : null,
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
