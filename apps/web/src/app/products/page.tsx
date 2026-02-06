'use client';

import { useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { SlidersHorizontal, ChevronDown } from 'lucide-react';
import { Navbar } from '@/components/layout/navbar';
import { Footer } from '@/components/layout/footer';
import { ProductCard } from '@/components/ui/product-card';
import { ProductRowSkeleton } from '@/components/ui/skeleton-loader';
import { productsApi, categoriesApi } from '@/lib/api';
import { Button } from '@/components/ui/button';

function ProductsContent() {
  const searchParams = useSearchParams();
  const categorySlug = searchParams.get('category') || undefined;
  const search = searchParams.get('search') || undefined;
  const [page, setPage] = useState(1);
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: () => categoriesApi.list(),
  });

  const { data: productsData, isLoading } = useQuery({
    queryKey: ['products', categorySlug, search, page, sortBy, sortOrder],
    queryFn: () =>
      productsApi.list({
        categorySlug,
        search,
        page,
        limit: 24,
        sortBy,
        sortOrder,
      }),
  });

  const catList = (categories as any[]) || [];
  const products = (productsData as any)?.items || [];
  const pagination = (productsData as any)?.pagination || { total: 0, totalPages: 0 };

  return (
    <div className="min-h-screen bg-white">
      <Navbar />

      <main className="container mx-auto px-4 py-4">
        {/* Header */}
        <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-xl font-extrabold text-swiggy-gray-800 md:text-2xl">
              {categorySlug
                ? catList.find((c: any) => c.slug === categorySlug)?.name || 'Products'
                : search
                  ? `Results for "${search}"`
                  : 'All Products'}
            </h1>
            <p className="text-xs text-swiggy-gray-400 md:text-sm">
              {pagination.total} product{pagination.total !== 1 ? 's' : ''} found
            </p>
          </div>

          {/* Sort */}
          <div className="flex items-center gap-2">
            <select
              value={`${sortBy}-${sortOrder}`}
              onChange={(e) => {
                const [sb, so] = e.target.value.split('-');
                setSortBy(sb);
                setSortOrder(so as 'asc' | 'desc');
                setPage(1);
              }}
              className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-swiggy-gray-700 focus:border-swiggy-orange focus:outline-none focus:ring-1 focus:ring-swiggy-orange/30"
            >
              <option value="createdAt-desc">Newest First</option>
              <option value="price-asc">Price: Low to High</option>
              <option value="price-desc">Price: High to Low</option>
              <option value="name-asc">Name A–Z</option>
            </select>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[180px_1fr]">
          {/* Sidebar - Categories (desktop) */}
          <aside className="hidden lg:block">
            <div className="sticky top-[80px] rounded-xl border border-gray-100 bg-swiggy-gray-50 p-3">
              <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-swiggy-gray-500">
                Categories
              </h3>
              <ul className="space-y-0.5">
                <li>
                  <Link
                    href="/products"
                    className={`block rounded-lg px-3 py-2 text-sm transition-colors ${
                      !categorySlug
                        ? 'bg-swiggy-orange font-bold text-white'
                        : 'font-medium text-swiggy-gray-600 hover:bg-white'
                    }`}
                  >
                    All Products
                  </Link>
                </li>
                {catList.map((cat: any) => (
                  <li key={cat.id}>
                    <Link
                      href={`/products?category=${cat.slug}`}
                      className={`block rounded-lg px-3 py-2 text-sm transition-colors ${
                        categorySlug === cat.slug
                          ? 'bg-swiggy-orange font-bold text-white'
                          : 'font-medium text-swiggy-gray-600 hover:bg-white'
                      }`}
                    >
                      {cat.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </aside>

          {/* Products Grid */}
          <div>
            {/* Category pills - mobile */}
            <div className="mb-4 flex gap-2 overflow-x-auto no-scrollbar lg:hidden">
              <Link
                href="/products"
                className={`flex-shrink-0 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
                  !categorySlug
                    ? 'border-swiggy-orange bg-swiggy-orange text-white'
                    : 'border-gray-200 bg-white text-swiggy-gray-600'
                }`}
              >
                All
              </Link>
              {catList.map((cat: any) => (
                <Link
                  key={cat.id}
                  href={`/products?category=${cat.slug}`}
                  className={`flex-shrink-0 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
                    categorySlug === cat.slug
                      ? 'border-swiggy-orange bg-swiggy-orange text-white'
                      : 'border-gray-200 bg-white text-swiggy-gray-600'
                  }`}
                >
                  {cat.name}
                </Link>
              ))}
            </div>

            {isLoading ? (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
                {Array.from({ length: 12 }).map((_, i) => (
                  <div key={i} className="flex flex-col rounded-xl bg-white border border-gray-100">
                    <div className="skeleton aspect-square rounded-t-xl" />
                    <div className="space-y-2 p-3">
                      <div className="skeleton h-3 w-full rounded" />
                      <div className="skeleton h-3 w-2/3 rounded" />
                      <div className="skeleton mt-2 h-7 w-full rounded-lg" />
                    </div>
                  </div>
                ))}
              </div>
            ) : products.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-xl bg-swiggy-gray-50 py-16">
                <div className="mb-3 text-5xl">📦</div>
                <h3 className="text-lg font-bold text-swiggy-gray-700">No products found</h3>
                <p className="text-sm text-swiggy-gray-400">Try adjusting your filters</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
                {products.map((product: any) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
            )}

            {/* Pagination */}
            {pagination.totalPages > 1 && (
              <div className="mt-6 flex items-center justify-center gap-1">
                {Array.from({ length: Math.min(pagination.totalPages, 8) }, (_, i) => i + 1).map(
                  (p) => (
                    <button
                      key={p}
                      onClick={() => setPage(p)}
                      className={`h-8 min-w-[32px] rounded-lg text-sm font-semibold transition-colors ${
                        page === p
                          ? 'bg-swiggy-orange text-white'
                          : 'text-swiggy-gray-600 hover:bg-swiggy-gray-50'
                      }`}
                    >
                      {p}
                    </button>
                  ),
                )}
              </div>
            )}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}

export default function ProductsPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-white">
        <Navbar />
        <main className="container mx-auto px-4 py-16">
          <div className="text-center">
            <div className="mb-4 h-8 w-8 animate-spin rounded-full border-4 border-swiggy-orange border-t-transparent mx-auto" />
            <p className="text-sm text-gray-500">Loading...</p>
          </div>
        </main>
      </div>
    }>
      <ProductsContent />
    </Suspense>
  );
}
