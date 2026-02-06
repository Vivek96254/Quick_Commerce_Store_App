'use client';

import { Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { CheckCircle, Package, Home } from 'lucide-react';
import Link from 'next/link';
import { Navbar } from '@/components/layout/navbar';
import { Footer } from '@/components/layout/footer';
import { Button } from '@/components/ui/button';

function PaymentSuccessContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const orderId = searchParams.get('orderId');
  const orderNumber = searchParams.get('orderNumber');

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <main className="container mx-auto px-4 py-16">
        <div className="mx-auto max-w-2xl text-center">
          {/* Success Icon */}
          <div className="mb-6 flex justify-center">
            <div className="flex h-24 w-24 items-center justify-center rounded-full bg-green-100">
              <CheckCircle className="h-12 w-12 text-green-600" />
            </div>
          </div>

          {/* Message */}
          <h1 className="mb-3 text-3xl font-bold text-gray-900">
            Payment Successful!
          </h1>
          <p className="mb-2 text-lg text-gray-600">
            Your order has been placed successfully.
          </p>
          {orderNumber && (
            <p className="mb-8 text-sm text-gray-500">
              Order #{orderNumber}
            </p>
          )}

          {/* Info Card */}
          <div className="mb-8 rounded-2xl bg-white p-6 shadow-sm">
            <div className="space-y-4 text-left">
              <div className="flex items-start gap-3">
                <Package className="mt-0.5 h-5 w-5 text-swiggy-orange" />
                <div>
                  <p className="font-semibold text-gray-900">What&apos;s next?</p>
                  <p className="text-sm text-gray-600">
                    We&apos;ve received your order and will start preparing it right away.
                    You&apos;ll receive updates on your order status.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle className="mt-0.5 h-5 w-5 text-green-600" />
                <div>
                  <p className="font-semibold text-gray-900">Estimated Delivery</p>
                  <p className="text-sm text-gray-600">
                    Your order will be delivered in 10-15 minutes.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
            {orderId && (
              <Link href={`/orders/${orderId}`}>
                <Button size="lg" className="w-full bg-swiggy-orange hover:bg-swiggy-orange-dark sm:w-auto">
                  <Package className="mr-2 h-5 w-5" />
                  View Order
                </Button>
              </Link>
            )}
            <Link href="/orders">
              <Button variant="outline" size="lg" className="w-full sm:w-auto">
                My Orders
              </Button>
            </Link>
            <Link href="/">
              <Button variant="outline" size="lg" className="w-full sm:w-auto">
                <Home className="mr-2 h-5 w-5" />
                Continue Shopping
              </Button>
            </Link>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}

export default function PaymentSuccessPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <main className="container mx-auto px-4 py-16">
          <div className="text-center">
            <div className="mb-4 h-8 w-8 animate-spin rounded-full border-4 border-swiggy-orange border-t-transparent mx-auto" />
            <p className="text-sm text-gray-500">Loading...</p>
          </div>
        </main>
      </div>
    }>
      <PaymentSuccessContent />
    </Suspense>
  );
}
