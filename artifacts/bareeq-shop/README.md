# Bareeq Atelier — Independent Shop

This app is separate from the existing Bareeq Atelier deployment. Its server and
pages use Next.js App Router, TypeScript, and Tailwind. MongoDB Atlas is accessed
through Mongoose; the shared Express/PostgreSQL scaffold is not used by this shop.

## Configuration

Keep these values in Replit Secrets, never in source files:

- `MONGODB_URI`: the MongoDB Atlas database-user connection string.
- `JWT_SECRET`: at least 32 random characters (64 recommended) for signed sessions.

Photo bytes and metadata live in the shop's independent MongoDB database.
No additional storage provider, token, or subscription is required at runtime.
New uploads are limited to 4 MiB (below Vercel's request limit), decoded, stripped
of metadata, resized to at most 2400 pixels and compressed to WebP. Photos count
toward the Atlas storage allowance. The shop retains its own JWT authentication
and Next.js route handlers; no separate upload server is added.

The one-time `scripts/migrate-photos-to-mongo.ts` script copies the independent
shop's legacy Replit photos without deleting originals or changing product URLs.
Run it in Replit with `pnpm --filter @workspace/bareeq-shop exec tsx
scripts/migrate-photos-to-mongo.ts` for a dry-run; append `--apply` to copy.
It verifies copied bytes by SHA-256, refuses destination conflicts, and requires
the old `PRIVATE_OBJECT_DIR` only during migration. Deploy the updated shop code
to Vercel after copying; its old code will still try to use Replit storage.

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
pnpm --filter @workspace/bareeq-shop run verify:photos
pnpm --filter @workspace/bareeq-shop run verify:settings
pnpm --filter @workspace/bareeq-shop run verify:order-protection
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
after successful setup. Core shop runtime needs `MONGODB_URI` and `JWT_SECRET`;
photo features use the same MongoDB connection.

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
  Both pages require a valid signed session before rendering. Missing, tampered,
  expired or revoked tokens redirect to login, preserving the requested page.
  The matching APIs return 401 without a valid session and never return another
  customer's orders. Tokens must include issue-time, expiry and session-revision
  claims, and be no older than seven days.
- `/admin`: database-derived overview, collection counts, recent orders,
  photo counts, and protected links to all management pages.
- `/admin/products`: create/edit/delete bilingual products. Deletion removes a
  piece from browsing and bags, while previous order snapshots remain.
- `/admin/photos`: upload, search, view product usage, and permanently delete
  public product photographs. JPEG, PNG, and WebP are supported up to 4 MiB.
  Product forms can upload/select a library photo or keep an HTTPS/local image.
  Removing a form's photo resets the illustrative default after saving; deleting
  a library photo permanently removes its stored file and resets all products
  that use it. Confirmation explains this before deletion.
- `/admin/orders`: list all orders and manually record pending/paid status.
- `/admin/customers`: list/edit customer names and activate/deactivate accounts.
  Deactivation immediately invalidates sessions and prevents login; reactivation
  requires a new login. Orders remain. No role or password-hash editing is exposed.
- `/admin/settings`: add/edit/delete admin and staff accounts, assign roles,
  activate/deactivate accounts, and set/reset passwords. Create/edit/delete
  bilingual custom roles with Products, Photos, Orders, Customers, and Admin
  Settings permissions. The built-in Administrator and Customer roles are
  immutable. Delete confirmations explain permanent removal of login/profile/
  cart data; historical order snapshots remain.

Custom role permissions are resolved from MongoDB on every authorized server
request. A signed JWT carries an identity/session revision, not trusted roles.
Admin navigation and overview data are permission-filtered; APIs and individual
server pages enforce the same restrictions. Settings managers cannot grant
permissions they do not have or manage higher-privilege accounts/roles. Only a
full built-in Administrator can create or manage other full administrators.
Assigned custom roles cannot be deleted until their accounts are reassigned or
removed. Account role, email, password or activation changes revoke old sessions;
permission changes revoke sessions for every account assigned to that role.
Self role changes, deactivation and deletion are blocked. A shared transactional
lock serializes access changes, re-checks the actor, and preserves at least one
active full administrator even during concurrent requests. Public signup still
creates customers only; administrator creation is not public.

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

Photo upload/delete/list operations require a current database administrator role.
Uploads go to private MongoDB staging through an authenticated, same-origin route
using an owner-bound ten-minute ticket. Completion checks
the actual file bytes, type and size before publishing the verified bytes to a
different path, so a remaining upload URL cannot overwrite a public photo.
Only completed photos are publicly served, with explicit MIME types and
`nosniff`. Product attachment and deletion serialize in MongoDB transactions.
If physical deletion fails, a hidden `deleting` record remains for a visible
retry rather than falsely reporting success. Never upload sensitive files.
Abandoned staging blobs expire automatically after 15 minutes through a MongoDB
TTL index and cannot be read after expiry even before the cleanup runs. Published
blobs have no expiry. Binary fields are excluded from metadata/list queries.

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
