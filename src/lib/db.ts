export type User = {
  name: string;
  isAdmin: boolean;
};

export type Cabin = {
  id: string;
  name: string;
  capacity: number;
  occupants: string[];
};


export type Flight = {
  id: string;
  user: string;
  departureAirport: string;
  arrivalAirport: string;
  arrivalTime: string;   // ISO UTC string
  departureTime: string; // ISO UTC string
  flightNumber?: string;
  flightType: 'arriving' | 'departing';
};

export type Expense = {
  id: string;
  name: string;
  buyer: string | null;
  amountPaid: number | null;
};

export type Activity = {
  id: string;
  name: string;
  description: string;
  proposer: string;
  votes: string[];
  promoted: boolean;
};

export type Todo = {
  id: string;
  text: string;
  completed: boolean;
  user: string;
  assignee: string | null;
};

export type ScheduleItem = {
  id: string;
  day: string;      // YYYY-MM-DD
  time: string;     // HH:MM, or '' for all-day
  endTime: string;  // HH:MM, or '' if open-ended
  title: string;
  description: string;
};

export type PackingItem = {
  id: string;
  name: string;
  provided: boolean;
  personal: boolean;
  packed: boolean;
  user: string | null;
  assignee: string | null;
};

import { sql } from './db-client';

export const db = {
  async getUsers(): Promise<User[]> {
    const rows = await sql`SELECT * FROM users`;
    return rows.map((r: any) => ({
      name: r.name,
      isAdmin: !!r.is_admin,
    }));
  },
  async getUser(name: string): Promise<User | null> {
    const rows = await sql`SELECT * FROM users WHERE name = ${name}`;
    return rows.length ? { name: rows[0].name, isAdmin: !!rows[0].is_admin } : null;
  },
  async addUser(name: string) {
    await sql`INSERT INTO users (name) VALUES (${name}) ON CONFLICT DO NOTHING`;
  },

  async getScheduleItems(): Promise<ScheduleItem[]> {
    const rows = await sql`SELECT * FROM schedule_items ORDER BY day, time`;
    return rows.map((r: any) => ({
      id: r.id,
      day: r.day,
      time: r.time ?? '',
      endTime: r.end_time ?? '',
      title: r.title,
      description: r.description ?? '',
    }));
  },
  async addScheduleItem(item: ScheduleItem) {
    await sql`INSERT INTO schedule_items (id, day, time, end_time, title, description)
              VALUES (${item.id}, ${item.day}, ${item.time}, ${item.endTime}, ${item.title}, ${item.description})`;
  },
  async updateScheduleItem(item: ScheduleItem) {
    await sql`UPDATE schedule_items
              SET day = ${item.day}, time = ${item.time}, end_time = ${item.endTime}, title = ${item.title}, description = ${item.description}
              WHERE id = ${item.id}`;
  },
  async removeScheduleItem(itemId: string) {
    await sql`DELETE FROM schedule_items WHERE id = ${itemId}`;
  },

  async getCabins(): Promise<Cabin[]> {
    const rows = await sql`SELECT * FROM cabins ORDER BY id::integer`;
    return rows.map((r: any) => ({
      ...r,
      occupants: typeof r.occupants === 'string' ? JSON.parse(r.occupants) : (r.occupants || [])
    }));
  },
  async updateCabin(cabin: Cabin) {
    await sql`UPDATE cabins 
              SET occupants = ${JSON.stringify(cabin.occupants)}::jsonb 
              WHERE id = ${cabin.id}`;
  },

  async getFlights(): Promise<Flight[]> {
    const rows = await sql`SELECT * FROM flights`;
    return rows.map((r: any) => ({
      id: r.id,
      user: r.username,
      departureAirport: r.departureairport,
      arrivalAirport: r.arrivalairport,
      arrivalTime: r.arrivaltime instanceof Date ? r.arrivaltime.toISOString() : r.arrivaltime,
      departureTime: r.departuretime instanceof Date ? r.departuretime.toISOString() : r.departuretime,
      flightNumber: r.flightnumber,
      flightType: r.flighttype || 'arriving',
    }));
  },
  async addFlight(flight: Flight) {
    await sql`INSERT INTO flights (id, username, departureairport, arrivalairport, arrivaltime, departuretime, flightnumber, flighttype)
              VALUES (${flight.id}, ${flight.user}, ${flight.departureAirport}, ${flight.arrivalAirport}, ${flight.arrivalTime}::timestamptz, ${flight.departureTime}::timestamptz, ${flight.flightNumber || null}, ${flight.flightType})`;
  },
  async removeFlightForUser(user: string) {
    await sql`DELETE FROM flights WHERE username = ${user}`;
  },
  async removeFlightByType(user: string, flightType: 'arriving' | 'departing') {
    await sql`DELETE FROM flights WHERE username = ${user} AND flighttype = ${flightType}`;
  },

  async getExpenses(): Promise<Expense[]> {
    const rows = await sql`SELECT * FROM expenses`;
    return rows.map((r: any) => ({
      id: r.id,
      name: r.name,
      buyer: r.buyer,
      amountPaid: r.amountpaid
    }));
  },
  async addExpense(expense: Expense) {
    await sql`INSERT INTO expenses (id, name, buyer, amountpaid)
              VALUES (${expense.id}, ${expense.name}, ${expense.buyer || null}, ${expense.amountPaid || null})`;
  },
  async updateExpense(expense: Expense) {
    await sql`UPDATE expenses
              SET buyer = ${expense.buyer}, amountpaid = ${expense.amountPaid}
              WHERE id = ${expense.id}`;
  },
  async removeExpense(expenseId: string) {
    await sql`DELETE FROM expenses WHERE id = ${expenseId}`;
  },

  async getActivities(): Promise<Activity[]> {
    const rows = await sql`SELECT * FROM activities`;
    return rows.map((r: any) => ({
      ...r,
      votes: typeof r.votes === 'string' ? JSON.parse(r.votes) : (r.votes || []),
      promoted: !!r.promoted
    }));
  },
  async addActivity(activity: Activity) {
    await sql`INSERT INTO activities (id, name, description, proposer, votes, promoted)
              VALUES (${activity.id}, ${activity.name}, ${activity.description}, ${activity.proposer}, ${JSON.stringify(activity.votes)}::jsonb, ${activity.promoted})`;
  },
  async updateActivity(activity: Activity) {
    await sql`UPDATE activities
              SET name = ${activity.name}, description = ${activity.description},
                  votes = ${JSON.stringify(activity.votes)}::jsonb, promoted = ${activity.promoted}
              WHERE id = ${activity.id}`;
  },

  async getTodos(): Promise<Todo[]> {
    const rows = await sql`SELECT * FROM todos`;
    return rows.map((r: any) => ({
      id: r.id,
      text: r.text,
      completed: r.completed,
      user: r.username,
      assignee: r.assignee ?? null,
    }));
  },
  async addTodo(todo: Todo) {
    await sql`INSERT INTO todos (id, text, completed, username, assignee)
              VALUES (${todo.id}, ${todo.text}, ${todo.completed}, ${todo.user}, ${todo.assignee})`;
  },
  async updateTodo(todo: Todo) {
    await sql`UPDATE todos 
              SET text = ${todo.text}, completed = ${todo.completed}, assignee = ${todo.assignee}
              WHERE id = ${todo.id}`;
  },
  async removeTodo(todoId: string) {
    await sql`DELETE FROM todos WHERE id = ${todoId}`;
  },

  async getPackingItems(): Promise<PackingItem[]> {
    const rows = await sql`SELECT * FROM packing_items ORDER BY lower(name)`;
    return rows.map((r: any) => ({
      id: r.id,
      name: r.name,
      provided: r.provided,
      personal: r.personal ?? false,
      packed: r.packed,
      user: r.username ?? null,
      assignee: r.assignee ?? null,
    }));
  },
  async addPackingItem(item: PackingItem) {
    await sql`INSERT INTO packing_items (id, name, provided, personal, packed, username, assignee)
              VALUES (${item.id}, ${item.name}, ${item.provided}, ${item.personal}, ${item.packed}, ${item.user}, ${item.assignee})`;
  },
  async updatePackingItem(item: PackingItem) {
    await sql`UPDATE packing_items
              SET name = ${item.name}, packed = ${item.packed}, assignee = ${item.assignee}
              WHERE id = ${item.id}`;
  },
  async removePackingItem(itemId: string) {
    await sql`DELETE FROM packing_items WHERE id = ${itemId}`;
  }
};
