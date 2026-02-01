'use client';

import Link from 'next/link';
import { ShoppingBag, ShoppingCart, User, Menu, X, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuthStore, useCartStore } from '@/lib/store';
import { useState } from 'react';

export function Navbar() {
  const { isAuthenticated, user, logout } = useAuthStore();
  const { itemCount } = useCartStore();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <nav className="sticky top-0 z-50 border-b bg-white/80 backdrop-blur-md">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary">
            <ShoppingBag className="h-6 w-6 text-white" />
          </div>
          <span className="text-xl font-bold text-gray-900">QuickMart</span>
        </Link>

        {/* Desktop Navigation */}
        <div className="hidden items-center gap-6 md:flex">
          <Link href="/products" className="text-gray-600 hover:text-primary transition-colors">
            Products
          </Link>
          <Link href="/categories" className="text-gray-600 hover:text-primary transition-colors">
            Categories
          </Link>
          <Link href="/orders" className="text-gray-600 hover:text-primary transition-colors">
            My Orders
          </Link>
          <Link href="/contact" className="text-gray-600 hover:text-primary transition-colors">
            Contact
          </Link>
        </div>

        <div className="hidden items-center gap-4 md:flex">
          <Link href="/cart" className="relative">
            <Button variant="ghost" size="icon">
              <ShoppingCart className="h-5 w-5" />
              {itemCount > 0 && (
                <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-xs font-medium text-white">
                  {itemCount}
                </span>
              )}
            </Button>
          </Link>

          {isAuthenticated ? (
            <div className="flex items-center gap-2">
              <Link href="/profile">
                <Button variant="ghost" size="sm" className="gap-2">
                  <User className="h-4 w-4" />
                  {user?.firstName || 'Profile'}
                </Button>
              </Link>
              {user?.role !== 'CUSTOMER' && (
                <Link href="/admin">
                  <Button variant="outline" size="sm">Admin</Button>
                </Link>
              )}
              <Button variant="ghost" size="sm" onClick={logout}>
                Logout
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link href="/login">
                <Button variant="outline">Login</Button>
              </Link>
              <Link href="/register">
                <Button>Sign Up</Button>
              </Link>
            </div>
          )}
        </div>

        {/* Mobile Menu Button */}
        <button
          className="md:hidden"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        >
          {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="border-t bg-white md:hidden">
          <div className="container mx-auto px-4 py-4 space-y-4">
            <Link href="/products" className="block py-2 text-gray-600 hover:text-primary" onClick={() => setMobileMenuOpen(false)}>
              Products
            </Link>
            <Link href="/categories" className="block py-2 text-gray-600 hover:text-primary" onClick={() => setMobileMenuOpen(false)}>
              Categories
            </Link>
            <Link href="/cart" className="block py-2 text-gray-600 hover:text-primary" onClick={() => setMobileMenuOpen(false)}>
              Cart ({itemCount})
            </Link>
            <Link href="/orders" className="block py-2 text-gray-600 hover:text-primary" onClick={() => setMobileMenuOpen(false)}>
              My Orders
            </Link>
            <Link href="/contact" className="block py-2 text-gray-600 hover:text-primary" onClick={() => setMobileMenuOpen(false)}>
              Contact
            </Link>
            <hr />
            {isAuthenticated ? (
              <>
                <Link href="/profile" className="block py-2 text-gray-600 hover:text-primary" onClick={() => setMobileMenuOpen(false)}>
                  Profile
                </Link>
                <button onClick={() => { logout(); setMobileMenuOpen(false); }} className="block py-2 text-red-600">
                  Logout
                </button>
              </>
            ) : (
              <div className="flex gap-2">
                <Link href="/login" className="flex-1" onClick={() => setMobileMenuOpen(false)}>
                  <Button variant="outline" className="w-full">Login</Button>
                </Link>
                <Link href="/register" className="flex-1" onClick={() => setMobileMenuOpen(false)}>
                  <Button className="w-full">Sign Up</Button>
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
