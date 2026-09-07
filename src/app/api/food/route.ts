import { NextResponse } from 'next/server';
import { db, FoodIngredient } from '@/lib/db';
import { getSessionUser } from '@/lib/auth';
import { isFoodApproved } from '@/lib/food';

const newId = () => Math.random().toString(36).substring(2, 9);

export async function GET() {
  return NextResponse.json(await db.getFoodIdeas());
}

export async function POST(request: Request) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const user = sessionUser.name;

  const body = await request.json();
  const { action, foodId, ingredientId } = body;
  const name = typeof body.name === 'string' ? body.name.trim() : '';
  const description = typeof body.description === 'string' ? body.description.trim() : '';

  const findIdea = async (id: string) => (await db.getFoodIdeas()).find((f) => f.id === id) ?? null;
  const notFound = (what: string) => NextResponse.json({ error: `${what} not found` }, { status: 404 });
  const adminOnly = (what: string) =>
    NextResponse.json({ error: `Only a trip admin can ${what}` }, { status: 403 });

  // ---- Food ideas ----
  if (action === 'propose') {
    if (!name) return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    await db.addFoodIdea({
      id: newId(),
      name,
      description,
      proposer: user,
      votes: [user], // proposer auto-votes
      promoted: false,
    });
  } else if (action === 'vote') {
    const idea = await findIdea(foodId);
    if (!idea) return notFound('Food idea');
    idea.votes = idea.votes.includes(user) ? idea.votes.filter((v) => v !== user) : [...idea.votes, user];
    await db.updateFoodIdea(idea);
  } else if (action === 'edit') {
    if (!sessionUser.isAdmin) return adminOnly('edit food ideas');
    if (!name) return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    const idea = await findIdea(foodId);
    if (!idea) return notFound('Food idea');
    idea.name = name;
    idea.description = description;
    await db.updateFoodIdea(idea);
  } else if (action === 'promote') {
    if (!sessionUser.isAdmin) return adminOnly('promote food ideas');
    const idea = await findIdea(foodId);
    if (!idea) return notFound('Food idea');
    idea.promoted = !idea.promoted;
    await db.updateFoodIdea(idea);
  } else if (action === 'delete') {
    if (!sessionUser.isAdmin) return adminOnly('delete food ideas');
    const idea = await findIdea(foodId);
    if (!idea) return notFound('Food idea');
    await db.removeFoodIdea(idea.id);

  // ---- Ingredient checklist (only for approved ideas) ----
  } else if (action === 'addIngredient') {
    if (!name) return NextResponse.json({ error: 'Ingredient name is required' }, { status: 400 });
    const idea = await findIdea(foodId);
    if (!idea) return notFound('Food idea');
    if (!isFoodApproved(idea)) {
      return NextResponse.json({ error: 'Ingredients can only be added once a food idea is agreed upon' }, { status: 400 });
    }
    const ingredient: FoodIngredient = {
      id: newId(),
      foodId: idea.id,
      name,
      purchased: false,
      addedBy: user,
      assignee: typeof body.assignee === 'string' && body.assignee ? body.assignee : null,
    };
    await db.addFoodIngredient(ingredient);
  } else if (action === 'updateIngredient') {
    const idea = await findIdea(foodId);
    if (!idea) return notFound('Food idea');
    const ingredient = idea.ingredients.find((i) => i.id === ingredientId);
    if (!ingredient) return notFound('Ingredient');
    if (typeof body.purchased === 'boolean') ingredient.purchased = body.purchased;
    if ('assignee' in body) ingredient.assignee = typeof body.assignee === 'string' && body.assignee ? body.assignee : null;
    if (name) ingredient.name = name;
    await db.updateFoodIngredient(ingredient);
  } else if (action === 'removeIngredient') {
    const idea = await findIdea(foodId);
    if (!idea) return notFound('Food idea');
    const ingredient = idea.ingredients.find((i) => i.id === ingredientId);
    if (!ingredient) return notFound('Ingredient');
    await db.removeFoodIngredient(ingredient.id);
  } else {
    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  }

  return NextResponse.json({ success: true, foodIdeas: await db.getFoodIdeas() });
}
