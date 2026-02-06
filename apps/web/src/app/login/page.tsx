'use client';

import { useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { ShoppingBag, Mail, Lock, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/lib/store';
import { authApi } from '@/lib/api';
import { toast } from '@/components/ui/use-toast';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get('redirect') || '/';
  const { setAuth } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({ email: '', password: '' });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await authApi.login({
        email: formData.email,
        password: formData.password,
      });
      setAuth(response.user, response.tokens.accessToken, response.tokens.refreshToken);
      toast({ title: 'Welcome back!', description: `Logged in as ${response.user.firstName}` });
      if (['ADMIN', 'SUPER_ADMIN'].includes(response.user.role)) {
        router.push('/admin');
      } else {
        router.push(redirect);
      }
    } catch (error: any) {
      toast({ title: 'Login failed', description: error.message || 'Invalid credentials', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen">
      {/* Left: Form */}
      <div className="flex flex-1 flex-col justify-center px-6 py-12 lg:px-20">
        <div className="mx-auto w-full max-w-sm">
          <Link href="/" className="mb-8 flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-swiggy-orange">
              <ShoppingBag className="h-5 w-5 text-white" />
            </div>
            <span className="text-lg font-extrabold text-swiggy-gray-800">QuickMart</span>
          </Link>

          <h2 className="text-2xl font-extrabold text-swiggy-gray-800">Welcome back</h2>
          <p className="mt-1 text-sm text-swiggy-gray-400">
            Don&apos;t have an account?{' '}
            <Link href="/register" className="font-semibold text-swiggy-orange hover:underline">
              Sign up
            </Link>
          </p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-swiggy-gray-700">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-swiggy-gray-400" />
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full rounded-lg border border-gray-200 bg-swiggy-gray-50 py-2.5 pl-10 pr-3 text-sm text-swiggy-gray-800 focus:border-swiggy-orange focus:bg-white focus:outline-none focus:ring-1 focus:ring-swiggy-orange/30"
                  placeholder="you@example.com"
                />
              </div>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-swiggy-gray-700">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-swiggy-gray-400" />
                <input
                  type="password"
                  required
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full rounded-lg border border-gray-200 bg-swiggy-gray-50 py-2.5 pl-10 pr-3 text-sm text-swiggy-gray-800 focus:border-swiggy-orange focus:bg-white focus:outline-none focus:ring-1 focus:ring-swiggy-orange/30"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <div className="flex items-center justify-between text-sm">
              <label className="flex items-center gap-2 text-swiggy-gray-500">
                <input type="checkbox" className="accent-[#FC8019]" /> Remember me
              </label>
              <Link href="/forgot-password" className="font-medium text-swiggy-orange hover:underline">
                Forgot?
              </Link>
            </div>

            <Button
              type="submit"
              className="w-full gap-2 bg-swiggy-orange text-white hover:bg-swiggy-orange-dark"
              size="lg"
              disabled={loading}
            >
              {loading ? 'Signing in...' : (
                <>Sign in <ArrowRight className="h-4 w-4" /></>
              )}
            </Button>
          </form>

          {/* Demo creds */}
          <div className="mt-6 rounded-lg bg-swiggy-gray-50 p-3">
            <p className="mb-1 text-xs font-bold text-swiggy-gray-600">Demo Accounts</p>
            <div className="space-y-0.5 text-[11px] text-swiggy-gray-400">
              <p><strong>Admin:</strong> admin@quickmart.local / Admin@123</p>
              <p><strong>Customer:</strong> john@example.com / Customer@123</p>
            </div>
          </div>
        </div>
      </div>

      {/* Right: Branding */}
      <div className="relative hidden w-0 flex-1 lg:block">
        <div className="absolute inset-0 bg-gradient-to-br from-[#FC8019] to-[#e06e0a]">
          <div className="flex h-full flex-col items-center justify-center p-12 text-white">
            <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-sm">
              <ShoppingBag className="h-8 w-8 text-white" />
            </div>
            <h1 className="mb-3 text-3xl font-extrabold">QuickMart</h1>
            <p className="max-w-xs text-center text-base text-orange-100">
              Groceries &amp; essentials delivered in 10–15 minutes
            </p>
            <div className="mt-8 grid grid-cols-3 gap-3">
              {['🍎', '🥛', '🍞', '🥬', '🧀', '🥚'].map((emoji, i) => (
                <div key={i} className="flex h-16 w-16 items-center justify-center rounded-xl bg-white/15 text-3xl backdrop-blur-sm">
                  {emoji}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="mb-4 h-8 w-8 animate-spin rounded-full border-4 border-swiggy-orange border-t-transparent mx-auto" />
          <p className="text-sm text-gray-500">Loading...</p>
        </div>
      </div>
    }>
      <LoginForm />
    </Suspense>
  );
}
