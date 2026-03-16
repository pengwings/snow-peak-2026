'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Home, HomeIcon as Cabin, Plane, ShoppingCart, Activity, CheckSquare } from 'lucide-react';
import { displayName } from '@/lib/displayName';

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/me')
      .then((res) => res.json())
      .then((data) => {
        setUser(data.user);
      });
  }, [pathname]);

  if (pathname === '/login') return null;

  const handleLogout = async () => {
    await fetch('/api/logout', { method: 'POST' });
    router.push('/login');
    router.refresh();
  };

  const navLinks = [
    { href: '/', label: 'Home', icon: Home },
    { href: '/cabins', label: 'Cabins', icon: Cabin },
    { href: '/flights', label: 'Flights', icon: Plane },
    { href: '/expenses', label: 'Expenses', icon: ShoppingCart },
    { href: '/activities', label: 'Activities', icon: Activity },
    { href: '/todos', label: 'Todos', icon: CheckSquare },
  ];

  return (
    <nav className="sticky top-0 z-50" style={{ borderBottom: '1px solid var(--border)', background: 'var(--card)' }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-14 items-center">

          {/* Brand */}
          <div className="flex items-center gap-8">
            <span
              className="font-semibold tracking-[0.15em] uppercase text-xs"
              style={{ color: 'var(--accent)', fontFamily: 'Inter, sans-serif' }}
            >
              Snow Peak 2026
            </span>

            {/* Desktop links */}
            <div className="hidden sm:flex sm:gap-1">
              {navLinks.map((link) => {
                const Icon = link.icon;
                const isActive = pathname === link.href;
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium tracking-wide uppercase rounded transition-colors ${
                      isActive
                        ? 'bg-[#e8e0d0] text-[#1a1a1a]'
                        : 'text-[#5a5248] hover:bg-[#ede7dc] hover:text-[#1a1a1a]'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    {link.label}
                  </Link>
                );
              })}
            </div>
          </div>

          {/* User / logout */}
          {user && (
            <div className="flex items-center gap-3">
              <span className="text-xs" style={{ color: 'var(--muted)' }}>
                {displayName(user)}
              </span>
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
        <div className="flex gap-1 px-2 py-2">
          {navLinks.map((link) => {
            const Icon = link.icon;
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`whitespace-nowrap flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium tracking-wide uppercase transition-colors ${
                  isActive
                    ? 'bg-[#e0d8c8] text-[#1a1a1a]'
                    : 'text-[#6a6258] hover:bg-[#ede7dc]'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {link.label}
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
