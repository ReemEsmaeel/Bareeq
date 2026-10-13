export type ShopUser = {
  id: string;
  name: string;
  email: string;
  role: "customer" | "admin";
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
  products: number;
  customers: number;
  orders: number;
  pendingOrders: number;
  orderValue: number;
};
