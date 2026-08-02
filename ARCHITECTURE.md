# StyleBook — How the App Works

A walkthrough of the whole system: what each layer does, how a request travels through it, and
how the pieces connect to each other.

StyleBook is a two-sided salon and barbershop booking platform for Ghana. Customers discover
shops, book appointments, review them and chat with them. Shop owners manage their profile,
services, opening hours, bookings, posts and payments. Both sides use the same mobile app,
which branches on the user's role at login.

---

## 1. The two halves

```
D:\stylebook
├── backend/     Spring Boot REST API + Postgres        (deployed on Railway)
├── mobile/      Expo / React Native app in TypeScript  (customer + owner)
└── docs/        Defense presentation and Q&A
```

They talk over HTTPS only. The app has no database access; the backend serves no HTML. The
single point of contact is `mobile/src/services/api.ts`, which hard-codes the Railway base URL.

| | Backend | Mobile |
|---|---|---|
| Language | Java 17 | TypeScript |
| Framework | Spring Boot 3.2 | Expo SDK 54 / React Native 0.81 |
| Storage | PostgreSQL via JPA/Hibernate | AsyncStorage (token + prefs only) |
| Auth | JWT, HS256, 24h expiry | Token in `Authorization` header |
| Deploy | Docker → Railway | Expo / EAS build |

---

## 2. Backend architecture

The backend is a conventional layered Spring application. Every feature follows the same path:

```
HTTP request
    │
    ▼
JwtAuthFilter          reads Bearer token, puts a UUID into the SecurityContext
    │
    ▼
Controller             thin — pulls the caller's UUID, delegates, wraps in ResponseEntity
    │
    ▼
Service                all business rules, authorisation and transactions live here
    │
    ├──► Repository    Spring Data JPA, mostly derived queries
    │
    └──► Event         published for anything another feature cares about
              │
              ▼
         Listener      turns the event into a notification
              │
              ▼
    NotificationService  saves it, broadcasts over WebSocket, sends push
```

### Package layout

| Package | Responsibility |
|---|---|
| `config` | Security, CORS, WebSocket, async pool, static file serving, startup data |
| `security` | `JwtUtils` (sign/parse), `JwtAuthFilter` (per-request authentication) |
| `controller` | HTTP surface only. No business logic. |
| `service` | Business rules, ownership checks, transactions |
| `repository` | Spring Data JPA interfaces |
| `entity` | JPA-mapped tables |
| `dto` | Request/response shapes, with static `from(entity)` mappers |
| `event` | Java records describing something that happened |
| `listener` | Reacts to events, creates notifications |
| `exception` | `GlobalExceptionHandler` — one place that turns exceptions into JSON |

### Why the layers are drawn this way

**Controllers never trust the client for identity.** They read the caller from the JWT
(`authentication.getPrincipal()` or `@AuthenticationPrincipal`), never from a request body
field. A client cannot claim to be someone else.

**Authorisation lives in services, not controllers.** Every mutating service method re-loads
the entity and checks ownership before touching it — `booking.getShop().getOwner().getId()
.equals(ownerId)` or it throws. This means the rule is enforced no matter which controller
calls it.

**Events decouple features.** Booking code doesn't know notifications exist; it publishes
`BookingRequestedEvent` and moves on. This is why the notification system could be extended
to messaging and payments without touching booking logic.

---

## 3. Authentication and authorisation

### Registration and verification

```
POST /api/auth/register/customer   → creates User(role=CUSTOMER, emailVerified=false)
POST /api/auth/register/owner      → creates User(role=OWNER) AND a Shop in one transaction
    │
    ├─ password hashed with BCrypt
    ├─ 6-digit OTP generated (SecureRandom), valid 10 minutes
    ├─ OTP emailed via SendGrid HTTP API (async — never blocks the response)
    └─ JWT returned immediately, so the app can proceed to the OTP screen
        │
        ▼
POST /api/auth/verify-otp          → sets emailVerified=true, clears the code, returns a fresh JWT
POST /api/auth/resend-otp          → 30-second cooldown enforced server-side
```

Registering as an owner creates the `User` and the `Shop` together. That's why an owner never
has an "create your shop" step — it already exists by the time they first log in, which is
also why `AuthResponse` carries a `shopId`.

### Password reset

`forgot-password` returns the same message whether or not the email exists. That's deliberate:
it stops the endpoint being used to discover which emails are registered. The miss is logged
server-side, though, so a typo and a genuine delivery failure can be told apart in the Railway
logs rather than both looking like silence.

All email lookups go through `findByEmailIgnoreCase`, and addresses are trimmed and lowercased
on registration. Exact-match lookups were the reason a password reset could silently do
nothing: registration emails the OTP using the `User` object it just built, with no lookup at
all, so verification worked while a differently-cased address on the reset screen matched no
row and returned the friendly message having sent nothing.

### The token

`JwtUtils` signs `HS256` with the subject set to the user's UUID, plus `email` and `role`
claims. `JwtAuthFilter` runs before Spring's own filters, validates the signature, and places
**the raw `UUID`** as the authentication principal with a `ROLE_CUSTOMER` / `ROLE_OWNER`
authority.

That choice explains a pattern you'll see everywhere:

```java
UUID userId = (UUID) authentication.getPrincipal();   // older controllers
@AuthenticationPrincipal UUID userId                  // newer controllers
```

Both get the same thing. There's no `UserDetails` object and no per-request database lookup
for the caller's identity.

### What's public

`SecurityConfig` permits without a token:

```
/api/auth/**    /api/shops/**    /api/posts/**    /uploads/**    /ws/**
```

Everything else requires a valid JWT. Note that `/api/shops/**` and `/api/posts/**` being open
includes their *write* endpoints — those aren't protected by the security layer. They are
protected in practice because the service layer looks up the caller's shop and throws if they
don't own one, and because the controllers dereference `authentication.getPrincipal()`, which
fails without a token. It works, but the protection comes from the service layer rather than
the security config. See §11.

---

## 4. The data model

```
User (CUSTOMER | OWNER)
 ├── owns ──────────► Shop ──┬──► Service      (name, price, durationMinutes)
 │                            ├──► ShopPhoto   (gallery)
 │                            ├──► Post ──┬──► Like
 │                            │            └──► Comment
 │                            └──► Promo
 │
 ├── books ─────────► Booking ────► Review     (one review per booking, enforced)
 ├── favourites ────► Favourite (User ↔ Shop)
 ├── chats ─────────► Conversation ────► Message
 └── receives ──────► Notification
                      NotificationPreferences  (one row per user)
                      UserDevice               (one row per signed-in device)
```

### Table notes

**`shops.openingHours` is a JSON string, not a relation.** It looks like
`{"MON":"09:00-19:00","SAT":"08:00-20:00"}` — a missing day means closed. Both the backend
(`BookingService.getOpeningWindow`) and the app (`BookingScreen.parseHours`,
`OpeningHoursScreen`) parse it independently. Keys are the first three letters of the day,
uppercase.

**`shops.avgRating` and `reviewCount` are denormalised.** `ReviewService.updateShopRating`
recalculates and writes them every time a review is created, so shop lists don't have to
aggregate reviews on every read.

**`posts.likeCount` is denormalised** the same way, maintained by `PostService.toggleLike`.

**`conversations` carries `lastMessage`, `lastMessageAt`, `customerUnread`, `ownerUnread`.**
Also denormalised, so the inbox renders from one query instead of one per thread. A unique
constraint on `(customer_id, shop_id)` guarantees one thread per customer/shop pair.

**`notifications.data` is a JSON column** holding whatever context the notification needs
(`bookingId`, `shopName`, `amount`…). `notification_channels` is an `@ElementCollection` side
table recording which channels each notification went out on.

**`bookings.payment_status` is nullable on purpose.** Hibernate's `ddl-auto=update` cannot add
a `NOT NULL` column to a table that already has rows, so it's nullable at the database level,
always set in code, and read as `UNPAID` when null.

---

## 5. Core flows

### 5.1 Booking — the central flow

```
Customer picks service → date → time in BookingScreen (a 4-step wizard)
    │
    │  GET /api/bookings/shop/{shopId}/slots?date=&serviceId=
    │      BookingService.getAvailableSlots:
    │        1. parse openingHours for that weekday → closed? return open:false
    │        2. bookable window = [open + 30min, close - 30min]
    │        3. walk in 30-minute steps
    │        4. drop any slot overlapping an existing PENDING/CONFIRMED booking
    │        5. drop slots already past, if the date is today
    ▼
POST /api/bookings
    │  assertSlotAvailable() re-checks everything server-side — the slot list is a
    │  convenience, not the authority. Two customers racing for the last slot both
    │  see it offered; only one gets past this check.
    │
    ├─ Booking saved as PENDING with autoConfirmAt = now + 45 seconds
    └─ publish BookingRequestedEvent → owner gets a notification + push
        │
        ▼
Owner sees it in the Bookings Inbox and taps Confirm
    │  PUT /api/bookings/{id}/confirm  → CONFIRMED
    │  publish BookingStatusChangedEvent → customer notified
    │  + confirmation email via SendGrid
    │
    │  …or does nothing, and the scheduled job confirms it automatically after 45s.
    ▼
Appointment happens
    │  completeFinishedBookings() (every 60s) flips CONFIRMED → COMPLETED
    │  once bookingTime + service duration has passed
    ▼
Owner taps Mark Paid → PUT /api/bookings/{id}/payment
    │  records method (CASH | MOBILE_MONEY | CARD) and amount, defaulting to
    │  the listed service price
    └─ publish PaymentReceivedEvent → customer gets a receipt notification
    ▼
Customer leaves a review (only allowed on CONFIRMED or COMPLETED bookings, once each)
    └─ publish ReviewCreatedEvent → owner notified; shop rating recalculated
```

The 45-second auto-confirm is the design's opinion that a booking shouldn't sit in limbo. An
owner who's busy with a client doesn't cost the customer a confirmation.

### 5.2 Notifications — the shared spine

Five things in the app produce notifications, and they all converge:

```
BookingService ──► BookingRequestedEvent ─────┐
               ──► BookingStatusChangedEvent ─┤
ReviewService  ──► ReviewCreatedEvent ────────┤
PostService    ──► PostInteractionEvent ──────┼──► @EventListener
MessagingService ► MessageCreatedEvent ───────┤    (5 listener classes)
BookingService ──► PaymentReceivedEvent ──────┘         │
                                                        ▼
                                        NotificationService.createNotification()
                                                        │
                    ┌───────────────────────────────────┼───────────────────────┐
                    ▼                                   ▼                       ▼
        NotificationPreferences check          save to notifications    STOMP broadcast to
        muted category → return null,          table                    /topic/notifications/{userId}
        nothing stored or sent                                                  │
        push muted → drop PUSH channel,                                         ▼
        keep the in-app record                                    PushNotificationService (@Async)
                                                                  POST https://exp.host/--/api/v2/push/send
                                                                  to every active UserDevice
```

Preferences are checked **inside** `NotificationService`, not at each call site. That keeps the
listeners simple and means a new notification type automatically respects the user's settings.

Push goes through **Expo's push service**, not Firebase directly — Expo forwards to FCM and
APNs, so the backend holds no Google credentials. `UserDevice.fcmToken` stores an Expo token
(`ExponentPushToken[…]`) despite the column name.

### 5.3 Messaging

```
Customer taps 💬 Message on a shop profile
    │  POST /api/messages/conversations {shopId}
    │  → returns the existing thread, or creates one (idempotent)
    ▼
ChatScreen polls GET /api/messages/conversations/{id} every 5 seconds
    │  (opening the thread also clears the caller's unread count)
    ▼
POST /api/messages/conversations/{id} {body}
    ├─ Message saved
    ├─ conversation.lastMessage / lastMessageAt updated, other side's unread +1
    ├─ STOMP broadcast to /topic/conversations/{id}
    └─ publish MessageCreatedEvent → the other party gets a notification + push
```

Every messaging method calls `requireMembership()` first, which loads the conversation and
confirms the caller is either the customer or the shop's owner. Knowing a conversation ID is
not authorisation.

The app polls rather than subscribing to the STOMP broadcast, to avoid adding a WebSocket
client dependency. Push notifications cover the case where the app isn't open.

### 5.4 Media upload

```
App picks an image (expo-image-picker) → multipart POST
    ├─ /api/shops/my-shop/cover-photo
    ├─ /api/shops/my-shop/gallery
    ├─ /api/posts/upload-image
    └─ /api/promos/upload-image
        │
        ▼
FileUploadService: UUID filename → written to stylebook.upload.dir
        returns an absolute URL: {APP_BASE_URL}/uploads/{uuid}.jpg
        │
        ▼
WebConfig serves /uploads/** from disk
```

Because URLs are stored **absolute** in the database, changing the backend's address breaks
every existing image. That's what `ImageUrlMigrator` exists for — see §7.

---

## 6. Background jobs

| Job | Interval | What it does |
|---|---|---|
| `autoConfirmBookings` | 10s | PENDING bookings past `autoConfirmAt` become CONFIRMED |
| `completeFinishedBookings` | 60s | CONFIRMED bookings whose end time has passed become COMPLETED |

Both are `@Scheduled` on `BookingService`, enabled by `@EnableScheduling` on the application
class.

Separately, `@EnableAsync` powers `EmailService` (SendGrid calls) and `PushNotificationService`.
`AsyncConfig` bounds that work to a 2–8 thread pool with a 200-task queue and a caller-runs
overflow policy, so a burst of notifications slows down rather than exhausting the container.

---

## 7. What happens on startup

Two `CommandLineRunner`s run in order:

**`ImageUrlMigrator` (`@Order(1)`)** — rewrites any image URL still pointing at
`http://10.192.1.15:8080` or `http://localhost:8080` to the current `APP_BASE_URL`. This is the
scar tissue from moving off a laptop onto Railway. It's idempotent and self-healing.

**`DemoDataSeeder` (`@Order(2)`)** — seeds realistic Ghanaian shops across Accra, Kumasi,
Takoradi and elsewhere, with services, photos, posts, bookings and reviews. Demo owners all use
the password `demo123`. A `SEED_VERSION` constant guards it: bump the string and the old demo
data is wiped and reseeded on next boot. Images come from the `uploads/` folder baked into the
Docker image (`n1.jpg` … `n24.jpg`).

---

## 8. The mobile app

### Navigation

`AppNavigator` is the whole routing story, and it branches three ways on auth state:

```
isLoading ──► spinner

!user ──────► Onboarding → RoleSelection → CustomerLogin / OwnerLogin
                        → VerifyEmail / ForgotPassword / ResetPassword

user.role === 'CUSTOMER' ──► CustomerTabs  (Discover · Feed · Bookings · Messages · Profile)
                             + ShopProfile, Booking, SavedShops, MyReviews, Settings, Chat

user.role === 'OWNER' ─────► OwnerTabs     (Dashboard · Bookings · Messages · Profile · Settings)
                             + CreatePost, OwnerReviews, OpeningHours, Chat
```

Because the stacks are mounted conditionally, a customer build literally has no owner screens
in its navigator, and vice versa. Logging out unmounts everything.

### State

There is no Redux. Two React contexts hold everything global:

- **`AuthContext`** — `user`, `token`, `login()`, `logout()`. Persists to AsyncStorage.
  `login()` also fires `registerForPush()`; `logout()` unregisters the device first, while the
  token is still valid.
- **`ThemeContext`** — light/dark palettes, persisted. Light is the default. Every screen wraps
  itself in `ThemedScreen` and pulls colours from `useTheme()`.

Everything else is local `useState` inside each screen, loaded on mount or on focus.

**`REMEMBER_LOGIN` is set to `false`** in `AuthContext`, which clears the stored token on every
app start. That forces a login each launch — convenient for demoing, but worth knowing it's a
deliberate flag and not a bug.

### The API layer

`src/services/api.ts` is a single axios instance with a request interceptor that attaches the
bearer token from AsyncStorage. Endpoints are grouped by domain — `authAPI`, `shopsAPI`,
`bookingsAPI`, `reviewsAPI`, `postsAPI`, `promosAPI`, `notificationsAPI`, `messagesAPI` — so a
screen imports only the group it needs.

`src/services/push.ts` handles Expo push tokens: permission prompt, Android notification
channel, token fetch using the EAS `projectId` from `app.json`, then registration with the
backend. Every function is best-effort — push failing never blocks sign-in.

---

## 9. API reference

### Public (no token)
```
POST   /api/auth/register/customer      POST   /api/auth/verify-otp
POST   /api/auth/register/owner         POST   /api/auth/resend-otp
POST   /api/auth/login                  POST   /api/auth/forgot-password
                                        POST   /api/auth/reset-password
GET    /uploads/**                      WS     /ws
```

### Shops
```
GET    /api/shops?query=&category=      GET    /api/shops/my-shop
GET    /api/shops/nearby?lat=&lng=      PUT    /api/shops/my-shop
GET    /api/shops/{shopId}              PUT    /api/shops/my-shop/plan
POST   /api/shops/{shopId}/favourite    POST   /api/shops/my-shop/cover-photo
GET    /api/shops/favourites            POST   /api/shops/my-shop/gallery
                                        DELETE /api/shops/my-shop/gallery/{photoId}
                                        POST   /api/shops/my-shop/services
                                        PUT    /api/shops/my-shop/services/{serviceId}
                                        DELETE /api/shops/my-shop/services/{serviceId}
```

### Bookings
```
POST   /api/bookings                    PUT    /api/bookings/{id}/confirm
GET    /api/bookings/shop/{id}/slots    PUT    /api/bookings/{id}/cancel
GET    /api/bookings/upcoming           PUT    /api/bookings/{id}/reschedule
GET    /api/bookings/past               PUT    /api/bookings/{id}/payment
GET    /api/bookings/shop/upcoming      DELETE /api/bookings/{id}
GET    /api/bookings/shop/all           DELETE /api/bookings/shop/cancelled
```

### Reviews, posts, promos
```
POST   /api/reviews                     GET    /api/posts/feed
POST   /api/reviews/{id}/reply          GET    /api/posts/trending
DELETE /api/reviews/{id}/reply          GET    /api/posts/shop/{shopId}
GET    /api/reviews/shop/{shopId}       POST   /api/posts
GET    /api/reviews/shop/{id}/breakdown POST   /api/posts/upload-image
GET    /api/reviews/my-reviews          POST   /api/posts/{id}/like
                                        POST   /api/posts/{id}/comments
GET    /api/promos                      GET    /api/posts/{id}/comments
GET    /api/promos/my                   DELETE /api/posts/{id}
POST   /api/promos
POST   /api/promos/upload-image
DELETE /api/promos/{promoId}
```

### Notifications and messaging
```
GET    /api/notifications?userId=       GET    /api/messages/conversations
GET    /api/notifications/unread-count  POST   /api/messages/conversations
PATCH  /api/notifications/{id}/read     GET    /api/messages/conversations/{id}
PATCH  /api/notifications/mark-all-read POST   /api/messages/conversations/{id}
GET    /api/notifications/preferences   PATCH  /api/messages/conversations/{id}/read
PUT    /api/notifications/preferences   GET    /api/messages/unread-count
POST   /api/notifications/devices
DELETE /api/notifications/devices
```

---

## 10. Deployment

The backend ships as a multi-stage Docker build: Maven + Temurin 17 to build the jar, then a
JRE-only image to run it. `server.port=${PORT:8080}` picks up Railway's injected port.

Schema is managed by `spring.jpa.hibernate.ddl-auto=update` — Hibernate creates and alters
tables to match the entities on boot. There are no migration files.

Required environment variables:

| Variable | Notes |
|---|---|
| `SPRING_DATASOURCE_URL` / `_USERNAME` / `_PASSWORD` | Postgres connection |
| `JWT_SECRET` | Falls back to a hard-coded default if unset — set it |
| `SENDGRID_API_KEY` / `SENDGRID_FROM_ADDRESS` | OTP and booking emails |
| `APP_BASE_URL` | **Critical.** Defaults to a LAN IP; must be the public Railway URL or every uploaded image URL is unreachable |

---

## 11. Things worth knowing

Observations from reading the code, separated from how it works.

**The notification bell never populates.** `NotificationBell.tsx` reads
`AsyncStorage.getItem('userId')`, but nothing in the app ever writes that key — `AuthContext`
stores `token` and `user` (a JSON blob containing `userId`). So `userId` stays null, the load
is skipped and `handleOpen` returns early. Notifications *are* being created and stored
correctly on the backend; the bell just can't read them. Fix: pull `user.userId` from
`useAuth()` instead of AsyncStorage.

**Uploaded images don't survive a redeploy.** Files are written to the container filesystem,
which Railway replaces on every deploy. The seeded demo images survive because they're baked
into the Docker image; anything a real user uploads is lost. `WebConfig` now checks two
locations so a Railway Volume can be mounted and `stylebook.upload.dir` repointed at it without
breaking the demo images.

**Write endpoints under `/api/shops/**` and `/api/posts/**` are `permitAll`.** They're safe in
practice — the service layer resolves the caller's shop and throws if they don't own it — but
the security config isn't the thing enforcing it. Moving those two patterns to authenticated
and whitelisting only the genuinely public reads would make the intent explicit.

**Plan limits are partly enforced.** The owner settings screen advertises the Free plan as
"10 bookings, 3 photos, 5 posts". Three limits are enforced server-side — 3 gallery photos
(`ShopService.addGalleryPhoto`), 5 posts (`PostService.createPost`), and promos being Pro/
Enterprise only (`PromoService.create`, with `getAll` also filtering out Free-plan promos so
they never surface on the customer home screen). The advertised 10-booking limit isn't
implemented anywhere.

**Slot booking has a small race window.** `assertSlotAvailable` re-checks availability inside
the transaction, which is the right instinct, but without a unique constraint or row lock two
simultaneous requests could both pass. Low-probability at current scale; a unique index on
`(shop_id, booking_date, booking_time)` for active bookings would close it.

**There are no tests.** `spring-boot-starter-test` is declared in `pom.xml` but `src/test/`
doesn't exist. The booking slot generator and the opening-hours parser are the two pieces where
unit tests would pay for themselves fastest — both are pure functions with fiddly edge cases.

**Leftover files.** `mobile/src/screens/WelcomeScreen.tsx` is never imported (superseded by
`OnboardingScreen`). `react-icons` and `react-native-maps` are declared dependencies with no
usages. `firebase-service-account.json` holds only placeholder values and is read by nothing —
push goes through Expo.
