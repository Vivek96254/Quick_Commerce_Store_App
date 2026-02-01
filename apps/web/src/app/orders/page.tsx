'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Package, ChevronRight, Clock, CheckCircle, Truck, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Navbar } from '@/components/layout/navbar';
import { Footer } from '@/components/layout/footer';
import { useAuthStore } from '@/lib/store';
import { ordersApi } from '@/lib/api';

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
  const [orders, setOrders] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login?redirect=/orders');
      return;
    }

    const fetchOrders = async () => {
      try {
        const data = await ordersApi.list(accessToken!);
        setOrders(data.items || []);
      } catch (error) {
        console.error('Failed to fetch orders:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchOrders();
  }, [isAuthenticated, accessToken, router]);

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <main className="container mx-auto px-4 py-8">
        <h1 className="mb-8 text-3xl font-bold text-gray-900">My Orders</h1>

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
            {orders.map((order) => {
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
