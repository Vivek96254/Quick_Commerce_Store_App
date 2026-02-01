'use client';

import { useState, useEffect } from 'react';
import { Save, Store, Truck, CreditCard, Bell, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/lib/store';
import { adminApi } from '@/lib/api';

export default function AdminSettingsPage() {
  const { accessToken } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('store');
  const [config, setConfig] = useState({
    name: 'QuickMart',
    description: '',
    phone: '',
    email: '',
    address: '',
    city: '',
    state: '',
    postalCode: '',
    currency: 'INR',
    currencySymbol: '₹',
    deliveryRadius: 5,
    minOrderAmount: 99,
    deliveryFee: 30,
    freeDeliveryAbove: 199,
    taxRate: 5,
    taxInclusive: true,
    isOpen: true,
  });

  useEffect(() => {
    if (accessToken) {
      adminApi
        .getStoreConfig(accessToken)
        .then((data) => {
          if (data) setConfig({ ...config, ...data });
        })
        .catch(console.error)
        .finally(() => setLoading(false));
    }
  }, [accessToken]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await adminApi.updateStoreConfig(accessToken!, config);
      alert('Settings saved successfully!');
    } catch (error) {
      console.error('Failed to save settings:', error);
      alert('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const tabs = [
    { id: 'store', label: 'Store Info', icon: Store },
    { id: 'delivery', label: 'Delivery', icon: Truck },
    { id: 'payments', label: 'Payments', icon: CreditCard },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'security', label: 'Security', icon: Shield },
  ];

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
          <p className="text-gray-600">Manage your store configuration</p>
        </div>
        <Button onClick={handleSave} disabled={saving} className="gap-2">
          <Save className="h-4 w-4" />
          {saving ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>

      <div className="flex gap-6">
        {/* Tabs */}
        <div className="w-48 space-y-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? 'bg-primary text-white'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <tab.icon className="h-4 w-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 rounded-xl bg-white p-6 shadow-sm">
          {activeTab === 'store' && (
            <div className="space-y-6">
              <h2 className="text-lg font-semibold text-gray-900">Store Information</h2>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">
                    Store Name
                  </label>
                  <input
                    type="text"
                    value={config.name}
                    onChange={(e) => setConfig({ ...config, name: e.target.value })}
                    className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-primary focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">
                    Phone
                  </label>
                  <input
                    type="tel"
                    value={config.phone}
                    onChange={(e) => setConfig({ ...config, phone: e.target.value })}
                    className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-primary focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">
                    Email
                  </label>
                  <input
                    type="email"
                    value={config.email}
                    onChange={(e) => setConfig({ ...config, email: e.target.value })}
                    className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-primary focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">
                    City
                  </label>
                  <input
                    type="text"
                    value={config.city}
                    onChange={(e) => setConfig({ ...config, city: e.target.value })}
                    className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-primary focus:outline-none"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="mb-2 block text-sm font-medium text-gray-700">
                    Address
                  </label>
                  <textarea
                    value={config.address}
                    onChange={(e) => setConfig({ ...config, address: e.target.value })}
                    rows={2}
                    className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-primary focus:outline-none"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="mb-2 block text-sm font-medium text-gray-700">
                    Description
                  </label>
                  <textarea
                    value={config.description}
                    onChange={(e) => setConfig({ ...config, description: e.target.value })}
                    rows={3}
                    className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-primary focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center gap-3 rounded-lg border p-4">
                <label className="flex cursor-pointer items-center gap-3">
                  <input
                    type="checkbox"
                    checked={config.isOpen}
                    onChange={(e) => setConfig({ ...config, isOpen: e.target.checked })}
                    className="h-5 w-5 rounded"
                  />
                  <div>
                    <p className="font-medium text-gray-900">Store is Open</p>
                    <p className="text-sm text-gray-500">
                      Toggle to open or close your store for orders
                    </p>
                  </div>
                </label>
              </div>
            </div>
          )}

          {activeTab === 'delivery' && (
            <div className="space-y-6">
              <h2 className="text-lg font-semibold text-gray-900">Delivery Settings</h2>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">
                    Delivery Radius (km)
                  </label>
                  <input
                    type="number"
                    value={config.deliveryRadius}
                    onChange={(e) => setConfig({ ...config, deliveryRadius: parseFloat(e.target.value) })}
                    className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-primary focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">
                    Minimum Order Amount (₹)
                  </label>
                  <input
                    type="number"
                    value={config.minOrderAmount}
                    onChange={(e) => setConfig({ ...config, minOrderAmount: parseFloat(e.target.value) })}
                    className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-primary focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">
                    Delivery Fee (₹)
                  </label>
                  <input
                    type="number"
                    value={config.deliveryFee}
                    onChange={(e) => setConfig({ ...config, deliveryFee: parseFloat(e.target.value) })}
                    className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-primary focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">
                    Free Delivery Above (₹)
                  </label>
                  <input
                    type="number"
                    value={config.freeDeliveryAbove}
                    onChange={(e) => setConfig({ ...config, freeDeliveryAbove: parseFloat(e.target.value) })}
                    className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-primary focus:outline-none"
                  />
                </div>
              </div>
            </div>
          )}

          {activeTab === 'payments' && (
            <div className="space-y-6">
              <h2 className="text-lg font-semibold text-gray-900">Payment Settings</h2>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">
                    Tax Rate (%)
                  </label>
                  <input
                    type="number"
                    value={config.taxRate}
                    onChange={(e) => setConfig({ ...config, taxRate: parseFloat(e.target.value) })}
                    className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-primary focus:outline-none"
                  />
                </div>
                <div className="flex items-center gap-3 rounded-lg border p-4">
                  <label className="flex cursor-pointer items-center gap-3">
                    <input
                      type="checkbox"
                      checked={config.taxInclusive}
                      onChange={(e) => setConfig({ ...config, taxInclusive: e.target.checked })}
                      className="h-5 w-5 rounded"
                    />
                    <div>
                      <p className="font-medium text-gray-900">Tax Inclusive Pricing</p>
                      <p className="text-sm text-gray-500">Prices already include tax</p>
                    </div>
                  </label>
                </div>
              </div>
              <div className="rounded-lg bg-gray-50 p-4">
                <h3 className="font-medium text-gray-900">Payment Gateways</h3>
                <p className="text-sm text-gray-500">
                  Configure Stripe and Razorpay keys in environment variables
                </p>
              </div>
            </div>
          )}

          {activeTab === 'notifications' && (
            <div className="space-y-6">
              <h2 className="text-lg font-semibold text-gray-900">Notification Settings</h2>
              <div className="space-y-4">
                <label className="flex items-center gap-3 rounded-lg border p-4">
                  <input type="checkbox" defaultChecked className="h-5 w-5 rounded" />
                  <div>
                    <p className="font-medium text-gray-900">New Order Notifications</p>
                    <p className="text-sm text-gray-500">Receive alerts for new orders</p>
                  </div>
                </label>
                <label className="flex items-center gap-3 rounded-lg border p-4">
                  <input type="checkbox" defaultChecked className="h-5 w-5 rounded" />
                  <div>
                    <p className="font-medium text-gray-900">Low Stock Alerts</p>
                    <p className="text-sm text-gray-500">Get notified when products are low on stock</p>
                  </div>
                </label>
                <label className="flex items-center gap-3 rounded-lg border p-4">
                  <input type="checkbox" className="h-5 w-5 rounded" />
                  <div>
                    <p className="font-medium text-gray-900">Daily Reports</p>
                    <p className="text-sm text-gray-500">Receive daily sales summary via email</p>
                  </div>
                </label>
              </div>
            </div>
          )}

          {activeTab === 'security' && (
            <div className="space-y-6">
              <h2 className="text-lg font-semibold text-gray-900">Security Settings</h2>
              <div className="space-y-4">
                <div className="rounded-lg border p-4">
                  <h3 className="font-medium text-gray-900">Two-Factor Authentication</h3>
                  <p className="text-sm text-gray-500 mb-3">
                    Add an extra layer of security to admin accounts
                  </p>
                  <Button variant="outline" size="sm">Enable 2FA</Button>
                </div>
                <div className="rounded-lg border p-4">
                  <h3 className="font-medium text-gray-900">Session Management</h3>
                  <p className="text-sm text-gray-500 mb-3">
                    View and manage active sessions
                  </p>
                  <Button variant="outline" size="sm">View Sessions</Button>
                </div>
                <div className="rounded-lg border p-4">
                  <h3 className="font-medium text-gray-900">API Keys</h3>
                  <p className="text-sm text-gray-500 mb-3">
                    Manage API keys for integrations
                  </p>
                  <Button variant="outline" size="sm">Manage Keys</Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
