'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { HomeIcon as Cabin, Plane, ShoppingCart, Activity, CheckSquare, Luggage } from 'lucide-react';
import { displayName } from '@/lib/displayName';

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [realAdmin, setRealAdmin] = useState(false);
  const [hiddenTabs, setHiddenTabs] = useState<string[]>([]);

  useEffect(() => {
    fetch('/api/me')
      .then((res) => res.json())
      .then((data) => {
        setUser(data.user);
        setIsAdmin(!!data.isAdmin);
        setRealAdmin(!!data.realAdmin);
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

  if (pathname === '/login') return null;

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

  const navLinks = [
    { href: '/cabins', label: 'Cabins', icon: Cabin },
    { href: '/flights', label: 'Flights', icon: Plane },
    { href: '/expenses', label: 'Expenses', icon: ShoppingCart },
    { href: '/activities', label: 'Activities', icon: Activity },
    { href: '/todos', label: 'Todos', icon: CheckSquare },
    { href: '/packing', label: 'Packing', icon: Luggage },
  ];

  // Admins in admin mode see every tab (hidden ones dimmed); everyone else
  // only sees visible tabs. Visibility is toggled from each page's header.
  const visibleLinks = isAdmin ? navLinks : navLinks.filter((link) => !hiddenTabs.includes(link.href));

  const renderLink = (link: (typeof navLinks)[number], mobile: boolean) => {
    const Icon = link.icon;
    const isActive = pathname === link.href;
    const isHidden = hiddenTabs.includes(link.href);
    return (
      <Link
        key={link.href}
        href={link.href}
        className={
          mobile
            ? `whitespace-nowrap flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium tracking-wide uppercase transition-colors ${
                isActive ? 'bg-[#e0d8c8] text-[#1a1a1a]' : 'text-[#6a6258] hover:bg-[#ede7dc]'
              }`
            : `inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium tracking-wide uppercase rounded transition-colors ${
                isActive ? 'bg-[#e8e0d0] text-[#1a1a1a]' : 'text-[#5a5248] hover:bg-[#ede7dc] hover:text-[#1a1a1a]'
              }`
        }
        style={isAdmin && isHidden ? { opacity: 0.45 } : undefined}
        title={isAdmin && isHidden ? 'Hidden from members' : undefined}
      >
        <Icon className="w-3.5 h-3.5" />
        {link.label}
      </Link>
    );
  };

  return (
    <nav className="sticky top-0 z-50" style={{ borderBottom: '1px solid var(--border)', background: 'var(--card)' }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-14 items-center">

          {/* Brand */}
          <div className="flex items-center gap-8">
            <Link
              href="/"
              className="font-semibold tracking-[0.15em] uppercase text-xs hover:opacity-80 transition-opacity"
              style={{ color: 'var(--accent)', fontFamily: 'Inter, sans-serif' }}
            >
              Snow Peak 2026
            </Link>

            {/* Desktop links */}
            <div className="hidden sm:flex sm:gap-1 sm:items-center">
              {visibleLinks.map((link) => renderLink(link, false))}
            </div>
          </div>

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

      {/* Mobile scrollable nav */}
      <div className="sm:hidden overflow-x-auto" style={{ borderTop: '1px solid var(--border)', background: 'var(--card)' }}>
        <div className="flex gap-1 px-2 py-2 items-center">
          {visibleLinks.map((link) => renderLink(link, true))}
        </div>
      </div>
    </nav>
  );
}
