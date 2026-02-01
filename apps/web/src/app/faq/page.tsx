'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ChevronDown, ChevronUp, Search, MessageCircle, HelpCircle, Truck, CreditCard, Package, RotateCcw } from 'lucide-react';
import { Navbar } from '@/components/layout/navbar';
import { Footer } from '@/components/layout/footer';

const faqCategories = [
  {
    id: 'orders',
    name: 'Orders & Delivery',
    icon: Truck,
    questions: [
      {
        q: 'How fast is delivery?',
        a: 'We offer lightning-fast delivery within 10-30 minutes for orders placed within our service area. Delivery time may vary based on your location and order size.',
      },
      {
        q: 'What is the minimum order amount?',
        a: 'The minimum order amount is ₹99. Orders above ₹199 qualify for free delivery.',
      },
      {
        q: 'How can I track my order?',
        a: 'Once your order is confirmed, you can track it in real-time from the Orders section in your account. You\'ll also receive notifications at each stage of delivery.',
      },
      {
        q: 'What if I\'m not available to receive my order?',
        a: 'Our delivery partner will attempt to contact you. If unreachable, the order may be left at a safe place or returned. Please ensure your contact details are correct.',
      },
    ],
  },
  {
    id: 'payments',
    name: 'Payments',
    icon: CreditCard,
    questions: [
      {
        q: 'What payment methods do you accept?',
        a: 'We accept all major payment methods including UPI, Credit/Debit Cards, Net Banking, and Cash on Delivery (COD).',
      },
      {
        q: 'Is it safe to pay online?',
        a: 'Yes! We use industry-standard encryption and secure payment gateways (Razorpay/Stripe) to ensure your payment information is protected.',
      },
      {
        q: 'When will I be charged for my order?',
        a: 'For online payments, you\'ll be charged immediately upon order confirmation. For COD orders, payment is collected at the time of delivery.',
      },
      {
        q: 'How do refunds work?',
        a: 'Refunds are processed within 5-7 business days to your original payment method. COD refunds may be credited to your QuickMart wallet.',
      },
    ],
  },
  {
    id: 'products',
    name: 'Products',
    icon: Package,
    questions: [
      {
        q: 'Are your products fresh?',
        a: 'Yes! We source fresh products daily from local suppliers. Our quick delivery ensures products reach you in the best condition.',
      },
      {
        q: 'What if a product is out of stock?',
        a: 'If a product becomes unavailable after you order, we\'ll notify you immediately and offer a suitable replacement or refund.',
      },
      {
        q: 'Do you sell organic products?',
        a: 'Yes, we have a dedicated organic section with certified organic fruits, vegetables, and other products.',
      },
    ],
  },
  {
    id: 'returns',
    name: 'Returns & Refunds',
    icon: RotateCcw,
    questions: [
      {
        q: 'What is your return policy?',
        a: 'We accept returns for damaged, expired, or incorrect items within 24 hours of delivery. Simply contact our support team with photos.',
      },
      {
        q: 'How do I report a problem with my order?',
        a: 'Go to Orders in your account, select the order, and tap "Report Issue". You can also contact our 24/7 support team.',
      },
      {
        q: 'Can I cancel my order?',
        a: 'You can cancel your order before it\'s picked up for delivery. Once out for delivery, cancellation may not be possible.',
      },
    ],
  },
];

export default function FAQPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('orders');
  const [openQuestions, setOpenQuestions] = useState<string[]>([]);

  const toggleQuestion = (questionId: string) => {
    setOpenQuestions((prev) =>
      prev.includes(questionId)
        ? prev.filter((id) => id !== questionId)
        : [...prev, questionId]
    );
  };

  const filteredCategories = faqCategories.map((cat) => ({
    ...cat,
    questions: cat.questions.filter(
      (q) =>
        !searchQuery ||
        q.q.toLowerCase().includes(searchQuery.toLowerCase()) ||
        q.a.toLowerCase().includes(searchQuery.toLowerCase())
    ),
  })).filter((cat) => cat.questions.length > 0);

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
            Frequently Asked Questions
          </h1>
          <p className="mx-auto max-w-2xl text-gray-600">
            Find answers to common questions about orders, delivery, payments, and more.
          </p>
        </div>

        {/* Search */}
        <div className="mx-auto mb-8 max-w-xl">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search for answers..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-xl border-0 bg-white py-4 pl-12 pr-4 shadow-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        </div>

        <div className="mx-auto max-w-4xl">
          {/* Category Tabs */}
          {!searchQuery && (
            <div className="mb-8 flex flex-wrap justify-center gap-2">
              {faqCategories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setActiveCategory(cat.id)}
                  className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                    activeCategory === cat.id
                      ? 'bg-primary text-white'
                      : 'bg-white text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <cat.icon className="h-4 w-4" />
                  {cat.name}
                </button>
              ))}
            </div>
          )}

          {/* Questions */}
          <div className="space-y-8">
            {(searchQuery ? filteredCategories : faqCategories.filter((c) => c.id === activeCategory)).map((category) => (
              <div key={category.id}>
                {searchQuery && (
                  <div className="mb-4 flex items-center gap-2">
                    <category.icon className="h-5 w-5 text-primary" />
                    <h2 className="font-semibold text-gray-900">{category.name}</h2>
                  </div>
                )}
                <div className="space-y-3">
                  {category.questions.map((question, index) => {
                    const questionId = `${category.id}-${index}`;
                    const isOpen = openQuestions.includes(questionId);
                    return (
                      <div
                        key={questionId}
                        className="overflow-hidden rounded-xl bg-white shadow-sm"
                      >
                        <button
                          onClick={() => toggleQuestion(questionId)}
                          className="flex w-full items-center justify-between px-6 py-4 text-left"
                        >
                          <span className="font-medium text-gray-900">{question.q}</span>
                          {isOpen ? (
                            <ChevronUp className="h-5 w-5 text-gray-400" />
                          ) : (
                            <ChevronDown className="h-5 w-5 text-gray-400" />
                          )}
                        </button>
                        {isOpen && (
                          <div className="border-t bg-gray-50 px-6 py-4">
                            <p className="text-gray-600">{question.a}</p>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}

            {filteredCategories.length === 0 && searchQuery && (
              <div className="rounded-xl bg-white py-12 text-center">
                <HelpCircle className="mx-auto mb-4 h-12 w-12 text-gray-300" />
                <p className="text-gray-500">No results found for "{searchQuery}"</p>
                <p className="mt-2 text-sm text-gray-400">Try different keywords or browse categories</p>
              </div>
            )}
          </div>
        </div>

        {/* Contact CTA */}
        <div className="mx-auto mt-16 max-w-2xl rounded-2xl bg-gradient-to-r from-primary to-green-500 p-8 text-center text-white">
          <MessageCircle className="mx-auto mb-4 h-12 w-12" />
          <h2 className="mb-2 text-2xl font-bold">Still have questions?</h2>
          <p className="mb-6 opacity-90">
            Our support team is here to help 24/7. Get in touch with us.
          </p>
          <Link
            href="/contact"
            className="inline-block rounded-lg bg-white px-6 py-3 font-semibold text-primary transition-transform hover:scale-105"
          >
            Contact Support
          </Link>
        </div>
      </main>

      <Footer />
    </div>
  );
}
