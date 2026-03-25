# 🇮🇳 BharatYatra

> A full-stack travel-discovery platform for India — built by students of Gujarat Technological University, Ahmedabad.

[![Live Demo](https://img.shields.io/badge/Live%20Demo-bharatyatra--lake.vercel.app-brightgreen?style=flat-square&logo=vercel)](https://bharatyatra-lake.vercel.app/)
![Made with Supabase](https://img.shields.io/badge/Backend-Supabase-3ECF8E?style=flat-square&logo=supabase)
![Deployed on Vercel](https://img.shields.io/badge/Hosted-Vercel-black?style=flat-square&logo=vercel)
![Course](https://img.shields.io/badge/Course-Design%20Engineering%20II--B-blue?style=flat-square)

---

## 📖 Overview

BharatYatra lets travellers explore five Indian states — **Gujarat, Rajasthan, Kerala, Uttarakhand, and Assam** — through a data-driven public website. Users can browse curated attractions and accommodations, plan day-by-day itineraries with budget tiers, find nearby hospitals for medical tourism, discover cultural events, and submit feedback.

A secure **admin panel** allows the team to manage all content directly from the browser.

---

## ✨ Features

| Feature                      | Description                                                             |
| ---------------------------- | ----------------------------------------------------------------------- |
| 🗺️ Interactive India Map     | SVG map on homepage with clickable state navigation                     |
| 🏛️ State & District Explorer | Attractions, accommodations, and district breakdowns for 5 states       |
| 📅 Itinerary Planner         | Day-by-day plans based on state, duration, and budget — with PDF export |
| 🎨 Events Browser            | Cultural events filterable by state and category                        |
| 🏥 Hospital Finder           | Medical tourism — filter hospitals by state and type                    |
| 🔗 Tourism Portals Hub       | Curated links to 37 official state tourism portals                      |
| 📬 Contact Form              | Public feedback form with admin-controlled on/off toggle                |
| 🔒 Admin Panel               | Auth-gated CRUD for all content, image manager, and submissions viewer  |

---

## 🛠️ Tech Stack

| Layer             | Technology                                               |
| ----------------- | -------------------------------------------------------- |
| **Frontend**      | HTML5, CSS3, Vanilla JS (ES2022)                         |
| **Animation**     | GSAP 3.12.2 + ScrollTrigger                              |
| **PDF Export**    | jsPDF 2.5                                                |
| **Icons / Fonts** | Font Awesome 6, Google Fonts (Playfair Display, Poppins) |
| **Database**      | Supabase (PostgreSQL)                                    |
| **Auth**          | Supabase Auth (email/password + custom JWT claim)        |
| **Storage**       | Supabase Storage (`bharatyatra-images` bucket)           |
| **Hosting**       | Vercel (static + serverless functions)                   |

---

## 🗄️ Database Schema (Overview)

The Supabase project contains **7 tables**:

| Table                 | Purpose                                                                   |
| --------------------- | ------------------------------------------------------------------------- |
| `states`              | The 5 featured states with descriptions, taglines, and best-time-to-visit |
| `districts`           | Districts per state, linked via `state_id` FK                             |
| `attractions`         | Tourist spots with type, priority score, images, and featured flags       |
| `accommodations`      | Hotels/stays linked to attractions, with budget tier classification       |
| `hospitals`           | Medical tourism listings with state, type, and rating                     |
| `events`              | Cultural events with date range, category, featured/recurring flags       |
| `contact_submissions` | Public form submissions; admin-only readable                              |
| `site_settings`       | Key-value config (e.g., `submissions_enabled` toggle)                     |

Row-Level Security (RLS) is enabled on all tables. Public users have `SELECT` only; write access requires an authenticated session with `is_admin: true` in the JWT.

---

## 🔐 Admin Panel

The admin panel lives at `/admin/` and is protected by a 15-layer security module (`admin-auth.js`), including:

- Session validation on every page load and visibility change
- Inactivity auto-logout
- JWT `is_admin` claim verification
- Login rate limiting and account lockout

### Admin Pages

| Page                   | Function                                                             |
| ---------------------- | -------------------------------------------------------------------- |
| `admin-login.html`     | Login with rate limiting                                             |
| `admin-dashboard.html` | Live content counts across all tables                                |
| `admin-state.html`     | Full CRUD for districts, attractions, accommodations + image manager |
| `admin-medical.html`   | Hospital CRUD                                                        |
| `admin-events.html`    | Events CRUD with featured/recurring flags                            |
| `admin-form.html`      | View/delete contact submissions + toggle public form on/off          |

> ⚠️ Admin credentials are managed via Supabase Auth. Do not commit credentials to the repository.

---

## 🚀 Local Setup

This project is **static HTML** — no build step required.

**1. Clone the repo**

```bash
git clone https://github.com/your-username/bharatyatra-final.git
cd bharatyatra-final
```

**2. Configure Supabase**

Open `supabase-init.js` and set your own Supabase project URL and anon key:

```js
window.BY_SUPABASE_URL = "https://your-project.supabase.co";
window.BY_SUPABASE_KEY = "your-anon-key";
```

**3. Set up Vercel environment variables** (for the contact form serverless function)

In your Vercel dashboard, add:

```
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your-service-role-key
```

**4. Serve locally**

Use any static server, e.g.:

```bash
npx serve .
```

Then open `http://localhost:3000`.

---

## ☁️ Deployment

The project deploys automatically to **Vercel** on push to `main`. No build configuration is needed — Vercel serves the HTML files directly and auto-detects the `api/` folder as serverless functions.

Security headers (HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy) are configured via `vercel.json`.

---

## 👥 Team

Developed as part of **Design Engineering II-B** at **Gujarat Technological University (GTU)**, Ahmedabad — March 2026.

| Name                              | Enrolment No. |
| --------------------------------- | ------------- |
| Bhanushali Vaibhav Chandreshkumar | 231130107004  |
| Gajjar Harshal Dhimantkumar       | 231130107011  |
| Zala Harshvardhansinh Nirmalsinh  | 231130107015  |
| Jangid Nitin Sitaram              | 231130107019  |
| Patel Shrey Darshan               | 231130107062  |

---

## 📄 License

This project was built for academic purposes. Please contact the team before reusing any part of the codebase.
