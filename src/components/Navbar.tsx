'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Home, HomeIcon as Cabin, Car, Plane, ShoppingCart, Activity, CheckSquare } from 'lucide-react';

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
    { href: '/cars', label: 'Cars', icon: Car },
    { href: '/flights', label: 'Flights', icon: Plane },
    { href: '/supplies', label: 'Supplies', icon: ShoppingCart },
    { href: '/activities', label: 'Activities', icon: Activity },
    { href: '/todos', label: 'Todos', icon: CheckSquare },
  ];

  return (
    <nav className="bg-blue-800 text-white shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex">
            <div className="flex-shrink-0 flex items-center mr-8">
              <span className="font-bold text-xl tracking-tight">Snow Peak</span>
            </div>
            <div className="hidden sm:ml-6 sm:flex sm:space-x-4">
              {navLinks.map((link) => {
                const Icon = link.icon;
                const isActive = pathname === link.href;
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`inline-flex items-center px-3 py-2 text-sm font-medium rounded-md mt-3 mb-3 ${
                      isActive
                        ? 'bg-blue-900 text-white'
                        : 'text-blue-100 hover:bg-blue-700 hover:text-white'
                    }`}
                  >
                    <Icon className="w-4 h-4 mr-2" />
                    {link.label}
                  </Link>
                );
              })}
            </div>
          </div>
          
          <div className="flex items-center">
            {user ? (
              <div className="flex items-center gap-4">
                <span className="text-sm font-medium text-blue-100">Hi, {user}</span>
                <button
                  onClick={handleLogout}
                  className="text-sm text-blue-200 hover:text-white px-3 py-2 rounded-md hover:bg-blue-700 transition"
                >
                  Logout
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </div>
      
      {/* Mobile nav (simple scrollable) */}
      <div className="sm:hidden overflow-x-auto bg-blue-900 pb-1">
        <div className="flex space-x-1 px-2 pt-2 pb-2">
          {navLinks.map((link) => {
            const Icon = link.icon;
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`whitespace-nowrap flex items-center px-3 py-2 rounded-md text-sm font-medium ${
                  isActive
                    ? 'bg-blue-800 text-white'
                    : 'text-blue-200 hover:bg-blue-700 hover:text-white'
                }`}
              >
                <Icon className="w-4 h-4 mr-1.5" />
                {link.label}
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
