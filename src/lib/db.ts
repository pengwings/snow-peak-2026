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

// In-memory global data store
// Note: This will reset when the Node.js process / Vercel Serverless Function restarts.
const globalData = {
  users: [] as User[],
  cabins: [
    { id: '1', name: 'Cabin 1', capacity: 4, occupants: [] },
    { id: '2', name: 'Cabin 2', capacity: 4, occupants: [] },
    { id: '3', name: 'Cabin 3', capacity: 6, occupants: [] }
  ] as Cabin[],
  cars: [
    { id: '1', name: 'SUV', driver: 'Alice', capacity: 5, passengers: [] },
    { id: '2', name: 'Sedan', driver: 'Bob', capacity: 4, passengers: [] }
  ] as Car[],
  flights: [] as Flight[],
  supplies: [
    { id: '1', name: 'Groceries (Dinner)', buyer: null, amountPaid: null },
    { id: '2', name: 'Snacks', buyer: null, amountPaid: null },
    { id: '3', name: 'Drinks', buyer: null, amountPaid: null },
    { id: '4', name: 'Firewood', buyer: null, amountPaid: null }
  ] as Supply[],
  activities: [] as Activity[]
};

export const db = {
  get users(): User[] {
    return globalData.users;
  },
  addUser(name: string) {
    if (!globalData.users.find(u => u.name === name)) {
      globalData.users.push({ name });
    }
  },

  get cabins(): Cabin[] {
    return globalData.cabins;
  },
  updateCabin(cabin: Cabin) {
    const idx = globalData.cabins.findIndex(c => c.id === cabin.id);
    if (idx !== -1) globalData.cabins[idx] = cabin;
  },

  get cars(): Car[] {
    return globalData.cars;
  },
  updateCar(car: Car) {
    const idx = globalData.cars.findIndex(c => c.id === car.id);
    if (idx !== -1) globalData.cars[idx] = car;
  },

  get flights(): Flight[] {
    return globalData.flights;
  },
  addFlight(flight: Flight) {
    globalData.flights.push(flight);
  },
  removeFlightForUser(user: string) {
    globalData.flights = globalData.flights.filter(f => f.user !== user);
  },

  get supplies(): Supply[] {
    return globalData.supplies;
  },
  updateSupply(supply: Supply) {
    const idx = globalData.supplies.findIndex(s => s.id === supply.id);
    if (idx !== -1) globalData.supplies[idx] = supply;
  },

  get activities(): Activity[] {
    return globalData.activities;
  },
  addActivity(activity: Activity) {
    globalData.activities.push(activity);
  },
  updateActivity(activity: Activity) {
    const idx = globalData.activities.findIndex(a => a.id === activity.id);
    if (idx !== -1) globalData.activities[idx] = activity;
  }
};
