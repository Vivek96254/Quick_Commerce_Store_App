'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { XCircle, RefreshCw, Home, CreditCard } from 'lucide-react';
import Link from 'next/link';
import { Navbar } from '@/components/layout/navbar';
import { Footer } from '@/components/layout/footer';
import { Button } from '@/components/ui/button';

function PaymentFailedContent() {
  const searchParams = useSearchParams();
  const orderId = searchParams.get('orderId');
  const reason = searchParams.get('reason') || 'Payment could not be processed';

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <main className="container mx-auto px-4 py-16">
        <div className="mx-auto max-w-2xl text-center">
          {/* Error Icon */}
          <div className="mb-6 flex justify-center">
            <div className="flex h-24 w-24 items-center justify-center rounded-full bg-red-100">
              <XCircle className="h-12 w-12 text-red-600" />
            </div>
          </div>

          {/* Message */}
          <h1 className="mb-3 text-3xl font-bold text-gray-900">
            Payment Failed
          </h1>
          <p className="mb-2 text-lg text-gray-600">
            {reason}
          </p>
          <p className="mb-8 text-sm text-gray-500">
            Don&apos;t worry, your order has been saved. You can try again or choose a different payment method.
          </p>

          {/* Info Card */}
          <div className="mb-8 rounded-2xl bg-white p-6 shadow-sm">
            <div className="space-y-4 text-left">
              <div className="flex items-start gap-3">
                <CreditCard className="mt-0.5 h-5 w-5 text-swiggy-orange" />
                <div>
                  <p className="font-semibold text-gray-900">What went wrong?</p>
                  <p className="text-sm text-gray-600">
                    The payment could not be completed. This could be due to insufficient funds,
                    network issues, or card authentication failure.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <RefreshCw className="mt-0.5 h-5 w-5 text-blue-600" />
                <div>
                  <p className="font-semibold text-gray-900">What can you do?</p>
                  <p className="text-sm text-gray-600">
                    You can retry the payment, choose a different payment method, or contact support for assistance.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
            {orderId && (
              <Link href={`/checkout?orderId=${orderId}`}>
                <Button size="lg" className="w-full bg-swiggy-orange hover:bg-swiggy-orange-dark sm:w-auto">
                  <RefreshCw className="mr-2 h-5 w-5" />
                  Retry Payment
                </Button>
              </Link>
            )}
            <Link href="/cart">
              <Button variant="outline" size="lg" className="w-full sm:w-auto">
                Back to Cart
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

export default function PaymentFailedPage() {
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
      <PaymentFailedContent />
    </Suspense>
  );
}
