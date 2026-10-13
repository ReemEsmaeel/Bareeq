import mongoose from "mongoose";

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
  if (!uri) throw new Error("MONGODB_URI is missing. Add it in Replit Secrets.");
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
    throw new Error(
      "The shop database is unavailable. Check your MongoDB Atlas connection and network access settings.",
    );
  }
}
