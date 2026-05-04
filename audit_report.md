# Detailed Code Audit Report - Ollama Mobile

## 1. Security Analysis

### 1.1 Insecure API Key Storage (Critical)
The legacy `useServerStore.ts` stores API keys in plain text within MMKV storage. MMKV files are not encrypted by default on disk, making these keys vulnerable on rooted/jailbroken devices or via backup exploits.
- **Affected File:** `src/store/useServerStore.ts`
- **Recommendation:** Migrate all server configurations to `useProviderStore.ts`, which correctly utilizes `expo-secure-store` for sensitive data and uses the `partialize` middleware to exclude keys from MMKV persistence.

### 1.2 Secret Redaction (Good)
The `useDiagnosticsStore.ts` implements a robust redaction system for logs. This is a positive security pattern that prevents accidental exposure of credentials in diagnostics exports.

---

## 2. Architectural Analysis

### 2.1 Store Redundancy
There is a significant overlap between `useServerStore.ts` and `useProviderStore.ts`.
- `useServerStore` is the older implementation and is currently used in the primary `SettingsSheet.tsx`.
- `useProviderStore` is the newer, unified implementation that supports Ollama, ZeroClaw, and Jules, but it is currently underutilized.
- **Recommendation:** Consolidate into `useProviderStore`. Remove `useServerStore` once migration is complete.

### 2.2 API Client Robustness
- **Timeouts:** Many API calls (e.g., in `ollamaClient.ts` and `julesApiService.ts`) lack explicit timeouts. This can lead to the app hanging on poor network connections.
- **WebSocket Stability:** The `zeroclawClient.ts` does not implement a heartbeat mechanism or explicit connection timeouts beyond the initial handshake.
- **Recommendation:** Implement `AbortController` for all fetch requests and add heartbeat/timeout logic to WebSocket clients.

### 2.3 Database Schema
The `src/db/schema.ts` includes a `repos` table and related operations that seem orphaned or part of a partially implemented feature (Git integration).
- **Recommendation:** Clean up dead schema entries if they are not planned for the immediate roadmap.

---

## 3. Code Quality & Type Safety

### 3.1 Type Safety
There is extensive use of the `any` type throughout the codebase, particularly in store-to-component boundaries and API response handling.
- **Recommendation:** Define strict interfaces for all API responses and component props to leverage TypeScript's full potential.

### 3.2 Linting & Formatting
The project has over 400 linting warnings/errors. Many are related to Prettier formatting and import ordering.
- **Recommendation:** Run `npm run lint -- --fix` and enforce linting in a CI/CD pipeline.

---

## 4. UI/UX Consistency

### 4.1 Theme & Styling
- **Hardcoded Colors:** Most components use hardcoded hex values (e.g., `#30d158`, `#1c1c1e`) instead of a centralized theme object.
- **Inconsistent Palette:** The UI component `Button.tsx` uses a purple accent (`#8B5CF6`) which contradicts the green accent (`#30D158`) used in the rest of the application.
- **Recommendation:** Implement a centralized theme configuration (e.g., via Tailwind/NativeWind or a React Context provider).

---

## 5. Testing Infrastructure

### 5.1 Jest Configuration
Some tests fail due to transformation issues with `react-native` internals.
- **Finding:** The `babel.config.js` and `jest.config.js` might need adjustment to properly handle ESM modules in `node_modules`.
- **Recommendation:** Update `transformIgnorePatterns` in `jest.config.js` to include problematic native modules.

---

## 6. Summary of Recommendations

1. **Immediate:** Refactor `SettingsSheet.tsx` to use `useProviderStore` and secure API key storage.
2. **Short-term:** Add timeouts to all network requests.
3. **Short-term:** Standardize the color palette and move to a theme-based styling approach.
4. **Long-term:** Improve type coverage and resolve all linting errors.
