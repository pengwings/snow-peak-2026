# Snow Peak 2026: Trip Organizer

A full-stack, nature-inspired web application built with [Next.js](https://nextjs.org) for organizing and planning group trips.

## Features

- **Guest Sessions & User Accounts**: Start planning immediately as a guest; data migrates to your account on sign-up.
- **View-Only Mode**: Anyone can browse every tab without an account. Editing controls appear once you sign in with a name on the guest list.
- **Flight Coordination**: Track arrival/departure details for all trip members.
- **Cabin & Lodging Management**: Assign and manage cabin assignments with ranking.
- **Activity Planning**: Collaborative itinerary and activity planning.
- **Trip Map**: An embedded Google My Maps view of the places we want to visit, set by a trip admin from within the app.
- **Campsite Cooking**: Propose meals to cook, vote on them, and build a shared shopping checklist of ingredients for each agreed-upon meal.
- **Trip Schedule**: Day-by-day itinerary visible to everyone, editable only by trip admins.
- **Expense Tracking**: Shared and individual expense tracking across the group.
- **Todo Lists**: Shared actionable todo lists for pre-trip and trip responsibilities.
- **Nature-Inspired Aesthetic**: Minimal, clean UI styled with Tailwind CSS.

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Styling**: Tailwind CSS (v4)
- **Database**: PostgreSQL — Docker locally, [Neon](https://neon.tech) in production
- **Icons**: Lucide React
- **Authentication**: Custom cookie-based guest & user sessions
- **Deployment**: Vercel

## Prerequisites

- [Docker](https://www.docker.com/) (for the local Postgres instance)
- Node.js 18+

## Getting Started

1. **Install dependencies:**

   ```bash
   npm install
   ```

2. **Set up your env file:**

   ```bash
   cp .env.local.example .env.local
   ```

   The default values connect to the local Docker Postgres instance — no edits needed for local dev.

3. **Run the development server:**

   ```bash
   npm run dev
   ```

   This automatically:
   - Starts a Postgres Docker container (`snow-peak-postgres`) on port `5432`
   - Waits for it to be ready
   - Runs the database init/migration script
   - Starts the Next.js dev server at [http://localhost:3000](http://localhost:3000)

## Production Deployment (Vercel)

Set the `DATABASE_URL` environment variable in your Vercel project settings to your [Neon](https://neon.tech) connection string. The app automatically uses the Neon WebSocket driver in production.

### URL

The app lives at **https://snow-peak.brian-yu.com**, a subdomain attached to the
`snow-peak-2026` Vercel project. The `brian-yu.com` DNS zone is hosted at GoDaddy (the
personal site in the `about-brian` repo owns the apex); the `snow-peak` record there points at
Vercel, which provisions the certificate itself.

The project also answers on its `*.vercel.app` addresses. Setting `CANONICAL_HOST` to
`snow-peak.brian-yu.com` in the project's **Production** environment (then redeploying) makes
those addresses redirect to the subdomain; see `next.config.ts`. Leave it unset for Preview so
preview URLs keep working.
