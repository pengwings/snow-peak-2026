import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });


import { sql } from './db-client';

async function init() {
  console.log("Creating/updating tables...");

  // Drop cars table if it exists
  await sql`DROP TABLE IF EXISTS cars`;

  await sql`
    CREATE TABLE IF NOT EXISTS users (
      name TEXT PRIMARY KEY,
      is_admin BOOLEAN DEFAULT false
    );
  `;
  await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT false;`;
  // Brian is the trip admin
  await sql`INSERT INTO users (name, is_admin) VALUES ('Brian', true)
            ON CONFLICT (name) DO UPDATE SET is_admin = true`;

  await sql`
    CREATE TABLE IF NOT EXISTS app_settings (
      key TEXT PRIMARY KEY,
      value JSONB
    );
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS cabins (
      id TEXT PRIMARY KEY,
      name TEXT,
      capacity INTEGER,
      occupants JSONB DEFAULT '[]'
    );
  `;

  // flights — new schema: departure/arrival airports, TIMESTAMPTZ times
  await sql`
    CREATE TABLE IF NOT EXISTS flights (
      id TEXT PRIMARY KEY,
      username TEXT,
      departureAirport TEXT,
      arrivalAirport TEXT,
      arrivalTime TIMESTAMPTZ,
      departureTime TIMESTAMPTZ,
      flightNumber TEXT,
      flightType TEXT DEFAULT 'arriving'
    );
  `;
  // Migrate existing table if created before schema change
  await sql`ALTER TABLE flights ADD COLUMN IF NOT EXISTS departureAirport TEXT;`;
  await sql`ALTER TABLE flights ADD COLUMN IF NOT EXISTS arrivalAirport TEXT;`;
  await sql`ALTER TABLE flights ADD COLUMN IF NOT EXISTS flightNumber TEXT;`;
  await sql`ALTER TABLE flights ADD COLUMN IF NOT EXISTS flightType TEXT DEFAULT 'arriving';`;

  await sql`
    CREATE TABLE IF NOT EXISTS expenses (
      id TEXT PRIMARY KEY,
      name TEXT,
      buyer TEXT,
      amountPaid REAL,
      participants JSONB DEFAULT '[]'
    );
  `;
  await sql`ALTER TABLE expenses ADD COLUMN IF NOT EXISTS participants JSONB DEFAULT '[]';`;

  await sql`
    CREATE TABLE IF NOT EXISTS activities (
      id TEXT PRIMARY KEY,
      name TEXT,
      description TEXT DEFAULT '',
      proposer TEXT,
      votes JSONB DEFAULT '[]',
      promoted BOOLEAN DEFAULT false
    );
  `;
  await sql`ALTER TABLE activities ADD COLUMN IF NOT EXISTS description TEXT DEFAULT '';`;
  await sql`ALTER TABLE activities ADD COLUMN IF NOT EXISTS promoted BOOLEAN DEFAULT false;`;

  await sql`
    CREATE TABLE IF NOT EXISTS todos (
      id TEXT PRIMARY KEY,
      text TEXT,
      completed BOOLEAN DEFAULT false,
      username TEXT,
      assignee TEXT
    );
  `;
  await sql`ALTER TABLE todos ADD COLUMN IF NOT EXISTS assignee TEXT;`;

  await sql`
    CREATE TABLE IF NOT EXISTS schedule_items (
      id TEXT PRIMARY KEY,
      day TEXT,
      time TEXT DEFAULT '',
      end_time TEXT DEFAULT '',
      title TEXT,
      description TEXT DEFAULT ''
    );
  `;
  await sql`ALTER TABLE schedule_items ADD COLUMN IF NOT EXISTS end_time TEXT DEFAULT '';`;

  await sql`
    CREATE TABLE IF NOT EXISTS packing_items (
      id TEXT PRIMARY KEY,
      name TEXT,
      provided BOOLEAN DEFAULT false,
      personal BOOLEAN DEFAULT false,
      packed BOOLEAN DEFAULT false,
      username TEXT,
      assignee TEXT
    );
  `;
  await sql`ALTER TABLE packing_items ADD COLUMN IF NOT EXISTS personal BOOLEAN DEFAULT false;`;

  // Trivia: fact submissions (one row per user), authored questions,
  // per-question answers, and the set of players who joined the current game.
  await sql`
    CREATE TABLE IF NOT EXISTS trivia_facts (
      username TEXT PRIMARY KEY,
      hobby TEXT DEFAULT '',
      self_facts JSONB DEFAULT '[]',
      hobby_facts JSONB DEFAULT '[]',
      updated_at TIMESTAMPTZ DEFAULT now()
    );
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS trivia_questions (
      id TEXT PRIMARY KEY,
      position INTEGER NOT NULL DEFAULT 0,
      text TEXT NOT NULL,
      options JSONB DEFAULT '[]',
      correct_index INTEGER NOT NULL DEFAULT 0,
      about TEXT
    );
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS trivia_answers (
      question_id TEXT NOT NULL,
      username TEXT NOT NULL,
      choice INTEGER NOT NULL,
      elapsed_ms INTEGER NOT NULL DEFAULT 0,
      answered_at TIMESTAMPTZ DEFAULT now(),
      PRIMARY KEY (question_id, username)
    );
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS trivia_players (
      username TEXT PRIMARY KEY,
      joined_at TIMESTAMPTZ DEFAULT now()
    );
  `;

  // Seed the campground-provided items if none exist yet
  const providedCount = await sql`SELECT count(*) FROM packing_items WHERE provided = true`;
  if (parseInt(providedCount[0].count) === 0) {
    console.log("Seeding provided packing items...");
    const providedItems = [
      'Beds & mattresses',
      'Firewood',
      'Fire pit & grill grate',
      'Picnic tables',
      'Drinking water',
      'Restrooms & showers',
    ];
    for (const name of providedItems) {
      await sql`INSERT INTO packing_items (id, name, provided, packed)
                VALUES (${Math.random().toString(36).substring(7)}, ${name}, true, false)`;
    }
  }

  // Seed cabins 9–14 if table is empty
  const cabinCount = await sql`SELECT count(*) FROM cabins`;
  if (parseInt(cabinCount[0].count) === 0) {
    console.log("Seeding cabins...");
    await sql`INSERT INTO cabins (id, name, capacity, occupants) VALUES ('9',  'Cabin 09', 3, '[]')`;
    await sql`INSERT INTO cabins (id, name, capacity, occupants) VALUES ('11', 'Cabin 11', 3, '[]')`;
    await sql`INSERT INTO cabins (id, name, capacity, occupants) VALUES ('12', 'Cabin 12', 3, '[]')`;
    await sql`INSERT INTO cabins (id, name, capacity, occupants) VALUES ('13', 'Cabin 13', 3, '[]')`;
    await sql`INSERT INTO cabins (id, name, capacity, occupants) VALUES ('14', 'Cabin 14', 3, '[]')`;
  }

  console.log("Database initialization complete.");
  process.exit(0);
}

init().catch(err => {
  console.error(err);
  process.exit(1);
});
