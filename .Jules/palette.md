## 2026-05-03 - [Mobile UX Haptics & Accessibility]
**Learning:** In mobile environments like Expo, user interactions such as long-pressing messages or sending them benefit significantly from haptic feedback to provide physical confirmation. Additionally, combining logical components (like MessageBubble) ensures accessibility improvements (ARIA labels, roles) and visual states (streaming cursor) are consistent across the app.
**Action:** Always check if a component is reused or should be refactored into a reusable component when implementing UX improvements to ensure consistency.

## 2026-05-03 - [Nav & Button Accessibility]
**Learning:** Common UI components and navigation headers are high-traffic areas where missing accessibility roles and labels significantly impact screen reader users. Adding `accessibilityRole="button"` and descriptive `accessibilityLabel` ensures clear navigation.
**Action:** Audit top-level navigation components for basic accessibility attributes early in the development process.
