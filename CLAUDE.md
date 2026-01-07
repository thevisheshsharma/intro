# Berri Platform - Claude Code Skill

This skill file provides comprehensive project context for AI-assisted development on the Berri platform.

## 🎯 Project Overview

**Berri** is an AI-powered Twitter analysis platform built for Web3 ecosystem intelligence. It provides relationship mapping, organizational profiling, and ICP (Ideal Customer Profile) analysis using Grok AI and Neo4j graph databases.

### Core Capabilities
- **Twitter Profile Analysis** - AI-powered extraction of professional insights
- **Organizational Intelligence** - Automated Web3 entity classification (DeFi, DAOs, exchanges, etc.)
- **Relationship Mapping** - Graph-based connection discovery and analysis
- **ICP Analysis** - Deep organizational profiling with 50+ data points

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | **Next.js 13** (App Router) |
| Language | **TypeScript** (strict mode) |
| Package Manager | **pnpm** |
| Styling | **Tailwind CSS** + custom design system |
| Animations | **Framer Motion** |
| UI Components | **Radix UI** + custom |
| Authentication | **Clerk** |
| Graph Database | **Neo4j** |
| AI/ML | **Grok AI** (X.AI API via Vercel AI SDK) |
| Icons | **Lucide React** |
| Validation | **Zod** |

### Key Dependencies
```json
{
  "next": "13.5.7",
  "react": "^18",
  "framer-motion": "^11.0.0",
  "@clerk/nextjs": "4.29.9",
  "neo4j-driver": "^5.28.1",
  "@ai-sdk/xai": "^2.0.39",
  "ai": "^5.0.108"
}
```

---

## 🎨 Design System - "Sunset Suite"

The design follows a **warm, premium aesthetic** intentionally avoiding typical AI/tech blue-purple palettes.

### Color Palette

| Color | Hex | Tailwind Class | Usage |
|-------|-----|----------------|-------|
| **Raspberry** | `#E54868` | `text-berri-raspberry`, `bg-berri-raspberry` | Primary CTAs, main brand |
| **Coral** | `#FF7F6B` | `text-berri-coral`, `bg-berri-coral` | Secondary accent, gradients |
| **Amber** | `#F5A623` | `text-berri-amber`, `bg-berri-amber` | Tertiary accent, People Intelligence |
| **Gold** | `#D4940A` | `text-berri-gold`, `bg-berri-gold` | Hover/active states |
| **Charcoal** | `#1A1A2E` | `bg-berri-charcoal` | Dark sections, Enterprise tier |
| **Warm White** | `#FAF8F5` | `bg-berri-warmWhite` | Warm light backgrounds |

### Gradient Progressions (Feature-Specific)
- **Pathfinder**: `from-berri-raspberry to-berri-coral`
- **Company Intelligence**: `from-berri-coral to-berri-amber`
- **People Intelligence**: `from-berri-amber to-berri-gold`

### Typography
- **Headings**: `font-heading` (Plus Jakarta Sans)
- **Body**: `font-sans` (Inter)

```tsx
// H1 - Hero headlines
<h1 className="text-4xl sm:text-5xl lg:text-6xl font-heading font-extrabold tracking-tight">

// H2 - Section titles
<h2 className="text-3xl md:text-4xl lg:text-5xl font-heading font-extrabold">

// Body text
<p className="text-lg text-gray-700">
```

### Glassmorphism Classes
| Class | Effect | Usage |
|-------|--------|-------|
| `glass` | Light frosted glass | Cards, panels |
| `glass-strong` | Prominent frosted | Featured cards, hero elements |
| `glass-navbar` | Extra strong blur (40px) | Dropdown menus |
| `glass-raspberry` | Raspberry tinted | Primary accent cards |
| `glass-coral` | Coral tinted | Secondary accent cards |
| `glass-amber` | Amber tinted | Tertiary accent cards |

### Depth & Elevation
```tsx
// Use these utility classes for layered shadows
depth-sm   // Subtle cards, badges
depth-md   // Standard cards
depth-lg   // Featured elements
depth-xl   // Hero elements
```

### Interactive Glows
```tsx
hover-glow-raspberry  // Raspberry glow on hover
hover-glow-amber      // Amber glow on hover
hover-glow-indigo     // Legacy - maps to amber
```

### Grain/Noise Textures
```tsx
grain-overlay  // Light backgrounds with aurora
grain-dark     // Dark backgrounds (CTA, dark cards)
grain-blend    // Gradient-heavy sections (Hero)
```

---

## 📁 Project Structure

```
src/
├── app/                             # Next.js App Router
│   ├── (marketing)/                 # Marketing pages (shared layout)
│   │   ├── layout.tsx               # Navbar + Footer
│   │   ├── page.tsx                 # Homepage
│   │   ├── about/                   # About page
│   │   ├── careers/                 # Careers page
│   │   ├── pricing/                 # Pricing page
│   │   ├── platform/                # Platform feature pages
│   │   │   ├── pathfinder/
│   │   │   ├── company-intelligence/
│   │   │   └── people-intelligence/
│   │   ├── use-cases/               # Use case pages
│   │   └── resources/               # Blog, contact, etc.
│   ├── api/                         # API routes
│   │   ├── find-mutuals/            # Mutual connections discovery
│   │   ├── find-from-org/           # Organization-based user discovery
│   │   ├── grok-analyze-org/        # Grok AI organization analysis
│   │   ├── neo4j/                   # Database operations
│   │   ├── organization-icp-analysis/
│   │   ├── profile/                 # User profile operations
│   │   ├── twitter/                 # Twitter API integration
│   │   └── user/                    # User data sync
│   ├── app/                         # Dashboard (protected)
│   ├── sign-in/                     # Auth pages
│   ├── sign-up/
│   ├── globals.css                  # Design system styles
│   └── layout.tsx                   # Root layout
├── components/
│   ├── marketing/                   # Marketing page components
│   │   ├── Hero.tsx                 # Homepage hero
│   │   ├── Navbar.tsx               # Navigation with dropdowns
│   │   ├── Footer.tsx               # Site footer
│   │   ├── CTA.tsx                  # Call-to-action sections
│   │   ├── Features.tsx             # Feature cards
│   │   ├── FeaturesScrollSection.tsx # Interactive scroll features
│   │   ├── NetworkAnimation.tsx     # Hero animation
│   │   ├── VisualSection.tsx        # Orbital animation section
│   │   ├── Testimonials.tsx         # Social proof
│   │   └── FAQ.tsx                  # FAQ accordion
│   ├── icp/                         # ICP analysis components
│   ├── twitter/                     # Twitter-specific components
│   └── ui/                          # Reusable UI components
│       └── button.tsx               # Button variants
├── lib/                             # Core utilities
│   ├── grok.ts                      # Grok AI client & analysis
│   ├── classifier.ts                # AI classification system
│   ├── neo4j.ts                     # Neo4j driver config
│   ├── socialapi-pagination.ts      # Twitter API integration
│   ├── validation.ts                # Zod schemas
│   └── hooks/
│       └── useGrok.ts               # Grok AI hook
├── services/                        # Service layer
├── jobs/                            # Scheduled tasks
└── middleware.ts                    # Auth middleware
```

---

## 🔧 Common Patterns

### Container Pattern (CRITICAL - Use on ALL sections)
```tsx
<div className="container mx-auto px-8 md:px-20 lg:px-32 xl:px-40">
  {/* Content */}
</div>
```

### Section Template
```tsx
<section className="py-24 bg-white">
  <div className="container mx-auto px-8 md:px-20 lg:px-32 xl:px-40">
    {/* Section Header */}
    <div className="text-center max-w-3xl mx-auto mb-16">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
      >
        <span className="inline-flex items-center px-4 py-1.5 rounded-full glass-raspberry text-berri-raspberry text-sm font-medium mb-6">
          Section Label
        </span>
        <h2 className="text-3xl md:text-4xl lg:text-5xl font-heading font-extrabold mb-6">
          Section Title
        </h2>
        <p className="text-lg text-gray-600">
          Description text.
        </p>
      </motion.div>
    </div>
    {/* Content Grid */}
  </div>
</section>
```

### Standard Animation Easing
```tsx
const STANDARD_EASE = [0.25, 0.1, 0.25, 1]

// Entrance animation
<motion.div
  initial={{ opacity: 0, y: 20 }}
  whileInView={{ opacity: 1, y: 0 }}
  viewport={{ once: true }}
  transition={{ duration: 0.5, ease: [0.25, 0.1, 0.25, 1] }}
>
```

### Button Variants
```tsx
import { Button } from '@/components/ui/button'

// Primary CTA
<Button variant="brandAction" size="lg" className="rounded-full">
  Get Started <ArrowRight className="w-4 h-4 ml-2" />
</Button>

// Secondary
<Button variant="brandOutline" size="lg" className="rounded-full">
  Learn More
</Button>

// Amber/Enterprise accent
<Button variant="brandAccent" size="lg" className="rounded-full">
  Enterprise
</Button>
```

### Feature Card Pattern
```tsx
<motion.div
  initial={{ opacity: 0, y: 20 }}
  whileInView={{ opacity: 1, y: 0 }}
  viewport={{ once: true }}
  className="p-8 rounded-3xl glass depth-md hover-glow-raspberry transition-all duration-300"
>
  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-berri-raspberry to-berri-coral flex items-center justify-center mb-6">
    <Icon className="w-6 h-6 text-white" />
  </div>
  <h3 className="text-xl font-heading font-semibold mb-3">Title</h3>
  <p className="text-gray-600">Description</p>
</motion.div>
```

---

## 📝 Development Guidelines

### Commands
```bash
pnpm dev          # Start development server
pnpm build        # Build for production
pnpm lint         # Run ESLint
pnpm lint:fix     # Fix lint issues
pnpm type-check   # TypeScript check
pnpm clean        # Clean build cache
```

### Adding New Marketing Pages
1. Create page at `src/app/(marketing)/[page-name]/page.tsx`
2. Use `'use client'` directive if animations needed
3. Import from:
   - `framer-motion` for animations
   - `lucide-react` for icons
   - `@/components/ui/button` for buttons
   - `next/link` for internal links
   - `next/image` for images
4. Follow container and section patterns above
5. Alternate section backgrounds between `bg-white` and `bg-gray-50`

### API Route Pattern
```tsx
// src/app/api/[route]/route.ts
import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs'

export async function POST(request: Request) {
  const { userId } = auth()
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  
  try {
    // Your logic here
    return NextResponse.json({ data: result })
  } catch (error) {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
```

### Neo4j Usage
```tsx
import { getDriver } from '@/lib/neo4j'

const driver = await getDriver()
const session = driver.session()

try {
  const result = await session.run(
    'MATCH (u:User {id: $id}) RETURN u',
    { id: userId }
  )
  // Process result
} finally {
  await session.close()
}
```

### Grok AI Usage
```tsx
import { analyzeWithGrok } from '@/lib/grok'

const analysis = await analyzeWithGrok({
  content: profileData,
  type: 'organization',
  enableLiveSearch: true
})
```

---

## 🚦 Quality Checklist

### Before Submitting Changes
- [ ] Follows container padding pattern
- [ ] Uses design system colors (no custom hex values)
- [ ] Glassmorphism classes where appropriate
- [ ] Framer Motion animations with standard easing
- [ ] Mobile-first responsive design
- [ ] Images use `next/image`
- [ ] Internal links use `next/link`
- [ ] TypeScript types are strict
- [ ] No console errors/warnings

### Design Principles
1. **Premium & Warm** - Raspberry/coral/amber palette, avoid cold blues
2. **Modern Glassmorphism** - Layered depth with frosted effects
3. **Subtle Animations** - Never jarring, always purposeful
4. **Consistent Spacing** - Use `py-24` for sections, standard container padding
5. **Mobile-First** - All layouts work on mobile first

---

## 📚 Key Files Reference

| File | Purpose |
|------|---------|
| `DESIGN_SYSTEM.md` | Full design system documentation |
| `globals.css` | Custom CSS classes & utilities |
| `tailwind.config.js` | Tailwind theme configuration |
| `src/components/ui/button.tsx` | Button component variants |
| `src/lib/grok.ts` | Grok AI integration |
| `src/lib/neo4j.ts` | Neo4j driver setup |
| `src/lib/classifier.ts` | AI classification logic |
| `src/middleware.ts` | Auth & routing middleware |

---

## 🔗 External Dependencies

### APIs
- **X.AI (Grok)** - AI analysis and classification
- **SocialAPI** - Twitter data fetching
- **Clerk** - Authentication

### Data Sources (for ICP Analysis)
- DeFiLlama, Dune Analytics (on-chain)
- CoinGecko, CoinMarketCap (market data)
- GitHub (developer metrics)
- Discord, Telegram (community data)

---

## 💡 Tips for Claude Code

1. **Always use the design system** - Colors, typography, spacing are all predefined
2. **Check globals.css first** - Many utilities already exist (glass, depth, glow)
3. **Framer Motion is standard** - Use for any page-level animations
4. **pnpm not npm** - This project uses pnpm
5. **Clerk handles auth** - Use `auth()` from `@clerk/nextjs` in API routes
6. **Neo4j for relationships** - Not just CRUD, think in graphs
7. **Warm palette only** - Raspberry, coral, amber, gold - no blues/purples
