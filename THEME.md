# TransitOps Theme Guide

## Theme Name

**Transit Control Room**

TransitOps should feel like a modern transport operations command
centre: structured, dense, reliable, and built for people monitoring
real fleet activity.

The interface must **not** look like a generic SaaS dashboard or startup
landing page.

------------------------------------------------------------------------

## Design Direction

Use the existing application layout as a structural reference:

-   Persistent left sidebar
-   Top utility bar
-   Main operational workspace
-   Page heading followed by actions, filters, and content
-   Dense tables and operational data

The visual identity comes from:

-   Dark control sidebar
-   Concrete-grey workspace
-   Signal-based status colours
-   Route-line page headings
-   Monospace operational data
-   Low border radius
-   Flat surfaces with borders instead of shadows

The application should feel like software used in a fleet control room.

------------------------------------------------------------------------

## DaisyUI Theme

Define this theme in `app.css`.

``` css
@import "tailwindcss";

@plugin "daisyui";

@plugin "daisyui/theme" {
  name: "transitops";
  default: true;
  color-scheme: light;

  --color-base-100: #f4f6f5;
  --color-base-200: #e9edeb;
  --color-base-300: #d7ddda;
  --color-base-content: #151a1e;

  --color-primary: #2563eb;
  --color-primary-content: #ffffff;

  --color-secondary: #334155;
  --color-secondary-content: #ffffff;

  --color-accent: #f59e0b;
  --color-accent-content: #151a1e;

  --color-neutral: #151a1e;
  --color-neutral-content: #f4f6f5;

  --color-info: #2563eb;
  --color-info-content: #ffffff;

  --color-success: #16a36a;
  --color-success-content: #ffffff;

  --color-warning: #f59e0b;
  --color-warning-content: #151a1e;

  --color-error: #dc3f4f;
  --color-error-content: #ffffff;

  --radius-selector: 0.25rem;
  --radius-field: 0.375rem;
  --radius-box: 0.5rem;

  --size-selector: 0.25rem;
  --size-field: 0.25rem;

  --border: 1px;
  --depth: 0;
  --noise: 0;
}
```

Use DaisyUI semantic colours instead of hardcoding colours in page
components.

------------------------------------------------------------------------

## Colour Language

  Role            Colour      Meaning
  --------------- ----------- ---------------------------------------
  Asphalt         `#151A1E`   Navigation and control surfaces
  Concrete        `#F4F6F5`   Main workspace
  Signal Blue     `#2563EB`   Active operations and primary actions
  Transit Amber   `#F59E0B`   Maintenance and attention
  Route Green     `#16A36A`   Available, healthy, completed
  Alert Red       `#DC3F4F`   Invalid, suspended, cancelled

Colour must communicate operational state. Do not use accent colours as
random decoration.

------------------------------------------------------------------------

## Typography

Use:

-   **IBM Plex Sans** --- interface, headings, labels, body text
-   **IBM Plex Mono** --- registration numbers, trip IDs, numeric KPIs,
    money, distances, percentages, and other operational data

Operational examples:

``` text
TR-0042
GJ01AB4521
₹34,070
1,482 km
81.4%
```

Use tabular numbers where values are compared.

``` css
.data-value {
  font-family: "IBM Plex Mono", monospace;
  font-variant-numeric: tabular-nums;
}
```

Avoid oversized marketing typography. This is an application, not a
landing page.

------------------------------------------------------------------------

## Application Shell

All authenticated pages should use the same shell.

``` text
┌────────────┬───────────────────────────────────────┐
│            │  Search                 Alerts  User  │
│ TRANSITOPS ├───────────────────────────────────────┤
│            │                                       │
│ Dashboard  │  ●──── FLEET / VEHICLES              │
│ Fleet      │                                       │
│ Drivers    │  Vehicle Registry      [+ Add Vehicle]│
│ Trips      │                                       │
│ Maintenance│  [filters]                            │
│ Fuel       │                                       │
│ Analytics  │  ┌─────────────────────────────────┐  │
│            │  │ operational content             │  │
│            │  └─────────────────────────────────┘  │
└────────────┴───────────────────────────────────────┘
```

The sidebar and topbar must remain visually stable between pages.

------------------------------------------------------------------------

## Sidebar

Use a dark neutral control surface.

Recommended base:

``` html
<aside class="bg-neutral text-neutral-content">
```

Navigation should be compact and readable.

Active navigation items use:

-   Subtle primary tint
-   Bright text
-   Thin primary left rail

Example:

``` html
<a class="border-l-2 border-primary bg-primary/15 text-white">
  Vehicles
</a>
```

Do not use large rounded navigation pills.

Use Lucide icons if the project already includes them. Otherwise use
clean text navigation. Never use emojis as interface icons.

------------------------------------------------------------------------

## Page Header --- Route Line Signature

The route-line heading is the signature visual element of TransitOps.

Each major page begins with a small operational eyebrow:

``` text
●────────  FLEET / VEHICLES

Vehicle Registry
Manage fleet capacity and availability
```

The node and line represent a transport route.

Use it once at the top of the page. Do not repeat route-line decorations
inside every card.

The eyebrow should be:

-   Small
-   Uppercase
-   Wide letter spacing
-   Muted text
-   Paired with a primary-coloured route node or line

The page title follows beneath it.

------------------------------------------------------------------------

## Surfaces and Cards

Prefer flat bordered surfaces.

``` html
<div class="rounded-box border border-base-300 bg-base-100 p-5">
  ...
</div>
```

Rules:

-   No glassmorphism
-   No gradients
-   No large soft shadows
-   No excessive floating cards
-   Avoid deeply nested cards
-   Use borders and spacing to establish hierarchy

Cards should group related operational information, not decorate empty
space.

------------------------------------------------------------------------

## KPI Cards

KPI cards use a coloured status rail on the left.

``` html
<div class="rounded-box border border-base-300 border-l-4 border-l-success bg-base-100 p-5">
  <p class="text-xs font-semibold uppercase tracking-widest opacity-50">
    Available vehicles
  </p>

  <p class="data-value mt-3 text-3xl font-bold">
    42
  </p>
</div>
```

The rail colour must match the meaning of the metric.

Examples:

-   Available vehicles → `success`
-   Active trips → `info`
-   Vehicles in maintenance → `warning`
-   Suspended drivers → `error`

Do not add gradients or decorative icons to every KPI.

------------------------------------------------------------------------

## Status System

Status colours must remain identical across every page.

### Vehicles

  Status      DaisyUI semantic colour
  ----------- -------------------------
  Available   success
  On Trip     info
  In Shop     warning
  Retired     neutral

### Drivers

  Status      DaisyUI semantic colour
  ----------- -------------------------
  Available   success
  On Trip     info
  Off Duty    warning
  Suspended   error

### Trips

  Status       DaisyUI semantic colour
  ------------ -------------------------
  Draft        neutral
  Dispatched   info
  Completed    success
  Cancelled    error

Use DaisyUI badges.

``` html
<span class="badge badge-success badge-soft">
  Available
</span>
```

Never invent a new colour for an existing status.

------------------------------------------------------------------------

## Tables

Tables are a major part of TransitOps and should feel like operational
registers.

Use:

-   Compact rows
-   Clear column labels
-   Muted uppercase table headings
-   Monospace for IDs and numeric data
-   Status badges
-   Row hover state
-   Actions aligned to the right

Recommended structure:

``` html
<div class="overflow-x-auto rounded-box border border-base-300 bg-base-100">
  <table class="table">
    ...
  </table>
</div>
```

Avoid placing a separate card around a table container unless the page
genuinely needs another grouping level.

Registration numbers and IDs should visually stand out through monospace
typography, not bright colours.

------------------------------------------------------------------------

## Forms

Forms should feel direct and administrative.

Use DaisyUI inputs, selects, and fieldsets.

Rules:

-   Labels use plain language
-   Inputs use `input-bordered` or the equivalent theme border
-   Related fields may use a two-column grid on desktop
-   Forms collapse to one column on mobile
-   Primary action names the actual operation: `Add vehicle`,
    `Dispatch trip`, `Complete maintenance`
-   Secondary action is visually quiet

Do not use the word `Submit` when a more specific action exists.

Validation errors must explain what is wrong.

Good:

``` text
Cargo weight exceeds this vehicle's 500 kg capacity.
```

Bad:

``` text
Invalid input.
```

------------------------------------------------------------------------

## Buttons

Primary action:

``` html
<button class="btn btn-primary">
  Add vehicle
</button>
```

Secondary action:

``` html
<button class="btn btn-ghost">
  Cancel
</button>
```

Dangerous action:

``` html
<button class="btn btn-error">
  Cancel trip
</button>
```

Avoid pill-shaped buttons.

Each page should normally have one visually dominant primary action.

------------------------------------------------------------------------

## Filters and Search

Filters should form a compact control strip above operational content.

Example:

``` text
[ Search vehicles... ] [ Type ▾ ] [ Status ▾ ] [ Region ▾ ]
```

Use DaisyUI inputs and selects.

Filters are controls, not cards. Do not wrap every filter in its own
surface.

------------------------------------------------------------------------

## Empty States

Empty states should direct the next action.

Good:

``` text
No maintenance records

This vehicle has no recorded maintenance.
[ Add maintenance record ]
```

Avoid playful illustrations or vague copy.

------------------------------------------------------------------------

## Motion

Motion should be minimal.

Allowed:

-   Subtle row hover transitions
-   Button interaction states
-   Short modal transitions
-   One restrained page-content entrance if already easy to implement

Respect `prefers-reduced-motion`.

Do not animate KPI numbers, route lines, sidebar icons, or charts purely
for decoration.

------------------------------------------------------------------------

## Responsive Behaviour

Desktop is the primary operational layout, but all pages must remain
usable on mobile.

-   Sidebar becomes a DaisyUI drawer
-   Tables use horizontal scrolling
-   KPI grids collapse progressively
-   Two-column forms become single-column
-   Page actions may stack below the title
-   Filters wrap or stack

Do not remove important operational data on mobile solely to preserve
appearance.

------------------------------------------------------------------------

## Copy Style

Use direct operational language.

Prefer:

-   `Add vehicle`
-   `Dispatch trip`
-   `Complete trip`
-   `Start maintenance`
-   `Record fuel`
-   `Vehicle unavailable`
-   `License expired`

Avoid:

-   `Get started`
-   `Let's go`
-   `Manage your journey`
-   `Unlock insights`
-   Marketing-style copy

TransitOps communicates state and action.

------------------------------------------------------------------------

## Design Constraints

When designing any TransitOps page:

1.  Use DaisyUI components and Tailwind utilities.
2.  Use the `transitops` DaisyUI semantic colours.
3.  Preserve the shared sidebar and topbar shell.
4.  Start the page with the route-line heading pattern.
5.  Use IBM Plex Sans and IBM Plex Mono.
6.  Use flat bordered surfaces.
7.  Use status colours consistently.
8.  Prefer dense, readable operational layouts.
9.  Keep one clear primary action per page.
10. Do not introduce a new visual style for an individual page.

### Never use

-   Gradients
-   Glassmorphism
-   Neon effects
-   Excessive shadows
-   Huge rounded cards
-   Pill-heavy navigation
-   Emojis as icons
-   Decorative charts with no operational value
-   Generic startup-dashboard aesthetics

------------------------------------------------------------------------

## Final Design Test

Before finishing a page, ask:

> Does this look like a transport operations control system, or could
> the same UI be pasted into a CRM, finance dashboard, or AI SaaS
> product unchanged?

If the answer is that it could belong to any SaaS product, revise it.

TransitOps should be recognizable through its **control-room shell,
route-line headings, signal colour language, and monospace operational
data**.
