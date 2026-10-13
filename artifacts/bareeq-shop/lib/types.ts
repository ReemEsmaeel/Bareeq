import type { AdminPermission } from "./permissions";

export type ShopUser = {
  id: string;
  name: string;
  email: string;
  role: "customer" | "admin" | "staff";
  roleId: string;
  roleName: string;
  roleNameAr: string;
  permissions: AdminPermission[];
  active: boolean;
  createdAt: string;
};

export type ShopProduct = {
  id: string;
  name: string;
  nameAr: string;
  description: string;
  descriptionAr: string;
  price: number;
  image: string;
  category: "Lujain" | "Rawnaq" | "Wahaj";
};

export type CartItem = {
  product: ShopProduct;
  quantity: number;
};

export type ShopCart = {
  items: CartItem[];
  total: number;
  removedItems: boolean;
  quote: string;
};

export type ShopOrder = {
  id: string;
  items: {
    product: string;
    name: string;
    nameAr: string;
    price: number;
    quantity: number;
  }[];
  total: number;
  status: "pending" | "paid";
  createdAt: string;
  customer?: ShopUser | null;
};

export type AdminSummary = {
  products: number | null;
  customers: number | null;
  orders: number | null;
  pendingOrders: number | null;
  orderValue: number | null;
  paidOrders: number | null;
  activeCustomers: number | null;
  photoCount: number | null;
  latestOrders: ShopOrder[];
  collections: { category: ShopProduct["category"]; count: number }[];
};

export type AdminAccount = ShopUser & { manageable: boolean };

export type AdminRole = {
  id: string;
  name: string;
  nameAr: string;
  permissions: AdminPermission[];
  builtin: boolean;
  assignedUsers: number;
  editable: boolean;
};

export type AdminPhoto = {
  id: string;
  url: string;
  name: string;
  size: number;
  contentType: string;
  status: "ready" | "deleting";
  usedBy: { id: string; name: string; nameAr: string }[];
  createdAt: string;
};
