# Shop outcome analytics

The independent Next.js shop uses only the optional tracker supplied by Replit.
No tracker script, website ID, analytics environment variable, or third-party
dependency is configured by the app.

| Event | Successful action | Dimensions |
| --- | --- | --- |
| `account_created` | Signup request succeeds, before session refresh/navigation | None |
| `add_to_bag` | Add request succeeds and returns the added piece | `collection` (Lujain, Rawnaq, Wahaj), `quantity` added, `value_sar` of that addition |
| `order_recorded` | Server returns a newly saved order | `quantity` summed from recorded items, `value_sar` from the saved order total |

Order value is **not collected revenue**: placing an order never charges payment.
No names, emails, passwords, tokens, customer/product/order identifiers, bag
quotes, URLs, or free-form text are included in these custom-event payloads.
The wrapper projects only the allowed scalar dimensions and rejects invalid
collection/quantity/value data.

Events live in success handlers, never page-load effects or order-detail views.
Failed requests, login, guest redirects, cart edits, and reloads emit nothing.
Each successful addition is a separate interaction, not a unique customer.
There is no event persistence, retry, replay, or identity-based deduplication.
Missing, blocked, throwing, or rejecting trackers cannot fail an action or delay
navigation. Events can be missed before tracker readiness or when tracking is
blocked; these are directional funnel counts, not an accounting ledger or
identified customer journeys.

Run the focused verification without database writes or real user accounts:

```sh
node artifacts/bareeq-shop/scripts/verify-analytics.mjs
pnpm --filter @workspace/bareeq-shop run typecheck
```

The verification exercises the actual handler bodies with stubbed API responses,
checks payloads and failure paths, and confirms no events execute on mount.
