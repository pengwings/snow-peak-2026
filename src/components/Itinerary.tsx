'use client';

import { useState, useEffect } from 'react';
import { ScheduleItem } from '@/lib/db';
import { X } from 'lucide-react';
import { format, parseISO } from 'date-fns';

// The trip runs September 10–13, 2026
const TRIP_DAYS = ['2026-09-10', '2026-09-11', '2026-09-12', '2026-09-13'];
const HOUR_PX = 48;
const GUTTER_PX = 56;

const minutesOf = (t: string) => {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
};

// Untimed end → assume one hour, capped at midnight
const endMinutesOf = (item: ScheduleItem) =>
  item.endTime ? minutesOf(item.endTime) : Math.min(minutesOf(item.time) + 60, 24 * 60);

const formatTime = (t: string) => format(parseISO(`2000-01-01T${t}`), 'h:mm a');

const hourLabel = (h: number) =>
  h === 0 || h === 24 ? '12 AM' : h === 12 ? '12 PM' : h < 12 ? `${h} AM` : `${h - 12} PM`;

type Positioned = {
  item: ScheduleItem;
  top: number;
  height: number;
  leftPct: number;
  widthPct: number;
};

// Google-Calendar-style layout: overlapping events share the column width
function layoutDay(events: ScheduleItem[], gridStartMin: number): Positioned[] {
  const sorted = [...events].sort((a, b) => minutesOf(a.time) - minutesOf(b.time));
  const result: Positioned[] = [];

  let cluster: { item: ScheduleItem; start: number; end: number; lane: number }[] = [];
  let clusterEnd = -1;

  const flush = () => {
    const lanes = Math.max(...cluster.map((c) => c.lane)) + 1;
    for (const c of cluster) {
      result.push({
        item: c.item,
        top: ((c.start - gridStartMin) / 60) * HOUR_PX,
        height: Math.max(((c.end - c.start) / 60) * HOUR_PX - 2, 22),
        leftPct: (c.lane * 100) / lanes,
        widthPct: 100 / lanes,
      });
    }
    cluster = [];
  };

  for (const ev of sorted) {
    const start = minutesOf(ev.time);
    const end = Math.max(endMinutesOf(ev), start + 15);
    if (cluster.length && start >= clusterEnd) flush();

    const laneEnds: number[] = [];
    for (const c of cluster) laneEnds[c.lane] = Math.max(laneEnds[c.lane] ?? 0, c.end);
    let lane = 0;
    while ((laneEnds[lane] ?? 0) > start) lane++;

    cluster.push({ item: ev, start, end, lane });
    clusterEnd = Math.max(clusterEnd, end);
  }
  if (cluster.length) flush();

  return result;
}

export default function Itinerary({ isAdmin }: { isAdmin: boolean }) {
  const [items, setItems] = useState<ScheduleItem[]>([]);
  const [error, setError] = useState('');

  const [editingId, setEditingId] = useState<string | null>(null);
  const [day, setDay] = useState(TRIP_DAYS[0]);
  const [time, setTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');

  const fetchItems = async () => {
    const res = await fetch('/api/schedule');
    setItems(await res.json());
  };

  useEffect(() => {
    fetch('/api/schedule')
      .then((res) => res.json())
      .then(setItems);
  }, []);

  const resetForm = () => {
    setEditingId(null);
    setDay(TRIP_DAYS[0]);
    setTime('');
    setEndTime('');
    setTitle('');
    setDescription('');
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!day || !title.trim()) return;

    const res = await fetch('/api/schedule', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: editingId ? 'update' : 'create',
        id: editingId ?? undefined,
        day,
        time,
        endTime,
        title: title.trim(),
        description: description.trim(),
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || 'Something went wrong');
      return;
    }

    resetForm();
    fetchItems();
  };

  const handleEdit = (item: ScheduleItem) => {
    setEditingId(item.id);
    setDay(item.day);
    setTime(item.time);
    setEndTime(item.endTime);
    setTitle(item.title);
    setDescription(item.description);
    setError('');
  };

  const handleDelete = async (id: string) => {
    await fetch('/api/schedule', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'delete', id }),
    });
    if (editingId === id) resetForm();
    fetchItems();
  };

  // Admin: clicking an empty slot prefills the form at that day/half-hour
  const handleGridClick = (d: string, e: React.MouseEvent<HTMLDivElement>, gridStartMin: number) => {
    if (!isAdmin) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const mins = gridStartMin + Math.floor(((e.clientY - rect.top) / HOUR_PX) * 2) * 30;
    setEditingId(null);
    setDay(d);
    setTime(`${String(Math.floor(mins / 60)).padStart(2, '0')}:${String(mins % 60).padStart(2, '0')}`);
    setEndTime('');
  };

  const timed = items.filter((i) => i.time && TRIP_DAYS.includes(i.day));
  const allDay = items.filter((i) => !i.time && TRIP_DAYS.includes(i.day));

  // Show 8 AM – 10 PM by default, stretching to fit any earlier/later events
  let startHour = 8;
  let endHour = 22;
  for (const item of timed) {
    startHour = Math.min(startHour, Math.floor(minutesOf(item.time) / 60));
    endHour = Math.max(endHour, Math.ceil(endMinutesOf(item) / 60));
  }
  const gridStartMin = startHour * 60;
  const gridHeight = (endHour - startHour) * HOUR_PX;
  const hours = Array.from({ length: endHour - startHour }, (_, i) => startHour + i);
  const hasAllDay = allDay.length > 0;

  const eventBlockStyle: React.CSSProperties = {
    background: '#e8e0d0',
    borderLeft: '3px solid var(--accent)',
    color: '#1a1a1a',
  };

  return (
    <div>
      {isAdmin && (
        <div className="mb-6 p-5" style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
          <h2 className="text-sm font-medium uppercase tracking-wider mb-3" style={{ color: 'var(--muted)' }}>
            {editingId ? 'Edit Schedule Item' : 'Add to Schedule'}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="flex flex-wrap gap-3">
              <div>
                <label className="block text-xs font-medium uppercase tracking-wider mb-1" style={{ color: 'var(--muted)' }}>Day</label>
                <select
                  className="px-3 py-2 text-sm focus:outline-none"
                  style={{ border: '1px solid var(--border)', background: 'var(--background)', color: 'var(--foreground)' }}
                  value={day}
                  onChange={(e) => setDay(e.target.value)}
                >
                  {TRIP_DAYS.map((d) => (
                    <option key={d} value={d}>{format(parseISO(d), 'EEE, MMM d')}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium uppercase tracking-wider mb-1" style={{ color: 'var(--muted)' }}>Start (blank = all day)</label>
                <input
                  type="time"
                  className="px-3 py-2 text-sm focus:outline-none"
                  style={{ border: '1px solid var(--border)', background: 'var(--background)', color: 'var(--foreground)' }}
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-xs font-medium uppercase tracking-wider mb-1" style={{ color: 'var(--muted)' }}>End (optional)</label>
                <input
                  type="time"
                  className="px-3 py-2 text-sm focus:outline-none"
                  style={{ border: '1px solid var(--border)', background: 'var(--background)', color: 'var(--foreground)' }}
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  disabled={!time}
                />
              </div>
            </div>
            <input
              type="text"
              required
              className="w-full px-3 py-2 text-sm focus:outline-none"
              style={{ border: '1px solid var(--border)', background: 'var(--background)', color: 'var(--foreground)' }}
              placeholder="e.g. Group dinner at the lodge"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
            <input
              type="text"
              className="w-full px-3 py-2 text-sm focus:outline-none"
              style={{ border: '1px solid var(--border)', background: 'var(--background)', color: 'var(--foreground)' }}
              placeholder="Details (optional)"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
            {error && <div className="text-sm" style={{ color: '#a33' }}>{error}</div>}
            <div className="flex gap-3">
              <button
                type="submit"
                className="px-6 py-2 text-sm tracking-widest uppercase"
                style={{ background: 'var(--accent)', color: '#f5f0e8' }}
              >
                {editingId ? 'Save' : 'Add'}
              </button>
              {editingId && (
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-6 py-2 text-sm tracking-widest uppercase"
                  style={{ color: 'var(--muted)', border: '1px solid var(--border)' }}
                >
                  Cancel
                </button>
              )}
            </div>
          </form>
          <p className="mt-3 text-xs" style={{ color: 'var(--muted)' }}>
            Tip: click an empty slot in the calendar to start an event there.
          </p>
        </div>
      )}

      <div className="overflow-x-auto" style={{ border: '1px solid var(--border)', background: 'var(--card)' }}>
        <div className="min-w-[640px]">
          {/* Day headers */}
          <div className="grid" style={{ gridTemplateColumns: `${GUTTER_PX}px repeat(${TRIP_DAYS.length}, 1fr)` }}>
            <div style={{ borderBottom: '1px solid var(--border)' }} />
            {TRIP_DAYS.map((d) => (
              <div
                key={d}
                className="py-3 text-center"
                style={{ borderLeft: '1px solid var(--border)', borderBottom: '1px solid var(--border)' }}
              >
                <div className="text-xs uppercase tracking-wider" style={{ color: 'var(--muted)' }}>
                  {format(parseISO(d), 'EEE')}
                </div>
                <div className="text-2xl font-normal" style={{ fontFamily: 'EB Garamond, Georgia, serif' }}>
                  {format(parseISO(d), 'd')}
                </div>
              </div>
            ))}
          </div>

          {/* All-day row */}
          {hasAllDay && (
            <div className="grid" style={{ gridTemplateColumns: `${GUTTER_PX}px repeat(${TRIP_DAYS.length}, 1fr)` }}>
              <div className="px-1 py-1 text-right text-[10px] uppercase tracking-wide" style={{ color: 'var(--muted)', borderBottom: '1px solid var(--border)' }}>
                All day
              </div>
              {TRIP_DAYS.map((d) => (
                <div key={d} className="p-1 space-y-1" style={{ borderLeft: '1px solid var(--border)', borderBottom: '1px solid var(--border)' }}>
                  {allDay.filter((i) => i.day === d).map((item) => (
                    <div
                      key={item.id}
                      className={`group relative px-2 py-1 text-xs ${isAdmin ? 'cursor-pointer' : ''}`}
                      style={eventBlockStyle}
                      title={item.description || item.title}
                      onClick={() => isAdmin && handleEdit(item)}
                    >
                      <span className="font-medium">{item.title}</span>
                      {isAdmin && (
                        <button
                          className="absolute top-0.5 right-0.5 hidden group-hover:block text-gray-500 hover:text-red-600"
                          onClick={(e) => { e.stopPropagation(); handleDelete(item.id); }}
                          title="Delete"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}

          {/* Time grid */}
          <div className="grid" style={{ gridTemplateColumns: `${GUTTER_PX}px repeat(${TRIP_DAYS.length}, 1fr)` }}>
            {/* Hour gutter */}
            <div className="relative" style={{ height: gridHeight }}>
              {hours.map((h) => (
                <div
                  key={h}
                  className="absolute right-1 text-[10px]"
                  style={{ top: (h - startHour) * HOUR_PX - 6, color: 'var(--muted)' }}
                >
                  {h > startHour ? hourLabel(h) : ''}
                </div>
              ))}
            </div>

            {/* Day columns */}
            {TRIP_DAYS.map((d) => (
              <div
                key={d}
                className="relative"
                style={{
                  height: gridHeight,
                  borderLeft: '1px solid var(--border)',
                  backgroundImage: `repeating-linear-gradient(to bottom, var(--border) 0, var(--border) 1px, transparent 1px, transparent ${HOUR_PX}px)`,
                }}
                onClick={(e) => handleGridClick(d, e, gridStartMin)}
              >
                {layoutDay(timed.filter((i) => i.day === d), gridStartMin).map(({ item, top, height, leftPct, widthPct }) => (
                  <div
                    key={item.id}
                    className={`group absolute overflow-hidden px-1.5 py-0.5 text-xs ${isAdmin ? 'cursor-pointer' : ''}`}
                    style={{
                      ...eventBlockStyle,
                      top,
                      height,
                      left: `${leftPct}%`,
                      width: `calc(${widthPct}% - 3px)`,
                    }}
                    title={`${formatTime(item.time)}${item.endTime ? `–${formatTime(item.endTime)}` : ''} ${item.title}${item.description ? ` — ${item.description}` : ''}`}
                    onClick={(e) => { e.stopPropagation(); if (isAdmin) handleEdit(item); }}
                  >
                    <div className="font-medium truncate">{item.title}</div>
                    <div className="text-[10px]" style={{ color: '#5a5248' }}>
                      {formatTime(item.time)}{item.endTime ? ` – ${formatTime(item.endTime)}` : ''}
                    </div>
                    {height >= 60 && item.description && (
                      <div className="text-[10px] mt-0.5" style={{ color: '#5a5248' }}>{item.description}</div>
                    )}
                    {isAdmin && (
                      <button
                        className="absolute top-0.5 right-0.5 hidden group-hover:block text-gray-500 hover:text-red-600"
                        onClick={(e) => { e.stopPropagation(); handleDelete(item.id); }}
                        title="Delete"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>

      {!isAdmin && (
        <p className="mt-4 text-xs text-center" style={{ color: 'var(--muted)' }}>
          Only a trip admin can change the schedule.
        </p>
      )}
    </div>
  );
}
