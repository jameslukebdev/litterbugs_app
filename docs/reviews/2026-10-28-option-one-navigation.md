# Option 1 navigation — local preview

Implemented the owner's approved action-based navigation. No deployment, push, or production data mutation.

- Desktop: left logo; Map; one direct Report litter action; Fund a cleanup; Clean up; Help & about; Get the app; search; existing alerts/profile.
- Funding links: reports available to fund, funding guide.
- Cleanup links: available reports, cleanup guide, completed cleanups, communities, cleanup safety.
- Help & about: reporting and rewards, customer help, cleanup safety, About Litterbugs, Support Litterbugs. The latter retains its distinct platform-support purpose.
- Every previous navigation destination is retained. Existing footer/policy links remain unchanged.
- Header search expands an inline row; no modal, backdrop, or body scroll lock. The shared map autocomplete supplies debounced suggestions and keyboard selection. Choosing a place opens the map with its selected area. The map itself retains its existing search.
- Mobile: visible Map shortcut on public pages; grouped drawer with all destinations and Get the app. The map retains its stateful reporting control, permanent app invitation, and existing bottom navigation/account controls.
- Split the custom reporting control from account controls in the shared header so it can occupy the reporting position without duplication or loss of map behavior.

Validation: 489 tests across 86 files passed, including navigation-destination preservation, mobile menu dismissal, keyboard controls, typing suggestions, and map reporting tests. Scoped lint passed. Production build (including TypeScript) passed after correcting a test typing option. Browser checks covered desktop and phone layouts, dropdown menus, inline search, and keyboard selection of Boone leading to its loaded map area. Local server remains on port 3000.

Reference direction: the approved option 1 from this conversation, existing site styling, and the preceding research on GoFundMe/Taskrabbit action-based navigation and Nielsen Norman Group menu/utility guidance. No new brand redesign.
