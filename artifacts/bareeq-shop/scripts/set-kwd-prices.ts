import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import { Product } from "@/models/Product";

async function main() {
  await connectDB();
  try {
    const products = await Product.find().select("name price").sort({ name: 1 }).lean();
    if (!products.length) throw new Error("The catalog is empty; no prices were changed.");

    console.log("Catalog price review (stored price → 50 KWD):");
    for (const product of products) {
      console.log(`- ${product.name}: ${product.price} → 50`);
    }

    if (!process.argv.includes("--apply")) {
      console.log("Dry run only. Pass --apply to set these four product prices.");
      return;
    }

    const productIds = products.map((product) => product._id);
    const result = await Product.updateMany(
      { _id: { $in: productIds } },
      { $set: { price: 50 } },
    );
    if (result.matchedCount !== productIds.length) {
      throw new Error("The catalog changed while applying prices; verify the products before retrying.");
    }

    const updated = await Product.find({ _id: { $in: productIds } })
      .select("name price").sort({ name: 1 }).lean();
    if (updated.length !== productIds.length || updated.some((product) => product.price !== 50)) {
      throw new Error("Price verification failed after the update.");
    }
    console.log(`Verified all ${updated.length} catalog products at 50 KWD. Order records were not modified.`);
  } finally {
    await mongoose.disconnect();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : "Price update failed.");
  process.exitCode = 1;
});
