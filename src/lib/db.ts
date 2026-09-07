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
  participants: string[]; // empty = split among everyone
  settled: boolean;
};

export type Activity = {
  id: string;
  name: string;
  description: string;
  proposer: string;
  votes: string[];
  promoted: boolean;
};

export type FoodIngredient = {
  id: string;
  foodId: string;
  name: string;
  purchased: boolean;
  addedBy: string;
  assignee: string | null;
};

export type FoodIdea = {
  id: string;
  name: string;
  description: string;
  proposer: string;
  votes: string[];
  promoted: boolean;
  ingredients: FoodIngredient[];
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


export type TriviaFacts = {
  username: string;
  hobby: string;
  selfFacts: string[];
  hobbyFacts: string[];
  updatedAt: string | null;
};

export type TriviaQuestion = {
  id: string;
  position: number;
  text: string;
  options: string[];
  correctIndex: number;
  /** Optional: the person this question is about (shown on the reveal). */
  about: string | null;
};

export type TriviaAnswer = {
  questionId: string;
  username: string;
  choice: number;
  elapsedMs: number;
};

export type TriviaPhase = 'idle' | 'lobby' | 'question' | 'reveal' | 'leaderboard' | 'finished';

export type TriviaGameState = {
  phase: TriviaPhase;
  questionId: string | null;
  /** ISO timestamp of when the current question was shown. */
  startedAt: string | null;
};

// Raw row shapes as returned by Postgres (lowercase / snake_case column names).
type UserRow = { name: string; is_admin: boolean | null };
type ScheduleItemRow = { id: string; day: string; time: string | null; end_time: string | null; title: string; description: string | null };
type CabinRow = { id: string; name: string; capacity: number; occupants: unknown };
type FlightRow = {
  id: string; username: string; departureairport: string; arrivalairport: string;
  arrivaltime: Date | string; departuretime: Date | string; flightnumber: string | null;
  flighttype: Flight['flightType'] | null;
};
type ExpenseRow = { id: string; name: string; buyer: string | null; amountpaid: number | null; participants: unknown; settled: boolean | null };
type ActivityRow = { id: string; name: string; description: string | null; proposer: string; votes: unknown; promoted: boolean | null };
type FoodIdeaRow = { id: string; name: string; description: string | null; proposer: string; votes: unknown; promoted: boolean | null };
type FoodIngredientRow = { id: string; food_id: string; name: string; purchased: boolean | null; added_by: string | null; assignee: string | null };
type TodoRow = { id: string; text: string; completed: boolean; username: string; assignee: string | null };
type PackingItemRow = { id: string; name: string; provided: boolean; personal: boolean | null; packed: boolean; username: string | null; assignee: string | null };
type TriviaFactsRow = { username: string; hobby: string | null; self_facts: unknown; hobby_facts: unknown; updated_at: Date | string | null };
type TriviaQuestionRow = { id: string; position: number | null; text: string; options: unknown; correct_index: number | null; about: string | null };
type TriviaAnswerRow = { question_id: string; username: string; choice: number; elapsed_ms: number };
type TriviaPlayerRow = { username: string };

const TRIVIA_GAME_KEY = 'trivia_game';
const TRIVIA_FACTS_OPEN_KEY = 'trivia_facts_open';
const DEFAULT_GAME_STATE: TriviaGameState = { phase: 'idle', questionId: null, startedAt: null };

function parseJson<T>(value: unknown, fallback: T): T {
  if (value == null) return fallback;
  if (typeof value === 'string') {
    try { return JSON.parse(value) as T; } catch { return fallback; }
  }
  return value as T;
}

import { sql } from './db-client';

export const db = {
  async getUsers(): Promise<User[]> {
    const rows = await sql<UserRow>`SELECT * FROM users`;
    return rows.map((r: UserRow) => ({
      name: r.name,
      isAdmin: !!r.is_admin,
    }));
  },
  async getUser(name: string): Promise<User | null> {
    const rows = await sql<UserRow>`SELECT * FROM users WHERE name = ${name}`;
    return rows.length ? { name: rows[0].name, isAdmin: !!rows[0].is_admin } : null;
  },
  async addUser(name: string) {
    await sql`INSERT INTO users (name) VALUES (${name}) ON CONFLICT DO NOTHING`;
  },

  async getHiddenTabs(): Promise<string[]> {
    const rows = await sql<{ value: unknown }>`SELECT value FROM app_settings WHERE key = 'hidden_tabs'`;
    if (!rows.length) return [];
    return parseJson<string[]>(rows[0].value, []);
  },
  async setHiddenTabs(tabs: string[]) {
    await sql`INSERT INTO app_settings (key, value) VALUES ('hidden_tabs', ${JSON.stringify(tabs)}::jsonb)
              ON CONFLICT (key) DO UPDATE SET value = ${JSON.stringify(tabs)}::jsonb`;
  },

  // The Google My Maps id shown on the /map tab. Null until an admin sets one.
  // Stored as { mid } rather than a bare JSON string: the pg driver hands JSONB
  // back already parsed, and parseJson would try to JSON.parse a bare string.
  async getMapId(): Promise<string | null> {
    const rows = await sql<{ value: unknown }>`SELECT value FROM app_settings WHERE key = 'my_maps_id'`;
    if (!rows.length) return null;
    return parseJson<{ mid: string | null }>(rows[0].value, { mid: null }).mid ?? null;
  },
  async setMapId(mid: string | null) {
    const value = JSON.stringify({ mid });
    await sql`INSERT INTO app_settings (key, value) VALUES ('my_maps_id', ${value}::jsonb)
              ON CONFLICT (key) DO UPDATE SET value = ${value}::jsonb`;
  },

  async getScheduleItems(): Promise<ScheduleItem[]> {
    const rows = await sql<ScheduleItemRow>`SELECT * FROM schedule_items ORDER BY day, time`;
    return rows.map((r: ScheduleItemRow) => ({
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
    const rows = await sql<CabinRow>`SELECT * FROM cabins ORDER BY id::integer`;
    return rows.map((r: CabinRow) => ({
      id: r.id,
      name: r.name,
      capacity: r.capacity,
      occupants: parseJson<string[]>(r.occupants, []),
    }));
  },
  async updateCabin(cabin: Cabin) {
    await sql`UPDATE cabins 
              SET occupants = ${JSON.stringify(cabin.occupants)}::jsonb 
              WHERE id = ${cabin.id}`;
  },

  async getFlights(): Promise<Flight[]> {
    const rows = await sql<FlightRow>`SELECT * FROM flights`;
    return rows.map((r: FlightRow) => ({
      id: r.id,
      user: r.username,
      departureAirport: r.departureairport,
      arrivalAirport: r.arrivalairport,
      arrivalTime: r.arrivaltime instanceof Date ? r.arrivaltime.toISOString() : r.arrivaltime,
      departureTime: r.departuretime instanceof Date ? r.departuretime.toISOString() : r.departuretime,
      flightNumber: r.flightnumber ?? undefined,
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
    const rows = await sql<ExpenseRow>`SELECT * FROM expenses`;
    return rows.map((r: ExpenseRow) => ({
      id: r.id,
      name: r.name,
      buyer: r.buyer,
      amountPaid: r.amountpaid,
      participants: parseJson<string[]>(r.participants, []),
      settled: !!r.settled,
    }));
  },
  async addExpense(expense: Expense) {
    await sql`INSERT INTO expenses (id, name, buyer, amountpaid, participants, settled)
              VALUES (${expense.id}, ${expense.name}, ${expense.buyer || null}, ${expense.amountPaid || null}, ${JSON.stringify(expense.participants)}::jsonb, ${expense.settled})`;
  },
  async updateExpense(expense: Expense) {
    await sql`UPDATE expenses
              SET name = ${expense.name}, buyer = ${expense.buyer}, amountpaid = ${expense.amountPaid},
                  participants = ${JSON.stringify(expense.participants)}::jsonb, settled = ${expense.settled}
              WHERE id = ${expense.id}`;
  },
  async removeExpense(expenseId: string) {
    await sql`DELETE FROM expenses WHERE id = ${expenseId}`;
  },

  async getActivities(): Promise<Activity[]> {
    const rows = await sql<ActivityRow>`SELECT * FROM activities`;
    return rows.map((r: ActivityRow) => ({
      id: r.id,
      name: r.name,
      description: r.description ?? '',
      proposer: r.proposer,
      votes: parseJson<string[]>(r.votes, []),
      promoted: !!r.promoted,
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

  // ---- Food ideas & ingredient checklists ----
  async getFoodIdeas(): Promise<FoodIdea[]> {
    const rows = await sql<FoodIdeaRow>`SELECT * FROM food_ideas ORDER BY created_at, id`;
    const ingredientRows = await sql<FoodIngredientRow>`SELECT * FROM food_ingredients ORDER BY created_at, id`;
    const byFood = new Map<string, FoodIngredient[]>();
    for (const r of ingredientRows) {
      const ing = mapFoodIngredient(r);
      const list = byFood.get(ing.foodId) ?? [];
      list.push(ing);
      byFood.set(ing.foodId, list);
    }
    return rows.map((r: FoodIdeaRow) => ({
      id: r.id,
      name: r.name,
      description: r.description ?? '',
      proposer: r.proposer,
      votes: parseJson<string[]>(r.votes, []),
      promoted: !!r.promoted,
      ingredients: byFood.get(r.id) ?? [],
    }));
  },
  async addFoodIdea(idea: Omit<FoodIdea, 'ingredients'>) {
    await sql`INSERT INTO food_ideas (id, name, description, proposer, votes, promoted)
              VALUES (${idea.id}, ${idea.name}, ${idea.description}, ${idea.proposer}, ${JSON.stringify(idea.votes)}::jsonb, ${idea.promoted})`;
  },
  async updateFoodIdea(idea: Omit<FoodIdea, 'ingredients'>) {
    await sql`UPDATE food_ideas
              SET name = ${idea.name}, description = ${idea.description},
                  votes = ${JSON.stringify(idea.votes)}::jsonb, promoted = ${idea.promoted}
              WHERE id = ${idea.id}`;
  },
  async removeFoodIdea(ideaId: string) {
    await sql`DELETE FROM food_ingredients WHERE food_id = ${ideaId}`;
    await sql`DELETE FROM food_ideas WHERE id = ${ideaId}`;
  },
  async addFoodIngredient(ing: FoodIngredient) {
    await sql`INSERT INTO food_ingredients (id, food_id, name, purchased, added_by, assignee)
              VALUES (${ing.id}, ${ing.foodId}, ${ing.name}, ${ing.purchased}, ${ing.addedBy}, ${ing.assignee})`;
  },
  async updateFoodIngredient(ing: FoodIngredient) {
    await sql`UPDATE food_ingredients
              SET name = ${ing.name}, purchased = ${ing.purchased}, assignee = ${ing.assignee}
              WHERE id = ${ing.id}`;
  },
  async removeFoodIngredient(ingredientId: string) {
    await sql`DELETE FROM food_ingredients WHERE id = ${ingredientId}`;
  },

  async getTodos(): Promise<Todo[]> {
    const rows = await sql<TodoRow>`SELECT * FROM todos`;
    return rows.map((r: TodoRow) => ({
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
    const rows = await sql<PackingItemRow>`SELECT * FROM packing_items ORDER BY lower(name)`;
    return rows.map((r: PackingItemRow) => ({
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
  },

  // ---- Trivia: facts ----
  async getTriviaFacts(username: string): Promise<TriviaFacts | null> {
    const rows = await sql<TriviaFactsRow>`SELECT * FROM trivia_facts WHERE username = ${username}`;
    return rows.length ? mapTriviaFacts(rows[0]) : null;
  },
  async getAllTriviaFacts(): Promise<TriviaFacts[]> {
    const rows = await sql<TriviaFactsRow>`SELECT * FROM trivia_facts ORDER BY lower(username)`;
    return rows.map(mapTriviaFacts);
  },
  async saveTriviaFacts(facts: TriviaFacts) {
    await sql`INSERT INTO trivia_facts (username, hobby, self_facts, hobby_facts, updated_at)
              VALUES (${facts.username}, ${facts.hobby}, ${JSON.stringify(facts.selfFacts)}::jsonb, ${JSON.stringify(facts.hobbyFacts)}::jsonb, now())
              ON CONFLICT (username) DO UPDATE
              SET hobby = EXCLUDED.hobby, self_facts = EXCLUDED.self_facts, hobby_facts = EXCLUDED.hobby_facts, updated_at = now()`;
  },
  async deleteTriviaFacts(username: string) {
    await sql`DELETE FROM trivia_facts WHERE username = ${username}`;
  },
  async getTriviaFactsOpen(): Promise<boolean> {
    const rows = await sql<{ value: unknown }>`SELECT value FROM app_settings WHERE key = ${TRIVIA_FACTS_OPEN_KEY}`;
    if (!rows.length) return true;
    return parseJson<boolean>(rows[0].value, true);
  },
  async setTriviaFactsOpen(open: boolean) {
    await sql`INSERT INTO app_settings (key, value) VALUES (${TRIVIA_FACTS_OPEN_KEY}, ${JSON.stringify(open)}::jsonb)
              ON CONFLICT (key) DO UPDATE SET value = ${JSON.stringify(open)}::jsonb`;
  },

  // ---- Trivia: questions ----
  async getTriviaQuestions(): Promise<TriviaQuestion[]> {
    const rows = await sql<TriviaQuestionRow>`SELECT * FROM trivia_questions ORDER BY position, id`;
    return rows.map(mapTriviaQuestion);
  },
  async addTriviaQuestion(q: TriviaQuestion) {
    await sql`INSERT INTO trivia_questions (id, position, text, options, correct_index, about)
              VALUES (${q.id}, ${q.position}, ${q.text}, ${JSON.stringify(q.options)}::jsonb, ${q.correctIndex}, ${q.about})`;
  },
  async updateTriviaQuestion(q: TriviaQuestion) {
    await sql`UPDATE trivia_questions
              SET position = ${q.position}, text = ${q.text}, options = ${JSON.stringify(q.options)}::jsonb,
                  correct_index = ${q.correctIndex}, about = ${q.about}
              WHERE id = ${q.id}`;
  },
  async removeAllTriviaQuestions() {
    await sql`DELETE FROM trivia_questions`;
    await sql`DELETE FROM trivia_answers`;
  },
  async removeTriviaQuestion(id: string) {
    await sql`DELETE FROM trivia_questions WHERE id = ${id}`;
    await sql`DELETE FROM trivia_answers WHERE question_id = ${id}`;
  },

  // ---- Trivia: game state ----
  async getTriviaGameState(): Promise<TriviaGameState> {
    const rows = await sql<{ value: unknown }>`SELECT value FROM app_settings WHERE key = ${TRIVIA_GAME_KEY}`;
    if (!rows.length) return { ...DEFAULT_GAME_STATE };
    return { ...DEFAULT_GAME_STATE, ...parseJson<Partial<TriviaGameState>>(rows[0].value, {}) };
  },
  async setTriviaGameState(state: TriviaGameState) {
    await sql`INSERT INTO app_settings (key, value) VALUES (${TRIVIA_GAME_KEY}, ${JSON.stringify(state)}::jsonb)
              ON CONFLICT (key) DO UPDATE SET value = ${JSON.stringify(state)}::jsonb`;
  },

  // ---- Trivia: answers & players ----
  async getTriviaAnswers(): Promise<TriviaAnswer[]> {
    const rows = await sql<TriviaAnswerRow>`SELECT * FROM trivia_answers`;
    return rows.map((r: TriviaAnswerRow) => ({
      questionId: r.question_id,
      username: r.username,
      choice: r.choice,
      elapsedMs: r.elapsed_ms,
    }));
  },
  /** First answer wins: a second tap on a different option is ignored. */
  async addTriviaAnswer(answer: TriviaAnswer) {
    await sql`INSERT INTO trivia_answers (question_id, username, choice, elapsed_ms)
              VALUES (${answer.questionId}, ${answer.username}, ${answer.choice}, ${answer.elapsedMs})
              ON CONFLICT (question_id, username) DO NOTHING`;
  },
  async clearTriviaAnswers() {
    await sql`DELETE FROM trivia_answers`;
  },
  async getTriviaPlayers(): Promise<string[]> {
    const rows = await sql<TriviaPlayerRow>`SELECT username FROM trivia_players ORDER BY joined_at`;
    return rows.map((r: TriviaPlayerRow) => r.username);
  },
  async addTriviaPlayer(username: string) {
    await sql`INSERT INTO trivia_players (username) VALUES (${username}) ON CONFLICT DO NOTHING`;
  },
  async clearTriviaPlayers() {
    await sql`DELETE FROM trivia_players`;
  },
};

function mapFoodIngredient(r: FoodIngredientRow): FoodIngredient {
  return {
    id: r.id,
    foodId: r.food_id,
    name: r.name,
    purchased: !!r.purchased,
    addedBy: r.added_by ?? '',
    assignee: r.assignee ?? null,
  };
}

function mapTriviaFacts(r: TriviaFactsRow): TriviaFacts {
  return {
    username: r.username,
    hobby: r.hobby ?? '',
    selfFacts: parseJson<string[]>(r.self_facts, []),
    hobbyFacts: parseJson<string[]>(r.hobby_facts, []),
    updatedAt: r.updated_at instanceof Date ? r.updated_at.toISOString() : (r.updated_at ?? null),
  };
}

function mapTriviaQuestion(r: TriviaQuestionRow): TriviaQuestion {
  return {
    id: r.id,
    position: r.position ?? 0,
    text: r.text,
    options: parseJson<string[]>(r.options, []),
    correctIndex: r.correct_index ?? 0,
    about: r.about ?? null,
  };
}
