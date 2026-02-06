'use client';

export const dynamic = 'force-dynamic';

import Link from 'next/link';
import { Home, ShoppingBag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Navbar } from '@/components/layout/navbar';
import { Footer } from '@/components/layout/footer';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="container mx-auto flex flex-col items-center justify-center px-4 py-16">
        <div className="text-center">
          <div className="mb-6 text-8xl">🔍</div>
          <h1 className="mb-3 text-4xl font-bold text-gray-900">404</h1>
          <h2 className="mb-2 text-2xl font-semibold text-gray-700">Page Not Found</h2>
          <p className="mb-8 text-gray-500">
            The page you&apos;re looking for doesn&apos;t exist.
          </p>
          <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
            <Link href="/">
              <Button size="lg" className="bg-swiggy-orange hover:bg-swiggy-orange-dark">
                <Home className="mr-2 h-5 w-5" />
                Go Home
              </Button>
            </Link>
            <Link href="/products">
              <Button variant="outline" size="lg">
                <ShoppingBag className="mr-2 h-5 w-5" />
                Browse Products
              </Button>
            </Link>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
