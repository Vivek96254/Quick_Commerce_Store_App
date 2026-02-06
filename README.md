# QuickMart - Production-Grade Quick Commerce Platform

A comprehensive quick-commerce platform similar to Blinkit, designed for a single local store. Built with modern technologies and production-ready architecture.

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                         QuickMart Platform                          │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────────┐  │
│  │   Customer   │  │    Admin     │  │      Mobile App          │  │
│  │   Web App    │  │  Dashboard   │  │    (React Native)        │  │
│  │   (Next.js)  │  │  (Next.js)   │  │       (Expo)             │  │
│  └──────┬───────┘  └──────┬───────┘  └───────────┬──────────────┘  │
│         │                 │                       │                 │
│         └────────────────┼───────────────────────┘                 │
│                          │                                          │
│                    ┌─────▼─────┐                                   │
│                    │  REST API │                                   │
│                    │ (NestJS)  │◄──── WebSocket (Real-time)        │
│                    └─────┬─────┘                                   │
│                          │                                          │
│         ┌────────────────┼────────────────┐                        │
│         │                │                │                        │
│    ┌────▼────┐     ┌─────▼─────┐    ┌─────▼─────┐                 │
│    │PostgreSQL│     │   Redis   │    │ Cloudinary │                │
│    │ (Primary)│     │  (Cache)  │    │  (Images)  │                │
│    └──────────┘     └───────────┘    └───────────┘                 │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

## 🛠️ Tech Stack

### Backend
- **Runtime**: Node.js (TypeScript)
- **Framework**: NestJS with layered architecture
- **Database**: PostgreSQL 15
- **ORM**: Prisma
- **Cache**: Redis
- **Authentication**: JWT with refresh tokens
- **Validation**: Zod + class-validator
- **API Docs**: Swagger/OpenAPI
- **Payments**: Stripe + Razorpay
- **File Storage**: Cloudinary
- **Real-time**: Socket.IO

### Frontend Web
- **Framework**: Next.js 14 (App Router)
- **Styling**: Tailwind CSS
- **State**: Zustand
- **Data Fetching**: TanStack Query
- **UI Components**: Radix UI

### Mobile App
- **Framework**: React Native
- **Platform**: Expo SDK 50
- **Navigation**: Expo Router
- **Styling**: NativeWind

### Infrastructure
- **Hosting**: Render.com
- **Containerization**: Docker
- **CI/CD**: Render auto-deploy

## 📁 Project Structure

```
quickmart/
├── apps/
│   ├── api/                    # NestJS Backend API
│   │   ├── src/
│   │   │   ├── common/         # Shared utilities, filters, interceptors
│   │   │   ├── config/         # Configuration & environment validation
│   │   │   ├── database/       # Prisma database service
│   │   │   ├── redis/          # Redis cache service
│   │   │   ├── websocket/      # WebSocket gateway
│   │   │   └── modules/        # Feature modules
│   │   │       ├── auth/       # Authentication & authorization
│   │   │       ├── users/      # User management
│   │   │       ├── products/   # Product catalog
│   │   │       ├── categories/ # Category management
│   │   │       ├── cart/       # Shopping cart
│   │   │       ├── orders/     # Order management
│   │   │       ├── payments/   # Payment processing
│   │   │       ├── addresses/  # Address management
│   │   │       ├── admin/      # Admin dashboard
│   │   │       ├── upload/     # File uploads
│   │   │       └── health/     # Health checks
│   │   ├── Dockerfile
│   │   └── package.json
│   │
│   ├── web/                    # Next.js Web Application
│   │   ├── src/
│   │   │   ├── app/            # App Router pages
│   │   │   │   ├── (customer)/ # Customer pages
│   │   │   │   └── admin/      # Admin dashboard
│   │   │   ├── components/     # React components
│   │   │   └── lib/            # Utilities, API client, store
│   │   ├── Dockerfile
│   │   └── package.json
│   │
│   └── mobile/                 # React Native Expo App
│       ├── app/                # Expo Router screens
│       ├── lib/                # API client, utilities
│       └── package.json
│
├── packages/
│   ├── db/                     # Prisma schema & migrations
│   │   ├── prisma/
│   │   │   ├── schema.prisma   # Database schema
│   │   │   └── seed.ts         # Seed data
│   │   └── src/                # Database client exports
│   │
│   └── shared-types/           # Shared TypeScript types & Zod schemas
│       └── src/
│           ├── schemas/        # Zod validation schemas
│           └── types/          # TypeScript interfaces
│
├── docker-compose.yml          # Local development services
├── render.yaml                 # Render deployment blueprint
├── turbo.json                  # Turborepo configuration
└── package.json                # Root workspace configuration
```

## 🗄️ Database Schema

### Entity Relationship Diagram

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│    users     │────<│   addresses  │     │  categories  │
├──────────────┤     ├──────────────┤     ├──────────────┤
│ id           │     │ id           │     │ id           │
│ email        │     │ userId       │     │ name         │
│ phone        │     │ fullName     │     │ slug         │
│ passwordHash │     │ addressLine1 │     │ parentId     │
│ firstName    │     │ city         │     │ image        │
│ lastName     │     │ postalCode   │     │ sortOrder    │
│ role         │     │ isDefault    │     │ isActive     │
│ isActive     │     └──────────────┘     └──────┬───────┘
└──────┬───────┘                                  │
       │                                          │
       │     ┌──────────────┐              ┌──────▼───────┐
       │────<│    carts     │              │   products   │
       │     ├──────────────┤              ├──────────────┤
       │     │ id           │              │ id           │
       │     │ userId       │              │ sku          │
       │     └──────┬───────┘              │ name         │
       │            │                      │ slug         │
       │     ┌──────▼───────┐              │ price        │
       │     │  cart_items  │──────────────│ discountPrice│
       │     ├──────────────┤              │ categoryId   │
       │     │ cartId       │              │ stockQuantity│
       │     │ productId    │              │ isAvailable  │
       │     │ quantity     │              └──────┬───────┘
       │     └──────────────┘                     │
       │                                   ┌──────▼───────┐
       │                                   │product_images│
       │     ┌──────────────┐              ├──────────────┤
       └────<│    orders    │              │ productId    │
             ├──────────────┤              │ url          │
             │ id           │              │ isPrimary    │
             │ orderNumber  │              └──────────────┘
             │ userId       │
             │ addressId    │     ┌──────────────┐
             │ status       │────<│ order_items  │
             │ total        │     ├──────────────┤
             │ paymentMethod│     │ orderId      │
             └──────┬───────┘     │ productId    │
                    │             │ quantity     │
             ┌──────▼───────┐     │ unitPrice    │
             │   payments   │     └──────────────┘
             ├──────────────┤
             │ orderId      │
             │ amount       │
             │ status       │
             │ gatewayId    │
             └──────────────┘
```

### Core Tables

| Table | Description |
|-------|-------------|
| `users` | Customer and admin accounts |
| `addresses` | Delivery addresses |
| `categories` | Product categories (hierarchical) |
| `products` | Product catalog |
| `product_images` | Product image gallery |
| `inventory_logs` | Stock movement audit trail |
| `carts` | Shopping cart per user |
| `cart_items` | Items in cart |
| `orders` | Customer orders |
| `order_items` | Items in each order |
| `order_status_history` | Order status changes |
| `payments` | Payment transactions |
| `store_config` | Store settings |

## 🔌 API Routes

### Authentication (`/api/v1/auth`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/login` | Login with email/phone + password |
| POST | `/register` | Register new customer |
| POST | `/otp/send` | Send OTP for login |
| POST | `/otp/verify` | Verify OTP |
| POST | `/refresh` | Refresh access token |
| POST | `/logout` | Logout user |
| GET | `/me` | Get current user |

### Products (`/api/v1/products`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` | List products with filters |
| GET | `/featured` | Get featured products |
| GET | `/:id` | Get product by ID |
| GET | `/slug/:slug` | Get product by slug |
| POST | `/` | Create product (Admin) |
| PUT | `/:id` | Update product (Admin) |
| PATCH | `/:id/stock` | Update stock (Admin) |
| DELETE | `/:id` | Delete product (Admin) |

### Categories (`/api/v1/categories`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` | List all categories |
| GET | `/:id` | Get category by ID |
| POST | `/` | Create category (Admin) |
| PUT | `/:id` | Update category (Admin) |
| DELETE | `/:id` | Delete category (Admin) |

### Cart (`/api/v1/cart`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` | Get user cart |
| POST | `/items` | Add item to cart |
| PUT | `/items/:productId` | Update item quantity |
| DELETE | `/items/:productId` | Remove item |
| DELETE | `/` | Clear cart |
| POST | `/sync` | Sync cart from client |

### Orders (`/api/v1/orders`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/` | Create order from cart |
| GET | `/` | List user orders |
| GET | `/:id` | Get order details |
| POST | `/:id/cancel` | Cancel order |
| GET | `/admin/all` | List all orders (Admin) |
| PATCH | `/admin/:id/status` | Update status (Admin) |

### Payments (`/api/v1/payments`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/initiate/:orderId` | Initiate payment |
| POST | `/verify` | Verify payment |
| POST | `/webhook/stripe` | Stripe webhook |
| POST | `/webhook/razorpay` | Razorpay webhook |
| POST | `/refund/:orderId` | Process refund (Admin) |

### Admin (`/api/v1/admin`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/dashboard` | Dashboard statistics |
| GET | `/store-config` | Get store settings |
| PUT | `/store-config` | Update store settings |
| GET | `/reports/sales` | Sales report |
| GET | `/reports/inventory` | Inventory report |

## 🚀 Getting Started

### Prerequisites

- Node.js 20+
- npm 10+
- Docker & Docker Compose
- PostgreSQL 15 (or use Docker)
- Redis (or use Docker)

### Local Development Setup

1. **Clone the repository**
```bash
git clone https://github.com/your-org/quickmart.git
cd quickmart
```

2. **Install dependencies**
```bash
npm install
```

3. **Start infrastructure (PostgreSQL + Redis)**
```bash
docker-compose up -d postgres redis
```

4. **Configure environment variables**
```bash
# Create .env file in apps/api
cp apps/api/.env.example apps/api/.env
# Edit the file with your values
```

5. **Generate Prisma client & run migrations**
```bash
npm run db:generate
npx prisma migrate dev --schema=packages/db/prisma/schema.prisma
```

6. **Seed the database**
```bash
npm run db:seed
```

7. **Start development servers**
```bash
npm run dev
```

This starts:
- API: http://localhost:4000
- Web: http://localhost:3000
- API Docs: http://localhost:4000/api-docs

**Or start individually:**
```bash
npm run dev:api      # Start API only
npm run dev:web      # Start Web app only
npm run dev:mobile   # Start Mobile app (Expo)
```

### Mobile App Setup

1. **Install dependencies:**
```bash
cd apps/mobile
npm install
```

2. **Configure API URL:**
Create `.env` file in `apps/mobile/`:
```env
EXPO_PUBLIC_API_URL=http://localhost:4000
```

For production:
```env
EXPO_PUBLIC_API_URL=https://quickmart-api-v065.onrender.com
```

3. **Start Expo development server:**
```bash
npm run dev:mobile
# or
cd apps/mobile && npm run dev
```

4. **Run on device:**
   - Install **Expo Go** app on your phone
   - Scan the QR code shown in terminal
   - Make sure your phone and computer are on the same network

5. **Run on simulator/emulator:**
```bash
npm run ios        # iOS Simulator (macOS only)
npm run android    # Android Emulator
npm run web        # Web browser
```

See [apps/mobile/README.md](apps/mobile/README.md) for detailed mobile app documentation.

### Test Accounts

After seeding:
- **Super Admin**: admin@quickmart.local / Admin@123
- **Store Manager**: manager@quickmart.local / Manager@123
- **Customer**: john@example.com / Customer@123

## 🚢 Deployment

### Mobile App Deployment

The mobile app can be deployed to **App Store (iOS)** and **Google Play (Android)** using Expo Application Services (EAS).

**Quick Start:**
```bash
cd apps/mobile
npm install -g eas-cli
eas login
eas build:configure
eas build --platform all --profile production
eas submit --platform all
```

**📖 Complete Guide:** See [apps/mobile/DEPLOYMENT.md](apps/mobile/DEPLOYMENT.md) for:
- Step-by-step deployment instructions
- App Store and Google Play setup
- Credentials management
- OTA updates configuration
- Testing and submission process

### Deploy to Render.com

1. **Push to GitHub**
```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/your-org/quickmart.git
git push -u origin main
```

2. **Connect to Render**
- Go to [render.com](https://render.com)
- Click "New Blueprint"
- Connect your GitHub repository
- Render will detect `render.yaml` and configure services

3. **Configure Secrets**
After deployment, configure these environment variables in Render dashboard:
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `RAZORPAY_KEY_ID`
- `RAZORPAY_KEY_SECRET`
- `CLOUDINARY_CLOUD_NAME`
- `CLOUDINARY_API_KEY`
- `CLOUDINARY_API_SECRET`

4. **Run Database Migration**
```bash
# Using Render Shell
cd apps/api
npx prisma migrate deploy --schema=../../packages/db/prisma/schema.prisma
npm run db:seed
```

### Docker Deployment

```bash
# Build and run production containers
docker-compose --profile production up -d

# Run migrations
docker-compose exec api npx prisma migrate deploy
```

## 🔒 Security Features

- **Authentication**: JWT with short-lived access tokens + refresh tokens
- **Password Hashing**: bcrypt with 12 rounds
- **Rate Limiting**: Per-IP and per-user limits
- **Input Validation**: Zod schemas + class-validator
- **CORS**: Configurable allowed origins
- **Helmet**: Security headers
- **Payment Verification**: Webhook signature validation
- **Role-Based Access**: Customer, Admin, Super Admin roles

## 📊 Real-Time Features

WebSocket events for:
- Stock updates (public)
- Order status changes (user-specific)
- New orders (admin)
- Store status updates (public)

Connect: `ws://localhost:4000/ws`

## 🧪 Environment Variables Template

```env
# Core
NODE_ENV=development
PORT=4000

# Database
DATABASE_URL=postgresql://quickmart:password@localhost:5432/quickmart

# Redis
REDIS_URL=redis://localhost:6379

# JWT
JWT_SECRET=your-32-char-secret-key-here
JWT_REFRESH_SECRET=your-32-char-refresh-secret
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# Payments
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
RAZORPAY_KEY_ID=rzp_test_...
RAZORPAY_KEY_SECRET=...

# Storage
CLOUDINARY_CLOUD_NAME=...
CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...

# CORS
CORS_ORIGINS=http://localhost:3000

# Frontend
NEXT_PUBLIC_API_URL=http://localhost:4000
NEXT_PUBLIC_WS_URL=ws://localhost:4000/ws
```

## 📝 License

MIT License - see LICENSE file for details.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Open a Pull Request

---

Built with ❤️ for local stores worldwide
