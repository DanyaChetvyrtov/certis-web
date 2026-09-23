# Tasks

## 1. Build the workspace widget

- [x] 1.1 Create `src/widgets/workspace-shell` with a public `index.ts` exporting the existing `WorkspaceSidebar` props contract; move desktop and mobile navigation UI into widget-owned components and verify the six routes, active markers, four mobile primary links, and More destinations match the current rendered navigation.
- [x] 1.2 Extract shared session/account-menu, profile/settings dialog, sign-out, and focus coordination into a focused widget-local model/controller; verify both desktop and mobile UI use the same remembered Transactions destination and preserve the existing success, failure, and close behavior in focused interaction tests.
- [x] 1.3 Keep shared route metadata and derived account display data inside the widget without adding a generic shared abstraction; verify desktop/mobile labels, icons, profile initials/photo, and active-account summary remain identical in rendered component tests.
- [x] 1.4 Move `WorkspaceSidebar.css` and `MobileWorkspaceNavigation.css` beside their widget UI owners with unchanged selectors, breakpoint, and safe-area rules; verify stylesheet references point only to the new files and the original selector/declaration sets remain present.

## 2. Switch consumers and enforce boundaries

- [x] 2.1 Update Dashboard, Accounts, Transactions, Budgets, Goals, and Categories plus affected test mocks to import `widgets/workspace-shell`; remove obsolete `src/layouts` implementations and styles, and verify `rg` finds no imports of the removed modules and all six route tests render.
- [x] 2.2 Add `widgets/workspace-shell` to the FSD checker, allow only its exact legacy `Icons`, session, profile modal/photo, and settings modal imports, and remove the Transactions-to-legacy-sidebar exception; verify `npm run lint:architecture` passes and an unlisted widget legacy/deep/peer import fails the checker tests.
- [x] 2.3 Update `docs/architecture.md` with the widget owner, its exact legacy integrations and removal points, and the transitional Dashboard/legacy route consumers; verify the documented list agrees with `scripts/fsd-legacy-imports.mjs`.

## 3. Automated regression tests

- [x] 3.1 Move and adapt the existing desktop/mobile navigation tests to the widget, covering route placement, active states, current-profile remembered Transactions URL, another profile's URL isolation, and successful sign-out clearing; verify the focused widget test suite passes.
- [x] 3.2 Add focused interaction tests for Escape/outside-pointer menu closing, profile/settings dialog focus restoration from desktop and mobile triggers, sign-out failure feedback, and prevention of duplicate sign-out; verify the new tests pass without changing user-visible behavior.
- [x] 3.3 Update architecture-checker tests for the new migrated widget and removed exception; verify the checker rejects upward, peer, deep, and unlisted legacy imports while accepting the intended public APIs.
- [x] 3.4 Run the existing Transactions filter/navigation tests and affected Dashboard, Accounts, Budgets, Goals, and Categories route tests; verify their menu destinations and representative screens still pass after import changes.

## 4. Visual and final verification

- [x] 4.1 Review desktop and mobile navigation, More/account menus, profile/settings dialogs, focus states, and responsive layout in light/dark themes and English/Russian; verify there is no visible regression or new text, and update both locale files only if new user-facing text was actually introduced.
- [x] 4.2 Run `npm run lint`, `npm test`, and `npm run build`; verify all three finish successfully and that no removed layout import or stylesheet remains before marking the change complete.
