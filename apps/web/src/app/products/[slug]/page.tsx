'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { Minus, Plus, ShoppingCart, Truck, Shield, RotateCcw, ChevronLeft } from 'lucide-react';
import { Navbar } from '@/components/layout/navbar';
import { Footer } from '@/components/layout/footer';
import { ProductCard } from '@/components/ui/product-card';
import { Button } from '@/components/ui/button';
import { useCartStore, useAuthStore } from '@/lib/store';
import { productsApi, cartApi } from '@/lib/api';
import { toast } from '@/components/ui/use-toast';

export default function ProductPage() {
  const { slug } = useParams<{ slug: string }>();
  const { accessToken, isAuthenticated } = useAuthStore();
  const { items, addItem, updateQuantity, removeItem } = useCartStore();
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(false);
  const [selectedImage, setSelectedImage] = useState(0);

  const { data: product, isLoading } = useQuery({
    queryKey: ['product', slug],
    queryFn: () => productsApi.getBySlug(slug),
    enabled: !!slug,
  });

  const { data: relatedData } = useQuery({
    queryKey: ['related-products', product?.categoryId],
    queryFn: () => productsApi.list({ categoryId: product?.categoryId, limit: 6 }),
    enabled: !!product?.categoryId,
  });

  const relatedProducts = ((relatedData as any)?.items || []).filter(
    (p: any) => p.id !== product?.id,
  );

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white">
        <Navbar />
        <main className="container mx-auto px-4 py-8">
          <div className="grid gap-8 lg:grid-cols-2">
            <div className="skeleton aspect-square rounded-2xl" />
            <div className="space-y-4">
              <div className="skeleton h-8 w-2/3 rounded" />
              <div className="skeleton h-5 w-1/3 rounded" />
              <div className="skeleton h-12 w-1/2 rounded" />
              <div className="skeleton h-12 w-full rounded-lg" />
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-white">
        <Navbar />
        <div className="flex flex-col items-center justify-center py-20">
          <div className="text-6xl mb-4">📦</div>
          <h2 className="text-xl font-bold text-swiggy-gray-700">Product not found</h2>
          <Link href="/products" className="mt-4">
            <Button className="bg-swiggy-orange hover:bg-swiggy-orange-dark">Browse Products</Button>
          </Link>
        </div>
      </div>
    );
  }

  const effectivePrice = product.discountedPrice || product.price;
  const discount = product.discountedPrice
    ? Math.round((1 - product.discountedPrice / product.price) * 100)
    : 0;
  const cartItem = items.find((i) => i.productId === product.id);
  const cartQty = cartItem?.quantity || 0;
  const outOfStock = product.stockQuantity === 0;

  const handleAddToCart = async () => {
    setLoading(true);
    try {
      if (isAuthenticated && accessToken) {
        await cartApi.addItem(accessToken, product.id, quantity);
      }
      addItem({
        productId: product.id,
        quantity,
        product: {
          id: product.id,
          name: product.name,
          slug: product.slug,
          price: product.price,
          discountedPrice: product.discountedPrice ?? null,
          unit: product.unit || '',
          stockQuantity: product.stockQuantity,
          isAvailable: true,
          images: (product.images || []).map((img: any) => ({
            url: img.url,
            isPrimary: img.isPrimary ?? false,
          })),
        },
        itemTotal: effectivePrice * quantity,
      });
      toast({ title: 'Added to cart!', variant: 'default' });
    } catch {
      toast({ title: 'Failed to add', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white">
      <Navbar />

      <main className="container mx-auto px-4 py-4 pb-20 md:py-8 md:pb-8">
        {/* Breadcrumb */}
        <nav className="mb-4 flex items-center gap-2 text-xs text-swiggy-gray-400">
          <Link href="/" className="hover:text-swiggy-orange">Home</Link>
          <span>/</span>
          <Link href="/products" className="hover:text-swiggy-orange">Products</Link>
          {product.category && (
            <>
              <span>/</span>
              <Link
                href={`/products?category=${product.category.slug}`}
                className="hover:text-swiggy-orange"
              >
                {product.category.name}
              </Link>
            </>
          )}
          <span>/</span>
          <span className="text-swiggy-gray-700 font-medium">{product.name}</span>
        </nav>

        <div className="grid gap-6 lg:grid-cols-2 lg:gap-12">
          {/* Images */}
          <div className="space-y-3">
            <div className="relative aspect-square overflow-hidden rounded-2xl border border-gray-100 bg-swiggy-gray-50">
              {product.images?.[selectedImage]?.url ? (
                <Image
                  src={product.images[selectedImage].url}
                  alt={product.name}
                  fill
                  className="object-contain p-6"
                  priority
                />
              ) : (
                <div className="flex h-full items-center justify-center text-8xl text-gray-200">📦</div>
              )}
              {discount > 0 && (
                <div className="absolute left-0 top-4 rounded-r-md bg-[#E23744] px-2 py-1 text-xs font-bold text-white">
                  {discount}% OFF
                </div>
              )}
            </div>
            {product.images?.length > 1 && (
              <div className="flex gap-2">
                {product.images.map((img: any, idx: number) => (
                  <button
                    key={img.id || idx}
                    onClick={() => setSelectedImage(idx)}
                    className={`relative h-16 w-16 flex-shrink-0 overflow-hidden rounded-lg border-2 transition-colors ${
                      selectedImage === idx ? 'border-swiggy-orange' : 'border-gray-200'
                    }`}
                  >
                    <Image src={img.url} alt="" fill className="object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Product Info */}
          <div className="space-y-4">
            <div>
              <h1 className="text-xl font-extrabold text-swiggy-gray-800 md:text-2xl">{product.name}</h1>
              <p className="mt-1 text-sm text-swiggy-gray-400">{product.unit}</p>
            </div>

            {/* Price */}
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-extrabold text-swiggy-gray-800 md:text-3xl">
                ₹{effectivePrice}
              </span>
              {product.discountedPrice && (
                <>
                  <span className="text-lg text-swiggy-gray-300 line-through">₹{product.price}</span>
                  <span className="rounded bg-swiggy-orange-light px-1.5 py-0.5 text-xs font-bold text-swiggy-orange">
                    Save ₹{(product.price - product.discountedPrice).toFixed(0)}
                  </span>
                </>
              )}
            </div>

            {/* Stock */}
            <div className="flex items-center gap-2 text-sm">
              {outOfStock ? (
                <>
                  <div className="h-2.5 w-2.5 rounded-full bg-red-500" />
                  <span className="font-medium text-red-600">Out of Stock</span>
                </>
              ) : (
                <>
                  <div className="h-2.5 w-2.5 rounded-full bg-swiggy-green" />
                  <span className="font-medium text-swiggy-green">In Stock</span>
                  <span className="text-swiggy-gray-400">({product.stockQuantity} available)</span>
                </>
              )}
            </div>

            {/* Quantity + Add */}
            {!outOfStock && (
              <div className="flex items-center gap-3">
                <div className="flex items-center rounded-lg border border-gray-200">
                  <button
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="px-3 py-2 text-swiggy-gray-500 hover:text-swiggy-gray-800 transition-colors"
                  >
                    <Minus className="h-4 w-4" />
                  </button>
                  <span className="min-w-[40px] text-center text-sm font-bold text-swiggy-gray-800">
                    {quantity}
                  </span>
                  <button
                    onClick={() => setQuantity(Math.min(product.stockQuantity, quantity + 1))}
                    className="px-3 py-2 text-swiggy-gray-500 hover:text-swiggy-gray-800 transition-colors"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>

                <Button
                  onClick={handleAddToCart}
                  disabled={loading}
                  className="flex-1 gap-2 bg-swiggy-orange text-white hover:bg-swiggy-orange-dark"
                  size="lg"
                >
                  <ShoppingCart className="h-4 w-4" />
                  {loading ? 'Adding...' : `Add to Cart · ₹${(effectivePrice * quantity).toFixed(0)}`}
                </Button>
              </div>
            )}

            {/* Features */}
            <div className="grid grid-cols-3 gap-3 rounded-xl border border-gray-100 p-3">
              <div className="text-center">
                <Truck className="mx-auto mb-1 h-5 w-5 text-swiggy-orange" />
                <p className="text-[11px] text-swiggy-gray-500">10 min delivery</p>
              </div>
              <div className="text-center">
                <Shield className="mx-auto mb-1 h-5 w-5 text-swiggy-orange" />
                <p className="text-[11px] text-swiggy-gray-500">Quality assured</p>
              </div>
              <div className="text-center">
                <RotateCcw className="mx-auto mb-1 h-5 w-5 text-swiggy-orange" />
                <p className="text-[11px] text-swiggy-gray-500">Easy returns</p>
              </div>
            </div>

            {/* Description */}
            {product.description && (
              <div>
                <h3 className="mb-1.5 text-sm font-bold text-swiggy-gray-700">Description</h3>
                <p className="text-sm leading-relaxed text-swiggy-gray-500 whitespace-pre-line">
                  {product.description}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Related */}
        {relatedProducts.length > 0 && (
          <section className="mt-12">
            <h2 className="mb-4 text-lg font-extrabold text-swiggy-gray-800">Similar Products</h2>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
              {relatedProducts.slice(0, 5).map((rp: any) => (
                <ProductCard key={rp.id} product={rp} />
              ))}
            </div>
          </section>
        )}
      </main>

      <Footer />
    </div>
  );
}
