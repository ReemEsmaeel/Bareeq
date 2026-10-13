import { createHash } from "node:crypto";
import mongoose, { type ClientSession } from "mongoose";
import { Product } from "@/models/Product";
import { User } from "@/models/User";
import { publicProduct } from "./serialize";
import { HttpError } from "./http";
import type { CartItem, ShopCart, ShopProduct } from "./types";

export async function readCart(user: any, session?: ClientSession): Promise<ShopCart> {
  const products = await Product.find({
    _id: { $in: user.cart.map((item: any) => item.product) },
  }).session(session || null).lean();
  const byId = new Map<string, ShopProduct>(
    products.map((product: any) => [String(product._id), publicProduct(product)]),
  );
  const items: CartItem[] = user.cart.flatMap((item: any) => {
    const product = byId.get(String(item.product));
    return product ? [{ product, quantity: item.quantity }] : [];
  });
  const total = items.reduce(
    (sum, item) => sum + Math.round(item.product.price * 100) * item.quantity,
    0,
  ) / 100;
  const quote = createHash("sha256").update(JSON.stringify(
    items.map((item) => [item.product.id, item.quantity, item.product.price]),
  )).digest("hex");
  return { items, total, quote, removedItems: items.length !== user.cart.length };
}

export async function mutateCart(
  userId: string,
  productId: string | null,
  quantity: number,
  mode: "add" | "set" | "clear",
) {
  const session = await mongoose.startSession();
  let result: ShopCart | undefined;
  try {
    await session.withTransaction(async () => {
      const user = await User.findById(userId).session(session);
      if (!user?.active) throw new HttpError(401, "Please sign in again.");
      if (mode === "clear") {
        user.cart = [];
      } else {
        const available = await Product.find({
          _id: { $in: user.cart.map((item: any) => item.product) },
        }).select("_id").session(session).lean();
        const availableIds = new Set(available.map((item: any) => String(item._id)));
        user.cart = user.cart.filter((item: any) => availableIds.has(String(item.product)));
        if (quantity > 0 && !(await Product.exists({ _id: productId }).session(session))) {
          throw new HttpError(404, "This piece is no longer available.");
        }
        const existing = user.cart.find((item: any) => String(item.product) === productId);
        const nextQuantity = mode === "add" ? (existing?.quantity || 0) + quantity : quantity;
        if (nextQuantity > 20) throw new HttpError(400, "You can add at most 20 of a single piece.");
        if (nextQuantity === 0) {
          user.cart = user.cart.filter((item: any) => String(item.product) !== productId);
        } else if (existing) {
          existing.quantity = nextQuantity;
        } else {
          user.cart.push({ product: productId, quantity: nextQuantity });
        }
        if (user.cart.length > 40) throw new HttpError(400, "Your bag can contain at most 40 different pieces.");
      }
      await user.save({ session });
      result = await readCart(user, session);
    });
    if (!result) throw new HttpError(500, "Your bag could not be updated.");
    return result;
  } finally {
    await session.endSession();
  }
}
