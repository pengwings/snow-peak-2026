import { neon } from '@neondatabase/serverless';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const sql = neon(process.env.DATABASE_URL!);

async function init() {
  console.log("Creating tables...");
  
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
  
  await sql`
    CREATE TABLE IF NOT EXISTS cars (
      id TEXT PRIMARY KEY,
      name TEXT,
      driver TEXT,
      capacity INTEGER,
      passengers JSONB DEFAULT '[]'
    );
  `;
  
  await sql`
    CREATE TABLE IF NOT EXISTS flights (
      id TEXT PRIMARY KEY,
      username TEXT,
      airport TEXT,
      arrivalTime TEXT,
      departureTime TEXT
    );
  `;
  
  await sql`
    CREATE TABLE IF NOT EXISTS supplies (
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
      proposer TEXT,
      votes JSONB DEFAULT '[]'
    );
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS todos (
      id TEXT PRIMARY KEY,
      text TEXT,
      completed BOOLEAN DEFAULT false,
      username TEXT
    );
  `;

  // Seed default data
  const cabins = await sql`SELECT count(*) FROM cabins`;
  if (parseInt(cabins[0].count) === 0) {
    console.log("Seeding cabins...");
    await sql`INSERT INTO cabins (id, name, capacity, occupants) VALUES ('1', 'Cabin 1', 4, '[]')`;
    await sql`INSERT INTO cabins (id, name, capacity, occupants) VALUES ('2', 'Cabin 2', 4, '[]')`;
    await sql`INSERT INTO cabins (id, name, capacity, occupants) VALUES ('3', 'Cabin 3', 6, '[]')`;
  }

  const cars = await sql`SELECT count(*) FROM cars`;
  if (parseInt(cars[0].count) === 0) {
    console.log("Seeding cars...");
    await sql`INSERT INTO cars (id, name, driver, capacity, passengers) VALUES ('1', 'SUV', 'Alice', 5, '[]')`;
    await sql`INSERT INTO cars (id, name, driver, capacity, passengers) VALUES ('2', 'Sedan', 'Bob', 4, '[]')`;
  }

  const supplies = await sql`SELECT count(*) FROM supplies`;
  if (parseInt(supplies[0].count) === 0) {
    console.log("Seeding supplies...");
    await sql`INSERT INTO supplies (id, name) VALUES ('1', 'Groceries (Dinner)')`;
    await sql`INSERT INTO supplies (id, name) VALUES ('2', 'Snacks')`;
    await sql`INSERT INTO supplies (id, name) VALUES ('3', 'Drinks')`;
    await sql`INSERT INTO supplies (id, name) VALUES ('4', 'Firewood')`;
  }

  console.log("Database initialization complete.");
  process.exit(0);
}

init().catch(err => {
  console.error(err);
  process.exit(1);
});
