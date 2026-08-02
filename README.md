<p align="center">
  <img src="mobile/assets/icon.png" width="110" alt="StyleBook logo"/>
</p>

<h1 align="center">StyleBook</h1>
<p align="center"><b>Beauty & barber booking platform for Ghana</b><br/>
Find a shop near you and book an exact time slot — while owners run their whole business from one dashboard.</p>

<p align="center"><b>🚀 Live:</b> backend deployed on Railway · Android APK built with EAS · mobile app also runs via Expo Go</p>

---

## Why StyleBook

Booking a haircut in Ghana is informal: walk in, sit, wait. Customers lose time; shop owners can't plan their day. StyleBook digitizes the whole booking flow for customers and shop owners alike.

## Features

**Customer side**
- Discover shops by name, category (Salon / Barbershop / Spa / Nails) and city
- 🧭 **Near me** — GPS search sorted by real distance (Haversine)
- Shop profiles: live open/closed status, services & prices, photo gallery, verified reviews with owner replies, share to WhatsApp
- **Smart booking** — 3-step flow with time slots generated from each day's real opening hours, service-duration blocking, no double bookings, past times hidden, 30-min buffers at open/close
- 45-second auto-confirm if the shop doesn't respond
- Bookings hub: upcoming / rescheduled / completed / cancelled, reschedule with live availability, 10-minute appointment reminders
- 💬 **Direct messaging** — chat with any shop from its profile; one thread per shop, unread badges, push on new messages
- 🔔 **Notification centre** — in-app bell plus real push notifications, with per-category preferences that follow the account across devices
- Payment confirmations with an emailed receipt when a shop records your payment
- Instagram-style feed of shop posts (like, comment, book from a post)
- Favourites, review history, dark/light theme (light default)
- Sign-up sends a verification code but doesn't gate access, so new customers and owners land straight in the app

**Owner side**
- Business dashboard: stats, pending-booking alerts, **earnings this month** from recorded payments, quick actions
- Bookings inbox with confirm / cancel / **mark paid**
- 💵 **Payment recording** — cash, mobile money or card taken at the shop, logged against the booking; the customer gets a push notification and an emailed receipt
- 💬 Customer messaging inbox, shared with the customer side
- Shop profile editor: cover photo, gallery (plan-limited), services with edit/delete, per-day opening hours, GPS location pin, location description
- Posts with captions, review replies (edit/delete)
- Subscription plans: Free / Pro (GHS 120/mo) / Enterprise (GHS 300/mo), with a simulated mobile-money or card checkout, reflected live across the app the moment you upgrade
- Demo data seeded automatically on first boot — 10 shops across 6 Ghanaian cities, ready for a walkthrough with zero setup

## Tech stack

| Layer | Technology |
|---|---|
| Mobile app | React Native (Expo SDK 54) · TypeScript · React Navigation · Axios |
| Backend | Spring Boot 3.2 · Java 17 · Spring Security (JWT) · Spring Data JPA |
| Database | PostgreSQL — 17 tables, UUID keys, FK-enforced relationships |
| Auth | Stateless JWT · BCrypt password hashing · role + ownership checks |
| Realtime | STOMP over WebSocket (SockJS) for live notification and chat delivery |
| Push | Expo Push API — no Firebase credentials needed on the server |
| Email | SendGrid (HTTP API) for transactional email |
| Hosting | Railway — Docker deploy, managed Postgres |
| Distribution | EAS Build — installable Android APK |

## Architecture

Client–server. The mobile app owns presentation; **all business rules live on the server** (availability, conflicts, review eligibility, plan limits, chat membership — nothing is trusted from the client). The backend is a modular monolith — Auth / Shop / Booking / Review / Post / Promo / Messaging / Notification services with clean boundaries, deliberately structured so any domain can be extracted to a microservice when scale demands it.

Highlights:
- **Slot engine** — per-day opening windows + 30-min buffers → 30-min interval candidates → duration-overlap rejection against existing bookings → today's past times removed
- **Auto-confirm scheduler** — `@Scheduled` jobs promote pending bookings after 45s and complete finished ones (unlocking reviews)
- **Event-driven notifications** — bookings, reviews, post interactions, messages and payments publish domain events; listeners turn them into notifications, so no feature needs to know the notification system exists
- **One delivery pipeline** — every notification is filtered through the user's preferences, stored, broadcast over WebSocket to any open app, and pushed via Expo to every registered device

A full walkthrough of the layers, data model and request flows lives in [`ARCHITECTURE.md`](ARCHITECTURE.md).

## Deployment

The backend runs as a Docker container on **Railway**, connected to a managed **PostgreSQL** instance. Demo shop images ship inside the Docker image itself (committed under `backend/uploads/`, copied in at build time) and are served from a static `/uploads` route.

> **Note on uploads:** files written at runtime live on the container filesystem, which Railway replaces on every deploy. For persistent user uploads, attach a Railway **Volume** and point `stylebook.upload.dir` at its mount path — `WebConfig` checks the volume first and falls back to the baked-in demo images.

Transactional email (verification codes, password resets, booking confirmations, payment receipts) goes through **SendGrid's HTTP API** rather than SMTP — outbound SMTP ports are commonly blocked on hosting platforms, while HTTPS-based email delivery is not. Account email verification is sent but not enforced at login, for a smoother onboarding/demo experience; the enforcement path remains in place and can be enabled per environment.

Push notifications go through the **Expo Push API**, which fans out to FCM and APNs. This keeps Firebase credentials off the server entirely — the backend stores an Expo push token per signed-in device and POSTs to `exp.host`.

## Running locally

**Prerequisites:** JDK 17 · Maven · PostgreSQL · Node.js · Expo Go app on your phone

```bash
# 1. Database (one time)
psql -U postgres
CREATE DATABASE stylebook_db;
CREATE USER stylebook_user WITH PASSWORD 'stylebook_password';
GRANT ALL PRIVILEGES ON DATABASE stylebook_db TO stylebook_user;
\c stylebook_db
GRANT ALL ON SCHEMA public TO stylebook_user;

# 2. Backend  (http://localhost:8080 — tables auto-create)
cd backend
mvn spring-boot:run

# 3. Mobile app
cd mobile
npm install --legacy-peer-deps
# put YOUR computer's IP (or the deployed Railway URL) in src/services/api.ts (API_BASE_URL)
npx expo start
# scan the QR with Expo Go — phone and computer on the same WiFi
```

All secrets/config are overridable via environment variables (`SPRING_DATASOURCE_URL`, `SENDGRID_API_KEY`, `SENDGRID_FROM_ADDRESS`, `JWT_SECRET`, `APP_BASE_URL`), and a `backend/Dockerfile` is included for container-based deploys.

> Push notifications cannot be delivered to Expo Go on SDK 54. Use the APK build below to test them.

## Building the Android app

```bash
cd mobile
npx eas-cli login
npx eas-cli build -p android --profile preview
```

The `preview` profile produces an installable **APK** (rather than a Play Store App Bundle). EAS builds in the cloud and returns a download link and QR code — no Android Studio required. The APK talks to the deployed Railway backend, so it runs anywhere on mobile data with no laptop involved.

## Project structure

```
stylebook/
├── backend/          Spring Boot API — controllers / services / repositories / entities / DTOs
├── mobile/           Expo app — screens (auth, customer, owner) / navigation / contexts / api client
├── docs/             Defense presentation and Q&A
└── ARCHITECTURE.md   How the system fits together, end to end
```

## Roadmap

Real mobile money integration (Paystack / Hubtel) to replace the simulated upgrade checkout · object storage or a mounted volume for user uploads · staff-level booking calendars · verified sending domain for production-grade email · map view · automated tests

---
