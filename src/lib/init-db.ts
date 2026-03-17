import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });


import { sql } from './db-client';

async function init() {
  console.log("Creating/updating tables...");

  // Drop cars table if it exists
  await sql`DROP TABLE IF EXISTS cars`;

  await sql`
    CREATE TABLE IF NOT EXISTS users (
      name TEXT PRIMARY KEY
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
      amountPaid REAL
    );
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS activities (
      id TEXT PRIMARY KEY,
      name TEXT,
      description TEXT DEFAULT '',
      proposer TEXT,
      votes JSONB DEFAULT '[]'
    );
  `;
  await sql`ALTER TABLE activities ADD COLUMN IF NOT EXISTS description TEXT DEFAULT '';`;

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
