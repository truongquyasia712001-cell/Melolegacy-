---
name: image-to-code
description: Convert design screenshots to React/HTML code using vision analysis
---

# Image to Code - Design Screenshots → Source Code

## Workflow
1. User uploads design screenshot
2. Analyze layout, colors, typography
3. Generate React component

## Analysis Process

### Layout Detection
- Top bar/header
- Sidebar (left/right)
- Main content area
- Footer
- Grid vs flex layout

### Color Extraction
- Primary colors
- Neutral colors
- Semantic colors (green/red)
- Generate Tailwind classes

### Typography Recognition
- Heading levels (h1, h2, h3)
- Body text (font size, line height)
- Button text
- Icons

### Component Identification
- Buttons (primary, secondary, disabled)
- Cards (borders, shadows)
- Inputs (text, dropdown, radio, checkbox)
- Modals (centered, sized)
- Lists (horizontal, vertical)

## Code Generation Examples

### Button → React
```jsx
<button className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-6 py-3 rounded-lg">
  Save Score
</button>
```

### Card → React
```jsx
<div className="border-l-4 border-blue-600 bg-white p-4 shadow-sm rounded-lg">
  <h3 className="font-semibold">Untitled Score</h3>
  <p className="text-gray-600 text-sm">5 measures • 4/4 time</p>
</div>
```

### Form Input → React
```jsx
<input
  type="text"
  placeholder="Composer name"
  className="border border-gray-300 px-4 py-2 rounded-lg w-full focus:ring-2 focus:ring-blue-500"
/>
```

### Layout Grid → React
```jsx
<div className="grid grid-cols-1 md:grid-cols-3 gap-6">
  {items.map(item => (
    <div key={item.id} className="rounded-lg border p-4">
      {/* Card content */}
    </div>
  ))}
</div>
```

## Tailwind Mapping

### Shadows
- Light: shadow-sm
- Medium: shadow-md
- Dark: shadow-lg

### Spacing
- 4px: gap-1
- 8px: gap-2
- 16px: gap-4

### Border Radius
- Slightly: rounded
- Very: rounded-lg
- Pills: rounded-full

### Font Size
- Small: text-sm (14px)
- Body: text-base (16px)
- Large: text-lg (18px)
- Heading: text-2xl (24px)

## Best Practices
- ✅ Use Tailwind for responsive
- ✅ Extract reusable components
- ✅ Semantic HTML
- ✅ Alt text for images
- ✅ Keyboard navigation
- ❌ Hard-code colors
- ❌ Inline styles
- ❌ Skip hover/focus

## Quality Checklist
- [ ] Appears as designed
- [ ] Responsive on all devices
- [ ] Touch targets ≥44px
- [ ] Color contrast ≥4.5:1
- [ ] Keyboard accessible
- [ ] 60fps smooth
- [ ] TypeScript types
- [ ] Props documented
