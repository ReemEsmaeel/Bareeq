# Bareeq Atelier — Independent Shop

This app is separate from the existing Bareeq Atelier deployment. Its server and
pages use Next.js App Router, TypeScript, and Tailwind. MongoDB Atlas is accessed
through Mongoose; the shared Express/PostgreSQL scaffold is not used by this shop.

## Configuration

Keep these values in Replit Secrets, never in source files:

- `MONGODB_URI`: the MongoDB Atlas database-user connection string.
- `JWT_SECRET`: a long random value for the later login-session milestone.

The connection explicitly selects `bareeq_independent_shop`, regardless of the
database named in the URI, to avoid using the original boutique's database.
The Atlas database user must have read/write access to that independent database.

## Commands

From the workspace:

```sh
pnpm --filter @workspace/bareeq-shop run typecheck
pnpm --filter @workspace/bareeq-shop run seed
```

The managed shop workflow runs `pnpm --filter @workspace/bareeq-shop run dev`.
Production uses `next build` followed by `next start`.

The seed adds the four requested sample products without overwriting existing
records. Sample product imagery currently uses the generated editorial artwork;
it is illustrative, not photography of the actual products.

## Server routes

The shop's Next.js routes are under `/api/shop` to avoid the existing workspace
service mounted at `/api`. The health route checks the MongoDB connection.
Product data is read from MongoDB, with no hardcoded product fallback.

## MongoDB troubleshooting

An authentication error usually means the Atlas **database user** or its password
does not match the connection string. This is different from the Atlas account
used to sign into the Atlas website. Update the secret using the connection string
from **Connect → Drivers**, inserting the database-user password and percent-encoding
reserved characters in it. Do not put the connection string in chat.
