'use client';

import Link from 'next/link';
import {
  HelpCircle,
  Package,
  Truck,
  CreditCard,
  RotateCcw,
  User,
  MapPin,
  MessageCircle,
  Phone,
  Mail,
  Clock,
  FileText,
  Shield,
  ChevronRight,
} from 'lucide-react';
import { Navbar } from '@/components/layout/navbar';
import { Footer } from '@/components/layout/footer';

const helpTopics = [
  {
    title: 'Getting Started',
    icon: User,
    color: 'bg-blue-100 text-blue-600',
    links: [
      { label: 'Create an account', href: '/register' },
      { label: 'Update your profile', href: '/profile' },
      { label: 'Add delivery address', href: '/profile' },
    ],
  },
  {
    title: 'Orders',
    icon: Package,
    color: 'bg-green-100 text-green-600',
    links: [
      { label: 'Track your order', href: '/orders' },
      { label: 'View order history', href: '/orders' },
      { label: 'Cancel an order', href: '/faq#orders' },
    ],
  },
  {
    title: 'Delivery',
    icon: Truck,
    color: 'bg-orange-100 text-orange-600',
    links: [
      { label: 'Delivery areas', href: '/faq#orders' },
      { label: 'Delivery times', href: '/faq#orders' },
      { label: 'Delivery charges', href: '/faq#orders' },
    ],
  },
  {
    title: 'Payments',
    icon: CreditCard,
    color: 'bg-purple-100 text-purple-600',
    links: [
      { label: 'Payment methods', href: '/faq#payments' },
      { label: 'Payment issues', href: '/faq#payments' },
      { label: 'Invoices', href: '/orders' },
    ],
  },
  {
    title: 'Returns & Refunds',
    icon: RotateCcw,
    color: 'bg-red-100 text-red-600',
    links: [
      { label: 'Return policy', href: '/faq#returns' },
      { label: 'Request a refund', href: '/contact' },
      { label: 'Report an issue', href: '/contact' },
    ],
  },
  {
    title: 'Account & Privacy',
    icon: Shield,
    color: 'bg-teal-100 text-teal-600',
    links: [
      { label: 'Privacy policy', href: '/privacy' },
      { label: 'Terms of service', href: '/terms' },
      { label: 'Delete account', href: '/contact' },
    ],
  },
];

const quickActions = [
  { icon: Package, label: 'Track Order', href: '/orders', color: 'bg-blue-500' },
  { icon: MessageCircle, label: 'Live Chat', href: '/contact', color: 'bg-green-500' },
  { icon: Phone, label: 'Call Us', href: 'tel:+911234567890', color: 'bg-purple-500' },
  { icon: Mail, label: 'Email Support', href: 'mailto:support@quickmart.com', color: 'bg-orange-500' },
];

export default function HelpPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <main className="container mx-auto px-4 py-8">
        {/* Hero */}
        <div className="mb-12 text-center">
          <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <HelpCircle className="h-8 w-8 text-primary" />
          </div>
          <h1 className="mb-4 text-3xl font-bold text-gray-900 sm:text-4xl">
            Help Center
          </h1>
          <p className="mx-auto max-w-2xl text-gray-600">
            How can we help you today? Find answers, browse topics, or contact our support team.
          </p>
        </div>

        {/* Quick Actions */}
        <div className="mb-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {quickActions.map((action) => (
            <Link
              key={action.label}
              href={action.href}
              className="flex items-center gap-4 rounded-xl bg-white p-4 shadow-sm transition-all hover:shadow-md hover:scale-[1.02]"
            >
              <div className={`flex h-12 w-12 items-center justify-center rounded-lg text-white ${action.color}`}>
                <action.icon className="h-6 w-6" />
              </div>
              <span className="font-medium text-gray-900">{action.label}</span>
            </Link>
          ))}
        </div>

        {/* Help Topics */}
        <div className="mb-12">
          <h2 className="mb-6 text-xl font-bold text-gray-900">Browse by Topic</h2>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {helpTopics.map((topic) => (
              <div key={topic.title} className="rounded-xl bg-white p-6 shadow-sm">
                <div className="mb-4 flex items-center gap-3">
                  <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${topic.color}`}>
                    <topic.icon className="h-5 w-5" />
                  </div>
                  <h3 className="font-semibold text-gray-900">{topic.title}</h3>
                </div>
                <ul className="space-y-2">
                  {topic.links.map((link) => (
                    <li key={link.label}>
                      <Link
                        href={link.href}
                        className="flex items-center justify-between rounded-lg px-3 py-2 text-gray-600 transition-colors hover:bg-gray-50 hover:text-primary"
                      >
                        <span>{link.label}</span>
                        <ChevronRight className="h-4 w-4" />
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        {/* FAQ Link */}
        <div className="mb-12 rounded-xl bg-white p-8 text-center shadow-sm">
          <FileText className="mx-auto mb-4 h-12 w-12 text-primary" />
          <h2 className="mb-2 text-xl font-bold text-gray-900">
            Frequently Asked Questions
          </h2>
          <p className="mb-6 text-gray-600">
            Find quick answers to the most common questions about our service.
          </p>
          <Link
            href="/faq"
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-3 font-semibold text-white transition-colors hover:bg-primary/90"
          >
            View FAQ
            <ChevronRight className="h-5 w-5" />
          </Link>
        </div>

        {/* Contact Section */}
        <div className="rounded-2xl bg-gradient-to-r from-gray-900 to-gray-700 p-8 text-white">
          <div className="grid gap-8 lg:grid-cols-2">
            <div>
              <h2 className="mb-4 text-2xl font-bold">Still need help?</h2>
              <p className="mb-6 text-gray-300">
                Our support team is available 24/7 to assist you with any questions or concerns.
              </p>
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/10">
                    <Phone className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-400">Call us</p>
                    <p className="font-medium">+91 12345 67890</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/10">
                    <Mail className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-400">Email us</p>
                    <p className="font-medium">support@quickmart.com</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/10">
                    <Clock className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-400">Hours</p>
                    <p className="font-medium">24/7 Support</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="flex items-center justify-center">
              <Link
                href="/contact"
                className="inline-flex items-center gap-2 rounded-xl bg-white px-8 py-4 font-semibold text-gray-900 transition-transform hover:scale-105"
              >
                <MessageCircle className="h-5 w-5" />
                Contact Support
              </Link>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
