# Design skills in this repo

These live in `.claude/skills/` and load automatically when Claude Code starts in this folder, on any account. Sources and pinned commits are in `.claude/SOURCES.md`.

To use one, name it in your prompt: "Use the `apple-design` skill to review the bottom sheet."

## The order to use them in

1. `apple-design` and `frontend-design`: set the direction before any screen is built (rules are in `prep/PLAN.md` section 9).
2. `ui-ux-pro-max`, `mapcn`, `maplibre-cartography`: lay out the map and its controls.
3. `shadcn`: components, restyled to the rules, never left at defaults.
4. `mobile-native`: make the site behave like an app from the iPhone Home Screen.
5. `animate`, then `review-animations`: motion, built then checked.
6. `better-colors`, `better-typography`, `web-design-guidelines`: a polish pass around 16:00.

## Direction and layout

| Skill | What it is for |
|---|---|
| `frontend-design` | Guidance for distinctive, intentional visual design when building new UI or reshaping an existing one. |
| `apple-design` | Apple's approach to interface design and fluid, physical motion, translated for the web. |
| `ui-ux-pro-max` | UI/UX design intelligence for web, mobile, and desktop. |
| `design-taste-frontend` | Anti-slop frontend skill for landing pages, portfolios, and redesigns. |
| `better-ui` | Polishes surfaces and icons with exact values for border radius, optical alignment, shadows and icon states. |
| `better-layout` | Sets grouping, alignment, reading order, responsive structure and room for translated text, so a layout holds up when it is resized, translated or mirrored. |
| `better-colors` | Builds and checks color systems by generating palettes, naming semantic tokens, converting between formats and measuring contrast. |
| `better-typography` | Sets and reviews how text renders, from the type scale and spacing to font features, wrapping, truncation and punctuation. |
| `web-design-guidelines` | Review UI code for Web Interface Guidelines compliance. |
| `make-interfaces-feel-better` | Apply concrete design-engineering details that make interfaces feel polished. |
| `liquid-glass-design` | iOS 26 Liquid Glass design system — dynamic glass material with blur, reflection, and interactive morphing for SwiftUI, UIKit, and WidgetKit. |

## Map

| Skill | What it is for |
|---|---|
| `mapcn` | Build maps in React with mapcn, themeable shadcn-style map components on MapLibre GL and Tailwind CSS. |
| `maplibre-cartography` | Cartographic principles for MapLibre GL JS — label and symbol legibility on imagery vs. |
| `maplibre-source-wiring` | Getting a MapLibre GL JS source to actually render — TileJSON `url` versus hand-wired `tiles` templates, matching `source-layer` names to the tile schema, layer order and |
| `maplibre-tile-sources` | Choosing what form your data needs for MapLibre GL JS — GeoJSON read straight from a file versus vector or raster tiles, the feature-count and file-size thresholds where  |
| `maplibre-v6-migration` | Upgrading a MapLibre GL JS app from v5 to v6 — the ESM-only build, the removed default export, CommonJS require() breakage, the styleimagemissing/setMissingStyleImageReso |
| `maplibre-terrain-rendering` | Drawing elevation in MapLibre GL JS once a raster-dem source works — hillshade and `hillshade-method`, the `color-relief` layer and the `["elevation"]` expression, runtim |

## Components and iPhone

| Skill | What it is for |
|---|---|
| `shadcn` | Manages shadcn components and projects — adding, searching, fixing, debugging, styling, and composing UI, including chat interfaces. |
| `mobile-native` | Make a web app feel native on a phone — the small CSS and meta-tag fixes that separate "a website in a browser" from something that feels installed. |
| `frontend-patterns` | Frontend development patterns for React, Next.js, state management, performance optimization, and UI best practices. |

## Motion

| Skill | What it is for |
|---|---|
| `animate` | Build an animation from scratch, making the decisions in the order that determines whether it feels right — should it animate at all, what purpose, which tool, which prop |
| `review-animations` | Reviews animation and motion code against a high craft bar derived from Emil Kowalski's design engineering philosophy. |
| `choreograph` | Coordinate several elements that animate together — decide what moves, in what order, how much they overlap, and what stays still — so a group reads as one intentional mo |
| `emil-design-eng` | Emil Kowalski's design-engineering philosophy for UI polish, component design, animation decisions, and the invisible details that make software feel great. |
| `motion-foundations` | Motion tokens, spring presets, performance rules, device adaptation, accessibility enforcement, and SSR safety for React / Next.js using motion/react. |
| `motion-patterns` | Production-ready animation patterns for React / Next.js — button, modal, toast, stagger, page transitions, exit animations, scroll, and layout — built on motion-foundatio |
| `motion-advanced` | Advanced motion patterns for React / Next.js — drag & drop, gestures, text animations, SVG path drawing, custom hooks, imperative sequences (useAnimate), loaders, and the |
| `motion-framer` | Modern animation library for React and JavaScript. |
| `gsap-core` | Official GSAP skill for the core API — gsap.to(), from(), fromTo(), easing, duration, stagger, defaults, gsap.matchMedia() (responsive, prefers-reduced-motion). |
| `gsap-timeline` | Official GSAP skill for timelines — gsap.timeline(), position parameter, nesting, playback. |
| `gsap-scrolltrigger` | Official GSAP skill for ScrollTrigger — scroll-linked animations, pinning, scrub, triggers. |
| `gsap-react` | Official GSAP skill for React — useGSAP hook, refs, gsap.context(), cleanup. |
| `gsap-plugins` | Official GSAP skill for GSAP plugins — registration, ScrollToPlugin, ScrollSmoother, Flip, Draggable, Inertia, Observer, SplitText, ScrambleText, SVG and physics plugins, |
| `gsap-performance` | Official GSAP skill for performance — prefer transforms, avoid layout thrashing, will-change, batching. |
| `gsap-utils` | Official GSAP skill for gsap.utils — clamp, mapRange, normalize, interpolate, random, snap, toArray, wrap, pipe. |
| `gsap-frameworks` | Official GSAP skill for Vue, Svelte, and other non-React frameworks — lifecycle, scoping selectors, cleanup on unmount. |

## Ship and check

| Skill | What it is for |
|---|---|
| `deploy-to-vercel` | Deploy applications and websites to Vercel. |
| `e2e-testing` | Playwright E2E testing patterns, Page Object Model, configuration, CI/CD integration, artifact management, and flaky test strategies. |
| `deployment-patterns` | Deployment workflows, CI/CD pipeline patterns, Docker containerization, health checks, rollback strategies, and production readiness checklists for web applications. |

## Also in the kit (logic, backend, process)

`api-design`, `backend-patterns`, `coding-standards`, `eval-harness`, `grill-me`, `grilling`, `mcp-builder`, `mcp-server-patterns`, `orch-build-mvp`, `orch-pipeline`, `postgres-patterns`, `search-first`, `strategic-compact`, `supabase`, `supabase-postgres-best-practices`

## Not in this folder

- `impeccable` is installed globally on Harshith's PC (`~/.claude/skills`), not here. It is the critique and polish pass.
- The HyperFrames video skills and the three.js skills were left out to keep the repo small. They are in the original kit on Harshith's PC.
