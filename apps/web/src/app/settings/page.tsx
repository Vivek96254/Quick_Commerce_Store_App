'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  User,
  Bell,
  Shield,
  Palette,
  Globe,
  Moon,
  Sun,
  Smartphone,
  Mail,
  ArrowLeft,
  CheckCircle,
  AlertCircle,
  ChevronRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/lib/store';
import { Navbar } from '@/components/layout/navbar';
import { Footer } from '@/components/layout/footer';

export default function SettingsPage() {
  const router = useRouter();
  const { user, accessToken } = useAuthStore();
  const [activeTab, setActiveTab] = useState('notifications');
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [theme, setTheme] = useState('light');

  const [notifications, setNotifications] = useState({
    orderUpdates: true,
    promotions: true,
    newProducts: false,
    deliveryAlerts: true,
    emailNotifications: true,
    smsNotifications: true,
    pushNotifications: false,
  });

  const [privacy, setPrivacy] = useState({
    shareDataWithPartners: false,
    personalized: true,
    analytics: true,
  });

  useEffect(() => {
    if (!user || !accessToken) {
      router.push('/login');
    }
  }, [user, accessToken]);

  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3000);
  };

  const handleSave = () => {
    // In a real app, this would save to the API
    showToast('success', 'Settings saved successfully!');
  };

  if (!user) {
    return null;
  }

  const tabs = [
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'appearance', label: 'Appearance', icon: Palette },
    { id: 'privacy', label: 'Privacy', icon: Shield },
    { id: 'language', label: 'Language', icon: Globe },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <main className="container mx-auto px-4 py-8">
        {/* Toast */}
        {toast && (
          <div
            className={`fixed right-4 top-4 z-50 flex items-center gap-3 rounded-lg px-4 py-3 shadow-lg ${
              toast.type === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'
            }`}
          >
            {toast.type === 'success' ? (
              <CheckCircle className="h-5 w-5" />
            ) : (
              <AlertCircle className="h-5 w-5" />
            )}
            <span>{toast.message}</span>
          </div>
        )}

        {/* Header */}
        <div className="mb-8 flex items-center gap-4">
          <Link href="/profile">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
            <p className="text-gray-600">Manage your app preferences</p>
          </div>
        </div>

        <div className="flex flex-col gap-6 lg:flex-row">
          {/* Sidebar Tabs */}
          <div className="lg:w-64">
            <div className="rounded-xl bg-white p-2 shadow-sm">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex w-full items-center gap-3 rounded-lg px-4 py-3 text-left text-sm font-medium transition-colors ${
                    activeTab === tab.id
                      ? 'bg-primary text-white'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <tab.icon className="h-5 w-5" />
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Content */}
          <div className="flex-1">
            <div className="rounded-xl bg-white p-6 shadow-sm">
              {/* Notifications */}
              {activeTab === 'notifications' && (
                <div className="space-y-6">
                  <h2 className="text-lg font-semibold text-gray-900">Notification Preferences</h2>
                  
                  <div className="space-y-4">
                    <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider">
                      Order & Delivery
                    </h3>
                    <label className="flex items-center justify-between rounded-lg border p-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 text-blue-600">
                          <Bell className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">Order Updates</p>
                          <p className="text-sm text-gray-500">Get notified about your order status</p>
                        </div>
                      </div>
                      <input
                        type="checkbox"
                        checked={notifications.orderUpdates}
                        onChange={(e) => setNotifications({ ...notifications, orderUpdates: e.target.checked })}
                        className="h-5 w-5 rounded"
                      />
                    </label>
                    <label className="flex items-center justify-between rounded-lg border p-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100 text-green-600">
                          <Smartphone className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">Delivery Alerts</p>
                          <p className="text-sm text-gray-500">Real-time delivery tracking updates</p>
                        </div>
                      </div>
                      <input
                        type="checkbox"
                        checked={notifications.deliveryAlerts}
                        onChange={(e) => setNotifications({ ...notifications, deliveryAlerts: e.target.checked })}
                        className="h-5 w-5 rounded"
                      />
                    </label>
                  </div>

                  <div className="space-y-4">
                    <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider">
                      Marketing
                    </h3>
                    <label className="flex items-center justify-between rounded-lg border p-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-100 text-purple-600">
                          <Mail className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">Promotions & Offers</p>
                          <p className="text-sm text-gray-500">Exclusive deals and discounts</p>
                        </div>
                      </div>
                      <input
                        type="checkbox"
                        checked={notifications.promotions}
                        onChange={(e) => setNotifications({ ...notifications, promotions: e.target.checked })}
                        className="h-5 w-5 rounded"
                      />
                    </label>
                    <label className="flex items-center justify-between rounded-lg border p-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-100 text-orange-600">
                          <Bell className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">New Products</p>
                          <p className="text-sm text-gray-500">Be the first to know about new arrivals</p>
                        </div>
                      </div>
                      <input
                        type="checkbox"
                        checked={notifications.newProducts}
                        onChange={(e) => setNotifications({ ...notifications, newProducts: e.target.checked })}
                        className="h-5 w-5 rounded"
                      />
                    </label>
                  </div>

                  <div className="space-y-4">
                    <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider">
                      Channels
                    </h3>
                    <div className="grid gap-4 sm:grid-cols-3">
                      <label className="flex flex-col items-center gap-2 rounded-lg border p-4 cursor-pointer">
                        <Mail className="h-6 w-6 text-gray-400" />
                        <span className="text-sm font-medium">Email</span>
                        <input
                          type="checkbox"
                          checked={notifications.emailNotifications}
                          onChange={(e) => setNotifications({ ...notifications, emailNotifications: e.target.checked })}
                          className="h-5 w-5 rounded"
                        />
                      </label>
                      <label className="flex flex-col items-center gap-2 rounded-lg border p-4 cursor-pointer">
                        <Smartphone className="h-6 w-6 text-gray-400" />
                        <span className="text-sm font-medium">SMS</span>
                        <input
                          type="checkbox"
                          checked={notifications.smsNotifications}
                          onChange={(e) => setNotifications({ ...notifications, smsNotifications: e.target.checked })}
                          className="h-5 w-5 rounded"
                        />
                      </label>
                      <label className="flex flex-col items-center gap-2 rounded-lg border p-4 cursor-pointer">
                        <Bell className="h-6 w-6 text-gray-400" />
                        <span className="text-sm font-medium">Push</span>
                        <input
                          type="checkbox"
                          checked={notifications.pushNotifications}
                          onChange={(e) => setNotifications({ ...notifications, pushNotifications: e.target.checked })}
                          className="h-5 w-5 rounded"
                        />
                      </label>
                    </div>
                  </div>
                </div>
              )}

              {/* Appearance */}
              {activeTab === 'appearance' && (
                <div className="space-y-6">
                  <h2 className="text-lg font-semibold text-gray-900">Appearance</h2>
                  
                  <div className="space-y-4">
                    <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider">
                      Theme
                    </h3>
                    <div className="grid gap-4 sm:grid-cols-3">
                      <button
                        onClick={() => setTheme('light')}
                        className={`flex flex-col items-center gap-3 rounded-xl border-2 p-6 transition-all ${
                          theme === 'light' ? 'border-primary bg-primary/5' : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <Sun className="h-8 w-8 text-yellow-500" />
                        <span className="font-medium">Light</span>
                      </button>
                      <button
                        onClick={() => setTheme('dark')}
                        className={`flex flex-col items-center gap-3 rounded-xl border-2 p-6 transition-all ${
                          theme === 'dark' ? 'border-primary bg-primary/5' : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <Moon className="h-8 w-8 text-gray-600" />
                        <span className="font-medium">Dark</span>
                      </button>
                      <button
                        onClick={() => setTheme('system')}
                        className={`flex flex-col items-center gap-3 rounded-xl border-2 p-6 transition-all ${
                          theme === 'system' ? 'border-primary bg-primary/5' : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <Smartphone className="h-8 w-8 text-gray-400" />
                        <span className="font-medium">System</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Privacy */}
              {activeTab === 'privacy' && (
                <div className="space-y-6">
                  <h2 className="text-lg font-semibold text-gray-900">Privacy Settings</h2>
                  
                  <div className="space-y-4">
                    <label className="flex items-center justify-between rounded-lg border p-4">
                      <div>
                        <p className="font-medium text-gray-900">Personalized Experience</p>
                        <p className="text-sm text-gray-500">
                          Allow us to personalize your shopping experience
                        </p>
                      </div>
                      <input
                        type="checkbox"
                        checked={privacy.personalized}
                        onChange={(e) => setPrivacy({ ...privacy, personalized: e.target.checked })}
                        className="h-5 w-5 rounded"
                      />
                    </label>
                    <label className="flex items-center justify-between rounded-lg border p-4">
                      <div>
                        <p className="font-medium text-gray-900">Usage Analytics</p>
                        <p className="text-sm text-gray-500">
                          Help us improve by sharing anonymous usage data
                        </p>
                      </div>
                      <input
                        type="checkbox"
                        checked={privacy.analytics}
                        onChange={(e) => setPrivacy({ ...privacy, analytics: e.target.checked })}
                        className="h-5 w-5 rounded"
                      />
                    </label>
                    <label className="flex items-center justify-between rounded-lg border p-4">
                      <div>
                        <p className="font-medium text-gray-900">Share with Partners</p>
                        <p className="text-sm text-gray-500">
                          Share data with our trusted partners for offers
                        </p>
                      </div>
                      <input
                        type="checkbox"
                        checked={privacy.shareDataWithPartners}
                        onChange={(e) => setPrivacy({ ...privacy, shareDataWithPartners: e.target.checked })}
                        className="h-5 w-5 rounded"
                      />
                    </label>
                  </div>

                  <div className="rounded-lg bg-gray-50 p-4">
                    <p className="text-sm text-gray-600">
                      For more information about how we handle your data, please read our{' '}
                      <Link href="/privacy" className="text-primary hover:underline">
                        Privacy Policy
                      </Link>
                      .
                    </p>
                  </div>
                </div>
              )}

              {/* Language */}
              {activeTab === 'language' && (
                <div className="space-y-6">
                  <h2 className="text-lg font-semibold text-gray-900">Language & Region</h2>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="mb-2 block text-sm font-medium text-gray-700">
                        Language
                      </label>
                      <select className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-primary focus:outline-none">
                        <option value="en">English</option>
                        <option value="hi">हिंदी (Hindi)</option>
                        <option value="ta">தமிழ் (Tamil)</option>
                        <option value="te">తెలుగు (Telugu)</option>
                        <option value="bn">বাংলা (Bengali)</option>
                        <option value="mr">मराठी (Marathi)</option>
                      </select>
                    </div>
                    <div>
                      <label className="mb-2 block text-sm font-medium text-gray-700">
                        Currency
                      </label>
                      <select className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-primary focus:outline-none">
                        <option value="INR">₹ Indian Rupee (INR)</option>
                        <option value="USD">$ US Dollar (USD)</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {/* Save Button */}
              <div className="mt-8 flex justify-end">
                <Button onClick={handleSave}>Save Changes</Button>
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
