import Database from 'better-sqlite3';
import path from 'path';

export type User = {
  name: string;
};

export type Cabin = {
  id: string;
  name: string;
  capacity: number;
  occupants: string[];
};

export type Car = {
  id: string;
  name: string;
  driver: string;
  capacity: number;
  passengers: string[];
};

export type Flight = {
  id: string;
  user: string;
  airport: string;
  arrivalTime: string;
  departureTime: string;
};

export type Supply = {
  id: string;
  name: string;
  buyer: string | null;
  amountPaid: number | null;
};

export type Activity = {
  id: string;
  name: string;
  proposer: string;
  votes: string[];
};

// Create or open the database file
const dbPath = path.resolve(process.cwd(), 'database.sqlite');
const sqlDb = new Database(dbPath);
sqlDb.pragma('journal_mode = WAL');

// Initialize tables if they don't exist
sqlDb.exec(`
  CREATE TABLE IF NOT EXISTS users (
    name TEXT PRIMARY KEY
  );

  CREATE TABLE IF NOT EXISTS cabins (
    id TEXT PRIMARY KEY,
    name TEXT,
    capacity INTEGER,
    occupants TEXT -- JSON array string
  );

  CREATE TABLE IF NOT EXISTS cars (
    id TEXT PRIMARY KEY,
    name TEXT,
    driver TEXT,
    capacity INTEGER,
    passengers TEXT -- JSON array string
  );

  CREATE TABLE IF NOT EXISTS flights (
    id TEXT PRIMARY KEY,
    user TEXT,
    airport TEXT,
    arrivalTime TEXT,
    departureTime TEXT
  );

  CREATE TABLE IF NOT EXISTS supplies (
    id TEXT PRIMARY KEY,
    name TEXT,
    buyer TEXT,
    amountPaid REAL
  );

  CREATE TABLE IF NOT EXISTS activities (
    id TEXT PRIMARY KEY,
    name TEXT,
    proposer TEXT,
    votes TEXT -- JSON array string
  );
`);

// Seed Initial Data (only if tables are empty)
const cabinsCount = sqlDb.prepare('SELECT COUNT(*) as count FROM cabins').get() as { count: number };
if (cabinsCount.count === 0) {
  const insertCabin = sqlDb.prepare('INSERT INTO cabins (id, name, capacity, occupants) VALUES (?, ?, ?, ?)');
  insertCabin.run('1', 'Cabin 1', 4, '[]');
  insertCabin.run('2', 'Cabin 2', 4, '[]');
  insertCabin.run('3', 'Cabin 3', 6, '[]');
}

const carsCount = sqlDb.prepare('SELECT COUNT(*) as count FROM cars').get() as { count: number };
if (carsCount.count === 0) {
  const insertCar = sqlDb.prepare('INSERT INTO cars (id, name, driver, capacity, passengers) VALUES (?, ?, ?, ?, ?)');
  insertCar.run('1', 'SUV', 'Alice', 5, '[]');
  insertCar.run('2', 'Sedan', 'Bob', 4, '[]');
}

const suppliesCount = sqlDb.prepare('SELECT COUNT(*) as count FROM supplies').get() as { count: number };
if (suppliesCount.count === 0) {
  const insertSupply = sqlDb.prepare('INSERT INTO supplies (id, name, buyer, amountPaid) VALUES (?, ?, ?, ?)');
  insertSupply.run('1', 'Groceries (Dinner)', null, null);
  insertSupply.run('2', 'Snacks', null, null);
  insertSupply.run('3', 'Drinks', null, null);
  insertSupply.run('4', 'Firewood', null, null);
}

// Wrapper to provide the same API structure to the rest of the application
export const db = {
  get users(): User[] {
    return sqlDb.prepare('SELECT * FROM users').all() as User[];
  },
  addUser(name: string) {
    sqlDb.prepare('INSERT OR IGNORE INTO users (name) VALUES (?)').run(name);
  },

  get cabins(): Cabin[] {
    const rows = sqlDb.prepare('SELECT * FROM cabins').all() as any[];
    return rows.map(r => ({ ...r, occupants: JSON.parse(r.occupants) }));
  },
  updateCabin(cabin: Cabin) {
    sqlDb.prepare('UPDATE cabins SET occupants = ? WHERE id = ?').run(JSON.stringify(cabin.occupants), cabin.id);
  },

  get cars(): Car[] {
    const rows = sqlDb.prepare('SELECT * FROM cars').all() as any[];
    return rows.map(r => ({ ...r, passengers: JSON.parse(r.passengers) }));
  },
  updateCar(car: Car) {
    sqlDb.prepare('UPDATE cars SET passengers = ? WHERE id = ?').run(JSON.stringify(car.passengers), car.id);
  },

  get flights(): Flight[] {
    return sqlDb.prepare('SELECT * FROM flights').all() as Flight[];
  },
  addFlight(flight: Flight) {
    sqlDb.prepare('INSERT INTO flights (id, user, airport, arrivalTime, departureTime) VALUES (?, ?, ?, ?, ?)').run(flight.id, flight.user, flight.airport, flight.arrivalTime, flight.departureTime);
  },
  removeFlightForUser(user: string) {
    sqlDb.prepare('DELETE FROM flights WHERE user = ?').run(user);
  },

  get supplies(): Supply[] {
    return sqlDb.prepare('SELECT * FROM supplies').all() as Supply[];
  },
  updateSupply(supply: Supply) {
    sqlDb.prepare('UPDATE supplies SET buyer = ?, amountPaid = ? WHERE id = ?').run(supply.buyer, supply.amountPaid, supply.id);
  },

  get activities(): Activity[] {
    const rows = sqlDb.prepare('SELECT * FROM activities').all() as any[];
    return rows.map(r => ({ ...r, votes: JSON.parse(r.votes) }));
  },
  addActivity(activity: Activity) {
    sqlDb.prepare('INSERT INTO activities (id, name, proposer, votes) VALUES (?, ?, ?, ?)').run(activity.id, activity.name, activity.proposer, JSON.stringify(activity.votes));
  },
  updateActivity(activity: Activity) {
    sqlDb.prepare('UPDATE activities SET votes = ? WHERE id = ?').run(JSON.stringify(activity.votes), activity.id);
  }
};
