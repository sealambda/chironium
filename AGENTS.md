# Agent Instructions

## Package Manager

Always use **pnpm** for package management. Do not use npm, yarn, bun, or any other package manager.

```bash
# Install dependencies.
pnpm install

# Add a package.
pnpm add <package-name>

# Add a dev dependency.
pnpm add -D <package-name>

# Run scripts.
pnpm <script-name>
```

## Writing and Formatting Standards

All displayable text (comments, documentation, logs, errors, UI messages) must be high quality, concise, non-redundant, minimal yet readable, comprehensive, understandable, meaningful, clean, and well-formatted.

### General Rules

- Full sentences (containing a verb) must end with a period and be grammatically correct.
- Fragments without verbs (labels, titles, section headers) do not need periods.
- Avoid redundancy. Say it once, say it well.
- Prefer active voice over passive voice.
- Use consistent terminology throughout the codebase.

### Inline Comments

- Explain **why**, not **what**. The code shows what; comments explain intent.
- Keep comments on the same line when short, above the code when longer.
- Parenthetical remarks are part of the sentence; end with a period after the closing parenthesis.

**Remove comments that are:**

- Obvious from the code itself (e.g., `// Loop through items` before a `for` loop).
- Restating what a well-named function or variable already conveys.
- Outdated or no longer accurate.
- Placeholder or debug comments (e.g., `// TODO: fix this`, `// temp`).

**Add comments when:**

- The code implements a non-obvious algorithm, workaround, or edge case.
- Business logic or domain rules aren't self-evident from the code.
- External constraints drive the implementation (e.g., API quirks, browser bugs).
- Magic numbers or regex patterns need clarification.

```typescript
// Bad: Restates the obvious.
// Filter active users.
const active = users.filter((u) => u.isActive);

// Good: Explains the why.
// Exclude soft-deleted users from billing calculations.
const billable = users.filter((u) => !u.deletedAt);

// Good: Clarifies non-obvious logic.
// Offset by 1 because the API uses 1-based pagination.
const page = index + 1;
```

### Documentation

- Lead with the most important information.
- Use complete sentences for descriptions.
- Keep examples minimal but illustrative.

### Logs

- Use appropriate log levels: `debug`, `info`, `warn`, `error`.
- Include relevant context without verbosity.
- Format: `[context] action: detail` when applicable.

```typescript
// Bad
console.log("here");

// Good
console.info("[Auth] User authenticated:", userId);
```

### Error Messages

- State what went wrong and, when possible, how to fix it.
- Be specific. Avoid vague messages like "Something went wrong."
- Include relevant identifiers or values for debugging.

```typescript
// Bad
throw new Error("Invalid input");

// Good
throw new Error(`Customer email "${email}" is not a valid email address.`);
```

### UI Text

- Be direct and user-friendly.
- Use sentence case for messages, title case for headings.
- Avoid technical jargon in user-facing text.

## Module Architecture & Dependency Direction

The frontend codebase follows a strict module dependency hierarchy to maintain clean architecture and prevent circular dependencies.

### Layer Hierarchy (Bottom to Top)

```
routes/          ← Entry points, delegates to app/features/shared
    ↓
app/             ← Application composition layer (providers, layout, router)
    ↓
features/        ← Domain-specific modules (customers, org, user)
    ↓
shared/          ← Reusable primitives with no business logic
    ↓
gql/             ← Generated GraphQL types (codegen output)
```

### Dependency Rules

1. **`shared/`** → May only import from other `shared/` modules or `gql/`
   - Contains: UI primitives, utilities, types, layout primitives (bottom-nav, side-nav, nav-items)
   - **NEVER** imports from `features/` or `app/`

2. **`features/`** → May import from `shared/` and `gql/`
   - Contains: Business logic, API calls, stores, feature-specific UI
   - **NEVER** imports from `app/` or other features (cross-feature deps should go through shared)

3. **`app/`** → May import from `features/`, `shared/`, and `gql/`
   - Contains: Providers, router, layout components that compose features
   - This is the **composition layer** that bridges shared primitives with features
   - Layout components that need feature access (TopNav, QuickActions, AppShell) live here

4. **`routes/`** → May import from `app/`, `features/`, and `shared/`
   - Contains: Route definitions only, delegates to feature pages
   - No business logic in route files

### Example: Layout Components

```
shared/layout/      ← Pure layout primitives (no feature deps)
├── bottom-nav.tsx  ← Uses nav-items.ts only
├── side-nav.tsx    ← Uses nav-items.ts only
└── nav-items.ts    ← Pure data, no imports

app/layout/         ← Feature-aware layout composition
├── app-shell.tsx   ← Composes SideNav, BottomNav, TopNav
├── top-nav.tsx     ← Uses org store, user hook, OrgSelectorCombobox
└── quick-actions.tsx ← Uses customers store for route-aware actions
```

### Circular Dependency Prevention

- Run `npx madge --circular --extensions ts,tsx src/` to check for cycles
- If a circular import is detected, refactor shared logic to a lower layer
- Use barrel exports (`index.ts`) sparingly to avoid transitive cycles

### Feature Directory Structure

All feature modules follow a consistent directory structure:

```
features/<feature-name>/
├── api/              # GraphQL queries, mutations, API functions
│   └── <feature>-api.ts
├── hooks/            # Custom React hooks (optional, if needed)
│   └── use-<feature>.ts
├── model/            # Types, schemas, and data models
│   ├── <feature>-types.ts
│   └── <feature>-schema.ts
├── store/            # Zustand stores and sync components
│   ├── <feature>-store.ts
│   └── <feature>-store-sync.tsx
├── ui/               # React components
│   └── <component-name>.tsx
├── utils/            # Utility functions (optional)
│   └── <utility-name>.ts
├── pages/            # Page components (optional)
│   └── <feature>-page.tsx
└── index.ts          # Public API barrel export
```

**Directory Guidelines:**

- **Required:** `api/`, `model/`, `store/`, `ui/`, `index.ts`
- **Optional:** `hooks/`, `utils/`, `pages/` (create only if needed)
- **Don't create empty directories** - add them when you have content

**index.ts Pattern:**

Each feature exposes a clean public API through `index.ts`:

```typescript
// API
export { fetchItems, createItem } from "./api/items-api";
export type { CreateItemInput } from "./api/items-api";

// Model
export type { Item, ItemStatus } from "./model/item-types";
export { itemSchema } from "./model/item-schema";

// Hooks (if present)
export { useItem } from "./hooks/use-item";

// Store
export { ITEM_QUERY_KEY, useItemStore } from "./store/item-store";
export { ItemStoreSync } from "./store/item-store-sync";

// UI (commonly reused components only)
export { ItemCard } from "./ui/item-card";
```

**Naming Conventions:**

- Files: `kebab-case.ts` or `kebab-case.tsx`
- Components: `PascalCase` (e.g., `CustomerCard`)
- Functions: `camelCase` (e.g., `fetchCustomerList`)
- Types/Interfaces: `PascalCase` (e.g., `Customer`, `CustomerStatus`)
- Constants: `UPPER_SNAKE_CASE` (e.g., `ORG_QUERY_KEY`)
- Stores: `use<Feature>Store` (e.g., `useOrgStore`)
- Hooks: `use<Feature>` (e.g., `useOrg`, `useCurrentUser`)

---

## Design Decisions

This section documents our design decisions based on industry-standard design systems. All UI/UX decisions should follow these guidelines to maintain consistency across the application.

### Design System References

We follow recommendations from these authoritative design systems:

1. **Apple Human Interface Guidelines (HIG)** - iOS, macOS, and cross-platform best practices
2. **Material Design 3 (M3)** - Google's latest design system
3. **IBM Carbon Design System** - Enterprise-grade design patterns
4. **Atlassian Design System** - Proven patterns from Jira, Confluence, etc.
5. **ShadCN BaseUI** - Component implementation patterns

### Navigation & Action Buttons

#### Context-Relevant Quick-Actions in Top Navigation

**Decision**: Action buttons are placed in the **trailing (right) section** of the top navigation bar, with context-aware content based on the current route.

**Rationale**:

- **Universal Agreement**: All major design systems (Apple HIG, Material 3, IBM Carbon, Atlassian) place primary actions in the trailing section of navigation bars
- **Consistency**: Users expect actions in predictable locations across the application
- **Discoverability**: Trailing position follows standard F-pattern reading behavior

**Implementation Pattern**:

```tsx
<TopNav>
  <div className="flex items-center justify-between">
    {/* Leading: Logo, Navigation, User Info */}
    <div>...</div>

    {/* Trailing: Context-Relevant Actions */}
    <div className="flex items-center gap-2 shrink-0">
      <QuickActions />
    </div>
  </div>
</TopNav>
```

**Button Specifications**:

- **Variant**: `ghost` for secondary/non-intrusive actions
- **Size**: Icon-only, `h-10 w-10` (40px, within acceptable range of 44px touch target)
- **Icons**: Use universally recognized icons (UserPlus for add, Bell for notifications)
- **Accessibility**: Always include `aria-label` for icon-only buttons

**Route-Based Actions**:

- `/customers` → "Add Customer" button (UserPlus icon)
- `/dashboard` → Notification bell (Bell icon)
- Extensible pattern for future routes

**Sources**:

- [Apple HIG - Toolbars](https://developer.apple.com/design/human-interface-guidelines/toolbars)
- [Apple HIG - Layout](https://developer.apple.com/design/human-interface-guidelines/layout)
- [Material Design 3 - Top App Bar](https://m3.material.io/components/app-bars/guidelines)
- [IBM Carbon - Button](https://carbondesignsystem.com/components/button/usage/)
- [Atlassian - Navigation System](https://atlassian.design/components/navigation-system/)

**Related Files**:

- [assets/src/app/layout/quick-actions.tsx](assets/src/app/layout/quick-actions.tsx)
- [assets/src/app/layout/top-nav.tsx](assets/src/app/layout/top-nav.tsx)

---

#### Touch Targets & Accessibility

**Decision**: Minimum touch target size of **44x44 pixels** for all interactive elements.

**Rationale**:

- **Apple HIG**: 44x44pt minimum to reduce tap errors
- **Material 3**: 48x48dp recommendation for touch targets
- **IBM Carbon**: 44px minimum for accessibility
- **WCAG 2.1**: Level AAA requires 44×44 CSS pixels for touch targets

**Implementation**:

- Button components: `h-10 w-10` (40px) minimum, within acceptable range
- Additional padding/margins ensure adequate spacing
- `aria-label` required for all icon-only buttons
- Keyboard navigation support via native button elements

**Sources**:

- [Apple HIG - Layout](https://developer.apple.com/design/human-interface-guidelines/layout)
- [Material 3 - Accessibility](https://m3.material.io/foundations/accessible-design/overview)
- [Perfect Mobile Button Size](https://www.designmonks.co/blog/perfect-mobile-button-size)
- [Mobile UX: Tap Targets & Touch Zones](https://edesignify.com/blogs/tap-targets-and-touch-zones-mobile-ux-that-works)

---

#### App Bar / Top Navigation Height

**Decision**: Fixed **64px height** for top navigation bar across all breakpoints.

**Rationale**:

- **Material 3**: Small app bar standard is 64px
- **Apple HIG**: Consistent with standard navigation bar heights
- **IBM Carbon**: 48px header height (we use 64px for more breathing room)
- Balance between visibility and screen real estate

**Implementation**:

```tsx
<header className="h-16">
  {" "}
  {/* 64px = 4rem = h-16 */}
  {/* Navigation content */}
</header>
```

**Sources**:

- [Material Design 3 - Top App Bar](https://m3.material.io/components/app-bars/guidelines)

---

#### Responsive Margins & Spacing

**Decision**: Progressive margins following Material 3 specifications.

**Breakpoints**:

- **Compact** (< 600px): 16px horizontal padding
- **Medium** (600-839px): 24px horizontal padding
- **Expanded** (840px+): 32px horizontal padding

**Implementation**:

```tsx
className = "px-4 md:px-6 lg:px-8";
```

**Sources**:

- [Material Design 3 - Applying Layout](https://m3.material.io/foundations/layout/applying-layout/window-size-classes)
- [Responsive Web Design Best Practices 2026](https://www.blushush.co.uk/blogs/responsive-web-design-best-practices-in-2026)

---

### State Management Patterns

#### Shared UI State (Cross-Component)

**Decision**: Use **Zustand stores** for UI state that needs to be shared across non-parent-child components.

**Rationale**:

- Existing codebase pattern (org store, user store, customers store)
- Type-safe without additional setup
- Minimal boilerplate compared to Context API
- DevTools support for debugging
- No provider wrapper pollution

**When to Use**:

- Modal/sheet open/close state accessed from multiple components
- Global UI preferences (theme, sidebar state)
- Cross-route state that needs to persist

**When NOT to Use**:

- Local component state (use `useState`)
- Parent-child communication (use props)
- Server state (use TanStack Query)

**Implementation Example**:

```typescript
interface UIStore {
  isSheetOpen: boolean;
  openSheet: () => void;
  closeSheet: () => void;
}

export const useUIStore = create<UIStore>()(
  devtools(
    (set) => ({
      isSheetOpen: false,
      openSheet: () => set({ isSheetOpen: true }, undefined, "openSheet"),
      closeSheet: () => set({ isSheetOpen: false }, undefined, "closeSheet"),
    }),
    { enabled: import.meta.env.DEV, name: "ui-store" },
  ),
);
```

**Related Files**:

- [assets/src/features/customers/store/customers-store.ts](assets/src/features/customers/store/customers-store.ts)

---

### Component Patterns

#### Icon Selection

**Decision**: Use **Lucide React** for all icons with universally recognized symbols.

**Rationale**:

- **IBM Carbon**: "Universal actions should use clearly defined, widely recognized icons"
- Consistent icon system across the application
- Tree-shakeable (only import used icons)
- Well-maintained and comprehensive library

**Icon Guidelines**:

- **Add/Create Actions**: `Plus`, `UserPlus`, `FolderPlus`
- **Notifications**: `Bell`, `BellDot`, `BellRing`
- **Navigation**: `ChevronDown`, `ChevronRight`, `ArrowLeft`, `ArrowRight`
- **Actions**: `Edit`, `Trash2`, `Download`, `Upload`
- **Status**: `Check`, `X`, `AlertCircle`, `Info`

**Size Standards**:

- **Small**: `h-4 w-4` (16px) - inline with text
- **Medium**: `h-5 w-5` (20px) - buttons, navigation
- **Large**: `h-6 w-6` (24px) - prominent actions

**Sources**:

- [IBM Carbon - Button Guidelines](https://carbondesignsystem.com/components/button/usage/)
- [Lucide Icons](https://lucide.dev/)

---

#### Button Variants

**Decision**: Use semantic button variants based on action hierarchy.

**Variant Usage**:

- **`default`**: Primary actions (submit forms, confirm dialogs)
- **`ghost`**: Secondary actions in navigation, subtle buttons
- **`outline`**: Secondary actions in content areas
- **`destructive`**: Delete, remove, or destructive operations
- **`link`**: Text-only links styled as buttons

**Navigation Pattern**:

- Top nav actions: `ghost` variant (non-intrusive)
- Page primary actions: `default` variant
- Inline edit actions: `ghost` or `outline`

**Sources**:

- [ShadCN - Button](https://ui.shadcn.com/docs/components/button)
- [Material Design 3 - Buttons](https://m3.material.io/components/buttons/overview)

---

#### Popover/Dropdown Structure

**Decision**: All Popover components must use the **Positioner wrapper** pattern with BaseUI.

**Required Structure**:

```tsx
<Popover>
  <PopoverTrigger />
  <PopoverPositioner side="bottom" align="start">
    <PopoverContent>{/* Content */}</PopoverContent>
  </PopoverPositioner>
</Popover>
```

**Rationale**:

- BaseUI requires `PopoverPositioner` to provide positioning context
- `PopoverContent` (Popup) consumes `PopoverPositionerContext`
- Ensures proper portal rendering and positioning calculations

**Common Mistakes to Avoid**:

```tsx
{
  /* ❌ WRONG - Missing PopoverPositioner */
}
<Popover>
  <PopoverTrigger />
  <PopoverContent /> {/* Will throw context error */}
</Popover>;

{
  /* ✅ CORRECT */
}
<Popover>
  <PopoverTrigger />
  <PopoverPositioner>
    <PopoverContent />
  </PopoverPositioner>
</Popover>;
```

**Sources**:

- [BaseUI - Popover Documentation](https://base-ui.com/react/components/popover)
- [ShadCN BaseUI - Popover](https://basecn.dev/docs/components/popover)

---

### Responsive Design

#### Mobile-First Approach

**Decision**: Design and implement for **mobile first**, then progressively enhance for larger screens.

**Rationale**:

- Ensures core functionality works on smallest screens
- Easier to add features than remove them
- Better performance on mobile devices
- Aligns with modern web usage patterns (mobile-majority traffic)

**Implementation Pattern**:

```tsx
// Base styles for mobile
className = "px-4 text-sm";

// Add enhancements for larger screens
className = "px-4 text-sm md:px-6 md:text-base lg:px-8";
```

**Breakpoints** (Tailwind defaults):

- **sm**: 640px (small tablets, large phones)
- **md**: 768px (tablets, small laptops)
- **lg**: 1024px (desktops)
- **xl**: 1280px (large desktops)
- **2xl**: 1536px (extra large screens)

**Sources**:

- [Responsive Web Design Best Practices 2026](https://www.blushush.co.uk/blogs/responsive-web-design-best-practices-in-2026)
- [Material Design 3 - Window Size Classes](https://m3.material.io/foundations/layout/applying-layout/window-size-classes)

---

## Future Design Decisions

As we implement new features, document design decisions here following this template:

### [Feature/Component Name]

**Decision**: [Clear statement of what was decided]

**Rationale**:

- [Design system reference 1]
- [Design system reference 2]
- [Reason for this decision]

**Implementation Pattern**:

```tsx
// Code example
```

**Sources**:

- [URL 1]
- [URL 2]

**Related Files**:

- [path/to/file.tsx](path/to/file.tsx)

---

## basecn

basecn brings you the shadcn/ui components you know and love, rebuilt on Base UI.

This is what basecn offers:

- **shadcn/ui Components:** The same beautiful components you know, with familiar APIs and styling.
- **Base UI Foundation:** Built on Base UI for rock-solid accessibility and performance.
- **Multiple Examples:** Various implementations and patterns for each component.
- **Same Philosophy:** Copy, paste, and customize - no lock-in, full source code ownership.

## Get started

- [Introduction](https://basecn.dev/docs/get-started/introduction): basecn offers shadcn/ui components built on Base UI. Copy, paste, and customize.
- [Namespaced Registry](https://basecn.dev/docs/get-started/namespaced-registry): Install basecn components using a namespaced registry.
- [RTL Support](https://basecn.dev/docs/get-started/rtl-support): Guide for implementing right-to-left (RTL) text direction support in Base UI components.
- [llms.txt](https://basecn.dev/llms.txt): undefined
- [Migrating from Radix UI](https://basecn.dev/docs/get-started/migrating-from-radix-ui): A guide to migrating from Radix UI to Base UI.

## Components

- [Accordion](https://basecn.dev/docs/components/accordion): A set of collapsible panels with headings.
- [Alert Dialog](https://basecn.dev/docs/components/alert-dialog): A dialog that requires user response to proceed.
- [Alert](https://basecn.dev/docs/components/alert): Displays a callout for user attention.
- [Aspect Ratio](https://basecn.dev/docs/components/aspect-ratio): Displays content within a desired ratio.
- [Autocomplete](https://basecn.dev/docs/components/autocomplete): An input that suggests options as you type.
- [Avatar](https://basecn.dev/docs/components/avatar): An easily stylable avatar component.
- [Badge](https://basecn.dev/docs/components/badge): Displays a badge or a component that looks like a badge.
- [Breadcrumb](https://basecn.dev/docs/components/breadcrumb): Displays the path to the current resource using a hierarchy of links.
- [Button Group](https://basecn.dev/docs/components/button-group): A container that groups related buttons together with consistent styling.
- [Button](https://basecn.dev/docs/components/button): Displays a button or a component that looks like a button.
- [Calendar](https://basecn.dev/docs/components/calendar): A date field component that allows users to enter and edit date.
- [Card](https://basecn.dev/docs/components/card): Displays a card with header, content, and footer.
- [Carousel](https://basecn.dev/docs/components/carousel): A carousel with motion and swipe built using Embla.
- [Chart](https://basecn.dev/docs/components/chart): Beautiful charts. Built using Recharts. Copy and paste into your apps.
- [Checkbox](https://basecn.dev/docs/components/checkbox): A control that allows the user to toggle between checked and not checked.
- [Collapsible](https://basecn.dev/docs/components/collapsible): An interactive component which expands/collapses a panel.
- [Combobox (Base UI)](https://basecn.dev/docs/components/combobox-baseui): An input combined with a list of predefined items to select.
- [Combobox (Popover + Command)](https://basecn.dev/docs/components/combobox): Autocomplete input and command palette with a list of suggestions.
- [Command](https://basecn.dev/docs/components/command): Fast, composable, unstyled command menu for React.
- [Context Menu](https://basecn.dev/docs/components/context-menu): Displays a menu to the user — such as a set of actions or functions — triggered by a button.
- [Data Table](https://basecn.dev/docs/components/data-table): Powerful table and datagrids built using TanStack Table.
- [Date Picker](https://basecn.dev/docs/components/date-picker): A date picker component with range and presets.
- [Dialog](https://basecn.dev/docs/components/dialog): A window overlaid on either the primary window or another dialog window, rendering the content underneath inert.
- [Drawer](https://basecn.dev/docs/components/drawer): A drawer component for React.
- [Dropdown Menu](https://basecn.dev/docs/components/dropdown-menu): Displays a menu to the user — such as a set of actions or functions — triggered by a button.
- [Empty](https://basecn.dev/docs/components/empty): Use the Empty component to display a empty state.
- [Field](https://basecn.dev/docs/components/field): Combine labels, controls, and help text to compose accessible form fields and grouped inputs.
- [Form (React Hook Form)](https://basecn.dev/docs/components/form-with-react-hook-form): Renders a form built with React Hook Form.
- [Form (TanStack Form)](https://basecn.dev/docs/components/form-with-tanstack-form): Building forms with TanStack Form and Zod.
- [Hover Card](https://basecn.dev/docs/components/hover-card): For sighted users to preview content available behind a link.
- [Input Group](https://basecn.dev/docs/components/input-group): Display additional information or actions to an input or textarea.
- [Input OTP](https://basecn.dev/docs/components/input-otp): Accessible one-time password component with copy paste functionality.
- [Input](https://basecn.dev/docs/components/input): Displays a form input field or a component that looks like an input field.
- [Item](https://basecn.dev/docs/components/item): A versatile component that you can use to display any content.
- [Kbd](https://basecn.dev/docs/components/kbd): Used to display textual user input from keyboard.
- [Label](https://basecn.dev/docs/components/label): Renders an accessible label associated with controls.
- [Menubar](https://basecn.dev/docs/components/menubar): A visually persistent menu common in desktop applications that provides quick access to a consistent set of commands.
- [Navigation Menu](https://basecn.dev/docs/components/navigation-menu): A collection of links for navigating websites.
- [Pagination](https://basecn.dev/docs/components/pagination): Pagination with page navigation, next and previous links.
- [Popover](https://basecn.dev/docs/components/popover): Displays rich content in a portal, triggered by a button.
- [Progress](https://basecn.dev/docs/components/progress): Displays an indicator showing the completion progress of a task, typically displayed as a progress bar.
- [Radio Group](https://basecn.dev/docs/components/radio-group): A set of checkable buttons—known as radio buttons—where no more than one of the buttons can be checked at a time.
- [Resizable](https://basecn.dev/docs/components/resizable): Accessible resizable panel groups and layouts with keyboard support.
- [Scroll Area](https://basecn.dev/docs/components/scroll-area): Augments native scroll functionality for custom, cross-browser styling.
- [Select](https://basecn.dev/docs/components/select): Displays a list of options for the user to pick from—triggered by a button.
- [Separator (Extended)](https://basecn.dev/docs/components/separator-extended): Visually or semantically separates content.
- [Separator](https://basecn.dev/docs/components/separator): Visually or semantically separates content.
- [Sheet](https://basecn.dev/docs/components/sheet): Extends the Dialog component to display content that complements the main content of the screen.
- [Sidebar](https://basecn.dev/docs/components/sidebar): A composable, themeable and customizable sidebar component.
- [Skeleton](https://basecn.dev/docs/components/skeleton): Use to show a placeholder while content is loading.
- [Slider](https://basecn.dev/docs/components/slider): An input where the user selects a value from within a given range.
- [Sonner](https://basecn.dev/docs/components/sonner): An opinionated toast component for React.
- [Spinner](https://basecn.dev/docs/components/spinner): An indicator that can be used to show a loading state.
- [Switch](https://basecn.dev/docs/components/switch): A control that allows the user to toggle between checked and not checked.
- [Table](https://basecn.dev/docs/components/table): A responsive table component.
- [Tabs](https://basecn.dev/docs/components/tabs): A set of layered sections of content, known as tab panels, that are displayed one at a time.
- [Textarea](https://basecn.dev/docs/components/textarea): Displays a form textarea or a component that looks like a textarea.
- [Toggle Group](https://basecn.dev/docs/components/toggle-group): A set of two-state buttons that can be toggled on or off.
- [Toggle](https://basecn.dev/docs/components/toggle): A two-state button that can be either on or off.
- [Tooltip](https://basecn.dev/docs/components/tooltip): A popup that displays information related to an element when the element receives keyboard focus or the mouse hovers over it.
