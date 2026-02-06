'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';
import { Minus, Plus } from 'lucide-react';
import { useAuthStore, useCartStore } from '@/lib/store';
import { cartApi } from '@/lib/api';
import { toast } from '@/components/ui/use-toast';

interface ProductCardProps {
  product: {
    id: string;
    name: string;
    slug: string;
    price: number;
    discountedPrice?: number | null;
    unit?: string;
    stockQuantity: number;
    isAvailable?: boolean;
    images?: Array<{ url: string; isPrimary?: boolean }>;
  };
  compact?: boolean;
}

export function ProductCard({ product, compact = false }: ProductCardProps) {
  const { accessToken, isAuthenticated } = useAuthStore();
  const { items, addItem, updateQuantity, removeItem } = useCartStore();
  const [loading, setLoading] = useState(false);

  const cartItem = items.find((i) => i.productId === product.id);
  const quantity = cartItem?.quantity || 0;
  const effectivePrice = product.discountedPrice || product.price;
  const discount = product.discountedPrice
    ? Math.round((1 - product.discountedPrice / product.price) * 100)
    : 0;
  const outOfStock = product.stockQuantity === 0 || product.isAvailable === false;

  const handleAdd = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (outOfStock) return;

    setLoading(true);
    try {
      if (isAuthenticated && accessToken) {
        await cartApi.addItem(accessToken, product.id, 1);
      }
      addItem({
        productId: product.id,
        quantity: 1,
        product: {
          id: product.id,
          name: product.name,
          slug: product.slug,
          price: product.price,
          discountedPrice: product.discountedPrice ?? null,
          unit: product.unit || '',
          stockQuantity: product.stockQuantity,
          isAvailable: product.isAvailable !== false,
          images: (product.images || []).map((img) => ({
            url: img.url,
            isPrimary: img.isPrimary ?? false,
          })),
        },
        itemTotal: effectivePrice,
      });
    } catch {
      toast({ title: 'Failed to add', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleIncrement = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (quantity >= product.stockQuantity) return;
    setLoading(true);
    try {
      if (isAuthenticated && accessToken) {
        await cartApi.updateItem(accessToken, product.id, quantity + 1);
      }
      updateQuantity(product.id, quantity + 1);
    } catch {
      toast({ title: 'Failed to update', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleDecrement = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setLoading(true);
    try {
      if (quantity <= 1) {
        if (isAuthenticated && accessToken) {
          await cartApi.removeItem(accessToken, product.id);
        }
        removeItem(product.id);
      } else {
        if (isAuthenticated && accessToken) {
          await cartApi.updateItem(accessToken, product.id, quantity - 1);
        }
        updateQuantity(product.id, quantity - 1);
      }
    } catch {
      toast({ title: 'Failed to update', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Link
      href={`/products/${product.slug}`}
      className={`group relative flex flex-col rounded-xl bg-white border border-gray-100 transition-shadow hover:shadow-card-hover ${
        compact ? 'w-[140px] flex-shrink-0' : ''
      }`}
    >
      {/* Image */}
      <div className={`relative overflow-hidden rounded-t-xl bg-swiggy-gray-50 ${compact ? 'h-[120px]' : 'aspect-square'}`}>
        {product.images?.[0]?.url ? (
          <Image
            src={product.images[0].url}
            alt={product.name}
            fill
            className="object-cover transition-transform duration-200 group-hover:scale-105"
            sizes={compact ? '140px' : '(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw'}
          />
        ) : (
          <div className="flex h-full items-center justify-center text-4xl text-gray-300">
            📦
          </div>
        )}

        {/* Discount badge */}
        {discount > 0 && (
          <div className="absolute left-0 top-2 rounded-r-md bg-[#E23744] px-1.5 py-0.5 text-[10px] font-bold text-white">
            {discount}% OFF
          </div>
        )}

        {/* Out of stock overlay */}
        {outOfStock && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/70">
            <span className="rounded-md bg-swiggy-gray-700 px-2 py-1 text-xs font-semibold text-white">
              Out of stock
            </span>
          </div>
        )}
      </div>

      {/* Info */}
      <div className={`flex flex-1 flex-col ${compact ? 'p-2' : 'p-3'}`}>
        <h3
          className={`line-clamp-2 font-medium text-swiggy-gray-800 ${
            compact ? 'text-xs leading-tight' : 'text-sm leading-snug'
          }`}
        >
          {product.name}
        </h3>

        {product.unit && (
          <p className={`mt-0.5 text-swiggy-gray-400 ${compact ? 'text-[10px]' : 'text-xs'}`}>
            {product.unit}
          </p>
        )}

        <div className="mt-auto pt-2">
          <div className="flex items-center gap-1.5">
            <span className={`font-bold text-swiggy-gray-800 ${compact ? 'text-xs' : 'text-sm'}`}>
              ₹{effectivePrice}
            </span>
            {product.discountedPrice && (
              <span className={`text-swiggy-gray-400 line-through ${compact ? 'text-[10px]' : 'text-xs'}`}>
                ₹{product.price}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ADD / Stepper button */}
      {!outOfStock && (
        <div className={`px-3 pb-3 ${compact ? 'px-2 pb-2' : ''}`}>
          {quantity === 0 ? (
            <button
              onClick={handleAdd}
              disabled={loading}
              className={`w-full rounded-lg border-2 border-swiggy-orange bg-white font-bold text-swiggy-orange transition-all hover:bg-swiggy-orange-light active:scale-95 disabled:opacity-60 ${
                compact ? 'py-1 text-xs' : 'py-1.5 text-sm'
              }`}
            >
              ADD
            </button>
          ) : (
            <div
              className={`flex items-center justify-between rounded-lg bg-swiggy-orange font-bold text-white ${
                compact ? 'py-0.5 text-xs' : 'py-1 text-sm'
              }`}
            >
              <button
                onClick={handleDecrement}
                disabled={loading}
                className="flex-1 py-0.5 transition-opacity hover:opacity-80 active:scale-90"
              >
                <Minus className="mx-auto h-3.5 w-3.5" />
              </button>
              <span className="min-w-[24px] text-center">{quantity}</span>
              <button
                onClick={handleIncrement}
                disabled={loading || quantity >= product.stockQuantity}
                className="flex-1 py-0.5 transition-opacity hover:opacity-80 active:scale-90 disabled:opacity-50"
              >
                <Plus className="mx-auto h-3.5 w-3.5" />
              </button>
            </div>
          )}
        </div>
      )}
    </Link>
  );
}
