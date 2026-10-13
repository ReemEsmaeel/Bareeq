import type { NextRequest } from "next/server";
import mongoose from "mongoose";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { checkOrigin, handle, HttpError } from "@/lib/http";
import { readCart } from "@/lib/cart";
import { publicOrder } from "@/lib/serialize";
import { rateLimit } from "@/lib/rate-limit";
import { User } from "@/models/User";
import { Order } from "@/models/Order";
import type { ShopOrder } from "@/lib/types";

export async function GET() {
  return handle(async () => {
    const user = await requireUser();
    const orders = await Order.find({ user: user._id }).sort({ createdAt: -1 }).lean();
    return orders.map(publicOrder);
  });
}

export async function POST(request: NextRequest) {
  return handle(async () => {
    checkOrigin(request);
    const sessionUser = await requireUser();
    const { quote } = z.object({ quote: z.string().regex(/^[a-f\d]{64}$/i) }).strict().parse(await request.json());
    await rateLimit(request, "order", 30, 10, sessionUser.email);
    const session = await mongoose.startSession();
    let result: ShopOrder | undefined;
    try {
      await session.withTransaction(async () => {
        const user = await User.findById(sessionUser._id).session(session);
        if (!user?.active || user.authVersion !== sessionUser.authVersion) {
          throw new HttpError(401, "Your session is no longer valid. Please sign in again.");
        }
        const cart = await readCart(user, session);
        if (!cart.items.length) throw new HttpError(400, "Your bag is empty.");
        if (cart.quote !== quote) {
          throw new HttpError(409, "Your bag or its prices changed. Review the updated bag before placing your order.");
        }
        const [order] = await Order.create([{
          user: user._id,
          items: cart.items.map((item) => ({
            product: item.product.id,
            name: item.product.name,
            nameAr: item.product.nameAr,
            quantity: item.quantity,
            price: item.product.price,
          })),
          total: cart.total,
          status: "pending",
        }], { session });
        user.cart = [];
        await user.save({ session });
        result = publicOrder(order);
      });
      if (!result) throw new HttpError(500, "Your order could not be recorded.");
      return result;
    } finally {
      await session.endSession();
    }
  }, 201);
}
