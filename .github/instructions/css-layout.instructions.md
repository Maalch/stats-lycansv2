---
description: "Use when editing CSS layout, spacing, or display properties in component stylesheets. Covers vertical margin rules and pill/badge element patterns."
applyTo: "**/*.css"
---
# CSS Layout Conventions

## Vertical Spacing Between Siblings

Never use `display: inline-block` or `display: inline-flex` on elements that need vertical margins between them. Inline-level elements in the same flow ignore `margin-top`/`margin-bottom` between siblings.

```css
/* ❌ WRONG: margin-top has no effect between inline siblings */
.badge { display: inline-flex; }
.highlight { display: inline-block; margin-top: 0.75rem; }

/* ✅ CORRECT: block-level respects vertical margins */
.badge { display: inline-flex; }
.highlight { display: block; width: fit-content; margin-top: 0.75rem; }
```

## Pill/Badge Elements

For pill-shaped elements (badges, tags, highlights) that need to sit on their own line with spacing:
- Use `display: block` + `width: fit-content` (not `inline-block`)
- This ensures vertical margins work while keeping the element sized to content
