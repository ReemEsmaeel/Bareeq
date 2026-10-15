import mongoose from "mongoose";
import { HttpError } from "./http";

type ConnectionCache = {
  connection: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
};

const globalForMongo = globalThis as typeof globalThis & {
  bareeqMongo?: ConnectionCache;
};
const cache = (globalForMongo.bareeqMongo ??= {
  connection: null,
  promise: null,
});

export async function connectDB() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new HttpError(503, "MONGODB_URI is missing from this deployment's server-side environment variables.");
  if (cache.connection) return cache.connection;
  cache.promise ??= mongoose.connect(uri, {
    // Intentionally isolated from any database used by the original boutique.
    dbName: "bareeq_independent_shop",
    serverSelectionTimeoutMS: 10000,
    bufferCommands: false,
  });
  try {
    cache.connection = await cache.promise;
    return cache.connection;
  } catch {
    cache.promise = null;
    throw new HttpError(
      503,
      "The shop database is unavailable. Check MongoDB Atlas credentials and network access for this deployment.",
    );
  }
}
