import Link from 'next/link';
import Image from 'next/image';
import { Filter, SlidersHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Navbar } from '@/components/layout/navbar';
import { Footer } from '@/components/layout/footer';

async function getProducts(searchParams: Record<string, string | undefined>) {
  try {
    const params = new URLSearchParams();
    if (searchParams.category) params.set('categorySlug', searchParams.category);
    if (searchParams.search) params.set('search', searchParams.search);
    if (searchParams.page) params.set('page', searchParams.page);
    params.set('limit', '20');
    
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}/api/v1/products?${params}`,
      { next: { revalidate: 60 } }
    );
    if (!res.ok) return { items: [], pagination: { total: 0, totalPages: 0 } };
    const data = await res.json();
    return data.data || { items: [], pagination: { total: 0, totalPages: 0 } };
  } catch {
    return { items: [], pagination: { total: 0, totalPages: 0 } };
  }
}

async function getCategories() {
  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}/api/v1/categories`,
      { next: { revalidate: 300 } }
    );
    if (!res.ok) return [];
    const data = await res.json();
    return data.data || [];
  } catch {
    return [];
  }
}

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Record<string, string | undefined>;
}) {
  const [productsData, categories] = await Promise.all([
    getProducts(searchParams),
    getCategories(),
  ]);

  const { items: products, pagination } = productsData;

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Products</h1>
            <p className="text-gray-600">{pagination.total} products available</p>
          </div>
          
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="gap-2">
              <Filter className="h-4 w-4" /> Filter
            </Button>
            <Button variant="outline" size="sm" className="gap-2">
              <SlidersHorizontal className="h-4 w-4" /> Sort
            </Button>
          </div>
        </div>

        <div className="grid gap-8 lg:grid-cols-4">
          {/* Sidebar - Categories */}
          <aside className="hidden lg:block">
            <div className="rounded-2xl bg-white p-6 shadow-sm">
              <h3 className="mb-4 font-semibold text-gray-900">Categories</h3>
              <ul className="space-y-2">
                <li>
                  <Link
                    href="/products"
                    className={`block rounded-lg px-3 py-2 text-sm transition-colors ${
                      !searchParams.category
                        ? 'bg-primary text-white'
                        : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    All Products
                  </Link>
                </li>
                {categories.map((category: any) => (
                  <li key={category.id}>
                    <Link
                      href={`/products?category=${category.slug}`}
                      className={`block rounded-lg px-3 py-2 text-sm transition-colors ${
                        searchParams.category === category.slug
                          ? 'bg-primary text-white'
                          : 'text-gray-600 hover:bg-gray-100'
                      }`}
                    >
                      {category.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </aside>

          {/* Products Grid */}
          <div className="lg:col-span-3">
            {products.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-2xl bg-white py-16">
                <div className="text-6xl mb-4">📦</div>
                <h3 className="text-xl font-semibold text-gray-900">No products found</h3>
                <p className="text-gray-600">Try adjusting your filters or search terms</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
                {products.map((product: any) => (
                  <Link
                    key={product.id}
                    href={`/products/${product.slug}`}
                    className="group rounded-2xl bg-white p-4 shadow-sm transition-all hover:shadow-md"
                  >
                    <div className="relative mb-3 aspect-square overflow-hidden rounded-xl bg-gray-100">
                      {product.images?.[0]?.url ? (
                        <Image
                          src={product.images[0].url}
                          alt={product.name}
                          fill
                          className="object-cover transition-transform group-hover:scale-105"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center text-4xl">
                          📦
                        </div>
                      )}
                      {product.discountedPrice && (
                        <div className="absolute left-2 top-2 rounded-full bg-red-500 px-2 py-1 text-xs font-medium text-white">
                          {Math.round((1 - product.discountedPrice / product.price) * 100)}% OFF
                        </div>
                      )}
                      {product.stockQuantity === 0 && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                          <span className="rounded-full bg-white px-3 py-1 text-sm font-medium text-gray-900">
                            Out of Stock
                          </span>
                        </div>
                      )}
                    </div>
                    <h3 className="mb-1 line-clamp-2 text-sm font-medium text-gray-900 group-hover:text-primary">
                      {product.name}
                    </h3>
                    <p className="text-xs text-gray-500">{product.unit}</p>
                    <div className="mt-2 flex items-center gap-2">
                      <span className="text-lg font-bold text-gray-900">
                        ₹{product.discountedPrice || product.price}
                      </span>
                      {product.discountedPrice && (
                        <span className="text-sm text-gray-400 line-through">
                          ₹{product.price}
                        </span>
                      )}
                    </div>
                    <Button 
                      size="sm" 
                      className="mt-3 w-full"
                      disabled={product.stockQuantity === 0}
                    >
                      {product.stockQuantity === 0 ? 'Out of Stock' : 'Add to Cart'}
                    </Button>
                  </Link>
                ))}
              </div>
            )}

            {/* Pagination */}
            {pagination.totalPages > 1 && (
              <div className="mt-8 flex justify-center gap-2">
                {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map((page) => (
                  <Link
                    key={page}
                    href={`/products?${new URLSearchParams({
                      ...searchParams,
                      page: String(page),
                    })}`}
                  >
                    <Button
                      variant={searchParams.page === String(page) || (!searchParams.page && page === 1) ? 'default' : 'outline'}
                      size="sm"
                    >
                      {page}
                    </Button>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
