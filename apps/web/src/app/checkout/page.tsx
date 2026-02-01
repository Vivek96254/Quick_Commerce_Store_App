'use client';

export const dynamic = 'force-dynamic';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { MapPin, CreditCard, Truck, ChevronRight, Plus, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Navbar } from '@/components/layout/navbar';
import { Footer } from '@/components/layout/footer';
import { useCartStore, useAuthStore } from '@/lib/store';

export default function CheckoutPage() {
  const router = useRouter();
  const { items, subtotal, deliveryFee, total, clearCart } = useCartStore();
  const { isAuthenticated, accessToken } = useAuthStore();
  const [selectedAddress, setSelectedAddress] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<'CASH_ON_DELIVERY' | 'RAZORPAY' | 'STRIPE'>('CASH_ON_DELIVERY');
  const [isLoading, setIsLoading] = useState(false);

  // Redirect if not authenticated
  if (!isAuthenticated) {
    router.push('/login?redirect=/checkout');
    return null;
  }

  if (items.length === 0) {
    router.push('/cart');
    return null;
  }

  const handlePlaceOrder = async () => {
    if (!selectedAddress) {
      alert('Please select a delivery address');
      return;
    }

    setIsLoading(true);
    try {
      // API call would go here
      alert('Order placed successfully!');
      clearCart();
      router.push('/orders');
    } catch (error) {
      alert('Failed to place order. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <main className="container mx-auto px-4 py-8">
        <h1 className="mb-8 text-3xl font-bold text-gray-900">Checkout</h1>

        <div className="grid gap-8 lg:grid-cols-3">
          {/* Checkout Steps */}
          <div className="lg:col-span-2 space-y-6">
            {/* Delivery Address */}
            <div className="rounded-2xl bg-white p-6 shadow-sm">
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-white">
                  <MapPin className="h-5 w-5" />
                </div>
                <h2 className="text-lg font-semibold text-gray-900">Delivery Address</h2>
              </div>

              <div className="space-y-3">
                {/* Sample addresses - would be fetched from API */}
                <label className="flex cursor-pointer items-start gap-3 rounded-xl border-2 border-transparent bg-gray-50 p-4 transition-colors has-[:checked]:border-primary has-[:checked]:bg-primary/5">
                  <input
                    type="radio"
                    name="address"
                    className="mt-1"
                    checked={selectedAddress === 'home'}
                    onChange={() => setSelectedAddress('home')}
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">Home</span>
                      <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs text-green-700">Default</span>
                    </div>
                    <p className="mt-1 text-sm text-gray-600">
                      123 Main Street, Apartment 4B<br />
                      Mumbai, Maharashtra 400001
                    </p>
                    <p className="mt-1 text-sm text-gray-500">+91 98765 43210</p>
                  </div>
                </label>

                <label className="flex cursor-pointer items-start gap-3 rounded-xl border-2 border-transparent bg-gray-50 p-4 transition-colors has-[:checked]:border-primary has-[:checked]:bg-primary/5">
                  <input
                    type="radio"
                    name="address"
                    className="mt-1"
                    checked={selectedAddress === 'office'}
                    onChange={() => setSelectedAddress('office')}
                  />
                  <div className="flex-1">
                    <span className="font-medium">Office</span>
                    <p className="mt-1 text-sm text-gray-600">
                      456 Business Park, Tower A<br />
                      Mumbai, Maharashtra 400051
                    </p>
                    <p className="mt-1 text-sm text-gray-500">+91 98765 43210</p>
                  </div>
                </label>

                <button className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-gray-300 p-4 text-gray-600 transition-colors hover:border-primary hover:text-primary">
                  <Plus className="h-5 w-5" />
                  Add New Address
                </button>
              </div>
            </div>

            {/* Payment Method */}
            <div className="rounded-2xl bg-white p-6 shadow-sm">
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-white">
                  <CreditCard className="h-5 w-5" />
                </div>
                <h2 className="text-lg font-semibold text-gray-900">Payment Method</h2>
              </div>

              <div className="space-y-3">
                <label className="flex cursor-pointer items-center gap-3 rounded-xl border-2 border-transparent bg-gray-50 p-4 transition-colors has-[:checked]:border-primary has-[:checked]:bg-primary/5">
                  <input
                    type="radio"
                    name="payment"
                    checked={paymentMethod === 'CASH_ON_DELIVERY'}
                    onChange={() => setPaymentMethod('CASH_ON_DELIVERY')}
                  />
                  <div className="flex-1">
                    <span className="font-medium">Cash on Delivery</span>
                    <p className="text-sm text-gray-500">Pay when your order arrives</p>
                  </div>
                  <span className="text-2xl">💵</span>
                </label>

                <label className="flex cursor-pointer items-center gap-3 rounded-xl border-2 border-transparent bg-gray-50 p-4 transition-colors has-[:checked]:border-primary has-[:checked]:bg-primary/5">
                  <input
                    type="radio"
                    name="payment"
                    checked={paymentMethod === 'RAZORPAY'}
                    onChange={() => setPaymentMethod('RAZORPAY')}
                  />
                  <div className="flex-1">
                    <span className="font-medium">Razorpay</span>
                    <p className="text-sm text-gray-500">UPI, Cards, Net Banking</p>
                  </div>
                  <span className="text-2xl">💳</span>
                </label>

                <label className="flex cursor-pointer items-center gap-3 rounded-xl border-2 border-transparent bg-gray-50 p-4 transition-colors has-[:checked]:border-primary has-[:checked]:bg-primary/5">
                  <input
                    type="radio"
                    name="payment"
                    checked={paymentMethod === 'STRIPE'}
                    onChange={() => setPaymentMethod('STRIPE')}
                  />
                  <div className="flex-1">
                    <span className="font-medium">Stripe</span>
                    <p className="text-sm text-gray-500">Credit/Debit Cards</p>
                  </div>
                  <span className="text-2xl">💳</span>
                </label>
              </div>
            </div>

            {/* Delivery Info */}
            <div className="rounded-2xl bg-gradient-to-r from-green-50 to-emerald-50 p-6">
              <div className="flex items-center gap-3">
                <Truck className="h-6 w-6 text-green-600" />
                <div>
                  <p className="font-medium text-gray-900">Express Delivery</p>
                  <p className="text-sm text-gray-600">Estimated delivery in 10-15 minutes</p>
                </div>
              </div>
            </div>
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-1">
            <div className="sticky top-24 rounded-2xl bg-white p-6 shadow-sm">
              <h2 className="mb-4 text-lg font-semibold text-gray-900">Order Summary</h2>

              <div className="mb-4 max-h-64 space-y-3 overflow-y-auto">
                {items.map((item) => (
                  <div key={item.productId} className="flex gap-3">
                    <div className="relative h-16 w-16 flex-shrink-0 overflow-hidden rounded-lg bg-gray-100">
                      {item.product.images?.[0]?.url ? (
                        <Image
                          src={item.product.images[0].url}
                          alt={item.product.name}
                          fill
                          className="object-cover"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center text-xl">📦</div>
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="line-clamp-1 text-sm font-medium">{item.product.name}</p>
                      <p className="text-xs text-gray-500">Qty: {item.quantity}</p>
                      <p className="text-sm font-medium">₹{item.itemTotal}</p>
                    </div>
                  </div>
                ))}
              </div>

              <hr className="my-4" />

              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Subtotal</span>
                  <span>₹{subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Delivery</span>
                  <span className="text-green-600">{deliveryFee === 0 ? 'Free' : `₹${deliveryFee}`}</span>
                </div>
                <hr className="my-2" />
                <div className="flex justify-between text-lg font-bold">
                  <span>Total</span>
                  <span>₹{total.toFixed(2)}</span>
                </div>
              </div>

              <Button
                size="lg"
                className="mt-6 w-full gap-2"
                onClick={handlePlaceOrder}
                disabled={!selectedAddress || isLoading}
              >
                {isLoading ? 'Placing Order...' : 'Place Order'}
                <ChevronRight className="h-4 w-4" />
              </Button>

              <p className="mt-4 text-center text-xs text-gray-500">
                By placing this order, you agree to our Terms of Service and Privacy Policy
              </p>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
