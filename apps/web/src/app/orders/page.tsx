'use client';

export const dynamic = 'force-dynamic';

import { useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { Package, ChevronRight, Clock, CheckCircle, Truck, XCircle, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Navbar } from '@/components/layout/navbar';
import { Footer } from '@/components/layout/footer';
import { useAuthStore, useCartStore } from '@/lib/store';
import { ordersApi, cartApi } from '@/lib/api';
import { toast } from '@/components/ui/use-toast';

const statusConfig: Record<string, { icon: any; color: string; bg: string }> = {
  PENDING: { icon: Clock, color: 'text-yellow-600', bg: 'bg-yellow-100' },
  CONFIRMED: { icon: CheckCircle, color: 'text-blue-600', bg: 'bg-blue-100' },
  PACKED: { icon: Package, color: 'text-purple-600', bg: 'bg-purple-100' },
  OUT_FOR_DELIVERY: { icon: Truck, color: 'text-orange-600', bg: 'bg-orange-100' },
  DELIVERED: { icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-100' },
  CANCELLED: { icon: XCircle, color: 'text-red-600', bg: 'bg-red-100' },
  REFUNDED: { icon: XCircle, color: 'text-gray-600', bg: 'bg-gray-100' },
};

export default function OrdersPage() {
  const router = useRouter();
  const { isAuthenticated, accessToken } = useAuthStore();
  const { addItem } = useCartStore();

  const { data: ordersData, isLoading, refetch } = useQuery({
    queryKey: ['orders'],
    queryFn: () => ordersApi.list(accessToken!),
    enabled: !!isAuthenticated && !!accessToken,
  });

  const orders = (ordersData as any)?.items || [];

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login?redirect=/orders');
    }
  }, [isAuthenticated, router]);

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <main className="container mx-auto px-4 py-8">
        <div className="mb-8 flex items-center justify-between">
          <h1 className="text-3xl font-bold text-gray-900">My Orders</h1>
          <Button variant="outline" onClick={() => refetch()} disabled={isLoading}>
            Refresh
          </Button>
        </div>

        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse rounded-2xl bg-white p-6">
                <div className="h-4 w-1/4 rounded bg-gray-200"></div>
                <div className="mt-4 h-3 w-1/2 rounded bg-gray-200"></div>
                <div className="mt-2 h-3 w-1/3 rounded bg-gray-200"></div>
              </div>
            ))}
          </div>
        ) : orders.length === 0 ? (
          <div className="mx-auto max-w-md text-center py-16">
            <div className="mb-6 text-8xl">📦</div>
            <h2 className="mb-2 text-2xl font-bold text-gray-900">No orders yet</h2>
            <p className="mb-6 text-gray-600">
              Start shopping to see your orders here
            </p>
            <Link href="/products">
              <Button size="lg">Browse Products</Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map((order: any) => {
              const status = statusConfig[order.status] || statusConfig.PENDING;
              const StatusIcon = status.icon;

              return (
                <Link
                  key={order.id}
                  href={`/orders/${order.id}`}
                  className="block rounded-2xl bg-white p-6 shadow-sm transition-shadow hover:shadow-md"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-3">
                        <span className="font-semibold text-gray-900">
                          Order #{order.orderNumber}
                        </span>
                        <span className={`flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium ${status.bg} ${status.color}`}>
                          <StatusIcon className="h-3 w-3" />
                          {order.status.replace(/_/g, ' ')}
                        </span>
                      </div>
                      <p className="mt-1 text-sm text-gray-500">
                        {new Date(order.createdAt).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'long',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                      <p className="mt-2 text-sm text-gray-600">
                        {order.items?.length || 0} items • ₹{order.total}
                      </p>
                    </div>
                    <ChevronRight className="h-5 w-5 text-gray-400" />
                  </div>

                  {order.estimatedDelivery && order.status !== 'DELIVERED' && order.status !== 'CANCELLED' && (
                    <div className="mt-4 flex items-center gap-2 rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">
                      <Truck className="h-4 w-4" />
                      Estimated delivery: {new Date(order.estimatedDelivery).toLocaleTimeString('en-IN', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </div>
                  )}

                  {/* Reorder Button */}
                  {order.status === 'DELIVERED' && (
                    <div className="mt-4">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={async (e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          try {
                            if (!accessToken) return;
                            for (const item of order.items || []) {
                              await cartApi.addItem(accessToken, item.productId, item.quantity);
                              addItem({
                                productId: item.productId,
                                quantity: item.quantity,
                                product: {
                                  id: item.product.id,
                                  name: item.product.name,
                                  slug: item.product.slug,
                                  price: item.product.price,
                                  discountedPrice: item.product.discountedPrice,
                                  unit: item.product.unit || '',
                                  stockQuantity: item.product.stockQuantity || 0,
                                  isAvailable: item.product.isAvailable !== false,
                                  images: (item.product.images || []).map((img: any) => ({
                                    url: img.url,
                                    isPrimary: img.isPrimary ?? false,
                                  })),
                                },
                                itemTotal: item.itemTotal,
                              });
                            }
                            toast({ title: 'Items added to cart!' });
                            router.push('/cart');
                          } catch {
                            toast({ title: 'Failed to reorder', variant: 'destructive' });
                          }
                        }}
                        className="gap-2"
                      >
                        <RotateCcw className="h-4 w-4" />
                        Reorder
                      </Button>
                    </div>
                  )}
                </Link>
              );
            })}
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
