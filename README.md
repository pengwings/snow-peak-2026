# Snow Peak 2026: Trip Organizer

A full-stack, nature-inspired web application built with [Next.js](https://nextjs.org) for organizing and planning group trips.

## Features

- **Guest Sessions & User Accounts**: Allows users to start planning immediately with guest sessions, seamlessly migrating data to authenticated accounts later.
- **Flight Coordination**: Track and coordinate arrival/departure flight details for all trip members.
- **Cabin & Lodging Management**: Assign and manage cabin or room assignments with ranking capabilities.
- **Activity Planning**: Collaborative itinerary and activity planning.
- **Expense Tracking**: Keep track of shared expenses and individual costs across the group.
- **Todo Lists**: Shared actionable todo lists to keep track of pre-trip and trip responsibilities.
- **Nature-Inspired Aesthetic**: A minimal, clean user interface styled manually with Tailwind CSS to match the serene vibe of a camping trip.

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Styling**: Tailwind CSS (v4)
- **Database**: PostgreSQL (via Neon Serverless)
- **Icons**: Lucide React
- **Authentication**: Custom cookie-based guest & user sessions
- **Deployment**: Vercel

## Getting Started

1. **Install dependencies:**

   ```bash
   npm install
   ```

2. **Set up the database:**
   Ensure your `.env.local` contains the right Neon/PostgreSQL connection string. Database initialization occurs during the build process, or you can run it manually:

   ```bash
   npx tsx src/lib/init-db.ts
   ```

3. **Run the development server:**

   ```bash
   npm run dev
   ```

4. **Open your browser:**
   Navigate to [http://localhost:3000](http://localhost:3000) to see the application.
