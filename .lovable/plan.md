## Bangladeshi Medicine E-Commerce — Plan

### Stack note (important)

You asked for Next.js for the admin/backend. This Lovable project runs on **TanStack Start** (React 19 + Vite + server functions on the edge). It gives you the same SSR + server-side API capability as Next.js, plus a built-in backend (Lovable Cloud, powered by Supabase). I'll build the entire app — storefront and admin — inside this one project using TanStack Start + Lovable Cloud + shadcn/ui. Same Supabase database you wanted, just no separate Next.js app to maintain. If you specifically need a standalone Next.js admin, tell me and I'll adjust.

### Design

- Premium beauty / wellness aesthetic: soft off-white background, deep emerald or muted rose primary, generous whitespace, thin dividers, large product imagery, subtle motion.
- Mobile-first, minimal, no emoji clutter.
- All copy in **Bangla**. Typography: **Hind Siliguri** loaded via Google Fonts (true "Google Sans" is not licensed for web embedding; Hind Siliguri is Google's recommended Bangla pairing and reads cleanly alongside a Latin sans for prices/SKUs).
- Design tokens defined in `src/styles.css` (oklch), used everywhere via shadcn.

### Database (Supabase)

Tables with RLS + grants:

- `categories` (id, name_bn, slug, image_url, sort)
- `products` (id, name_bn, slug, description_bn, price, compare_at_price, stock, category_id, images[], is_featured, is_active)
- `reviews` (id, product_id, author_name, rating, body_bn, approved)
- `banners` (hero + promo slots, image, link, text_bn, position)
- `announcements` (text_bn, active) — drives the top ticker
- `orders` (id, user_id nullable for guest, status, subtotal, delivery_fee, total, payment_method [cod|partial_online], paid_amount, due_amount, uddoktapay_invoice_id, address_json, phone, created_at)
- `order_items` (order_id, product_id, name_bn, unit_price, qty)
- `carts` / `cart_items` (persistent for logged-in users; localStorage for guests; abandoned-cart tracking writes a row when checkout is started but not completed)
- `profiles` (id ↔ auth.users, full_name, phone, address_json)
- `user_roles` (separate table + `has_role()` security-definer function — required pattern for admin role)
- `site_settings` (delivery fee, advance % default = 10, contact info)

### Auth

- Email + password, plus guest checkout (no account required).
- Admin gated by `has_role(auth.uid(), 'admin')`.

### Storefront routes (Bangla UI)

- `/` Home — sections in your exact order: announcement ticker, sticky header (logo, menu, search, cart, account), hero, category slider, featured products, two promo banners, all products grid, reviews, "আমরা বনাম অন্যরা" comparison, "কেন আমাদের থেকে কিনবেন" feature cards, money-back guarantee banner, footer.
- `/products` — filter by category, search, sort, pagination.
- `/products/$slug` — gallery, price, stock, qty, add to cart, buy now.
- `/cart` — edit qty, remove, subtotal, proceed.
- `/checkout` — address form, payment choice (COD / 10% advance online), edit cart inline, place order.
- `/order/$id/success` — invoice download (PDF) + tracking link.
- `/track` — track by order id + phone (guest-friendly).
- `/account`, `/account/orders`, `/account/orders/$id` — user dashboard with invoice download.
- `/login`, `/signup`, `/reset-password`.
- `/about`, `/contact`, `/policy/*` (refund, privacy, terms).

### Admin routes (separate layout, role-gated)

- `/admin` dashboard — revenue, orders today, low-stock, abandoned carts count.
- `/admin/orders` — list, filter by status/payment, detail view, mark paid/shipped/delivered, refund note.
- `/admin/abandoned` — incomplete checkouts with customer contact.
- `/admin/payments` — UddoktaPay transactions, reconcile due amounts.
- `/admin/customers` — list, detail, order history.
- `/admin/products` — CRUD, images, stock, featured toggle.
- `/admin/categories`, `/admin/banners`, `/admin/announcements`, `/admin/reviews` (moderate), `/admin/settings` (delivery fee, advance %).

### Payments — UddoktaPay(currently do COD, aftwards we will integrate)

- Server functions create an UddoktaPay payment session for the calculated advance (10% of product total or full delivery fee — configurable in settings).
- Webhook endpoint at `/api/public/uddoktapay/webhook` verifies the request, updates `orders.paid_amount` and status.
- COD orders skip the gateway and go straight to "Pending Confirmation".
- Requires secret: **UDDOKTAPAY_API_KEY** (and base URL if sandbox vs live). I'll request this via the secret prompt at implementation time.

### Invoice

- Server-rendered PDF (react-pdf in a server fn) with Bangla font embedded, downloadable from the Supabaseorder success page and `/account/orders/$id`.

### Build order

1. Enable supabase, set up schema + RLS + admin role, seed categories/sample products/banners/announcement.
2. Design tokens, fonts, shared layout (header, footer, ticker).
3. Storefront: home → product list → product detail → cart → checkout (COD path first).
4. Auth + user dashboard + order tracking + PDF invoice.
5. UddoktaPay integration + webhook + partial-payment logic.
6. Admin panel (orders → products → customers → abandoned → settings).
7. Polish, responsive QA, SEO meta per route, sitemap.

Approve this and I'll start with step 1 (Cloud + schema + seed data).