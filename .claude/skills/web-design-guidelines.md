---
name: web-design-guidelines
description: Vercel Labs design principles - spacing, sizing, rhythm, performance
---

# Web Design Guidelines - Vercel

## Spacing Scale (8px base)
- space-1: 4px
- space-2: 8px
- space-4: 16px
- space-6: 32px

## Typography Scale
- text-xs: 12px
- text-sm: 14px
- text-base: 16px
- text-lg: 20px
- text-xl: 24px

## Border Radius
- sm: 2px
- default: 4px
- lg: 8px
- full: 999px

## Z-Index
- base: 0
- dropdown: 10
- sticky: 20
- modal: 50

## Shadows
- sm: 0 1px 2px rgba(0,0,0,0.05)
- md: 0 10px 15px rgba(0,0,0,0.1)
- lg: 0 20px 25px rgba(0,0,0,0.1)

## Animation Duration
- hover: 100ms
- transition: 200ms
- page: 300-500ms
- entrance: 400ms

## Motion Easing
- ease-out: cubic-bezier(0.4, 0, 0.2, 1)
- ease-in-out: cubic-bezier(0.4, 0, 0.2, 1)

## Performance
- Use transform for animations (GPU)
- Minimize repaints
- Lazy load images
- CSS Grid/Flexbox layout
