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

export type Todo = {
  id: string;
  text: string;
  completed: boolean;
  user: string;
};

import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL!);

export const db = {
  async getUsers(): Promise<User[]> {
    return (await sql`SELECT * FROM users`) as User[];
  },
  async addUser(name: string) {
    await sql`INSERT INTO users (name) VALUES (${name}) ON CONFLICT DO NOTHING`;
  },

  async getCabins(): Promise<Cabin[]> {
    const rows = await sql`SELECT * FROM cabins`;
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

  async getCars(): Promise<Car[]> {
    const rows = await sql`SELECT * FROM cars`;
    return rows.map((r: any) => ({
      ...r,
      passengers: typeof r.passengers === 'string' ? JSON.parse(r.passengers) : (r.passengers || [])
    }));
  },
  async updateCar(car: Car) {
    await sql`UPDATE cars 
              SET passengers = ${JSON.stringify(car.passengers)}::jsonb 
              WHERE id = ${car.id}`;
  },

  async getFlights(): Promise<Flight[]> {
    const rows = await sql`SELECT * FROM flights`;
    return rows.map((r: any) => ({
      id: r.id,
      user: r.username,
      airport: r.airport,
      arrivalTime: r.arrivaltime,
      departureTime: r.departuretime
    }));
  },
  async addFlight(flight: Flight) {
    await sql`INSERT INTO flights (id, username, airport, arrivaltime, departuretime) 
              VALUES (${flight.id}, ${flight.user}, ${flight.airport}, ${flight.arrivalTime}, ${flight.departureTime})`;
  },
  async removeFlightForUser(user: string) {
    await sql`DELETE FROM flights WHERE username = ${user}`;
  },

  async getSupplies(): Promise<Supply[]> {
    const rows = await sql`SELECT * FROM supplies`;
    return rows.map((r: any) => ({
      id: r.id,
      name: r.name,
      buyer: r.buyer,
      amountPaid: r.amountpaid
    }));
  },
  async updateSupply(supply: Supply) {
    await sql`UPDATE supplies 
              SET buyer = ${supply.buyer}, amountpaid = ${supply.amountPaid} 
              WHERE id = ${supply.id}`;
  },

  async getActivities(): Promise<Activity[]> {
    const rows = await sql`SELECT * FROM activities`;
    return rows.map((r: any) => ({
      ...r,
      votes: typeof r.votes === 'string' ? JSON.parse(r.votes) : (r.votes || [])
    }));
  },
  async addActivity(activity: Activity) {
    await sql`INSERT INTO activities (id, name, proposer, votes) 
              VALUES (${activity.id}, ${activity.name}, ${activity.proposer}, ${JSON.stringify(activity.votes)}::jsonb)`;
  },
  async updateActivity(activity: Activity) {
    await sql`UPDATE activities 
              SET votes = ${JSON.stringify(activity.votes)}::jsonb 
              WHERE id = ${activity.id}`;
  },

  async getTodos(): Promise<Todo[]> {
    const rows = await sql`SELECT * FROM todos`;
    return rows.map((r: any) => ({
      id: r.id,
      text: r.text,
      completed: r.completed,
      user: r.username
    }));
  },
  async addTodo(todo: Todo) {
    await sql`INSERT INTO todos (id, text, completed, username) 
              VALUES (${todo.id}, ${todo.text}, ${todo.completed}, ${todo.user})`;
  },
  async updateTodo(todo: Todo) {
    await sql`UPDATE todos 
              SET text = ${todo.text}, completed = ${todo.completed} 
              WHERE id = ${todo.id}`;
  },
  async removeTodo(todoId: string) {
    await sql`DELETE FROM todos WHERE id = ${todoId}`;
  }
};
