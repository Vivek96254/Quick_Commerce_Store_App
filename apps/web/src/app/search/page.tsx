'use client';

import { useState, useEffect, useMemo, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Search, X, Clock, TrendingUp } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { Navbar } from '@/components/layout/navbar';
import { Footer } from '@/components/layout/footer';
import { ProductCard } from '@/components/ui/product-card';
import { ProductRowSkeleton } from '@/components/ui/skeleton-loader';
import { Button } from '@/components/ui/button';
import { productsApi } from '@/lib/api';
import { useSearchStore } from '@/lib/store';
import { debounce } from '@/lib/utils';
import Link from 'next/link';

const POPULAR_SEARCHES = [
  'Milk', 'Bread', 'Eggs', 'Rice', 'Atta', 'Dal', 'Onion', 'Tomato',
  'Potato', 'Banana', 'Apple', 'Curd', 'Butter', 'Cheese',
];

function SearchContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get('q') || '';
  const [query, setQuery] = useState(initialQuery);
  const [debouncedQuery, setDebouncedQuery] = useState(initialQuery);
  const { recentSearches, addRecentSearch, clearRecentSearches } = useSearchStore();

  // Debounce search
  const debouncedSetQuery = useMemo(
    () =>
      debounce((value: string) => {
        setDebouncedQuery(value);
        if (value.trim()) {
          addRecentSearch(value.trim());
        }
      }, 300),
    [addRecentSearch],
  );

  useEffect(() => {
    debouncedSetQuery(query);
  }, [query, debouncedSetQuery]);

  // Update URL when query changes
  useEffect(() => {
    if (debouncedQuery.trim()) {
      router.replace(`/search?q=${encodeURIComponent(debouncedQuery.trim())}`, {
        scroll: false,
      });
    } else {
      router.replace('/search', { scroll: false });
    }
  }, [debouncedQuery, router]);

  const { data: searchResults, isLoading } = useQuery({
    queryKey: ['search', debouncedQuery],
    queryFn: () => productsApi.list({ search: debouncedQuery, limit: 50 }),
    enabled: debouncedQuery.trim().length > 0,
  });

  const products = (searchResults as any)?.items || [];
  const hasResults = products.length > 0;
  const showEmpty = debouncedQuery.trim().length > 0 && !isLoading && !hasResults;
  const showInitial = debouncedQuery.trim().length === 0 && !isLoading;

  const handleSearch = (term: string) => {
    setQuery(term);
    setDebouncedQuery(term);
    addRecentSearch(term);
  };

  return (
    <div className="min-h-screen bg-white">
      <Navbar />

      <main className="container mx-auto px-4 py-4 md:py-6">
        {/* Search Bar */}
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-swiggy-gray-400" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search for atta, dal, curd and more"
              className="w-full rounded-xl border-2 border-gray-200 bg-swiggy-gray-50 py-3 pl-12 pr-12 text-base text-swiggy-gray-800 placeholder-swiggy-gray-400 transition-colors focus:border-swiggy-orange focus:bg-white focus:outline-none focus:ring-2 focus:ring-swiggy-orange/20"
              autoFocus
            />
            {query && (
              <button
                onClick={() => {
                  setQuery('');
                  setDebouncedQuery('');
                }}
                className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full p-1 text-swiggy-gray-400 hover:bg-gray-100"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        {/* Initial State - Recent & Popular */}
        {showInitial && (
          <div className="space-y-6">
            {/* Recent Searches */}
            {recentSearches.length > 0 && (
              <div>
                <div className="mb-3 flex items-center justify-between">
                  <h2 className="flex items-center gap-2 text-sm font-bold text-swiggy-gray-700">
                    <Clock className="h-4 w-4" />
                    Recent Searches
                  </h2>
                  <button
                    onClick={clearRecentSearches}
                    className="text-xs font-semibold text-swiggy-orange hover:underline"
                  >
                    Clear
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {recentSearches.map((term, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSearch(term)}
                      className="rounded-full border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-swiggy-gray-700 transition-colors hover:border-swiggy-orange hover:bg-swiggy-orange-light"
                    >
                      {term}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Popular Searches */}
            <div>
              <h2 className="mb-3 flex items-center gap-2 text-sm font-bold text-swiggy-gray-700">
                <TrendingUp className="h-4 w-4" />
                Popular Searches
              </h2>
              <div className="flex flex-wrap gap-2">
                {POPULAR_SEARCHES.map((term) => (
                  <button
                    key={term}
                    onClick={() => handleSearch(term)}
                    className="rounded-full border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-swiggy-gray-700 transition-colors hover:border-swiggy-orange hover:bg-swiggy-orange-light"
                  >
                    {term}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Loading */}
        {isLoading && (
          <div>
            <p className="mb-4 text-sm text-swiggy-gray-500">
              Searching for &quot;{debouncedQuery}&quot;...
            </p>
            <ProductRowSkeleton count={8} />
          </div>
        )}

        {/* Results */}
        {hasResults && (
          <div>
            <p className="mb-4 text-sm text-swiggy-gray-500">
              Found {products.length} result{products.length !== 1 ? 's' : ''} for &quot;
              {debouncedQuery}&quot;
            </p>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
              {products.map((product: any) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          </div>
        )}

        {/* Empty State */}
        {showEmpty && (
          <div className="flex flex-col items-center justify-center py-16">
            <div className="mb-4 text-6xl">🔍</div>
            <h2 className="mb-2 text-xl font-bold text-swiggy-gray-800">
              No results found
            </h2>
            <p className="mb-6 text-center text-sm text-swiggy-gray-500">
              We couldn&apos;t find any products matching &quot;{debouncedQuery}&quot;.
              <br />
              Try different keywords or browse categories.
            </p>
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => {
                  setQuery('');
                  setDebouncedQuery('');
                }}
              >
                Clear Search
              </Button>
              <Link href="/categories">
                <Button className="bg-swiggy-orange hover:bg-swiggy-orange-dark">
                  Browse Categories
                </Button>
              </Link>
            </div>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}

export default function SearchPage() {
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
      <SearchContent />
    </Suspense>
  );
}
