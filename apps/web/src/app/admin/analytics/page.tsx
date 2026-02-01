'use client';

import { useState, useEffect } from 'react';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  ShoppingCart,
  Users,
  Package,
  Calendar,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/lib/store';
import { adminApi } from '@/lib/api';

export default function AdminAnalyticsPage() {
  const { accessToken } = useAuthStore();
  const [period, setPeriod] = useState<'7d' | '30d' | '90d'>('30d');
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (accessToken) {
      const endDate = new Date().toISOString().split('T')[0];
      const startDate = new Date(
        Date.now() - (period === '7d' ? 7 : period === '30d' ? 30 : 90) * 24 * 60 * 60 * 1000
      ).toISOString().split('T')[0];

      adminApi
        .getSalesReport(accessToken, startDate, endDate)
        .then(setStats)
        .catch(console.error)
        .finally(() => setLoading(false));
    }
  }, [accessToken, period]);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
          <p className="text-gray-600">Track your store performance</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant={period === '7d' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setPeriod('7d')}
          >
            7 Days
          </Button>
          <Button
            variant={period === '30d' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setPeriod('30d')}
          >
            30 Days
          </Button>
          <Button
            variant={period === '90d' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setPeriod('90d')}
          >
            90 Days
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-green-100 text-green-600">
              <DollarSign className="h-6 w-6" />
            </div>
            <span className="flex items-center gap-1 text-sm font-medium text-green-600">
              <TrendingUp className="h-4 w-4" /> +15%
            </span>
          </div>
          <p className="mt-4 text-2xl font-bold text-gray-900">
            ₹{stats?.totalRevenue?.toLocaleString() || '0'}
          </p>
          <p className="text-sm text-gray-600">Total Revenue</p>
        </div>

        <div className="rounded-xl bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-100 text-blue-600">
              <ShoppingCart className="h-6 w-6" />
            </div>
            <span className="flex items-center gap-1 text-sm font-medium text-green-600">
              <TrendingUp className="h-4 w-4" /> +8%
            </span>
          </div>
          <p className="mt-4 text-2xl font-bold text-gray-900">{stats?.totalOrders || 0}</p>
          <p className="text-sm text-gray-600">Total Orders</p>
        </div>

        <div className="rounded-xl bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-purple-100 text-purple-600">
              <Users className="h-6 w-6" />
            </div>
            <span className="flex items-center gap-1 text-sm font-medium text-green-600">
              <TrendingUp className="h-4 w-4" /> +12%
            </span>
          </div>
          <p className="mt-4 text-2xl font-bold text-gray-900">{stats?.newCustomers || 0}</p>
          <p className="text-sm text-gray-600">New Customers</p>
        </div>

        <div className="rounded-xl bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-orange-100 text-orange-600">
              <Package className="h-6 w-6" />
            </div>
            <span className="flex items-center gap-1 text-sm font-medium text-red-600">
              <TrendingDown className="h-4 w-4" /> -3%
            </span>
          </div>
          <p className="mt-4 text-2xl font-bold text-gray-900">
            ₹{stats?.avgOrderValue?.toFixed(0) || '0'}
          </p>
          <p className="text-sm text-gray-600">Avg Order Value</p>
        </div>
      </div>

      {/* Charts Placeholder */}
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl bg-white p-6 shadow-sm">
          <h3 className="mb-4 font-semibold text-gray-900">Revenue Over Time</h3>
          <div className="flex h-64 items-center justify-center rounded-lg bg-gray-50">
            <div className="text-center text-gray-500">
              <Calendar className="mx-auto mb-2 h-8 w-8" />
              <p>Revenue chart will appear here</p>
              <p className="text-sm">Integrate with Recharts for visualization</p>
            </div>
          </div>
        </div>

        <div className="rounded-xl bg-white p-6 shadow-sm">
          <h3 className="mb-4 font-semibold text-gray-900">Orders by Status</h3>
          <div className="flex h-64 items-center justify-center rounded-lg bg-gray-50">
            <div className="text-center text-gray-500">
              <ShoppingCart className="mx-auto mb-2 h-8 w-8" />
              <p>Order status chart will appear here</p>
              <p className="text-sm">Integrate with Recharts for visualization</p>
            </div>
          </div>
        </div>
      </div>

      {/* Top Products */}
      <div className="rounded-xl bg-white p-6 shadow-sm">
        <h3 className="mb-4 font-semibold text-gray-900">Top Selling Products</h3>
        {stats?.topProducts?.length > 0 ? (
          <div className="space-y-3">
            {stats.topProducts.map((product: any, index: number) => (
              <div
                key={product.id}
                className="flex items-center justify-between rounded-lg border p-3"
              >
                <div className="flex items-center gap-3">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 text-sm font-medium">
                    {index + 1}
                  </span>
                  <div>
                    <p className="font-medium text-gray-900">{product.name}</p>
                    <p className="text-sm text-gray-500">{product.totalSold} sold</p>
                  </div>
                </div>
                <p className="font-medium text-gray-900">₹{product.revenue?.toLocaleString()}</p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-center text-gray-500 py-8">No sales data available</p>
        )}
      </div>
    </div>
  );
}
