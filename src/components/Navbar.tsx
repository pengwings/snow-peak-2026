'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import {
  HomeIcon as Cabin, Plane, ShoppingCart, Activity, MapPin, ChefHat, CheckSquare, Luggage, CircleHelp, Medal, Eye,
  Tent, ClipboardList, Gamepad2, ChevronDown,
} from 'lucide-react';

type NavLink = { href: string; label: string; icon: typeof Plane };
type NavGroup = { key: string; label: string; icon: typeof Plane; links: NavLink[] };

/** Tabs grouped into three menus: getting there and settled, what we'll do, and the games. */
const NAV_GROUPS: NavGroup[] = [
  {
    key: 'trip',
    label: 'Trip',
    icon: Tent,
    links: [
      { href: '/flights', label: 'Flights', icon: Plane },
      { href: '/cabins', label: 'Cabins', icon: Cabin },
      { href: '/packing', label: 'Packing', icon: Luggage },
      { href: '/expenses', label: 'Expenses', icon: ShoppingCart },
    ],
  },
  {
    key: 'plan',
    label: 'Plan',
    icon: ClipboardList,
    links: [
      { href: '/activities', label: 'Activities', icon: Activity },
      { href: '/food', label: 'Food', icon: ChefHat },
      { href: '/todos', label: 'Todos', icon: CheckSquare },
      { href: '/map', label: 'Map', icon: MapPin },
    ],
  },
  {
    key: 'games',
    label: 'Games',
    icon: Gamepad2,
    links: [
      { href: '/trivia', label: 'Trivia', icon: CircleHelp },
      { href: '/rankings', label: 'Rankings', icon: Medal },
    ],
  },
];
import { displayName } from '@/lib/displayName';

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [realAdmin, setRealAdmin] = useState(false);
  const [viewer, setViewer] = useState(false);
  const [hiddenTabs, setHiddenTabs] = useState<string[]>([]);
  const [openGroup, setOpenGroup] = useState<string | null>(null);
  const navRef = useRef<HTMLElement>(null);

  // Menus close when a link is picked, on a click anywhere else, and on Escape.
  useEffect(() => {
    if (!openGroup) return;
    const onPointer = (e: MouseEvent | TouchEvent) => {
      if (navRef.current && !navRef.current.contains(e.target as Node)) setOpenGroup(null);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpenGroup(null); };
    document.addEventListener('mousedown', onPointer);
    document.addEventListener('touchstart', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onPointer);
      document.removeEventListener('touchstart', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [openGroup]);

  useEffect(() => {
    fetch('/api/me')
      .then((res) => res.json())
      .then((data) => {
        setUser(data.user);
        setIsAdmin(!!data.isAdmin);
        setRealAdmin(!!data.realAdmin);
        setViewer(!!data.viewer);
      });
    const fetchTabs = () =>
      fetch('/api/tabs')
        .then((res) => res.json())
        .then((data) => setHiddenTabs(data.hiddenTabs || []));
    fetchTabs();
    // Page-level visibility toggles announce changes so the nav updates in place
    window.addEventListener('tabs-changed', fetchTabs);
    return () => window.removeEventListener('tabs-changed', fetchTabs);
  }, [pathname]);

  // The projector view wants the whole screen to itself.
  if (pathname === '/login' || pathname === '/trivia/board') return null;

  const handleLogout = async () => {
    await fetch('/api/logout', { method: 'POST' });
    router.push('/login');
    router.refresh();
  };

  const toggleAdminMode = async () => {
    if (isAdmin) {
      await fetch('/api/admin-mode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enable: false }),
      });
      window.location.reload();
      return;
    }

    const password = window.prompt('Enter the admin password to turn on admin mode:');
    if (password === null) return;
    const res = await fetch('/api/admin-mode', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enable: true, password }),
    });
    if (res.ok) {
      window.location.reload();
    } else {
      const data = await res.json().catch(() => ({}));
      alert(data.error || 'Could not turn on admin mode.');
    }
  };

  // Admins in admin mode see every tab (hidden ones dimmed); everyone else
  // only sees visible tabs, and a group with nothing visible disappears.
  // Visibility is toggled from each page's header.
  const isActive = (href: string) => pathname === href || pathname.startsWith(href + '/');
  const groups = NAV_GROUPS
    .map((g) => ({ ...g, links: isAdmin ? g.links : g.links.filter((l) => !hiddenTabs.includes(l.href)) }))
    .filter((g) => g.links.length > 0);

  const renderMenuItem = (link: NavLink, mobile: boolean) => {
    const LinkIcon = link.icon;
    const isHidden = hiddenTabs.includes(link.href);
    return (
      <Link
        key={link.href}
        href={link.href}
        role="menuitem"
        onClick={() => setOpenGroup(null)}
        className={`flex items-center gap-2 text-xs font-medium tracking-wide uppercase transition-colors whitespace-nowrap ${
          mobile ? 'px-3 py-1.5 rounded' : 'px-3 py-2'
        } ${isActive(link.href) ? 'bg-[#e8e0d0] text-[#1a1a1a]' : 'text-[#5a5248] hover:bg-[#ede7dc] hover:text-[#1a1a1a]'}`}
        style={isAdmin && isHidden ? { opacity: 0.45 } : undefined}
        title={isAdmin && isHidden ? 'Hidden from members' : undefined}
      >
        <LinkIcon className="w-3.5 h-3.5" />
        {link.label}
        {isAdmin && isHidden && <span className={`${mobile ? '' : 'ml-auto'} text-[10px] normal-case font-normal`}>hidden</span>}
      </Link>
    );
  };

  const renderGroup = (group: NavGroup, mobile: boolean) => {
    const Icon = group.icon;
    const active = group.links.some((l) => isActive(l.href));
    const open = openGroup === group.key;
    const current = group.links.find((l) => isActive(l.href));
    return (
      <div key={group.key} className="relative">
        <button
          type="button"
          onClick={() => setOpenGroup(open ? null : group.key)}
          aria-expanded={open}
          aria-haspopup="menu"
          className={`flex items-center gap-1.5 rounded text-xs font-medium tracking-wide uppercase transition-colors whitespace-nowrap ${
            mobile ? 'px-3 py-1.5' : 'px-2.5 py-1.5'
          } ${active || open ? 'bg-[#e8e0d0] text-[#1a1a1a]' : 'text-[#5a5248] hover:bg-[#ede7dc] hover:text-[#1a1a1a]'}`}
        >
          <Icon className="w-3.5 h-3.5" />
          {group.label}
          {/* On phones the chip names the page you're on, so the row doubles as a breadcrumb */}
          {mobile && current && <span className="normal-case font-normal" style={{ color: 'var(--muted)' }}>· {current.label}</span>}
          <ChevronDown className="w-3 h-3 transition-transform" style={{ transform: open ? 'rotate(180deg)' : 'none', opacity: 0.6 }} />
        </button>
        {/* Desktop: a dropdown under the button. Phones get a full-width panel instead (see below). */}
        {open && !mobile && (
          <div
            role="menu"
            className="absolute left-0 top-full mt-1 min-w-[11rem] py-1 z-50"
            style={{ background: 'var(--card)', border: '1px solid var(--border)', boxShadow: '0 6px 20px rgba(40, 30, 20, 0.12)' }}
          >
            {group.links.map((link) => renderMenuItem(link, false))}
          </div>
        )}
      </div>
    );
  };

  const openMobileGroup = groups.find((g) => g.key === openGroup);

  return (
    <nav ref={navRef} className="sticky top-0 z-50" style={{ borderBottom: '1px solid var(--border)', background: 'var(--card)' }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-14 items-center">

          {/* Brand */}
          <div className="flex items-center gap-6">
            <Link
              href="/"
              className="font-semibold tracking-[0.15em] uppercase text-xs whitespace-nowrap hover:opacity-80 transition-opacity"
              style={{ color: 'var(--accent)', fontFamily: 'Inter, sans-serif' }}
            >
              Snow Peak 2026
            </Link>

            {/* Desktop menus */}
            <div className="hidden md:flex md:gap-1 md:items-center">
              {groups.map((group) => renderGroup(group, false))}
            </div>
          </div>

          {/* View-only visitors: badge plus a way in */}
          {!user && viewer && (
            <div className="flex items-center gap-3">
              <span
                className="hidden sm:flex text-[10px] tracking-wide uppercase px-2 py-1 rounded items-center gap-1.5"
                style={{ color: 'var(--muted)', border: '1px solid var(--border)' }}
                title="You can browse everything but not make changes"
              >
                <Eye className="w-3 h-3" />
                View only
              </span>
              <Link
                href="/login"
                className="text-xs tracking-wide uppercase px-3 py-1.5 rounded transition-opacity hover:opacity-80"
                style={{ background: 'var(--accent)', color: '#f5f0e8', border: '1px solid var(--accent)' }}
              >
                Sign in
              </Link>
            </div>
          )}

          {/* User / admin mode / logout */}
          {user && (
            <div className="flex items-center gap-3">
              <span className="text-xs" style={{ color: 'var(--muted)' }}>
                {displayName(user)}
              </span>
              {realAdmin && (
                <button
                  onClick={toggleAdminMode}
                  className="text-[10px] tracking-wide uppercase px-2 py-1 rounded transition-colors flex items-center gap-1.5"
                  title={isAdmin ? 'Admin mode is on — click to browse as a regular member' : 'Admin mode is off — click to show admin features'}
                  style={
                    isAdmin
                      ? { background: 'var(--accent)', color: '#f5f0e8', border: '1px solid var(--accent)' }
                      : { color: 'var(--muted)', border: '1px solid var(--border)' }
                  }
                >
                  <span
                    className="w-1.5 h-1.5 rounded-full"
                    style={{ background: isAdmin ? '#f5f0e8' : 'var(--border)' }}
                  />
                  Admin {isAdmin ? 'on' : 'off'}
                </button>
              )}
              <button
                onClick={handleLogout}
                className="text-xs tracking-wide uppercase px-3 py-1.5 rounded transition-colors"
                style={{ color: 'var(--muted)', border: '1px solid var(--border)' }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.background = 'var(--border)';
                  (e.currentTarget as HTMLElement).style.color = 'var(--foreground)';
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.background = 'transparent';
                  (e.currentTarget as HTMLElement).style.color = 'var(--muted)';
                }}
              >
                Sign out
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Phone: the three group chips in a second row; the open group's tabs appear in a panel beneath */}
      <div className="md:hidden" style={{ borderTop: '1px solid var(--border)', background: 'var(--card)' }}>
        <div className="flex flex-wrap gap-1 px-2 py-2 items-center">
          {groups.map((group) => renderGroup(group, true))}
        </div>
        {openMobileGroup && (
          <div
            role="menu"
            className="flex flex-wrap gap-1 px-2 py-2"
            style={{ borderTop: '1px solid var(--border)', background: 'var(--background)' }}
          >
            {openMobileGroup.links.map((link) => renderMenuItem(link, true))}
          </div>
        )}
      </div>
    </nav>
  );
}
