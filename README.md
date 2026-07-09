# Medicare BD — Bangladeshi Pharmacy E-Commerce Platform

> A full-stack, production-grade e-commerce platform for a Bangladeshi pharmacy chain — Bangla-first UI, cash-on-delivery + online payment, admin panel, courier integration, and a complete Playwright end-to-end test suite with Allure reporting.

![Home Page](screenshots/pages/01_home_top.png)

---

## Table of Contents

1. [Overview](#overview)
2. [Feature Highlights](#feature-highlights)
3. [Tech Stack](#tech-stack)
4. [Architecture](#architecture)
5. [Project Structure](#project-structure)
6. [Getting Started](#getting-started)
7. [Environment Variables](#environment-variables)
8. [Database & Auth](#database--auth)
9. [Payment Gateway Integration](#payment-gateway-integration)
10. [Courier Integration](#courier-integration)
11. [End-to-End Testing](#end-to-end-testing)
12. [Allure Reports](#allure-reports)
13. [Feature Screenshots](#feature-screenshots)
14. [Deployment](#deployment)
15. [Scripts Reference](#scripts-reference)
16. [License](#license)

---

## Overview

**Medicare BD** is a complete, Bangla-first pharmacy and wellness storefront built for the Bangladeshi market. Customers browse vitamins, skincare, hair care, and supplements in Bangla, add them to a persistent cart, and check out with either **Cash on Delivery** or a **partial online advance** paid through **UddoktaPay** (bKash / Nagad / Rocket). Admins manage products, orders, customers, coupons, banners, chat, and abandoned carts from a role-gated dashboard.

The project is a single deployable unit — storefront **and** admin — powered by **TanStack Start** (SSR + edge server functions) with **Supabase** as the managed backend. It runs on **Cloudflare Workers** with a virtual filesystem, so there is no separate Node backend to operate.

---

## Feature Highlights

### Storefront
- Bangla-first UI (Hind Siliguri typography), fully responsive from 390px mobile to desktop
- Announcement ticker, sticky header with live cart badge, mega-search
- Categories, featured products, promo banners, customer reviews, "us vs. others" comparison, feature grid, money-back guarantee section
- Product catalog with search (`?q=`), category filter (`?cat=`), sort, pagination
- Product detail page with gallery, stock display, quantity selector, add-to-cart, buy-now
- Persistent cart (Zustand + localStorage for guests, DB-backed for logged-in users)
- Guest checkout **and** authenticated checkout
- COD **and** partial online advance via UddoktaPay (bKash / Nagad / Rocket)
- Order tracking (`/track`) by order ID + phone — no account required
- Downloadable order invoice with embedded Bangla font
- Live chat widget (`/admin/chat` on the backend)

### Auth & Accounts
- Email/password + Google OAuth
- Customer dashboard: order history, review management, saved addresses
- Password reset flow

### Admin Panel (role-gated via `has_role('admin')`)
- **Dashboard** — revenue, orders today, low-stock alerts, abandoned carts
- **Orders** — filter by status/payment, mark paid / shipped / delivered
- **Products / Categories / Brands** — full CRUD, images, stock, featured toggle
- **Coupons** — percentage / fixed discounts with expiry
- **Customers** — list, detail, order history
- **Chat** — respond to live-chat messages from the storefront
- **Abandoned Cart Recovery** — incomplete checkouts + customer contact
- **Banners / Announcements** — control the homepage promo slots and ticker
- **Settings** — delivery fee, advance %, contact info

### Integrations
- **UddoktaPay** — hosted checkout for bKash / Nagad / Rocket (personal & agent)
- **Steadfast Courier** — automated delivery consignment creation & status sync
- **Facebook Pixel + Conversions API** — server-side ad-attribution events
- **SEO** — per-route `<head>` meta, sitemap.xml, robots.txt, JSON-LD Organization schema

### Quality
- **20 automated end-to-end tests** with Playwright (Python)
- **Allure** reports with epic → feature → story hierarchy and per-test screenshots

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Framework** | [TanStack Start](https://tanstack.com/start) v1 (SSR + Server Functions) |
| **Frontend** | React 19, TanStack Router, TanStack Query, Zustand |
| **UI** | shadcn/ui, Radix Primitives, Tailwind CSS v4 (native CSS `@theme`) |
| **Language** | TypeScript (strict) |
| **Build** | Vite 7 |
| **Runtime** | Cloudflare Workers (edge) with `nodejs_compat` |
| **Database** | Supabase — PostgreSQL + Row-Level Security |
| **Auth** | Supabase Auth (email/password + Google OAuth) |
| **Storage** | Supabase Storage (product images, banners) |
| **Payments** | UddoktaPay (bKash / Nagad / Rocket) |
| **Courier** | Steadfast Courier API |
| **Analytics** | Facebook Pixel + Conversions API (server-side) |
| **Testing** | Playwright (Python), pytest, Allure |
| **Icons** | lucide-react |

---

## Architecture

The application is a single edge-deployed TanStack Start app. The client renders React 19; every data read goes through TanStack Query, which either hydrates from an SSR loader (edge) or calls a server function. Server functions run on Cloudflare Workers with Supabase as the backing store. External integrations (UddoktaPay, Steadfast, Facebook CAPI, BD Courier fraud) are called from public API routes under `/api/public/*` and secured with signature / bearer verification.

### System diagram

```mermaid
graph TB
  User((👤 Shopper)):::user
  Admin((🛡️ Admin)):::admin

  subgraph Client["🌐 Browser (Client)"]
    direction TB
    UI["React 19 UI<br/>shadcn/ui + Tailwind v4"]:::client
    Router["TanStack Router<br/>File-based routes"]:::client
    Query["TanStack Query<br/>Cache + SWR"]:::client
    Cart["Zustand Cart<br/>localStorage"]:::client
    Pixel["Facebook Pixel<br/>browser events"]:::client
  end

  subgraph Edge["⚡ Edge Runtime — Cloudflare Workers"]
    direction TB
    SSR["TanStack Start SSR<br/>Vite 7 build"]:::edge
    ServerFns["createServerFn<br/>Typed RPC"]:::edge
    APIRoutes["Public API routes<br/>/api/public/*"]:::edge
    Sitemap["sitemap.xml<br/>robots.txt"]:::edge
  end

  subgraph Backend["🗄️ Supabase Backend"]
    direction TB
    Auth["Auth<br/>Email + Google OAuth"]:::backend
    DB[("PostgreSQL<br/>Row-Level Security")]:::db
    Storage["Object Storage<br/>Product images"]:::backend
    RPC["SECURITY DEFINER<br/>has_role() · fraud RPC"]:::backend
  end

  subgraph External["🔌 External Integrations"]
    direction TB
    Uddokta["💳 UddoktaPay<br/>bKash · Nagad · Rocket"]:::pay
    Steadfast["📦 Steadfast Courier<br/>Delivery API"]:::ship
    FBCAPI["📊 Facebook CAPI<br/>Server-side ads"]:::analytics
    BDCourier["🛡️ BD Courier<br/>Fraud check"]:::analytics
  end

  subgraph QA["🧪 Quality Assurance"]
    direction TB
    PW["Playwright · Python<br/>20 E2E scenarios"]:::qa
    Allure["Allure Reports<br/>Epic → Feature → Story"]:::qa
  end

  User -->|HTTPS| UI
  Admin -->|"/admin (gated)"| UI
  UI --> Router --> Query
  UI --> Cart
  UI --> Pixel
  Router --> SSR
  Query -->|hydrate| SSR
  SSR --> ServerFns
  Query -->|RPC| ServerFns
  ServerFns --> Auth
  ServerFns --> DB
  ServerFns --> Storage
  ServerFns --> RPC
  ServerFns --> BDCourier
  APIRoutes --> DB
  Sitemap --> DB

  UI -->|"Pay advance"| APIRoutes
  APIRoutes -->|"/checkout-v2"| Uddokta
  Uddokta -.callback.-> APIRoutes
  APIRoutes -->|"Create consignment"| Steadfast
  Steadfast -.status webhook.-> APIRoutes
  Pixel -.dedupe.-> FBCAPI
  APIRoutes --> FBCAPI

  PW -.drives.-> UI
  PW --> Allure

  classDef user fill:#fef3c7,stroke:#d97706,stroke-width:2px,color:#78350f
  classDef admin fill:#fee2e2,stroke:#dc2626,stroke-width:2px,color:#7f1d1d
  classDef client fill:#dbeafe,stroke:#2563eb,stroke-width:2px,color:#1e3a8a
  classDef edge fill:#ede9fe,stroke:#7c3aed,stroke-width:2px,color:#4c1d95
  classDef backend fill:#dcfce7,stroke:#16a34a,stroke-width:2px,color:#14532d
  classDef db fill:#bbf7d0,stroke:#15803d,stroke-width:3px,color:#052e16
  classDef pay fill:#fce7f3,stroke:#db2777,stroke-width:2px,color:#831843
  classDef ship fill:#ffedd5,stroke:#ea580c,stroke-width:2px,color:#7c2d12
  classDef analytics fill:#cffafe,stroke:#0891b2,stroke-width:2px,color:#164e63
  classDef qa fill:#fef9c3,stroke:#ca8a04,stroke-width:2px,color:#713f12
```

### Payment & order lifecycle

```mermaid
sequenceDiagram
  autonumber
  actor U as 👤 Shopper
  participant C as 🖥️ Checkout UI
  participant S as ⚡ Server Function
  participant DB as 🗄️ Supabase
  participant P as 💳 UddoktaPay
  participant CB as 🔁 Callback Route
  participant SF as 📦 Steadfast

  U->>C: Fill address · pick payment
  C->>S: createServerFn createOrder(cart, address)
  S->>DB: INSERT orders + order_items (RLS-scoped)
  DB-->>S: order_id
  alt COD
    S-->>C: order_id · status=pending
    C->>U: Redirect /order/{id}
  else Partial online (advance)
    S->>P: POST /checkout-v2 (amount = delivery fee)
    P-->>S: payment_url · invoice_id
    S->>DB: UPDATE orders SET uddoktapay_invoice_id
    S-->>C: payment_url
    C->>U: Open UddoktaPay tab
    U->>P: bKash / Nagad / Rocket payment
    P->>CB: Redirect /api/public/uddoktapay/callback?invoice_id
    CB->>P: GET /verify-payment
    P-->>CB: paid=true · txn_id · sender_number
    CB->>DB: UPDATE orders paid_amount · payment_status=paid
    CB-->>U: Redirect /order/{id}?paid=1
    C->>C: Poll order until payment_status=paid
    C->>U: Show "পেমেন্ট সম্পন্ন" · invoice PDF
  end
  Note over S,SF: Admin ships from /admin/orders
  S->>SF: Create consignment
  SF-->>S: tracking_code
  SF-->>CB: Status webhook (in_review / delivered / cancelled)
  CB->>DB: UPDATE orders.status
```

### Request lifecycle

1. **Page navigation** — TanStack Router matches the URL against `src/routes/*` and runs the route's `loader()` on the edge (SSR) or in the browser (client transition).
2. **Loader** — Calls `context.queryClient.ensureQueryData(queryOptions)`; on the server this invokes a `createServerFn` handler that reads Supabase with the appropriate role (authenticated user vs. anon vs. service).
3. **Component render** — Reads the same query via `useSuspenseQuery`. No `useEffect` + `fetch`.
4. **Mutations** — Cart mutations write to Zustand + localStorage; checkout POSTs to a server function that creates an order row (RLS-scoped by `user_id` or nullable for guests).
5. **Payments** — `POST /api/payment/uddoktapay/create` calls UddoktaPay's `/checkout-v2` endpoint. On success the gateway redirects the shopper back to `/api/public/uddoktapay/callback`, which verifies the invoice via `/verify-payment`, updates the order, and redirects to the success page.

---

## Project Structure

```
.
├── src/
│   ├── routes/                     # File-based routes
│   │   ├── __root.tsx              # HTML shell, providers, global <head>
│   │   ├── _shop.tsx               # Storefront layout (header/footer/chat)
│   │   ├── _shop/
│   │   │   ├── index.tsx           # Home
│   │   │   ├── products/           # Listing + detail
│   │   │   ├── cart.tsx
│   │   │   ├── checkout.tsx
│   │   │   ├── order/$id.tsx       # Order success + tracking
│   │   │   ├── account.tsx
│   │   │   ├── login.tsx
│   │   │   ├── track.tsx
│   │   │   └── policy/             # Privacy, refund, terms
│   │   ├── admin.tsx               # Admin shell (role-gated)
│   │   ├── admin/                  # Orders, products, customers, ...
│   │   └── api/
│   │       ├── payment/uddoktapay/create.ts
│   │       └── public/
│   │           ├── uddoktapay/callback.ts
│   │           ├── steadfast/sync.ts
│   │           └── fb-capi.ts
│   ├── components/
│   │   ├── site/                   # Header, Footer, AnnouncementBar, ...
│   │   └── ui/                     # shadcn primitives
│   ├── lib/
│   │   ├── queries.ts              # TanStack Query keys + fetchers
│   │   ├── cart-store.ts           # Zustand cart
│   │   ├── format.ts               # BN digits, currency
│   │   └── *.functions.ts          # createServerFn modules
│   ├── integrations/supabase/      # Client + server + auth middleware
│   ├── hooks/
│   ├── styles.css                  # Tailwind v4 tokens + @theme
│   └── router.tsx
├── supabase/
│   ├── migrations/                 # SQL migrations (idempotent)
│   └── config.toml
├── tests/e2e/                      # Playwright Python test suite
│   ├── conftest.py
│   └── test_medicare.py
├── screenshots/
│   ├── pages/                      # Storefront feature captures
│   └── allure/                     # Allure dashboard captures
├── docs/
│   └── architecture.mmd
├── allure-results/                 # Raw test results (JSON)
├── allure-report/                  # Generated HTML report
├── pytest.ini
├── vite.config.ts
└── package.json
```

---

## Getting Started

### Prerequisites

- **Bun** 1.1+ (or npm 10+)
- **Python** 3.11+ (for the E2E suite)
- **Allure CLI** 2.30+ (for report generation)
- A **Supabase** project (free tier is fine)

### Install

```bash
# Frontend dependencies
bun install

# E2E test dependencies
python -m pip install --no-cache-dir allure-pytest pytest-playwright pytest-asyncio
python -m playwright install chromium
```

### Run the dev server

```bash
bun run dev
# → http://localhost:8080
```

### Production build

```bash
bun run build
bun run preview
```

---

## Environment Variables

Copy `.env.example` to `.env` and fill in:

| Variable | Purpose | Scope |
|---|---|---|
| `VITE_SUPABASE_URL` | Supabase project URL | client + server |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Anon key | client + server |
| `SUPABASE_SERVICE_ROLE_KEY` | Admin key (webhooks only) | **server-only** |
| `UDDOKTAPAY_API_KEY` | UddoktaPay merchant API key | server-only |
| `UDDOKTAPAY_BASE_URL` | `https://sandbox.uddoktapay.com` or live | server-only |
| `STEADFAST_API_KEY` / `STEADFAST_SECRET_KEY` | Courier credentials | server-only |
| `FB_PIXEL_ID` / `FB_CAPI_TOKEN` | Facebook ads | server-only |

> Never place secrets under a `VITE_` prefix — those are inlined into the browser bundle.

---

## Database & Auth

Schemas are created via SQL migrations under `supabase/migrations/`. Every public table has:

1. `GRANT` statements for the roles that need it
2. `ALTER TABLE ... ENABLE ROW LEVEL SECURITY`
3. Explicit `CREATE POLICY` per operation

Core tables: `categories`, `products`, `product_images`, `reviews`, `banners`, `announcements`, `orders`, `order_items`, `carts`, `cart_items`, `profiles`, `user_roles`, `site_settings`, `coupons`, `chat_messages`.

Roles are stored in a separate `user_roles` table (never on `profiles`) and checked via a `SECURITY DEFINER` function `public.has_role(uuid, app_role)` to avoid RLS recursion.

---

## Payment Gateway Integration

### Flow

```
Checkout ──POST──▶ /api/payment/uddoktapay/create
                        │ creates order row, calls UddoktaPay /checkout-v2
                        ▼
                   Hosted payment page (bKash / Nagad / Rocket)
                        │ user pays
                        ▼
                   /api/public/uddoktapay/callback?invoice_id=…
                        │ verifies via /verify-payment
                        │ updates orders.paid_amount, payment_status, status
                        ▼
                   Redirect → /order/{id}?paid=1
```

The `awaiting=1` flag in the redirect URL lets the order-success page distinguish "payment in progress" from "payment failed" while polling for the final callback state.

Partial-online mode charges only the delivery fee upfront; the remainder is collected on delivery (COD). Full-COD mode skips the gateway entirely.

---

## Courier Integration

`/api/public/steadfast/sync` receives Steadfast delivery-status webhooks and updates order rows. Outbound consignment creation lives in `src/lib/steadfast.functions.ts` — a `createServerFn` invoked when an admin marks an order shipped.

---

## End-to-End Testing

The project ships with a **20-test Playwright suite** covering every user-visible surface: home, products (list + search + detail), cart, checkout, auth, account, informational pages, admin gate, SEO artefacts, and responsive layouts.

### Structure

```
tests/e2e/
├── conftest.py         # Browser/page fixtures, screenshot-on-failure hook
└── test_medicare.py    # @allure.epic / feature / story hierarchy
```

Tests use Allure's **epic → feature → story** hierarchy:

- **Epic**: Medicare BD
- **Features**: Home Page, Product Catalog, Cart & Checkout, Auth, Informational Pages, Admin, SEO & Performance, Responsive Design
- **Stories**: 20 individual user-facing scenarios

### Run the suite

```bash
# Start the dev server in one terminal
bun run dev

# Run all tests
python -m pytest tests/e2e/

# Run a single feature
python -m pytest tests/e2e/test_medicare.py::TestCart -v
```

### Latest run

```
============================= 20 passed in 55.12s ==============================
```

All 20 tests green:

| # | Feature | Story |
|---|---|---|
| 1 | Home Page | Home page loads with hero and header |
| 2 | Home Page | Announcement bar and navigation links |
| 3 | Product Catalog | Products listing page renders grid |
| 4 | Product Catalog | Product search functionality |
| 5 | Product Catalog | Product detail page opens |
| 6 | Cart & Checkout | Empty cart page loads |
| 7 | Cart & Checkout | Checkout page loads |
| 8 | Auth | Login page renders |
| 9 | Auth | Account page redirects unauthenticated users |
| 10 | Informational Pages | About page |
| 11 | Informational Pages | Contact page |
| 12 | Informational Pages | Order tracking page |
| 13 | Informational Pages | Privacy policy page |
| 14 | Informational Pages | Refund policy page |
| 15 | Admin | Admin panel is gated behind authentication |
| 16 | SEO & Performance | Homepage has proper meta tags |
| 17 | SEO & Performance | Sitemap is served |
| 18 | SEO & Performance | robots.txt is served |
| 19 | Responsive Design | Mobile viewport renders home |
| 20 | Responsive Design | Tablet viewport renders products |

---

## Allure Reports

### Generate & view

```bash
# After running pytest:
allure generate allure-results -o allure-report --clean
allure open allure-report      # or: python -m http.server -d allure-report 9999
```

### Report screenshots

**Overview** — the executive dashboard: total tests, pass rate, environment, trend history.

![Allure Overview](screenshots/allure/01_overview.png)

**Suites** — every test grouped by module/class:

![Allure Suites](screenshots/allure/02_suites.png)

**Suites (expanded)** — drilling into features and stories:

![Allure Suites Expanded](screenshots/allure/03_suites_expanded.png)

**Graphs** — status distribution, severity breakdown, duration histogram:

![Allure Graphs](screenshots/allure/04_graphs.png)

**Timeline** — parallel execution timeline for every worker:

![Allure Timeline](screenshots/allure/05_timeline.png)

**Behaviors** — epic → feature → story business hierarchy (BDD view):

![Allure Behaviors](screenshots/allure/06_behaviors.png)

**Categories** — defect categories (product defects vs. test defects):

![Allure Categories](screenshots/allure/07_categories.png)

---

## Feature Screenshots

Every screenshot below is a fresh capture from the automated E2E suite.

### Home page (above the fold)
![Home top](screenshots/pages/01_home_top.png)

### Home page (middle sections)
![Home middle](screenshots/pages/02_home_middle.png)

### Home page (full-length capture)
![Home full](screenshots/pages/03_home_full.png)

### Product catalog
![Products list](screenshots/pages/04_products_list.png)

### Product search results
![Products search](screenshots/pages/05_products_search.png)

### Product detail
![Product detail](screenshots/pages/06_product_detail.png)

### Cart
![Cart](screenshots/pages/07_cart.png)

### Checkout
![Checkout](screenshots/pages/08_checkout.png)

### Login
![Login](screenshots/pages/09_login.png)

### Account
![Account](screenshots/pages/10_account.png)

### About
![About](screenshots/pages/11_about.png)

### Contact
![Contact](screenshots/pages/12_contact.png)

### Order tracking
![Track](screenshots/pages/13_track.png)

### Privacy policy
![Privacy](screenshots/pages/14_privacy.png)

### Refund policy
![Refund](screenshots/pages/15_refund.png)

### Admin gate (role-protected)
![Admin gate](screenshots/pages/16_admin_gate.png)

### Mobile home (390×844)
![Mobile home](screenshots/pages/17_mobile_home.png)

### Tablet products (820×1180)
![Tablet products](screenshots/pages/18_tablet_products.png)

---

## Deployment

The app deploys as a single Cloudflare Worker with the TanStack Start Vite build.

```bash
bun run build
# Deploy the `.output/` directory via Wrangler or your CI of choice
```

For CI-based Allure history:

```yaml
- run: python -m pytest tests/e2e/
- uses: actions/upload-artifact@v4
  with:
    name: allure-results
    path: allure-results
- run: allure generate allure-results -o allure-report --clean
```

---

## Scripts Reference

| Command | What it does |
|---|---|
| `bun run dev` | Vite dev server (`http://localhost:8080`) |
| `bun run build` | Production build |
| `bun run preview` | Serve the production build locally |
| `bun run lint` | ESLint |
| `bun run format` | Prettier |
| `python -m pytest tests/e2e/` | Run the full E2E suite |
| `allure generate allure-results -o allure-report --clean` | Build the HTML report |
| `allure open allure-report` | Open the report in a browser |

---

## License

Proprietary — all rights reserved.

---

*Built with TanStack Start, Supabase, and Playwright.*
