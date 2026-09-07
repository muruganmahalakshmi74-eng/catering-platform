# Multi-Restaurant Catering Platform

A multi-tenant catering application: several restaurants share one deployment, each with its own
users, menu items, catering packages and orders — and no restaurant can ever see another's data.
Includes an AI-assisted recommendation endpoint that turns a plain-English catering request into
ranked package suggestions drawn **only** from the restaurant the user is signed in to.

**Stack:** Node.js · Express 4 · MongoDB (Mongoose 8) · JWT · React 18 + Vite (bonus frontend)

---

## Table of contents

- [How to run](#how-to-run)
- [Architecture](#architecture)
- [Database design](#database-design)
- [API structure](#api-structure)
- [AI recommendation approach](#ai-recommendation-approach)
- [Frontend](#frontend-bonus)
- [Assumptions](#assumptions)

---

## How to run

**Prerequisites:** Node 18+, and MongoDB running locally (or a MongoDB Atlas connection string).

### 1. Backend

```bash
cd backend
npm install

cp .env.example .env      # then edit .env
```

`.env` must contain at least:

```ini
PORT=5000
MONGO_URI=mongodb://localhost:27017/catering_platform
JWT_SECRET=some_long_random_string
```

The server validates these on boot and exits with a clear message if either is missing.

```bash
npm run seed    # creates 2 restaurants, 4 users, 12 menu items, 5 packages, 2 orders
npm run dev     # http://localhost:5000  (or: npm start)
```

### 2. Frontend (optional bonus)

```bash
cd frontend
npm install
cp .env.example .env      # VITE_API_URL=http://localhost:5000/api
npm run dev               # http://localhost:5173
```

### Seeded logins

All use the password `123456`. Each account only ever sees its own restaurant.

| Email | Role | Restaurant |
|---|---|---|
| `admin@spiceparadise.com` | admin | Spice Paradise (pure veg) |
| `staff@spiceparadise.com` | staff | Spice Paradise |
| `admin@royalfeast.com` | admin | Royal Feast (veg + non-veg) |
| `staff@royalfeast.com` | staff | Royal Feast |

### Quick smoke test

```bash
# 1. Log in and capture the token + restaurant id
curl -s -X POST http://localhost:5000/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin@spiceparadise.com","password":"123456"}'

TOKEN=...   # token from the response
RID=...     # restaurant._id from the response

# 2. Read the restaurant's own data
curl http://localhost:5000/api/restaurants/$RID/menu     -H "Authorization: Bearer $TOKEN"
curl http://localhost:5000/api/restaurants/$RID/packages -H "Authorization: Bearer $TOKEN"
curl http://localhost:5000/api/restaurants/$RID/orders   -H "Authorization: Bearer $TOKEN"

# 3. AI recommendation
curl -X POST http://localhost:5000/api/restaurants/$RID/recommend \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"query":"I need vegetarian catering for 30 people with a budget of ₹20,000."}'

# 4. Tenant isolation — using another restaurant's id returns 403
curl -i http://localhost:5000/api/restaurants/<OTHER_RESTAURANT_ID>/menu \
  -H "Authorization: Bearer $TOKEN"
```

---

## Architecture

```
┌──────────────────────┐        JWT in Authorization header
│  React + Vite (SPA)  │ ─────────────────────────────────────┐
│  AuthContext         │                                      │
│  toastStore (toasts) │                                      ▼
└──────────────────────┘                        ┌─────────────────────────────┐
                                                │        Express API          │
                                                ├─────────────────────────────┤
                                                │ protect        (verify JWT) │
                                                │ adminOnly      (role gate)  │
                                                │ checkRestaurant (tenant gate)│
                                                ├─────────────────────────────┤
                                                │ controllers/  (validation)  │
                                                │ utils/recommendationService │
                                                ├─────────────────────────────┤
                                                │ errorHandler (typed errors) │
                                                └──────────────┬──────────────┘
                                                               ▼
                                                    ┌────────────────────┐
                                                    │      MongoDB       │
                                                    │ every row carries  │
                                                    │ a `restaurant` ref │
                                                    └────────────────────┘
```

### Layout

```
backend/
  server.js                       app bootstrap, env validation, route mounting
  config/db.js                    Mongoose connection
  models/                         Restaurant, User, MenuItem, CateringPackage, Order
  middleware/
    authMiddleware.js             protect (JWT) + adminOnly (role)
    restaurantMiddleware.js       tenant guard — the core of the isolation model
    errorMiddleware.js            maps Cast/Validation/duplicate/JWT errors to real status codes
  controllers/                    request validation + business rules
  utils/
    generateToken.js
    recommendationService.js      query parsing, scoring, explanation
  seed.js                         two fully separated sample restaurants

frontend/src/
  context/AuthContext.jsx         user + token, persisted to localStorage
  context/ToastContext.jsx        useToast() hook
  services/toastStore.js          framework-agnostic toast store
  services/api.js                 axios instance, auth header, 401 handling
  components/Toast.jsx            toast renderer
  pages/                          Home, Login, Dashboard
```

### How restaurant separation is enforced

Isolation is enforced in three layers, so no single mistake exposes another tenant's data:

1. **Data model** — every tenant-owned document (`User`, `MenuItem`, `CateringPackage`, `Order`)
   carries an indexed `restaurant` ObjectId.
2. **Route guard** — `checkRestaurantAccess` compares the `:restaurantId` in the URL against the
   restaurant on the authenticated user's token and returns **403** on any mismatch. It then sets
   `req.restaurantId` to the *token-derived* id.
3. **Query scoping** — controllers always filter by `req.restaurantId` (never a client-supplied
   value), so even a forged body cannot widen a query.

Identifiers that arrive in a **request body** rather than the URL are re-checked against the tenant
before use — for example, creating an order verifies the package belongs to your restaurant, and
creating a package verifies every menu item does too.

---

## Database design

MongoDB with Mongoose. A shared database with a mandatory `restaurant` discriminator on every
tenant-owned collection (see [Assumptions](#assumptions) for why this over a database-per-tenant).

```
Restaurant
  _id, name*, description, address*, phone, cuisine, image, timestamps

User
  _id, name*, email* (unique, lowercased), password* (bcrypt, min 6),
  restaurant* → Restaurant  [indexed],
  role: 'admin' | 'staff'   (default 'staff')

MenuItem
  _id, restaurant* → Restaurant  [indexed],
  name*, description, price* (≥ 0),
  category: 'starter'|'main'|'dessert'|'beverage'|'combo',
  isVeg [indexed], tags[], image, available

CateringPackage
  _id, restaurant* → Restaurant  [indexed],
  name*, description,
  items[] → MenuItem            (must belong to the same restaurant),
  pricePerPerson* (≥ 0), minGuests (10), maxGuests (500),
  isVeg [indexed], tags[], image, available

Order
  _id, restaurant* → Restaurant  [indexed],
  customerName*, customerPhone, customerEmail,
  cateringPackage* → CateringPackage,
  guestCount* (≥ 1), eventDate*, totalPrice*   (computed server-side),
  status: 'pending'|'confirmed'|'preparing'|'delivered'|'cancelled',
  specialRequests, createdBy → User
```

`*` = required.

**Indexes.** Single-field on every `restaurant` ref, plus compound
`{restaurant, isVeg, price}` on `MenuItem` and `{restaurant, isVeg, pricePerPerson}` on
`CateringPackage` — these match the recommendation engine's access pattern exactly (always
tenant-first, then diet, then price).

**Relationships.** `User → Restaurant` (many-to-one), `MenuItem → Restaurant` (many-to-one),
`CateringPackage → Restaurant` + many-to-many to `MenuItem`, `Order → Restaurant` + one package.

---

## API structure

Base URL: `http://localhost:5000`. All responses are JSON. Authenticated routes need
`Authorization: Bearer <token>`.

### Auth

| Method | Endpoint | Access | Notes |
|---|---|---|---|
| `POST` | `/api/auth/login` | Public | `{email, password}` → user + `token` (30d) |
| `POST` | `/api/auth/register` | **Admin** | `{name, email, password, role?}` — creates a user **in the admin's own restaurant** |
| `GET` | `/api/auth/profile` | JWT | Current user |

Registration is deliberately not public — see [Assumptions](#assumptions).

### Restaurants, menu, packages, orders

| Method | Endpoint | Access | Notes |
|---|---|---|---|
| `GET` | `/api/restaurants` | JWT | Returns only the caller's own restaurant |
| `GET` | `/api/restaurants/:id` | JWT + own | Restaurant profile |
| `GET` | `/api/restaurants/:id/menu` | JWT + own | Filters: `?category=`, `?isVeg=`, `?available=` |
| `POST` | `/api/restaurants/:id/menu` | JWT + own | `{name, price, category?, isVeg?, tags?}` |
| `GET` | `/api/restaurants/:id/packages` | JWT + own | Filters: `?isVeg=`, `?available=`, `?maxPricePerPerson=` |
| `POST` | `/api/restaurants/:id/packages` | JWT + own | `{name, pricePerPerson, minGuests?, maxGuests?, items?}` |
| `GET` | `/api/restaurants/:id/orders` | JWT + own | Filter: `?status=` |
| `POST` | `/api/restaurants/:id/orders` | JWT + own | See validation below |
| `PATCH` | `/api/restaurants/:id/orders/:orderId/status` | JWT + own | `{status}` |
| `POST` | `/api/restaurants/:id/recommend` | JWT + own | `{query}` — AI recommendation |
| `GET` | `/api/health` | Public | Liveness check |

### Order validation

Creating an order enforces, in order: required fields present · `cateringPackage` is a valid id ·
`guestCount` is a whole number ≥ 1 · email/phone well-formed if supplied · `eventDate` parses and is
not in the past · the package exists · **the package belongs to your restaurant** (403) · the package
is available · `guestCount` is inside the package's `minGuests…maxGuests` range.

`totalPrice` is always computed server-side as `pricePerPerson × guestCount`; a client-supplied
total is ignored.

### Error format

```json
{ "message": "guestCount must be between 10 and 50 for 'Veg Delight - Economy'" }
```

(`stack` is included in development only.)

| Status | Meaning |
|---|---|
| `400` | Validation failure, malformed ObjectId, bad enum value |
| `401` | Missing / invalid / expired token, bad credentials |
| `403` | Authenticated, but the resource belongs to another restaurant (or admin-only route) |
| `404` | Route or document not found |
| `409` | Duplicate — e.g. an email already registered |
| `500` | Unexpected server error |

---

## AI recommendation approach

`POST /api/restaurants/:restaurantId/recommend` with
`{"query": "I need vegetarian catering for 30 people with a budget of ₹20,000."}`

The implementation is a deterministic **rule-based NLU + scoring ranker**
(`backend/utils/recommendationService.js`), structured as a retrieval-augmented pipeline:

**1. Parse** — extract structured intent from free text:

- **Diet** — vegetarian / non-vegetarian / unspecified. Non-veg markers are tested *before* veg
  markers (otherwise the substring "veg" inside "non-veg" inverts the request), and negations like
  "no chicken" are read as a vegetarian requirement.
- **Guest count** — `30 people`, `30 pax`, `party of 30`, `60 plates`, `for 30`.
- **Budget** — `₹20,000`, `Rs 20000`, `20k`, `1.5 lakh`, `under 45000`, and per-person forms like
  `₹700 per head`. The headcount phrase is blanked out first so the two numbers can't be confused.
  Whichever of total/per-person budget is missing is derived from the other.
- **Occasion** — wedding, corporate, birthday… used as a soft ranking signal.

Anything not confidently found stays `null` and is treated as "no constraint" rather than a guess.

**2. Retrieve** — the controller queries `CateringPackage` and `MenuItem` filtered by
`req.restaurantId`, which comes from the caller's **token**, not the request body. This is the
tenant-isolation guarantee for the AI feature: candidates outside the selected restaurant are
never loaded, so they cannot be recommended. A vegetarian request additionally filters at the
database level (a hard dietary constraint); a non-veg request keeps veg packages in the pool and
lets the ranker demote them.

**3. Score & explain** — each candidate starts at 50 and is adjusted:

| Signal | Effect |
|---|---|
| Diet matches the request | +20 |
| Vegetarian request, non-veg package | −40 (disqualifying) |
| Guest count inside `minGuests…maxGuests` | +15 |
| Guest count outside the range | −25 |
| Total within budget | up to +15, scaled by how well the budget is used |
| Total over budget | −30 |
| Occasion tag match / 4+ dishes | +5 / +3 |

Every adjustment appends a human-readable `reason` or `warning`, so each suggestion explains
itself ("₹19,500 total — ₹500 under budget"). Candidates with **no** warnings become
`recommendations`; the rest become `alternatives` with their trade-offs listed. Scoring rewards
using the budget well rather than simply being cheapest, so a ₹20,000 / 30-guest request returns
the ₹650/person package (₹19,500) ahead of the ₹450/person one.

**4. Fall back** — if no package fits, the engine suggests individual menu items within the
per-plate budget, so the answer is never empty.

### Response shape

```jsonc
{
  "restaurantId": "…",
  "parsed":  { "isVeg": true, "guestCount": 30, "budget": 20000, "budgetPerPerson": 666, "occasion": null },
  "explanation": "Looking for vegetarian, 30 guests, a ₹20,000 budget (₹666/person). Found 2 matching packages at this restaurant.",
  "recommendations": [
    { "type": "package", "package": { … }, "pricePerPerson": 650, "totalPrice": 19500,
      "matchScore": 100, "reasons": ["Fully vegetarian, as requested", "Serves 30 guests (range 20-200)",
      "₹19,500 total - ₹500 under budget"], "warnings": [], "fits": true }
  ],
  "alternatives": [],
  "menuItemSuggestions": [],
  "candidatesConsidered": 2
}
```

### Why rule-based, and the upgrade path

A deterministic engine was chosen so the feature runs offline, needs no API key or per-request cost,
returns identical results for identical input, and is unit-testable — useful properties for a
reviewable assignment. The trade-off is that it understands the phrasings it was designed for
rather than arbitrary language.

The pipeline is deliberately shaped so it can become full RAG without touching the controller or
the response contract:

- **Step 1 → LLM parse.** Replace `parseQuery` with a Claude call using structured outputs to emit
  the same `{isVeg, guestCount, budget, occasion}` object. Handles arbitrary phrasing and other
  languages.
- **Step 2 → vector retrieval.** Store an embedding per package at write time and retrieve by
  cosine similarity — **keeping the `restaurant` filter as a hard pre-filter**, which is what
  preserves tenant isolation.
- **Step 3 → LLM ranking.** Pass only the retrieved, already tenant-scoped packages to the model
  and have it rank and explain them. Because the candidate list is built server-side, the model
  cannot invent or leak another restaurant's offering.

---

## Frontend (bonus)

React 18 + Vite SPA at `http://localhost:5173`.

- **Login** — JWT stored via `AuthContext`; one-click demo account buttons.
- **Dashboard** — restaurant profile, AI recommendation panel, order creation, order list with
  inline status changes, packages and menu. Everything is scoped to the signed-in restaurant.
- **Protected routes** — `/dashboard` redirects to `/login` when signed out.
- **Toast notifications** — a dependency-free toast system (`services/toastStore.js` +
  `components/Toast.jsx`). Success / error / warning / info variants, auto-dismiss with a progress
  bar, manual close, `aria-live` announcements and reduced-motion support. Because the store lives
  outside React, the axios interceptor can raise a toast too — an expired session surfaces as a
  toast and a redirect rather than a silently empty screen.
- **Client-side validation** — guest ranges and required fields are checked before submitting, so
  the user gets one clear message instead of a round-trip 400.

---

## Assumptions

1. **One user belongs to exactly one restaurant.** There is no cross-restaurant or platform-owner
   role. `GET /api/restaurants` therefore returns only the caller's own restaurant.
2. **Registration is an admin action, not public.** A public endpoint accepting an arbitrary
   `restaurantId` would let anyone create an account inside any restaurant and read that tenant's
   data, which defeats the isolation requirement. Admins create users within their own restaurant;
   the initial accounts come from the seed script.
3. **Shared database with a tenant discriminator**, rather than a database per restaurant. Simpler
   to operate and index at this scale; the guard middleware plus mandatory `restaurant` field give
   the isolation guarantee. A database-per-tenant model would be the next step if per-customer
   backup or residency requirements appeared.
4. **Budget in a query means the total event budget** unless phrased per-person — ₹20,000 for 30
   guests is read as ₹666/person.
5. **`isVeg` is a package-level flag.** A package is vegetarian only if the whole package is; there
   is no partial/mixed classification.
6. **A vegetarian request is a hard constraint; a non-vegetarian request is a preference.** Veg
   packages still appear as alternatives for a non-veg request, but never the reverse.
7. **Orders are staff-created on behalf of a customer.** Customers are captured as free-text
   contact details, not as platform user accounts, so there is no customer-facing auth.
8. **Prices are in INR**, whole rupees, and `totalPrice` is always `pricePerPerson × guestCount` —
   no taxes, delivery fees, discounts or payment processing.
9. **Event dates may be today or later.** Same-day orders are allowed; past dates are rejected.
10. **JWTs last 30 days and are not refreshed or revocable.** Adequate for a demo; production would
    want short-lived access tokens plus refresh tokens.
11. **Currency/locale formatting is Indian (`en-IN`)** throughout the UI.
