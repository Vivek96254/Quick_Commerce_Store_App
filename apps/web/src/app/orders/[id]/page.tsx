'use client';

import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Package,
  Clock,
  CheckCircle,
  Truck,
  XCircle,
  MapPin,
  CreditCard,
  RotateCcw,
  ChevronLeft,
  Calendar,
} from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { Navbar } from '@/components/layout/navbar';
import { Footer } from '@/components/layout/footer';
import { Button } from '@/components/ui/button';
import { useAuthStore, useCartStore } from '@/lib/store';
import { ordersApi, cartApi } from '@/lib/api';
import { toast } from '@/components/ui/use-toast';
import { formatDateTime, getStatusColor } from '@/lib/utils';

const statusConfig: Record<
  string,
  { icon: any; color: string; bg: string; label: string }
> = {
  PENDING: {
    icon: Clock,
    color: 'text-yellow-600',
    bg: 'bg-yellow-100',
    label: 'Pending',
  },
  CONFIRMED: {
    icon: CheckCircle,
    color: 'text-blue-600',
    bg: 'bg-blue-100',
    label: 'Confirmed',
  },
  PACKED: {
    icon: Package,
    color: 'text-purple-600',
    bg: 'bg-purple-100',
    label: 'Packed',
  },
  OUT_FOR_DELIVERY: {
    icon: Truck,
    color: 'text-orange-600',
    bg: 'bg-orange-100',
    label: 'Out for Delivery',
  },
  DELIVERED: {
    icon: CheckCircle,
    color: 'text-green-600',
    bg: 'bg-green-100',
    label: 'Delivered',
  },
  CANCELLED: {
    icon: XCircle,
    color: 'text-red-600',
    bg: 'bg-red-100',
    label: 'Cancelled',
  },
  REFUNDED: {
    icon: XCircle,
    color: 'text-gray-600',
    bg: 'bg-gray-100',
    label: 'Refunded',
  },
};

const statusTimeline = [
  'PENDING',
  'CONFIRMED',
  'PACKED',
  'OUT_FOR_DELIVERY',
  'DELIVERED',
];

export default function OrderDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { isAuthenticated, accessToken } = useAuthStore();
  const { addItem } = useCartStore();

  const { data: order, isLoading } = useQuery({
    queryKey: ['order', params.id],
    queryFn: () => ordersApi.getById(accessToken!, params.id),
    enabled: !!accessToken && !!params.id,
  });

  const reorderMutation = useMutation({
    mutationFn: async () => {
      if (!order?.items) return;
      for (const item of order.items) {
        await cartApi.addItem(accessToken!, item.productId, item.quantity);
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
    },
    onSuccess: () => {
      toast({ title: 'Items added to cart!' });
      router.push('/cart');
    },
    onError: () => {
      toast({ title: 'Failed to reorder', variant: 'destructive' });
    },
  });

  const cancelMutation = useMutation({
    mutationFn: (reason: string) =>
      ordersApi.cancel(accessToken!, params.id, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['order', params.id] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      toast({ title: 'Order cancelled successfully' });
    },
    onError: () => {
      toast({ title: 'Failed to cancel order', variant: 'destructive' });
    },
  });

  if (!isAuthenticated) {
    router.push('/login?redirect=/orders');
    return null;
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <main className="container mx-auto px-4 py-8">
          <div className="animate-pulse space-y-6">
            <div className="h-8 w-1/3 rounded bg-gray-200" />
            <div className="h-64 rounded-2xl bg-white" />
            <div className="h-64 rounded-2xl bg-white" />
          </div>
        </main>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <main className="container mx-auto px-4 py-8">
          <div className="text-center py-16">
            <div className="text-6xl mb-4">📦</div>
            <h2 className="text-xl font-bold text-gray-700">Order not found</h2>
            <Link href="/orders" className="mt-4 inline-block">
              <Button>Back to Orders</Button>
            </Link>
          </div>
        </main>
      </div>
    );
  }

  const status = statusConfig[order.status] || statusConfig.PENDING;
  const StatusIcon = status.icon;
  const currentStatusIndex = statusTimeline.indexOf(order.status);
  const canCancel = ['PENDING', 'CONFIRMED'].includes(order.status);

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <main className="container mx-auto px-4 py-6 md:py-8">
        {/* Header */}
        <div className="mb-6 flex items-center gap-4">
          <Link href="/orders">
            <Button variant="ghost" size="icon">
              <ChevronLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-gray-900">
              Order #{order.orderNumber}
            </h1>
            <p className="text-sm text-gray-500">
              Placed on {formatDateTime(order.createdAt)}
            </p>
          </div>
          <div className="flex items-center gap-3">
            {canCancel && (
              <Button
                variant="outline"
                onClick={() => {
                  if (confirm('Are you sure you want to cancel this order?')) {
                    cancelMutation.mutate('Customer request');
                  }
                }}
                disabled={cancelMutation.isPending}
              >
                Cancel Order
              </Button>
            )}
            <Button
              onClick={() => reorderMutation.mutate()}
              disabled={reorderMutation.isPending}
              className="bg-swiggy-orange hover:bg-swiggy-orange-dark"
            >
              <RotateCcw className="mr-2 h-4 w-4" />
              Reorder
            </Button>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Status Timeline */}
            <div className="rounded-2xl bg-white p-6 shadow-sm">
              <h2 className="mb-4 text-lg font-semibold text-gray-900">
                Order Status
              </h2>
              <div className="space-y-4">
                {statusTimeline.map((statusKey, index) => {
                  const stepStatus = statusConfig[statusKey];
                  const StepIcon = stepStatus.icon;
                  const isCompleted = index <= currentStatusIndex;
                  const isCurrent = index === currentStatusIndex;

                  return (
                    <div key={statusKey} className="flex items-center gap-4">
                      <div
                        className={`flex h-10 w-10 items-center justify-center rounded-full ${
                          isCompleted
                            ? `${stepStatus.bg} ${stepStatus.color}`
                            : 'bg-gray-100 text-gray-400'
                        }`}
                      >
                        <StepIcon className="h-5 w-5" />
                      </div>
                      <div className="flex-1">
                        <p
                          className={`font-medium ${
                            isCurrent ? stepStatus.color : 'text-gray-500'
                          }`}
                        >
                          {stepStatus.label}
                        </p>
                        {isCurrent && order.updatedAt && (
                          <p className="text-xs text-gray-400">
                            Updated {formatDateTime(order.updatedAt)}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Order Items */}
            <div className="rounded-2xl bg-white p-6 shadow-sm">
              <h2 className="mb-4 text-lg font-semibold text-gray-900">
                Order Items ({order.items?.length || 0})
              </h2>
              <div className="space-y-4">
                {order.items?.map((item: any) => (
                  <div
                    key={item.id}
                    className="flex gap-4 rounded-lg border border-gray-100 p-4"
                  >
                    <div className="relative h-20 w-20 flex-shrink-0 overflow-hidden rounded-lg bg-gray-50">
                      {item.product.images?.[0]?.url ? (
                        <Image
                          src={item.product.images[0].url}
                          alt={item.product.name}
                          fill
                          className="object-cover"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center text-2xl">
                          📦
                        </div>
                      )}
                    </div>
                    <div className="flex-1">
                      <h3 className="font-medium text-gray-900">
                        {item.product.name}
                      </h3>
                      <p className="text-sm text-gray-500">{item.product.unit}</p>
                      <div className="mt-2 flex items-center justify-between">
                        <span className="text-sm text-gray-600">
                          Qty: {item.quantity}
                        </span>
                        <span className="font-semibold text-gray-900">
                          ₹{item.itemTotal.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Delivery Address */}
            {order.address && (
              <div className="rounded-2xl bg-white p-6 shadow-sm">
                <div className="mb-4 flex items-center gap-2">
                  <MapPin className="h-5 w-5 text-gray-400" />
                  <h2 className="text-lg font-semibold text-gray-900">
                    Delivery Address
                  </h2>
                </div>
                <div className="text-sm text-gray-600">
                  <p className="font-medium text-gray-900">
                    {order.address.fullName || order.address.label}
                  </p>
                  <p className="mt-1">{order.address.addressLine1}</p>
                  {order.address.addressLine2 && <p>{order.address.addressLine2}</p>}
                  <p>
                    {order.address.city}, {order.address.state}{' '}
                    {order.address.postalCode}
                  </p>
                  {order.address.landmark && (
                    <p className="text-gray-500">Near: {order.address.landmark}</p>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className="sticky top-24 space-y-6">
              {/* Status Badge */}
              <div className="rounded-2xl bg-white p-6 shadow-sm">
                <div className="mb-4 flex items-center gap-3">
                  <div
                    className={`flex h-12 w-12 items-center justify-center rounded-full ${status.bg}`}
                  >
                    <StatusIcon className={`h-6 w-6 ${status.color}`} />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Status</p>
                    <p className={`font-semibold ${status.color}`}>{status.label}</p>
                  </div>
                </div>
                {order.estimatedDelivery &&
                  order.status !== 'DELIVERED' &&
                  order.status !== 'CANCELLED' && (
                    <div className="rounded-lg bg-green-50 p-3 text-sm">
                      <p className="text-gray-600">Estimated Delivery</p>
                      <p className="font-semibold text-green-700">
                        {new Date(order.estimatedDelivery).toLocaleString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                    </div>
                  )}
              </div>

              {/* Bill Summary */}
              <div className="rounded-2xl bg-white p-6 shadow-sm">
                <h2 className="mb-4 text-lg font-semibold text-gray-900">
                  Bill Summary
                </h2>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between text-gray-600">
                    <span>Item Total</span>
                    <span>₹{order.subtotal?.toFixed(2) || order.total.toFixed(2)}</span>
                  </div>
                  {order.deliveryFee !== undefined && (
                    <div className="flex justify-between text-gray-600">
                      <span>Delivery Fee</span>
                      <span>
                        {order.deliveryFee === 0 ? (
                          <span className="font-semibold text-green-600">FREE</span>
                        ) : (
                          `₹${order.deliveryFee.toFixed(2)}`
                        )}
                      </span>
                    </div>
                  )}
                  {order.tax !== undefined && order.tax > 0 && (
                    <div className="flex justify-between text-gray-600">
                      <span>Tax</span>
                      <span>₹{order.tax.toFixed(2)}</span>
                    </div>
                  )}
                  <hr className="my-3" />
                  <div className="flex justify-between text-base font-bold text-gray-900">
                    <span>Total</span>
                    <span>₹{order.total.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {/* Payment Info */}
              <div className="rounded-2xl bg-white p-6 shadow-sm">
                <div className="mb-2 flex items-center gap-2">
                  <CreditCard className="h-5 w-5 text-gray-400" />
                  <h2 className="text-lg font-semibold text-gray-900">
                    Payment Info
                  </h2>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Method</span>
                    <span className="font-medium text-gray-900">
                      {order.paymentMethod?.replace(/_/g, ' ') || 'N/A'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Status</span>
                    <span
                      className={`font-medium ${
                        order.paymentStatus === 'COMPLETED'
                          ? 'text-green-600'
                          : order.paymentStatus === 'FAILED'
                            ? 'text-red-600'
                            : 'text-yellow-600'
                      }`}
                    >
                      {order.paymentStatus || 'PENDING'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
