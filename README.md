# Snow Peak 2026: Trip Organizer

A full-stack, nature-inspired web application built with [Next.js](https://nextjs.org) for organizing and planning group trips.

## Features

- **Guest Sessions & User Accounts**: Start planning immediately as a guest; data migrates to your account on sign-up.
- **Flight Coordination**: Track arrival/departure details for all trip members.
- **Cabin & Lodging Management**: Assign and manage cabin assignments with ranking.
- **Activity Planning**: Collaborative itinerary and activity planning.
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
