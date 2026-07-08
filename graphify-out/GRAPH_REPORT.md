# Graph Report - ricepos  (2026-07-09)

## Corpus Check
- 151 files · ~393,468 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 680 nodes · 1678 edges · 42 communities (30 shown, 12 thin omitted)
- Extraction: 95% EXTRACTED · 5% INFERRED · 0% AMBIGUOUS · INFERRED: 76 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `5dde0a07`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- [[_COMMUNITY_Community 0|Community 0]]
- [[_COMMUNITY_Community 1|Community 1]]
- [[_COMMUNITY_Community 2|Community 2]]
- [[_COMMUNITY_Community 3|Community 3]]
- [[_COMMUNITY_Community 4|Community 4]]
- [[_COMMUNITY_Community 5|Community 5]]
- [[_COMMUNITY_Community 6|Community 6]]
- [[_COMMUNITY_Community 7|Community 7]]
- [[_COMMUNITY_Community 8|Community 8]]
- [[_COMMUNITY_Community 9|Community 9]]
- [[_COMMUNITY_Community 10|Community 10]]
- [[_COMMUNITY_Community 11|Community 11]]
- [[_COMMUNITY_Community 12|Community 12]]
- [[_COMMUNITY_Community 13|Community 13]]
- [[_COMMUNITY_Community 14|Community 14]]
- [[_COMMUNITY_Community 15|Community 15]]
- [[_COMMUNITY_Community 16|Community 16]]
- [[_COMMUNITY_Community 17|Community 17]]
- [[_COMMUNITY_Community 18|Community 18]]
- [[_COMMUNITY_Community 19|Community 19]]
- [[_COMMUNITY_Community 20|Community 20]]
- [[_COMMUNITY_Community 21|Community 21]]
- [[_COMMUNITY_Community 22|Community 22]]
- [[_COMMUNITY_Community 23|Community 23]]
- [[_COMMUNITY_Community 24|Community 24]]
- [[_COMMUNITY_Community 25|Community 25]]
- [[_COMMUNITY_Community 26|Community 26]]
- [[_COMMUNITY_Community 27|Community 27]]
- [[_COMMUNITY_Community 28|Community 28]]
- [[_COMMUNITY_Community 29|Community 29]]
- [[_COMMUNITY_Community 32|Community 32]]
- [[_COMMUNITY_Community 33|Community 33]]
- [[_COMMUNITY_Community 35|Community 35]]
- [[_COMMUNITY_Community 36|Community 36]]
- [[_COMMUNITY_Community 37|Community 37]]
- [[_COMMUNITY_Community 38|Community 38]]

## God Nodes (most connected - your core abstractions)
1. `cn()` - 134 edges
2. `getSession()` - 125 edges
3. `unauth()` - 121 edges
4. `supabase` - 47 edges
5. `notfind()` - 37 edges
6. `Button()` - 23 edges
7. `Input()` - 22 edges
8. `forbid()` - 18 edges
9. `Table()` - 16 edges
10. `TableHeader()` - 16 edges

## Surprising Connections (you probably didn't know these)
- `AvatarBadge()` --calls--> `cn()`  [EXTRACTED]
  src/components/ui/avatar.tsx → src/lib/utils.ts
- `AvatarGroup()` --calls--> `cn()`  [EXTRACTED]
  src/components/ui/avatar.tsx → src/lib/utils.ts
- `AvatarGroupCount()` --calls--> `cn()`  [EXTRACTED]
  src/components/ui/avatar.tsx → src/lib/utils.ts
- `DropdownMenuSubTrigger()` --calls--> `cn()`  [EXTRACTED]
  src/components/ui/dropdown-menu.tsx → src/lib/utils.ts
- `DropdownMenuSubContent()` --calls--> `cn()`  [EXTRACTED]
  src/components/ui/dropdown-menu.tsx → src/lib/utils.ts

## Import Cycles
- None detected.

## Communities (42 total, 12 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.05
Nodes (94): GET(), forbid(), getSession(), notfind(), SessionPayload, unauth(), validationErr(), verifySession() (+86 more)

### Community 1 - "Community 1"
Cohesion: 0.07
Nodes (61): Category, emptyForm, keys, Numpad(), NumpadProps, Customer, DashboardData, Discount (+53 more)

### Community 2 - "Community 2"
Cohesion: 0.07
Nodes (47): cn(), Breadcrumb(), BreadcrumbEllipsis(), BreadcrumbItem(), BreadcrumbLink(), BreadcrumbList(), BreadcrumbPage(), BreadcrumbSeparator() (+39 more)

### Community 3 - "Community 3"
Cohesion: 0.09
Nodes (28): NavMain(), NavProjects(), NavUser(), TeamSwitcher(), useIsMobile(), Sidebar(), SidebarContent(), SidebarContext (+20 more)

### Community 4 - "Community 4"
Cohesion: 0.06
Nodes (31): C1. Sale transaction not atomic — stock can go negative, C2. Logout functionally broken, C3. Split payment: GCash silently dropped when Cash >= Total, C4. Collection payment — double-allocation race condition, C5. Void/Refund is a stub — users see success but nothing happens, CRITICAL (5 issues), H1. Tax discount allocation wrong with non-eligible items, H2. No rate limiting on login — 4-digit PIN brute-force (+23 more)

### Community 5 - "Community 5"
Cohesion: 0.13
Nodes (22): Avatar(), AvatarBadge(), AvatarFallback(), AvatarGroup(), AvatarGroupCount(), AvatarImage(), DropdownMenu(), DropdownMenuCheckboxItem() (+14 more)

### Community 6 - "Community 6"
Cohesion: 0.13
Nodes (24): openCashDrawer(), openViaUSB(), ASCII_REPLACE, BluetoothDevice, BluetoothRemoteGATTCharacteristic, BluetoothRemoteGATTServer, buildReceipt(), concat() (+16 more)

### Community 7 - "Community 7"
Cohesion: 0.09
Nodes (23): dependencies, @base-ui/react, bcryptjs, class-variance-authority, clsx, cmdk, date-fns, @hookform/resolvers (+15 more)

### Community 8 - "Community 8"
Cohesion: 0.09
Nodes (21): aliases, components, hooks, lib, ui, utils, iconLibrary, menuAccent (+13 more)

### Community 9 - "Community 9"
Cohesion: 0.09
Nodes (22): devDependencies, autoprefixer, dotenv, eslint, eslint-config-next, jsdom, @playwright/test, postcss (+14 more)

### Community 10 - "Community 10"
Cohesion: 0.18
Nodes (13): applyDiscount(), DiscountInput, roundCurrency(), RoundingMode, computeTax(), TaxBreakdown, TaxInput, TaxResult (+5 more)

### Community 11 - "Community 11"
Cohesion: 0.10
Nodes (19): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+11 more)

### Community 12 - "Community 12"
Cohesion: 0.18
Nodes (7): Sheet(), SheetContent(), SheetDescription(), SheetFooter(), SheetHeader(), SheetOverlay(), SheetTitle()

### Community 13 - "Community 13"
Cohesion: 0.27
Nodes (4): AdminShell(), AdminShellProps, adminNavLinks, NavLink

### Community 14 - "Community 14"
Cohesion: 0.20
Nodes (9): background_color, description, display, icons, name, orientation, short_name, start_url (+1 more)

### Community 15 - "Community 15"
Cohesion: 0.31
Nodes (7): Collapsible(), CollapsibleContent(), CollapsibleTrigger(), SidebarGroup(), SidebarMenuSub(), SidebarMenuSubButton(), SidebarMenuSubItem()

### Community 16 - "Community 16"
Cohesion: 0.39
Nodes (6): setSessionCookie(), signSession(), checkRateLimit(), loginAttempts, POST(), POST()

### Community 17 - "Community 17"
Cohesion: 0.25
Nodes (8): scripts, build, db:seed, dev, lint, start, test, test:watch

### Community 18 - "Community 18"
Cohesion: 0.29
Nodes (4): PopoverContent(), PopoverDescription(), PopoverHeader(), PopoverTitle()

### Community 19 - "Community 19"
Cohesion: 0.38
Nodes (5): inter, metadata, RootLayout(), viewport, cn()

### Community 21 - "Community 21"
Cohesion: 0.50
Nodes (4): calcDenomTotal(), DenominationCounter(), DenomState, PESO_DENOMS

### Community 22 - "Community 22"
Cohesion: 0.40
Nodes (3): CatalogItem, CategoryCache, UseCatalogReturn

### Community 23 - "Community 23"
Cohesion: 0.50
Nodes (3): name, private, version

### Community 24 - "Community 24"
Cohesion: 0.67
Nodes (3): config, middleware(), verifyJwt()

## Knowledge Gaps
- **199 isolated node(s):** `$schema`, `style`, `rsc`, `tsx`, `config` (+194 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **12 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `cn()` connect `Community 2` to `Community 1`, `Community 3`, `Community 5`, `Community 12`, `Community 15`, `Community 18`?**
  _High betweenness centrality (0.098) - this node is a cross-community bridge._
- **Are the 28 inferred relationships involving `getSession()` (e.g. with `PATCH()` and `GET()`) actually correct?**
  _`getSession()` has 28 INFERRED edges - model-reasoned connections that need verification._
- **Are the 28 inferred relationships involving `unauth()` (e.g. with `PATCH()` and `GET()`) actually correct?**
  _`unauth()` has 28 INFERRED edges - model-reasoned connections that need verification._
- **Are the 19 inferred relationships involving `notfind()` (e.g. with `PATCH()` and `DELETE()`) actually correct?**
  _`notfind()` has 19 INFERRED edges - model-reasoned connections that need verification._
- **What connects `$schema`, `style`, `rsc` to the rest of the system?**
  _199 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.05032149846239866 - nodes in this community are weakly interconnected._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.06763590391908976 - nodes in this community are weakly interconnected._