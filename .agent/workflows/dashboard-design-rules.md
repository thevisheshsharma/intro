---
description: Dashboard light mode redesign - design rules and styling standards
---

# Dashboard Design System Rules

Apply these rules when redesigning any dashboard component to the new light mode standard.

## Color Palette

### Primary Colors
- **Raspberry (Primary)**: `#E54868` / `berri-raspberry` - CTAs, highlights, active states
- **Coral (Accent)**: `#FF7F6B` / `berri-coral` - Secondary accents, gradients
- **Amber (Tertiary)**: `#FFB347` / `berri-amber` - Points, rewards, warnings

### Neutral Colors
- **Background**: `#FFFFFF` (white) or `bg-gray-50` for subtle sections
- **Card Background**: `#FFFFFF` with shadow
- **Text Primary**: `text-gray-900`
- **Text Secondary**: `text-gray-500`
- **Text Muted**: `text-gray-400`
- **Borders**: `border-gray-100` or `border-gray-200/80`

## Typography

- **Headings**: `font-heading font-bold` (page titles: `text-3xl`, section: `text-lg`)
- **Body**: `text-[15px]` or `text-sm` for secondary
- **Labels**: `text-xs font-medium text-gray-500`
- **Values**: `font-medium text-gray-900`

## Spacing

- **Page Padding**: `py-8 px-6 lg:px-10`
- **Section Margin**: `mb-8` or `mb-10`
- **Card Padding**: `p-6` standard, `p-8` for larger cards
- **Element Gap**: `gap-4` or `gap-5` in grids

## Cards & Containers

```css
/* Standard Card */
bg-white rounded-2xl p-6 shadow-sm border border-gray-100/60

/* Elevated Card */
bg-white rounded-2xl p-6 shadow-md border border-gray-100/60

/* Shadow-only Card (no border) */
bg-white rounded-2xl p-6 shadow-[0_2px_20px_-4px_rgba(0,0,0,0.08)]
```

## Buttons

### Primary Button
```css
bg-berri-raspberry hover:bg-berri-raspberry/90 text-white rounded-xl px-4 py-2.5 font-medium
transition-all duration-200 shadow-md shadow-berri-raspberry/25
```

### Ghost Button
```css
text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-xl px-4 py-2.5
transition-all duration-200
```

### Icon Button (Circular)
```css
w-10 h-10 rounded-full bg-berri-raspberry/10 hover:bg-berri-raspberry
text-berri-raspberry hover:text-white transition-all duration-200
```

## Tables

### Container
```css
bg-white rounded-2xl border border-gray-100/60 overflow-hidden
```

### Header Row
```css
bg-gray-50 px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider
```

### Body Row
```css
px-4 py-4 border-t border-gray-100 hover:bg-gray-50/50 transition-colors
```

### Row Text
- Primary: `text-sm font-medium text-gray-900`
- Secondary: `text-sm text-gray-500`

## Pills & Badges

### Stats Pill
```css
flex items-center gap-2 px-3 py-1.5 bg-white rounded-full shadow-sm border border-gray-100/60
```

### Tag/Badge
```css
px-2.5 py-1 bg-gray-100 text-gray-700 rounded-lg text-xs font-medium
```

### Colored Badge
```css
px-2.5 py-1 bg-berri-raspberry/10 text-berri-raspberry rounded-lg text-xs font-medium
```

## Form Inputs

### Text Input
```css
bg-white rounded-xl px-4 py-3 text-[15px] text-gray-900 border-none
shadow-[0_2px_20px_-4px_rgba(0,0,0,0.08)]
focus:outline-none focus:ring-0 focus:shadow-[0_4px_24px_-4px_rgba(229,72,104,0.15)]
placeholder:text-gray-400
```

### Select
```css
bg-white rounded-xl px-4 py-3 text-[15px] text-gray-900 border border-gray-200
focus:border-berri-raspberry focus:ring-2 focus:ring-berri-raspberry/10
```

## Icons

- Use **line-based** icons (strokeWidth 1.5)
- Primary icons: `text-berri-raspberry`
- Secondary icons: `text-gray-400` or `text-gray-500`
- Size: `w-4 h-4` or `w-5 h-5`

## Hover & Transitions

```css
transition-all duration-200        /* Fast */
transition-all duration-300        /* Standard */
hover:shadow-lg                    /* Elevation on hover */
hover:-translate-y-0.5             /* Subtle lift */
hover:scale-105                    /* Scale for icons/buttons */
```

## DO NOT USE

- ❌ Dark mode colors (`bg-gray-800`, `bg-gray-900`, etc.)
- ❌ Neon/glow effects
- ❌ Heavy borders (use shadows instead)
- ❌ Filled icons (use line/stroke icons)
- ❌ `text-white` on dark backgrounds (except buttons)
- ❌ Hard shadows (use soft shadows with low opacity)
