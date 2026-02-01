import Link from 'next/link';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import { ChevronLeft, Minus, Plus, ShoppingCart, Truck, Shield, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Navbar } from '@/components/layout/navbar';
import { Footer } from '@/components/layout/footer';

async function getProduct(slug: string) {
  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}/api/v1/products/slug/${slug}`,
      { next: { revalidate: 60 } }
    );
    if (!res.ok) return null;
    const data = await res.json();
    return data.data;
  } catch {
    return null;
  }
}

async function getRelatedProducts(categoryId: string, currentProductId: string) {
  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}/api/v1/products?categoryId=${categoryId}&limit=4`,
      { next: { revalidate: 60 } }
    );
    if (!res.ok) return [];
    const data = await res.json();
    return (data.data?.items || []).filter((p: any) => p.id !== currentProductId);
  } catch {
    return [];
  }
}

export default async function ProductPage({
  params,
}: {
  params: { slug: string };
}) {
  const product = await getProduct(params.slug);

  if (!product) {
    notFound();
  }

  const relatedProducts = await getRelatedProducts(product.categoryId, product.id);

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <main className="container mx-auto px-4 py-8">
        {/* Breadcrumb */}
        <nav className="mb-6 flex items-center gap-2 text-sm text-gray-600">
          <Link href="/" className="hover:text-primary">Home</Link>
          <span>/</span>
          <Link href="/products" className="hover:text-primary">Products</Link>
          <span>/</span>
          {product.category && (
            <>
              <Link href={`/products?category=${product.category.slug}`} className="hover:text-primary">
                {product.category.name}
              </Link>
              <span>/</span>
            </>
          )}
          <span className="text-gray-900">{product.name}</span>
        </nav>

        <div className="grid gap-8 lg:grid-cols-2">
          {/* Product Images */}
          <div className="space-y-4">
            <div className="relative aspect-square overflow-hidden rounded-2xl bg-white">
              {product.images?.[0]?.url ? (
                <Image
                  src={product.images[0].url}
                  alt={product.name}
                  fill
                  className="object-contain p-8"
                  priority
                />
              ) : (
                <div className="flex h-full items-center justify-center text-8xl">📦</div>
              )}
              {product.discountedPrice && (
                <div className="absolute left-4 top-4 rounded-full bg-red-500 px-3 py-1 text-sm font-medium text-white">
                  {Math.round((1 - product.discountedPrice / product.price) * 100)}% OFF
                </div>
              )}
            </div>
            {product.images?.length > 1 && (
              <div className="flex gap-2 overflow-x-auto">
                {product.images.map((image: any, index: number) => (
                  <button
                    key={image.id || index}
                    className="relative h-20 w-20 flex-shrink-0 overflow-hidden rounded-lg border-2 border-transparent hover:border-primary"
                  >
                    <Image
                      src={image.url}
                      alt={`${product.name} ${index + 1}`}
                      fill
                      className="object-cover"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Product Info */}
          <div className="space-y-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{product.name}</h1>
              <p className="mt-1 text-gray-600">{product.unit} • SKU: {product.sku}</p>
            </div>

            <div className="flex items-baseline gap-3">
              <span className="text-4xl font-bold text-gray-900">
                ₹{product.discountedPrice || product.price}
              </span>
              {product.discountedPrice && (
                <>
                  <span className="text-xl text-gray-400 line-through">₹{product.price}</span>
                  <span className="rounded-full bg-green-100 px-2 py-1 text-sm font-medium text-green-700">
                    Save ₹{product.price - product.discountedPrice}
                  </span>
                </>
              )}
            </div>

            {/* Stock Status */}
            <div className="flex items-center gap-2">
              {product.stockQuantity > 0 ? (
                <>
                  <div className="h-3 w-3 rounded-full bg-green-500"></div>
                  <span className="text-green-700">In Stock ({product.stockQuantity} available)</span>
                </>
              ) : (
                <>
                  <div className="h-3 w-3 rounded-full bg-red-500"></div>
                  <span className="text-red-700">Out of Stock</span>
                </>
              )}
            </div>

            {/* Quantity Selector */}
            <div className="flex items-center gap-4">
              <span className="font-medium text-gray-700">Quantity:</span>
              <div className="flex items-center gap-2 rounded-lg border bg-white p-1">
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <Minus className="h-4 w-4" />
                </Button>
                <span className="w-12 text-center font-medium">1</span>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Add to Cart */}
            <div className="flex gap-3">
              <Button 
                size="lg" 
                className="flex-1 gap-2"
                disabled={product.stockQuantity === 0}
              >
                <ShoppingCart className="h-5 w-5" />
                {product.stockQuantity === 0 ? 'Out of Stock' : 'Add to Cart'}
              </Button>
              <Button size="lg" variant="outline" disabled={product.stockQuantity === 0}>
                Buy Now
              </Button>
            </div>

            {/* Features */}
            <div className="grid grid-cols-3 gap-4 rounded-xl bg-white p-4">
              <div className="text-center">
                <Truck className="mx-auto mb-2 h-6 w-6 text-primary" />
                <p className="text-xs text-gray-600">Free Delivery</p>
              </div>
              <div className="text-center">
                <Shield className="mx-auto mb-2 h-6 w-6 text-primary" />
                <p className="text-xs text-gray-600">Quality Assured</p>
              </div>
              <div className="text-center">
                <RotateCcw className="mx-auto mb-2 h-6 w-6 text-primary" />
                <p className="text-xs text-gray-600">Easy Returns</p>
              </div>
            </div>

            {/* Description */}
            {product.description && (
              <div>
                <h3 className="mb-2 font-semibold text-gray-900">Description</h3>
                <p className="text-gray-600 whitespace-pre-line">{product.description}</p>
              </div>
            )}

            {/* Tags */}
            {product.tags?.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {product.tags.map((tag: string) => (
                  <span key={tag} className="rounded-full bg-gray-100 px-3 py-1 text-sm text-gray-600">
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Related Products */}
        {relatedProducts.length > 0 && (
          <section className="mt-16">
            <h2 className="mb-6 text-2xl font-bold text-gray-900">Related Products</h2>
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              {relatedProducts.slice(0, 4).map((relatedProduct: any) => (
                <Link
                  key={relatedProduct.id}
                  href={`/products/${relatedProduct.slug}`}
                  className="group rounded-2xl bg-white p-4 shadow-sm transition-all hover:shadow-md"
                >
                  <div className="relative mb-3 aspect-square overflow-hidden rounded-xl bg-gray-100">
                    {relatedProduct.images?.[0]?.url ? (
                      <Image
                        src={relatedProduct.images[0].url}
                        alt={relatedProduct.name}
                        fill
                        className="object-cover"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-4xl">📦</div>
                    )}
                  </div>
                  <h3 className="line-clamp-2 text-sm font-medium text-gray-900 group-hover:text-primary">
                    {relatedProduct.name}
                  </h3>
                  <p className="mt-1 font-bold text-gray-900">
                    ₹{relatedProduct.discountedPrice || relatedProduct.price}
                  </p>
                </Link>
              ))}
            </div>
          </section>
        )}
      </main>

      <Footer />
    </div>
  );
}
