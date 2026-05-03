
## 2025-05-14 - [Chat List Performance Optimization]
**Learning:** In React Native `FlatList`, rendering complex item structures inline within `renderItem` causes expensive re-renders for every item on every parent state update (e.g., during token streaming). Extracting these to `React.memo` components and using stable callbacks (`useCallback`) significantly improves scroll performance and UI responsiveness.
**Action:** Always extract `FlatList` items to memoized components when the parent state updates frequently.

## 2025-05-14 - [CI Billing Issue Detected]
**Learning:** GitHub CI checks might fail with "account is locked due to a billing issue" which is outside of my control as an agent. However, I must still ensure the code is correct and passes local lint/typecheck.
**Action:** Ignore "billing issue" CI failures if local checks pass and the code is verified correct.
