export const ADMIN_PERMISSIONS = ["products", "photos", "orders", "customers", "settings"] as const;
export type AdminPermission = typeof ADMIN_PERMISSIONS[number];

export const PERMISSION_LABELS = {
  en: { products: "Products", photos: "Photos", orders: "Orders", customers: "Customers", settings: "Admin settings" },
  ar: { products: "المنتجات", photos: "الصور", orders: "الطلبات", customers: "العملاء", settings: "إعدادات الإدارة" },
};

/** Server use: the role reference must be populated from MongoDB, not a client. */
export function permissionsFor(user: any): AdminPermission[] {
  if (user?.role === "admin") return [...ADMIN_PERMISSIONS];
  if (user?.role !== "staff") return [];
  return ADMIN_PERMISSIONS.filter((p) => user.roleId?.permissions?.includes(p));
}

/** Presentation only. Server handlers independently resolve their DB role. */
export function hasPermission(user: { role?: string; permissions?: AdminPermission[] } | null | undefined, permission: AdminPermission) {
  return user?.role === "admin" || !!user?.permissions?.includes(permission);
}

export function hasAdminAccess(user: { role?: string; permissions?: AdminPermission[] } | null | undefined) {
  return user?.role === "admin" || (user?.role === "staff" && !!user.permissions?.length);
}
