# Bareeq Atelier — Independent Shop

This app is separate from the existing Bareeq Atelier deployment. Its server and
pages use Next.js App Router, TypeScript, and Tailwind. MongoDB Atlas is accessed
through Mongoose; the shared Express/PostgreSQL scaffold is not used by this shop.

## Configuration

Keep these values in Replit Secrets, never in source files:

- `MONGODB_URI`: the MongoDB Atlas database-user connection string.
- `JWT_SECRET`: at least 32 random characters (64 recommended) for signed sessions.

The connection explicitly selects `bareeq_independent_shop`, regardless of the
database named in the URI, to avoid using the original boutique's database.
The Atlas database user must have read/write access to that independent database.

## Commands

From the workspace:

```sh
pnpm --filter @workspace/bareeq-shop run typecheck
pnpm --filter @workspace/bareeq-shop run seed
pnpm --filter @workspace/bareeq-shop run build
pnpm --filter @workspace/bareeq-shop run verify:auth
pnpm --filter @workspace/bareeq-shop run verify:shop
pnpm --filter @workspace/bareeq-shop run verify:admin
pnpm --filter @workspace/bareeq-shop run verify:sessions
pnpm --filter @workspace/bareeq-shop run verify:unavailable-cart
```

The managed shop workflow runs `pnpm --filter @workspace/bareeq-shop run dev`.
Production uses `next build` followed by `next start`.

The seed adds the four requested sample products without overwriting existing
records. Sample product imagery currently uses the generated editorial artwork;
it is illustrative, not photography of the actual products.

Verification scripts run against the local preview, generate temporary accounts
and products, and clean up their own records. They never print credentials or
password hashes. Avoid repeatedly running them inside the authentication
rate-limit window.

## Private first-admin setup

Add two bootstrap-only values through Replit Secrets:

- `ADMIN_EMAIL`: the email for the explicitly configured first administrator.
- `ADMIN_PASSWORD`: at least 8 characters and at most 72 bytes.

Then run:

```sh
pnpm --filter @workspace/bareeq-shop run create-admin
```

The script creates the first administrator privately, hashes its password, and
records a one-time bootstrap lock. If the email already belongs to a customer,
the supplied password must match that account's current password before it is
promoted. Promotion invalidates old sessions, so sign in again.
Re-running for the same administrator does not reset its password; configuring
another administrator through first-admin setup is blocked.

There is no public promotion or bootstrap endpoint. Public signup always creates
a customer and rejects role fields. You may remove `ADMIN_PASSWORD` from Secrets
after successful setup; application runtime only needs `MONGODB_URI` and
`JWT_SECRET`.

## Features and manual checks

- `/`: bilingual editorial home with featured products loaded from MongoDB.
- `/products` and `/products/[id]`: collection filtering, name search, product
  details, SAR prices, and adding quantities to a bag.
- `/signup`, `/login`, `/account`: signup/login/logout and protected name/password
  updates. Names appear in navigation; emails are read-only. Password changes
  invalidate older sessions.
- `/cart`: protected, user-specific persistent quantities, removal and clearing.
  Try signing out and back in to verify the saved bag.
- `/orders` and `/orders/[id]`: protected customer-owned order history. Place an
  order from the bag and verify its saved item names, quantities and prices.
- `/admin`: database-derived overview and protected navigation.
- `/admin/products`: create/edit/delete bilingual products. Deletion removes a
  piece from browsing and bags, while previous order snapshots remain.
- `/admin/orders`: list all orders and manually record pending/paid status.
- `/admin/customers`: list/edit customer names and activate/deactivate accounts.
  Deactivation immediately invalidates sessions and prevents login; reactivation
  requires a new login. Orders remain. No role or password-hash editing is exposed.

Order placement records a pending order in MongoDB and atomically clears the bag.
All prices are computed server-side. A changed bag or price must be reviewed
before placement. Concurrent submissions cannot create duplicate orders from
the same bag. **No payment or charge is taken, and no Stripe integration exists.**
The paid status is a manual record, not a charge made by this app.

Switch English/Arabic and check the customer/admin pages at phone and desktop
widths. Unauthenticated protected-page visits go to sign-in. Customers visiting
admin pages go to their account, while admin APIs return 403.

Only necessary account data is stored: name, email, password hash, role/session
state, cart and order records. API responses use explicit field allowlists and
never expose hashes. Authentication attempts are rate-limited using expiring
hashed identifiers. Mutating routes enforce same-origin requests.

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
