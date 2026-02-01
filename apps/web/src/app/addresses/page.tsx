'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  MapPin,
  Plus,
  Edit,
  Trash2,
  Home,
  Briefcase,
  Star,
  CheckCircle,
  AlertCircle,
  ArrowLeft,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/lib/store';
import { addressesApi, ApiError } from '@/lib/api';
import { Navbar } from '@/components/layout/navbar';
import { Footer } from '@/components/layout/footer';

const addressTypes = [
  { value: 'HOME', label: 'Home', icon: Home },
  { value: 'WORK', label: 'Work', icon: Briefcase },
  { value: 'OTHER', label: 'Other', icon: MapPin },
];

export default function AddressesPage() {
  const router = useRouter();
  const { user, accessToken } = useAuthStore();
  const [addresses, setAddresses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingAddress, setEditingAddress] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const [formData, setFormData] = useState({
    label: '',
    type: 'HOME',
    addressLine1: '',
    addressLine2: '',
    city: '',
    state: '',
    postalCode: '',
    landmark: '',
    isDefault: false,
  });

  useEffect(() => {
    if (!user || !accessToken) {
      router.push('/login');
      return;
    }
    loadAddresses();
  }, [user, accessToken]);

  const loadAddresses = async () => {
    try {
      const data = await addressesApi.list(accessToken!);
      setAddresses(data || []);
    } catch (error) {
      console.error('Failed to load addresses:', error);
    } finally {
      setLoading(false);
    }
  };

  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 5000);
  };

  const resetForm = () => {
    setFormData({
      label: '',
      type: 'HOME',
      addressLine1: '',
      addressLine2: '',
      city: '',
      state: '',
      postalCode: '',
      landmark: '',
      isDefault: false,
    });
    setEditingAddress(null);
    setShowForm(false);
  };

  const handleEdit = (address: any) => {
    setEditingAddress(address);
    setFormData({
      label: address.label || '',
      type: address.type || 'HOME',
      addressLine1: address.addressLine1 || '',
      addressLine2: address.addressLine2 || '',
      city: address.city || '',
      state: address.state || '',
      postalCode: address.postalCode || '',
      landmark: address.landmark || '',
      isDefault: address.isDefault || false,
    });
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accessToken) return;

    setSaving(true);
    try {
      if (editingAddress) {
        await addressesApi.update(accessToken, editingAddress.id, formData);
        showToast('success', 'Address updated successfully!');
      } else {
        await addressesApi.create(accessToken, formData);
        showToast('success', 'Address added successfully!');
      }
      await loadAddresses();
      resetForm();
    } catch (error) {
      console.error('Failed to save address:', error);
      if (error instanceof ApiError) {
        showToast('error', error.message);
      } else {
        showToast('error', 'Failed to save address. Please try again.');
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this address?')) return;

    try {
      await addressesApi.delete(accessToken!, id);
      setAddresses((prev) => prev.filter((a) => a.id !== id));
      showToast('success', 'Address deleted successfully!');
    } catch (error) {
      console.error('Failed to delete address:', error);
      if (error instanceof ApiError) {
        showToast('error', error.message);
      } else {
        showToast('error', 'Failed to delete address. Please try again.');
      }
    }
  };

  const handleSetDefault = async (id: string) => {
    try {
      await addressesApi.setDefault(accessToken!, id);
      setAddresses((prev) =>
        prev.map((a) => ({
          ...a,
          isDefault: a.id === id,
        }))
      );
      showToast('success', 'Default address updated!');
    } catch (error) {
      console.error('Failed to set default address:', error);
      showToast('error', 'Failed to update default address.');
    }
  };

  if (!user) {
    return null;
  }

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
            <button onClick={() => setToast(null)} className="ml-2 hover:opacity-80">
              ✕
            </button>
          </div>
        )}

        {/* Header */}
        <div className="mb-8 flex items-center gap-4">
          <Link href="/profile">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-gray-900">My Addresses</h1>
            <p className="text-gray-600">Manage your delivery addresses</p>
          </div>
          <Button onClick={() => setShowForm(true)} className="gap-2">
            <Plus className="h-4 w-4" /> Add Address
          </Button>
        </div>

        {/* Add/Edit Form Modal */}
        {showForm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6">
              <h2 className="mb-4 text-lg font-semibold text-gray-900">
                {editingAddress ? 'Edit Address' : 'Add New Address'}
              </h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Address Type */}
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">
                    Address Type
                  </label>
                  <div className="flex gap-2">
                    {addressTypes.map((type) => (
                      <button
                        key={type.value}
                        type="button"
                        onClick={() => setFormData({ ...formData, type: type.value })}
                        className={`flex items-center gap-2 rounded-lg border px-4 py-2 text-sm transition-colors ${
                          formData.type === type.value
                            ? 'border-primary bg-primary/10 text-primary'
                            : 'border-gray-300 hover:border-gray-400'
                        }`}
                      >
                        <type.icon className="h-4 w-4" />
                        {type.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Label */}
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">
                    Label (Optional)
                  </label>
                  <input
                    type="text"
                    value={formData.label}
                    onChange={(e) => setFormData({ ...formData, label: e.target.value })}
                    className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-primary focus:outline-none"
                    placeholder="e.g., Mom's House, Office Building A"
                  />
                </div>

                {/* Address Line 1 */}
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">
                    Address Line 1 *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.addressLine1}
                    onChange={(e) => setFormData({ ...formData, addressLine1: e.target.value })}
                    className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-primary focus:outline-none"
                    placeholder="House/Flat No., Building Name"
                  />
                </div>

                {/* Address Line 2 */}
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">
                    Address Line 2
                  </label>
                  <input
                    type="text"
                    value={formData.addressLine2}
                    onChange={(e) => setFormData({ ...formData, addressLine2: e.target.value })}
                    className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-primary focus:outline-none"
                    placeholder="Street, Area"
                  />
                </div>

                {/* City & State */}
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-sm font-medium text-gray-700">City *</label>
                    <input
                      type="text"
                      required
                      value={formData.city}
                      onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                      className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-primary focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-medium text-gray-700">State *</label>
                    <input
                      type="text"
                      required
                      value={formData.state}
                      onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                      className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-primary focus:outline-none"
                    />
                  </div>
                </div>

                {/* Postal Code & Landmark */}
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-sm font-medium text-gray-700">
                      Postal Code *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.postalCode}
                      onChange={(e) => setFormData({ ...formData, postalCode: e.target.value })}
                      className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-primary focus:outline-none"
                      placeholder="6 digit PIN"
                    />
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-medium text-gray-700">Landmark</label>
                    <input
                      type="text"
                      value={formData.landmark}
                      onChange={(e) => setFormData({ ...formData, landmark: e.target.value })}
                      className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-primary focus:outline-none"
                      placeholder="Near..."
                    />
                  </div>
                </div>

                {/* Default Checkbox */}
                <label className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={formData.isDefault}
                    onChange={(e) => setFormData({ ...formData, isDefault: e.target.checked })}
                    className="h-5 w-5 rounded"
                  />
                  <span className="text-gray-700">Set as default address</span>
                </label>

                {/* Actions */}
                <div className="flex gap-3 pt-4">
                  <Button type="submit" className="flex-1" disabled={saving}>
                    {saving ? 'Saving...' : editingAddress ? 'Update Address' : 'Add Address'}
                  </Button>
                  <Button type="button" variant="outline" onClick={resetForm}>
                    Cancel
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Addresses List */}
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          </div>
        ) : addresses.length === 0 ? (
          <div className="rounded-xl bg-white py-16 text-center shadow-sm">
            <MapPin className="mx-auto mb-4 h-16 w-16 text-gray-300" />
            <h2 className="mb-2 text-xl font-semibold text-gray-900">No addresses yet</h2>
            <p className="mb-6 text-gray-500">Add your first delivery address to get started</p>
            <Button onClick={() => setShowForm(true)} className="gap-2">
              <Plus className="h-4 w-4" /> Add Address
            </Button>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {addresses.map((address) => {
              const typeConfig = addressTypes.find((t) => t.value === address.type) || addressTypes[2];
              const TypeIcon = typeConfig.icon;
              return (
                <div
                  key={address.id}
                  className={`relative rounded-xl bg-white p-6 shadow-sm transition-shadow hover:shadow-md ${
                    address.isDefault ? 'ring-2 ring-primary' : ''
                  }`}
                >
                  {address.isDefault && (
                    <div className="absolute right-4 top-4 flex items-center gap-1 rounded-full bg-primary/10 px-2 py-1 text-xs font-medium text-primary">
                      <Star className="h-3 w-3 fill-current" /> Default
                    </div>
                  )}

                  <div className="mb-3 flex items-center gap-2">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-100">
                      <TypeIcon className="h-5 w-5 text-gray-600" />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">
                        {address.label || typeConfig.label}
                      </p>
                      <p className="text-xs text-gray-500">{typeConfig.label}</p>
                    </div>
                  </div>

                  <div className="mb-4 text-sm text-gray-600">
                    <p>{address.addressLine1}</p>
                    {address.addressLine2 && <p>{address.addressLine2}</p>}
                    <p>
                      {address.city}, {address.state} {address.postalCode}
                    </p>
                    {address.landmark && (
                      <p className="text-gray-500">Near: {address.landmark}</p>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(address)}
                      className="flex-1"
                    >
                      <Edit className="mr-1 h-3 w-3" /> Edit
                    </Button>
                    {!address.isDefault && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleSetDefault(address.id)}
                      >
                        <Star className="h-3 w-3" />
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(address.id)}
                      className="text-red-600 hover:bg-red-50 hover:text-red-700"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
