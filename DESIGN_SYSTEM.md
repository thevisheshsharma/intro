# Berri Marketing Design System & Page Building Methodology

## Overview

This document defines the complete design system extracted from the homepage, providing patterns, components, and methodology for building consistent marketing pages.

The design system follows the **"Sunset Suite"** color strategy - an all-warm palette that feels premium and confident, avoiding the typical AI/tech blue-purple stereotype.

---

## 1. COLOR SYSTEM

### Core Brand Palette (Sunset Suite)
| Color | Hex | Tailwind Class | Usage |
|-------|-----|----------------|-------|
| Raspberry | `#E54868` | `text-berri-raspberry`, `bg-berri-raspberry` | Primary CTAs, links, main brand |
| Coral | `#FF7F6B` | `text-berri-coral`, `bg-berri-coral` | Secondary accent, gradients |
| Amber | `#F5A623` | `text-berri-amber`, `bg-berri-amber` | Tertiary accent, People Intelligence |
| Gold | `#D4940A` | `text-berri-gold`, `bg-berri-gold` | Deeper amber for hover/active states |

### Premium Neutrals
| Color | Hex | Tailwind Class | Usage |
|-------|-----|----------------|-------|
| Charcoal | `#1A1A2E` | `bg-berri-charcoal` | Dark sections, Enterprise tier cards |
| Warm White | `#FAF8F5` | `bg-berri-warmWhite` | Warm white backgrounds |

### Semantic Colors (Functional Use Only)
| Color | Hex | Usage |
|-------|-----|-------|
| Green | `#4CAF50` | Success states, confirmations |
| Red | `#E53935` | Error states, destructive actions |

### Background Colors
- **Primary sections**: `bg-gray-50` or `bg-white`
- **Alternating pattern**: Alternate between `bg-white` and `bg-gray-50/50`
- **Dark sections**: `bg-berri-charcoal` or `bg-gray-900` (Premium tiers, CTAs)
- **Glassmorphism**: Add `backdrop-blur-sm` to backgrounds

---

## 2. TYPOGRAPHY

### Font Stack
```tsx
// In layout.tsx - already configured
font-sans: Inter (body text)
font-heading: Plus Jakarta Sans (headings)
```

### Heading Hierarchy
| Level | Classes | Usage |
|-------|---------|-------|
| H1 | `text-4xl sm:text-5xl lg:text-6xl font-heading font-extrabold tracking-tight` | Hero headlines |
| H2 | `text-3xl md:text-4xl lg:text-5xl font-heading font-extrabold` | Section titles |
| H3 | `text-2xl lg:text-3xl font-heading font-bold` | Sub-section titles |
| H4 | `text-xl font-heading font-semibold` | Card titles |

### Body Text
| Type | Classes |
|------|---------|
| Large body | `text-lg text-gray-700` |
| Standard body | `text-base text-gray-600` |
| Small/caption | `text-sm text-gray-500` |

---

## 3. SPACING & LAYOUT

### Container Pattern (CRITICAL - Use on ALL sections)
```tsx
<div className="container mx-auto px-8 md:px-20 lg:px-32 xl:px-40">
  {/* Content */}
</div>
```

### Section Spacing
```tsx
// Standard section
<section className="py-24 bg-white">
  <div className="container mx-auto px-8 md:px-20 lg:px-32 xl:px-40">
    {/* Content */}
  </div>
</section>

// Or use CSS variable
<section className="py-[var(--section-spacing)] bg-gray-50">
```

### Grid Layouts

**Two-Column (Hero style)**
```tsx
<div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
  <div className="max-w-xl">{/* Content */}</div>
  <div className="relative">{/* Visual */}</div>
</div>
```

**Three-Column Cards**
```tsx
<div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
  {/* Cards */}
</div>
```

**Bento Grid (Features style)**
```tsx
<div className="grid grid-cols-12 gap-4 lg:gap-6">
  <div className="col-span-12 lg:col-span-7 row-span-2">{/* Large */}</div>
  <div className="col-span-12 sm:col-span-6 lg:col-span-5">{/* Medium */}</div>
  {/* ... */}
</div>
```

---

## 4. GLASSMORPHISM CLASSES

| Class | Effect | Usage |
|-------|--------|-------|
| `glass` | Light frosted glass | Cards, panels |
| `glass-strong` | Prominent frosted | Featured cards, hero elements |
| `glass-subtle` | Very light frost | Backgrounds |
| `glass-raspberry` | Raspberry tinted | Primary accent cards |
| `glass-coral` | Coral tinted | Secondary accent cards |
| `glass-amber` | Amber tinted | Tertiary accent, People Intelligence |
| `glass-gold` | Gold tinted | Premium accents |

### Usage Example
```tsx
<div className="glass-strong depth-md rounded-3xl p-8">
  {/* Card content */}
</div>

{/* Amber glass for People Intelligence section */}
<div className="glass-amber depth-md rounded-3xl p-8">
  {/* People Intelligence content */}
</div>
```

---

## 4.5 GRAIN/NOISE TEXTURE (Valley-Inspired)

Subtle film grain texture adds tactile polish and premium feel to gradient backgrounds. Inspired by [joinvalley.co](https://www.joinvalley.co/).

| Class | Opacity | Usage |
|-------|---------|-------|
| `grain-overlay` | 0.05 | Light backgrounds with aurora/gradients |
| `grain-dark` | 0.06 | Dark backgrounds (CTA, dark cards) |
| `grain-blend` | 0.05 + overlay blend | Gradient-heavy sections (Hero) |

### Usage Example
```tsx
{/* Add grain to section with aurora gradients */}
<section className="relative">
  {/* Aurora gradient backgrounds */}
  <div className="absolute inset-0 pointer-events-none">
    <div className="aurora-bg" />
  </div>

  {/* Grain overlay - adds subtle texture */}
  <div className="absolute inset-0 grain-blend pointer-events-none" />

  {/* Content */}
  <div className="relative z-10">...</div>
</section>

{/* Dark card with grain */}
<div className="bg-gray-900 rounded-3xl p-6 relative overflow-hidden grain-dark">
  {/* Content */}
</div>
```

### Where Grain is Applied
- **Hero** - `grain-blend` on aurora background
- **FeaturesScrollSection** - `grain-overlay` on sticky image
- **VisualSection** - `grain-overlay` on orbital animation section
- **Testimonials** - `grain-dark` on dark testimonial card
- **CTA** - `grain-dark` on dark section

---

## 5. DEPTH & ELEVATION

| Class | Usage |
|-------|-------|
| `depth-sm` | Subtle cards, badges |
| `depth-md` | Standard cards |
| `depth-lg` | Featured elements |
| `depth-xl` | Hero elements |

### Card Patterns
```tsx
// Standard elevated card
<div className="card-elevated p-6 rounded-2xl">

// Glass elevated card
<div className="card-glass-elevated p-6 rounded-2xl">
```

---

## 6. GLOW EFFECTS

### Static Glows
| Class | Color |
|-------|-------|
| `glow-primary` | Raspberry |
| `glow-raspberry` | Raspberry |
| `glow-coral` | Coral |
| `glow-amber` | Amber |
| `glow-gold` | Gold |
| `glow-accent` | Amber (replaces indigo) |

### Interactive Hover Glows
| Class | Effect |
|-------|--------|
| `hover-glow-raspberry` | Raspberry glow on hover |
| `hover-glow-amber` | Amber glow on hover |

---

## 7. BUTTON VARIANTS

### Primary Actions
```tsx
<Button variant="brandAction" size="lg" className="rounded-full">
  Get Started <ArrowRight className="w-4 h-4" />
</Button>
```

### Secondary Actions
```tsx
<Button variant="brandOutline" size="lg" className="rounded-full">
  Learn More
</Button>
```

### Available Variants
- `brand` - Primary raspberry
- `brandAction` - Primary CTA (raspberry with glow)
- `brandAccent` - Amber accent (for Enterprise, tertiary actions)
- `brandOutline` - Outlined raspberry
- `brandOutlineAccent` - Outlined amber

### Button Sizes
- `sm` - 36px height
- `default` - 40px height
- `lg` - 44px height

---

## 8. ANIMATION PATTERNS

### Standard Easing
```tsx
const STANDARD_EASE = [0.25, 0.1, 0.25, 1]
```

### Entrance Animation (Framer Motion)
```tsx
<motion.div
  initial={{ opacity: 0, y: 20 }}
  whileInView={{ opacity: 1, y: 0 }}
  viewport={{ once: true }}
  transition={{ duration: 0.5, ease: [0.25, 0.1, 0.25, 1] }}
>
```

### Staggered Children
```tsx
{items.map((item, index) => (
  <motion.div
    key={index}
    initial={{ opacity: 0, y: 20 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true }}
    transition={{
      duration: 0.4,
      delay: index * 0.1,
      ease: [0.25, 0.1, 0.25, 1]
    }}
  >
    {/* Item */}
  </motion.div>
))}
```

### Aurora Background Animation
```tsx
{/* Add to sections needing animated background */}
<div className="absolute inset-0 overflow-hidden pointer-events-none">
  <motion.div
    className="absolute top-0 right-0 w-[600px] h-[600px] rounded-full"
    style={{
      background: 'radial-gradient(circle, rgba(229,72,104,0.15) 0%, transparent 70%)',
    }}
    animate={{
      scale: [1, 1.1, 1],
      opacity: [0.4, 0.6, 0.4],
    }}
    transition={{
      duration: 8,
      repeat: Infinity,
      ease: 'easeInOut',
    }}
  />
</div>
```

---

## 9. COMPONENT PATTERNS

### Section Header
```tsx
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
      Section description text goes here.
    </p>
  </motion.div>
</div>
```

### Feature Card
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

{/* Amber variant for People Intelligence */}
<motion.div
  initial={{ opacity: 0, y: 20 }}
  whileInView={{ opacity: 1, y: 0 }}
  viewport={{ once: true }}
  className="p-8 rounded-3xl glass depth-md hover-glow-amber transition-all duration-300"
>
  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-berri-amber to-berri-gold flex items-center justify-center mb-6">
    <Icon className="w-6 h-6 text-white" />
  </div>
  <h3 className="text-xl font-heading font-semibold mb-3">Title</h3>
  <p className="text-gray-600">Description</p>
</motion.div>
```

### Stats Card
```tsx
<div className="glass-strong rounded-xl p-4 depth-sm hover-glow-raspberry transition-all">
  <div className="text-2xl font-heading font-bold text-gray-900">1.4M+</div>
  <div className="text-sm text-gray-500">People & Orgs</div>
</div>
```

### Testimonial Card
```tsx
<div className="flex gap-4">
  <div className="w-32 h-32 rounded-3xl glass-strong depth-sm p-3">
    <Image src={avatar} alt={name} className="rounded-2xl" />
  </div>
  <div className="flex-1 p-6 glass rounded-3xl depth-sm">
    <div className="flex gap-1 mb-4">
      {[...Array(5)].map((_, i) => (
        <Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />
      ))}
    </div>
    <blockquote className="text-gray-700 mb-4">"{quote}"</blockquote>
    <div className="font-semibold">{author}</div>
    <div className="text-sm text-gray-500">{role}</div>
  </div>
</div>
```

---

## 10. BADGE PATTERNS

### Status Badge
```tsx
<span className="inline-flex items-center px-3 py-1 rounded-full bg-berri-raspberry/10 text-berri-raspberry text-sm font-semibold">
  <span className="w-2 h-2 rounded-full bg-berri-green mr-2 animate-pulse" />
  Active
</span>
```

### Feature Badge
```tsx
<span className="inline-flex items-center px-4 py-1.5 rounded-full glass-raspberry text-berri-raspberry text-sm font-medium">
  New Feature
</span>
```

### Metric Badge
```tsx
<span className="inline-flex items-center px-3 py-1 rounded-full bg-berri-raspberry/10 text-berri-raspberry text-sm font-semibold">
  +150% Growth
</span>
```

---

## 11. ICON USAGE

### Import Pattern
```tsx
import {
  ArrowRight, ArrowUpRight, Check,
  Building2, Users, Route, TrendingUp,
  // Add as needed from lucide-react
} from 'lucide-react'
```

### Icon Sizes
| Context | Size |
|---------|------|
| Buttons | `w-4 h-4` |
| Cards | `w-5 h-5` or `w-6 h-6` |
| Feature icons | `w-6 h-6` inside containers |
| Large decorative | `w-8 h-8` or larger |

---

## 12. RESPONSIVE PATTERNS

### Breakpoints (Tailwind defaults)
- `sm`: 640px
- `md`: 768px
- `lg`: 1024px
- `xl`: 1280px
- `2xl`: 1536px

### Common Responsive Patterns
```tsx
// Typography scaling
text-3xl md:text-4xl lg:text-5xl

// Layout changes
grid-cols-1 md:grid-cols-2 lg:grid-cols-3

// Spacing scaling
gap-8 lg:gap-12

// Visibility
hidden lg:flex
flex lg:hidden

// Order changes (mobile-first content priority)
order-2 lg:order-1
```

---

## 13. PAGE BUILDING CHECKLIST

### Before Building
- [ ] Define page sections (typically 4-6 for landing pages)
- [ ] Plan section types (hero, features, testimonials, CTA, etc.)
- [ ] Identify required components
- [ ] Prepare content and assets

### Section Structure
- [ ] Use `'use client'` if animations needed
- [ ] Import framer-motion for animations
- [ ] Import required icons from lucide-react
- [ ] Import Button from `@/components/ui/button`
- [ ] Import Image from `next/image` for images
- [ ] Import Link from `next/link` for links

### For Each Section
- [ ] Wrap in `<section>` with appropriate `py-` and `bg-` classes
- [ ] Add container div with standard padding pattern
- [ ] Add section header (badge, title, description)
- [ ] Implement content with grid layout
- [ ] Add entrance animations
- [ ] Test responsive behavior

### Quality Checks
- [ ] Alternating section backgrounds
- [ ] Consistent spacing between sections
- [ ] All images use Next Image component
- [ ] All internal links use Next Link
- [ ] Animations trigger once on scroll
- [ ] Mobile navigation works correctly
- [ ] CTA buttons are prominent and consistent

---

## 14. EXISTING COMPONENTS TO REUSE

| Component | Path | Usage |
|-----------|------|-------|
| Button | `@/components/ui/button` | All buttons |
| Navbar | `@/components/marketing/Navbar` | Via layout (automatic) |
| Footer | `@/components/marketing/Footer` | Via layout (automatic) |
| Hero | `@/components/marketing/Hero` | Homepage hero |
| CTA | `@/components/marketing/CTA` | Bottom CTA sections |
| Testimonials | `@/components/marketing/Testimonials` | Social proof sections |
| FeaturesScrollSection | `@/components/marketing/FeaturesScrollSection` | Interactive features |
| VisualSection | `@/components/marketing/VisualSection` | Orbital animation |
| NetworkAnimation | `@/components/marketing/NetworkAnimation` | Hero animation |

---

## 15. FILE STRUCTURE FOR NEW PAGES

```
src/app/(marketing)/
├── layout.tsx              # Shared Navbar + Footer
├── page.tsx                # Homepage
├── about/page.tsx          # About page
├── pricing/page.tsx        # Pricing page
├── careers/page.tsx        # Careers page
├── platform/
│   ├── pathfinder/page.tsx
│   ├── company-intelligence/page.tsx
│   └── people-intelligence/page.tsx
├── use-cases/
│   ├── for-founders/page.tsx
│   ├── for-sales-bd/page.tsx
│   └── for-gtm-marketing/page.tsx
└── resources/
    ├── blog/page.tsx
    ├── case-studies/page.tsx
    └── contact/page.tsx
```

---

## 16. QUICK START TEMPLATE

```tsx
'use client'

import { motion } from 'framer-motion'
import { ArrowRight, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import Image from 'next/image'

export default function PageName() {
  return (
    <>
      {/* Hero Section */}
      <section className="py-24 lg:py-32 bg-gray-50 relative overflow-hidden">
        <div className="container mx-auto px-8 md:px-20 lg:px-32 xl:px-40">
          <div className="max-w-3xl mx-auto text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <span className="inline-flex items-center px-4 py-1.5 rounded-full glass-raspberry text-berri-raspberry text-sm font-medium mb-6">
                Page Label
              </span>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-heading font-extrabold tracking-tight mb-6">
                Page Headline
              </h1>
              <p className="text-lg text-gray-700 mb-8">
                Page description goes here.
              </p>
              <div className="flex flex-wrap justify-center gap-4">
                <Button variant="brandAction" size="lg" className="rounded-full">
                  Primary CTA <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
                <Button variant="brandOutline" size="lg" className="rounded-full">
                  Secondary CTA
                </Button>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24 bg-white">
        <div className="container mx-auto px-8 md:px-20 lg:px-32 xl:px-40">
          {/* Section Header */}
          <div className="text-center max-w-3xl mx-auto mb-16">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
            >
              <h2 className="text-3xl md:text-4xl lg:text-5xl font-heading font-extrabold mb-6">
                Section Title
              </h2>
              <p className="text-lg text-gray-600">
                Section description.
              </p>
            </motion.div>
          </div>

          {/* Features Grid */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
            {/* Feature Cards */}
          </div>
        </div>
      </section>

      {/* CTA Section - Import and use existing */}
      {/* <CTA /> */}
    </>
  )
}
```

---

## Summary

This design system provides everything needed to build consistent, professional marketing pages for Berri. Follow the patterns, use the existing components, and maintain the **"Sunset Suite"** warm-but-premium brand aesthetic with the raspberry/coral/amber color scheme, glassmorphism effects, and smooth Framer Motion animations.

**Key Principles:**
1. **Premium & Confident** - Warm palette (raspberry + coral + amber) that avoids typical AI/tech blues
2. **Modern glassmorphism aesthetic** - Use glass effects for depth and elegance
3. **Consistent container padding** - `px-8 md:px-20 lg:px-32 xl:px-40`
4. **Smooth, subtle animations** - Standard easing `[0.25, 0.1, 0.25, 1]`
5. **Mobile-first responsive design** - All layouts work on mobile first
6. **Reuse existing components where possible** - Maintain consistency

**Gradient Progressions:**
- **Pathfinder**: `from-berri-raspberry to-berri-coral`
- **Company Intelligence**: `from-berri-coral to-berri-amber`
- **People Intelligence**: `from-berri-amber to-berri-gold`

**Enterprise Tier Pattern:**
Use dark inverted cards (`bg-berri-charcoal`) with amber/gold accents for premium differentiation.
