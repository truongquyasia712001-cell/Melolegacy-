---
name: awesome-design
description: Industry standards from Stripe, Apple, Linear - patterns & best practices
---

# Awesome Design - Industry Best Practices

## Stripe Principles
- Clarity & Confidence
- Consistency (one button style)
- Efficiency (minimize steps)

## Apple Principles
- Simplicity (minimal interface)
- Human-Centered (touch-first)
- Integration (hardware sensors)

## Linear Principles
- Component-Driven
- Scalability (light & dark modes)
- Developer Experience (TypeScript)

## Common Patterns

### Buttons
- Primary: bg-blue-600 text-white
- Secondary: border border-gray-300
- Disabled: opacity-50 cursor-not-allowed

### Cards
- Border: border border-gray-200
- Rounded: rounded-lg
- Shadow: shadow-sm hover:shadow-md

### Form Input
- Border: border border-gray-300
- Focus: focus:ring-2 focus:ring-blue-500
- Error: aria-invalid=true + red text

### Empty State
- Icon + text + action button
- Centered, large spacing
- Gentle colors

### Loading State
- Animate pulse (shimmer)
- or spinner animation

### Notifications
- Toast position: bottom-right
- Auto-dismiss: 3-5 seconds
- Color by type: green/red/yellow

## Color Intent
| Intent | Color |
|--------|-------|
| Primary | Blue (#2563eb) |
| Success | Green (#10b981) |
| Error | Red (#ef4444) |
| Warning | Yellow (#f59e0b) |
| Neutral | Gray (#6b7280) |

## Responsive Breakpoints
- Mobile: <640px (single column)
- Tablet: 640-1024px (2 columns)
- Desktop: >1024px (3+ columns)

## Touch Targets
- Minimum: 44×44px
- Recommended: 48×48px
- Spacing: 8px between targets

## Implementation Checklist
- [ ] Consistent color palette
- [ ] 44px+ buttons (touch)
- [ ] Loading/error states
- [ ] Empty state
- [ ] Dark mode
- [ ] Responsive tested
- [ ] WCAG AA accessibility
- [ ] Lighthouse ≥90
