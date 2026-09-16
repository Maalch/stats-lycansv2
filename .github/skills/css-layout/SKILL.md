---
name: css-layout
user-invocable: false
description: "Use when editing CSS, component stylesheets, layout, spacing, display properties, theme colors, pills, badges, tags, or highlights in stats-lycansv2."
---

# CSS Layout

Use the existing stylesheet organization under `src/styles/` and component-local stylesheets. Reuse CSS custom properties from `src/styles/theme/variables.css` instead of introducing isolated theme colors.

## Vertical Spacing Between Siblings

Do not use `display: inline-block` or `display: inline-flex` on elements that need vertical margins between siblings. Inline-level elements in the same flow do not provide reliable vertical separation.

```css
/* Wrong: margin-top has no effect between inline siblings. */
.badge { display: inline-flex; }
.highlight { display: inline-block; margin-top: 0.75rem; }

/* Correct: block layout preserves spacing and content-sized width. */
.badge { display: inline-flex; }
.highlight { display: block; width: fit-content; margin-top: 0.75rem; }
```

For pill-shaped badges, tags, or highlights that sit on their own line, use `display: block` with `width: fit-content`.