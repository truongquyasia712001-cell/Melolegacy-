---
name: ui-skill
description: Taste Skill - Distinctive, intentional visual design for Melolegacy
---

# UI Skill - Melolegacy Design

## 🎨 Color Palette

### Day Mode (6:00 - 18:00)
- Primary: #1f2937 (dark gray)
- Success: #10b981 (green)
- Error: #ef4444 (red)
- Background: #ffffff (white)
- Text: #000000 (black)
- Staff lines: #000000 (black)
- Border: #d1d5db (light gray)

### Night Mode (18:00 - 6:00)
- Primary: #60a5fa (light blue)
- Success: #34d399 (lighter green)
- Error: #f87171 (lighter red)
- Background: #0f172a (dark navy)
- Text: #f3f4f6 (light gray)
- Staff lines: #e5e7eb (light gray)
- Border: #374151 (dark gray)

## 🕐 Time-Based Mode Detection

```javascript
const getTimeBasedMode = () => {
  const hour = new Date().getHours()
  return (hour >= 6 && hour < 18) ? 'light' : 'dark'
}

// Apply on mount
useEffect(() => {
  const mode = getTimeBasedMode()
  document.documentElement.setAttribute('data-theme', mode)
  
  // Update every minute
  const interval = setInterval(() => {
    const newMode = getTimeBasedMode()
    document.documentElement.setAttribute('data-theme', newMode)
  }, 60000)
  
  return () => clearInterval(interval)
}, [])
```

## 🌅 CSS Variables

```css
/* Day Mode (Default) */
:root[data-theme="light"] {
  --color-bg: #ffffff;
  --color-text: #000000;
  --color-primary: #1f2937;
  --color-success: #10b981;
  --color-error: #ef4444;
  --color-border: #d1d5db;
  --color-staff: #000000;
}

/* Night Mode */
:root[data-theme="dark"] {
  --color-bg: #0f172a;
  --color-text: #f3f4f6;
  --color-primary: #60a5fa;
  --color-success: #34d399;
  --color-error: #f87171;
  --color-border: #374151;
  --color-staff: #e5e7eb;
}

/* Apply colors */
body {
  background-color: var(--color-bg);
  color: var(--color-text);
  transition: background-color 300ms ease, color 300ms ease;
}

button {
  background-color: var(--color-primary);
  color: var(--color-bg);
}

.staff-line {
  stroke: var(--color-staff);
}
```

## 🎯 Component Styling

### Day Mode (6h-18h)
- Buttons: Dark gray (#1f2937) on white
- Cards: White background, dark border
- Icons: Black
- Music staff: Black lines
- Hover: Slight shade darker

### Night Mode (18h-6h)
- Buttons: Light blue (#60a5fa) on dark bg
- Cards: Dark navy background, gray border
- Icons: Light gray
- Music staff: Light gray lines
- Hover: Slight shade lighter

## 📱 iPad Optimization
- Both modes: 44px minimum touch targets
- Dark mode: Better eye strain reduction at night
- Smooth transition: 300ms when switching modes

## ♿ Accessibility
- Light mode: WCAG AA contrast (4.5:1)
- Dark mode: WCAG AA contrast (4.5:1)
- Color not only indicator (use icons + text)

## 🎬 Animation
- Duration: 200ms (day mode)
- Duration: 200ms (night mode)
- Theme transition: 300ms fade

## 📝 Implementation Notes
- Auto-detect time every minute
- Smooth CSS transition between modes
- Allow manual override (optional settings)
- Use CSS variables for easy switching
- Test on iPad both day & night
