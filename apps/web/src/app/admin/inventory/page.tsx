'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { AlertTriangle, Package, ArrowUp, ArrowDown, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/lib/store';
import { productsApi } from '@/lib/api';

export default function AdminInventoryPage() {
  const { accessToken } = useAuthStore();
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'low' | 'out'>('all');
  const [search, setSearch] = useState('');
  const [adjustingProduct, setAdjustingProduct] = useState<any>(null);
  const [adjustmentValue, setAdjustmentValue] = useState(0);
  const [adjustmentAction, setAdjustmentAction] = useState<'STOCK_IN' | 'STOCK_OUT' | 'ADJUSTMENT'>('STOCK_IN');

  useEffect(() => {
    productsApi
      .list({ limit: 100 })
      .then((data) => setProducts(data.items || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const filteredProducts = products.filter((product) => {
    if (search && !product.name.toLowerCase().includes(search.toLowerCase())) return false;
    if (filter === 'low') return product.stockQuantity <= product.lowStockThreshold && product.stockQuantity > 0;
    if (filter === 'out') return product.stockQuantity === 0;
    return true;
  });

  const handleStockUpdate = async () => {
    if (!adjustingProduct || adjustmentValue <= 0) return;
    try {
      await productsApi.updateStock(accessToken!, adjustingProduct.id, {
        quantity: adjustmentValue,
        action: adjustmentAction,
      });
      
      let newStock = adjustingProduct.stockQuantity;
      if (adjustmentAction === 'STOCK_IN') newStock += adjustmentValue;
      else if (adjustmentAction === 'STOCK_OUT') newStock -= adjustmentValue;
      else newStock = adjustmentValue;

      setProducts((prev) =>
        prev.map((p) =>
          p.id === adjustingProduct.id ? { ...p, stockQuantity: Math.max(0, newStock) } : p
        )
      );
      setAdjustingProduct(null);
      setAdjustmentValue(0);
    } catch (error) {
      console.error('Failed to update stock:', error);
    }
  };

  const lowStockCount = products.filter(
    (p) => p.stockQuantity <= p.lowStockThreshold && p.stockQuantity > 0
  ).length;
  const outOfStockCount = products.filter((p) => p.stockQuantity === 0).length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Inventory</h1>
        <p className="text-gray-600">Manage stock levels and track inventory</p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl bg-white p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-100 text-blue-600">
              <Package className="h-6 w-6" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{products.length}</p>
              <p className="text-sm text-gray-600">Total Products</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl bg-white p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-yellow-100 text-yellow-600">
              <AlertTriangle className="h-6 w-6" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{lowStockCount}</p>
              <p className="text-sm text-gray-600">Low Stock</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl bg-white p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-red-100 text-red-600">
              <Package className="h-6 w-6" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{outOfStockCount}</p>
              <p className="text-sm text-gray-600">Out of Stock</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search products..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-gray-300 py-2 pl-10 pr-4 focus:border-primary focus:outline-none"
          />
        </div>
        <div className="flex gap-2">
          <Button variant={filter === 'all' ? 'default' : 'outline'} size="sm" onClick={() => setFilter('all')}>
            All
          </Button>
          <Button variant={filter === 'low' ? 'default' : 'outline'} size="sm" onClick={() => setFilter('low')}>
            Low Stock ({lowStockCount})
          </Button>
          <Button variant={filter === 'out' ? 'default' : 'outline'} size="sm" onClick={() => setFilter('out')}>
            Out of Stock ({outOfStockCount})
          </Button>
        </div>
      </div>

      {/* Stock Adjustment Modal */}
      {adjustingProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-2xl bg-white p-6">
            <h2 className="mb-4 text-lg font-semibold">Adjust Stock: {adjustingProduct.name}</h2>
            <p className="mb-4 text-sm text-gray-600">Current stock: {adjustingProduct.stockQuantity}</p>
            <div className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">Action</label>
                <select
                  value={adjustmentAction}
                  onChange={(e) => setAdjustmentAction(e.target.value as any)}
                  className="w-full rounded-lg border border-gray-300 px-4 py-2"
                >
                  <option value="STOCK_IN">Stock In (+)</option>
                  <option value="STOCK_OUT">Stock Out (-)</option>
                  <option value="ADJUSTMENT">Set Exact Value</option>
                </select>
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">Quantity</label>
                <input
                  type="number"
                  min="0"
                  value={adjustmentValue}
                  onChange={(e) => setAdjustmentValue(parseInt(e.target.value) || 0)}
                  className="w-full rounded-lg border border-gray-300 px-4 py-2"
                />
              </div>
              <div className="flex gap-3">
                <Button onClick={handleStockUpdate} className="flex-1">
                  Update Stock
                </Button>
                <Button variant="outline" onClick={() => setAdjustingProduct(null)}>
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Products Table */}
      <div className="rounded-xl bg-white shadow-sm overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Product
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                SKU
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Stock
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Threshold
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Status
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {loading ? (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center">
                  <div className="flex justify-center">
                    <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                  </div>
                </td>
              </tr>
            ) : filteredProducts.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                  No products found
                </td>
              </tr>
            ) : (
              filteredProducts.map((product) => (
                <tr key={product.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="relative h-10 w-10 overflow-hidden rounded-lg bg-gray-100">
                        {product.images?.[0]?.url ? (
                          <Image src={product.images[0].url} alt={product.name} fill className="object-cover" />
                        ) : (
                          <div className="flex h-full items-center justify-center">📦</div>
                        )}
                      </div>
                      <span className="font-medium text-gray-900">{product.name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">{product.sku}</td>
                  <td className="px-6 py-4">
                    <span
                      className={`font-bold ${
                        product.stockQuantity === 0
                          ? 'text-red-600'
                          : product.stockQuantity <= product.lowStockThreshold
                          ? 'text-yellow-600'
                          : 'text-gray-900'
                      }`}
                    >
                      {product.stockQuantity}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">{product.lowStockThreshold}</td>
                  <td className="px-6 py-4">
                    {product.stockQuantity === 0 ? (
                      <span className="rounded-full bg-red-100 px-2 py-1 text-xs font-medium text-red-700">
                        Out of Stock
                      </span>
                    ) : product.stockQuantity <= product.lowStockThreshold ? (
                      <span className="rounded-full bg-yellow-100 px-2 py-1 text-xs font-medium text-yellow-700">
                        Low Stock
                      </span>
                    ) : (
                      <span className="rounded-full bg-green-100 px-2 py-1 text-xs font-medium text-green-700">
                        In Stock
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <Button size="sm" variant="outline" onClick={() => setAdjustingProduct(product)}>
                      Adjust Stock
                    </Button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
