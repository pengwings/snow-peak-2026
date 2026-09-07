'use client';

import { useState, useEffect, useRef } from 'react';
import { FoodIdea, FoodIngredient } from '@/lib/db';
import { CheckCircle, Circle, Plus, ShoppingBasket, Trash2 } from 'lucide-react';
import { displayName } from '@/lib/displayName';
import { FOOD_AGREED_THRESHOLD, isFoodApproved } from '@/lib/food';
import { useSession } from '@/lib/useSession';
import TabVisibilityToggle from '@/components/TabVisibilityToggle';
import SignInHint from '@/components/SignInHint';

export default function FoodPage() {
  const [ideas, setIdeas] = useState<FoodIdea[]>([]);
  const { user, isAdmin, ready } = useSession();
  const [users, setUsers] = useState<string[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newName, setNewName] = useState('');
  const [newDescription, setNewDescription] = useState('');
  // Draft ingredient inputs, keyed by food idea id
  const [ingredientDrafts, setIngredientDrafts] = useState<Record<string, { name: string; assignee: string }>>({});
  const formRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch('/api/food')
      .then((res) => res.json())
      .then(setIdeas);

    fetch('/api/users')
      .then((r) => r.json())
      .then((data: { name: string }[]) => setUsers(data.map((u) => u.name)))
      .catch(() => {}); // non-fatal
  }, []);

  const post = async (body: Record<string, unknown>) => {
    const res = await fetch('/api/food', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      alert(data.error || 'Something went wrong.');
      return;
    }
    if (Array.isArray(data.foodIdeas)) setIdeas(data.foodIdeas);
  };

  // ---- Food ideas ----
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    await post(
      editingId
        ? { action: 'edit', foodId: editingId, name: newName, description: newDescription }
        : { action: 'propose', name: newName, description: newDescription }
    );
    handleCancelEdit();
  };

  const handleEditClick = (idea: FoodIdea) => {
    setEditingId(idea.id);
    setNewName(idea.name);
    setNewDescription(idea.description);
    formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setNewName('');
    setNewDescription('');
  };

  const handleVote = (foodId: string) => post({ action: 'vote', foodId });
  const handlePromote = (foodId: string) => post({ action: 'promote', foodId });
  const handleDelete = async (idea: FoodIdea) => {
    if (!confirm(`Delete "${idea.name}" and its ingredient list?`)) return;
    if (editingId === idea.id) handleCancelEdit();
    await post({ action: 'delete', foodId: idea.id });
  };

  // ---- Ingredients ----
  const draftFor = (foodId: string) => ingredientDrafts[foodId] ?? { name: '', assignee: '' };
  const setDraft = (foodId: string, patch: Partial<{ name: string; assignee: string }>) =>
    setIngredientDrafts((prev) => ({ ...prev, [foodId]: { ...draftFor(foodId), ...patch } }));

  const handleAddIngredient = async (e: React.FormEvent, foodId: string) => {
    e.preventDefault();
    const draft = draftFor(foodId);
    if (!draft.name.trim()) return;
    await post({ action: 'addIngredient', foodId, name: draft.name, assignee: draft.assignee || null });
    setDraft(foodId, { name: '' });
  };

  const togglePurchased = (ing: FoodIngredient) =>
    post({ action: 'updateIngredient', foodId: ing.foodId, ingredientId: ing.id, purchased: !ing.purchased });

  const handleIngredientAssignee = (ing: FoodIngredient, assignee: string) =>
    post({ action: 'updateIngredient', foodId: ing.foodId, ingredientId: ing.id, assignee: assignee || null });

  const handleRemoveIngredient = (ing: FoodIngredient) =>
    post({ action: 'removeIngredient', foodId: ing.foodId, ingredientId: ing.id });

  if (!ready) return <div className="p-8">Loading...</div>;

  // View-only visitors see the menu, votes, and shopping lists but can't change them.
  const canEdit = user !== null;

  const sorted = [...ideas].sort((a, b) => b.votes.length - a.votes.length);
  const promoted = sorted.filter((f) => f.promoted);
  const agreed = sorted.filter((f) => !f.promoted && f.votes.length >= FOOD_AGREED_THRESHOLD);
  const proposed = sorted.filter((f) => !isFoodApproved(f));

  const voteButton = (idea: FoodIdea, tone: 'plain' | 'green') => {
    if (!canEdit) return <SignInHint action="vote" />;
    const hasVoted = user !== null && idea.votes.includes(user);
    return (
      <button
        onClick={() => handleVote(idea.id)}
        className={`w-full py-2 text-sm transition ${hasVoted ? 'bg-[#dff0e8] text-[#2d6a4f]' : ''}`}
        style={
          hasVoted
            ? { border: '1px solid #b7d8c0' }
            : tone === 'green'
              ? { background: '#f6fbf7', border: '1px solid #b7d8c0', color: '#2d6a4f' }
              : { background: 'var(--background)', border: '1px solid var(--border)', color: 'var(--foreground)' }
        }
      >
        {hasVoted ? 'Remove Vote' : 'Upvote'}
      </button>
    );
  };

  const adminButtons = (idea: FoodIdea) =>
    isAdmin && (
      <div className="flex gap-2 mt-3">
        <button
          onClick={() => handleEditClick(idea)}
          className="flex-1 py-1.5 text-xs tracking-widest uppercase"
          style={{ background: 'var(--background)', border: '1px solid var(--border)', color: 'var(--foreground)' }}
        >
          Edit
        </button>
        <button
          onClick={() => handlePromote(idea.id)}
          className="flex-1 py-1.5 text-xs tracking-widest uppercase"
          style={
            idea.promoted
              ? { background: 'var(--background)', border: '1px solid var(--border)', color: 'var(--muted)' }
              : { background: 'var(--accent)', border: '1px solid var(--accent)', color: '#f5f0e8' }
          }
        >
          {idea.promoted ? 'Unpromote' : 'Promote'}
        </button>
        <button
          onClick={() => handleDelete(idea)}
          className="px-3 py-1.5 text-xs tracking-widest uppercase text-red-500 hover:bg-red-50"
          style={{ border: '1px solid #e5c4c4' }}
          title="Delete this food idea"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    );

  const ingredientChecklist = (idea: FoodIdea) => {
    const bought = idea.ingredients.filter((i) => i.purchased).length;
    const draft = draftFor(idea.id);
    return (
      <div className="mt-4 overflow-hidden" style={{ border: '1px solid var(--border)', background: 'var(--card)' }}>
        <div className="px-3 py-2 flex items-center gap-2" style={{ borderBottom: '1px solid var(--border)' }}>
          <ShoppingBasket className="w-4 h-4" style={{ color: 'var(--muted)' }} />
          <h4 className="text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--muted)' }}>
            Ingredients to Buy
            {idea.ingredients.length > 0 && ` (${bought}/${idea.ingredients.length} bought)`}
          </h4>
        </div>
        {idea.ingredients.length === 0 ? (
          <p className="px-3 py-3 text-xs italic" style={{ color: 'var(--muted)' }}>
            {canEdit ? 'No ingredients yet — add what needs buying below.' : 'No ingredients yet.'}
          </p>
        ) : (
          <ul className="divide-y divide-gray-200">
            {idea.ingredients.map((ing) => (
              <li key={ing.id} className="px-3 py-2 flex items-center gap-3 hover:bg-gray-50 transition">
                <button
                  onClick={() => togglePurchased(ing)}
                  disabled={!canEdit}
                  className={ing.purchased ? 'text-green-500 shrink-0' : canEdit ? 'text-gray-400 hover:text-green-600 shrink-0' : 'text-gray-400 shrink-0'}
                  title={!canEdit ? (ing.purchased ? 'Bought' : 'Not bought yet') : ing.purchased ? 'Bought — click to unmark' : 'Mark as bought'}
                >
                  {ing.purchased ? <CheckCircle className="w-5 h-5" /> : <Circle className="w-5 h-5" />}
                </button>
                <div className="flex flex-col flex-1 min-w-0">
                  <span className={`text-sm truncate ${ing.purchased ? 'text-gray-400 line-through' : 'text-gray-900'}`}>
                    {ing.name}
                  </span>
                  <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                    <span className="text-xs" style={{ color: 'var(--muted)' }}>Buying:</span>
                    {canEdit ? (
                      <select
                        className="text-xs border border-gray-200 rounded px-1 py-0.5 text-gray-600 bg-white"
                        value={ing.assignee ?? ''}
                        onChange={(e) => handleIngredientAssignee(ing, e.target.value)}
                      >
                        <option value="">Unassigned</option>
                        {users.map((u) => (
                          <option key={u} value={u}>{displayName(u)}</option>
                        ))}
                      </select>
                    ) : (
                      <span className="text-xs text-gray-600">{ing.assignee ? displayName(ing.assignee) : 'Unassigned'}</span>
                    )}
                    {user !== null && ing.assignee === user && !ing.purchased && (
                      <span className="text-xs font-medium text-blue-600">You&apos;re on it!</span>
                    )}
                  </div>
                </div>
                {canEdit && (
                  <button
                    onClick={() => handleRemoveIngredient(ing)}
                    className="text-red-400 hover:text-red-600 p-1.5 rounded-full hover:bg-red-50 transition shrink-0"
                    title="Remove ingredient"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
        {canEdit && (
        <form
          onSubmit={(e) => handleAddIngredient(e, idea.id)}
          className="flex gap-2 px-3 py-2 flex-wrap"
          style={{ borderTop: '1px solid var(--border)', background: 'var(--background)' }}
        >
          <input
            type="text"
            className="flex-1 min-w-32 px-2 py-1 text-sm focus:outline-none"
            style={{ border: '1px solid var(--border)', background: 'var(--card)', color: 'var(--foreground)' }}
            placeholder="e.g. 2 lbs ground beef"
            value={draft.name}
            onChange={(e) => setDraft(idea.id, { name: e.target.value })}
          />
          <select
            className="text-xs border border-gray-300 rounded px-1.5 py-1 text-gray-700 bg-white"
            value={draft.assignee}
            onChange={(e) => setDraft(idea.id, { assignee: e.target.value })}
          >
            <option value="">Unassigned</option>
            {users.map((u) => (
              <option key={u} value={u}>{displayName(u)}</option>
            ))}
          </select>
          <button
            type="submit"
            className="inline-flex items-center gap-1 px-3 py-1 text-xs tracking-widest uppercase"
            style={{ background: 'var(--accent)', color: '#f5f0e8' }}
          >
            <Plus className="w-3.5 h-3.5" /> Add
          </button>
        </form>
        )}
      </div>
    );
  };

  return (
    <div className="max-w-4xl mx-auto px-6 py-12">
      <div className="flex items-center gap-3 mb-2">
        <h1 className="text-4xl font-normal" style={{ fontFamily: 'EB Garamond, Georgia, serif' }}>Campsite Cooking</h1>
        <TabVisibilityToggle />
      </div>
      <div className="w-8 h-px mb-8" style={{ background: 'var(--border)' }} />

      {!canEdit && <SignInHint panel className="mb-8" action="suggest a dish, vote, or build the shopping list" />}
      {canEdit && (
      <div ref={formRef} className="mb-8 p-6" style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
        <h2 className="text-xl font-semibold mb-1 text-gray-900">{editingId ? 'Edit Food Idea' : 'Suggest Something to Cook'}</h2>
        {!editingId && (
          <p className="text-xs mb-4" style={{ color: 'var(--muted)' }}>
            Ideas with {FOOD_AGREED_THRESHOLD}+ votes make the menu, and everyone can then build the shopping list for it.
          </p>
        )}
        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            type="text"
            required
            className="w-full border-gray-400 rounded-md shadow-sm border px-3 py-2 text-gray-900 placeholder-gray-500"
            placeholder="Dish, e.g. Campfire chili"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
          />
          <textarea
            className="w-full border-gray-400 rounded-md shadow-sm border px-3 py-2 resize-none text-gray-900 placeholder-gray-500"
            placeholder="Details (optional) — which night, serves how many, recipe link…"
            rows={2}
            value={newDescription}
            onChange={(e) => setNewDescription(e.target.value)}
          />
          <div className="flex gap-3">
            <button
              type="submit"
              className="px-6 py-2 text-sm tracking-widest uppercase"
              style={{ background: 'var(--accent)', color: '#f5f0e8' }}>
              {editingId ? 'Save' : 'Suggest'}
            </button>
            {editingId && (
              <button
                type="button"
                onClick={handleCancelEdit}
                className="px-6 py-2 text-sm tracking-widest uppercase"
                style={{ color: 'var(--muted)', border: '1px solid var(--border)' }}>
                Cancel
              </button>
            )}
          </div>
        </form>
      </div>
      )}

      {promoted.length > 0 && (
        <div className="mb-8">
          <h2 className="text-2xl font-normal mb-4" style={{ fontFamily: 'EB Garamond, Georgia, serif', color: 'var(--accent)' }}>On the Menu</h2>
          <div className="grid gap-4">
            {promoted.map((idea) => (
              <div key={idea.id} className="p-4" style={{ border: '2px solid var(--accent)', background: 'var(--card)' }}>
                <h3 className="text-lg font-semibold mb-1" style={{ color: 'var(--foreground)' }}>{idea.name}</h3>
                {idea.description && (
                  <p className="text-sm mb-2" style={{ color: 'var(--foreground)' }}>{idea.description}</p>
                )}
                <p className="text-xs" style={{ color: 'var(--muted)' }}>
                  Suggested by: {displayName(idea.proposer)} · {idea.votes.length} votes
                </p>
                {ingredientChecklist(idea)}
                {adminButtons(idea)}
              </div>
            ))}
          </div>
        </div>
      )}

      {agreed.length > 0 && (
        <div className="mb-8">
          <h2 className="text-2xl font-normal mb-4" style={{ fontFamily: 'EB Garamond, Georgia, serif', color: '#2d6a4f' }}>Agreed Upon ({FOOD_AGREED_THRESHOLD}+ Votes)</h2>
          <div className="grid gap-4">
            {agreed.map((idea) => (
              <div key={idea.id} className="p-4" style={{ border: '2px solid #b7d8c0', background: '#edf7f0' }}>
                <div className="flex justify-between items-start mb-1">
                  <h3 className="text-lg font-semibold text-green-900">{idea.name}</h3>
                  <span className="bg-green-200 text-green-800 text-xs px-2 py-1 rounded-full font-bold">
                    {idea.votes.length} Votes
                  </span>
                </div>
                {idea.description && (
                  <p className="text-sm text-green-800 mb-2">{idea.description}</p>
                )}
                <p className="text-xs text-green-600 mb-3">Suggested by: {displayName(idea.proposer)}</p>
                {voteButton(idea, 'green')}
                {ingredientChecklist(idea)}
                {adminButtons(idea)}
              </div>
            ))}
          </div>
        </div>
      )}

      <div>
        <h2 className="text-2xl font-normal mb-4" style={{ fontFamily: 'EB Garamond, Georgia, serif' }}>Suggested Dishes</h2>
        {proposed.length === 0 ? (
          <p className="text-gray-500 italic">No pending suggestions — what should we cook?</p>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {proposed.map((idea) => (
              <div key={idea.id} className="p-4" style={{ border: '1px solid var(--border)', background: 'var(--card)' }}>
                <div className="flex justify-between items-start mb-1">
                  <h3 className="text-lg font-semibold text-gray-900">{idea.name}</h3>
                  <span className="bg-gray-100 text-gray-700 text-xs px-2 py-1 rounded-full font-bold">
                    {idea.votes.length} Votes
                  </span>
                </div>
                {idea.description && (
                  <p className="text-sm text-gray-600 mb-2">{idea.description}</p>
                )}
                <p className="text-xs text-gray-400 mb-4">Suggested by: {displayName(idea.proposer)}</p>
                {voteButton(idea, 'plain')}
                {adminButtons(idea)}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
