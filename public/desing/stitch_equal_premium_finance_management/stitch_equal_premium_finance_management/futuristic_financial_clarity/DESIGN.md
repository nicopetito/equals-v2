---
name: Futuristic Financial Clarity
colors:
  surface: '#15121b'
  surface-dim: '#15121b'
  surface-bright: '#3b3742'
  surface-container-lowest: '#0f0d15'
  surface-container-low: '#1d1a23'
  surface-container: '#211e27'
  surface-container-high: '#2c2832'
  surface-container-highest: '#37333d'
  on-surface: '#e7e0ed'
  on-surface-variant: '#cbc3d7'
  inverse-surface: '#e7e0ed'
  inverse-on-surface: '#322f39'
  outline: '#958ea0'
  outline-variant: '#494454'
  surface-tint: '#d0bcff'
  primary: '#d0bcff'
  on-primary: '#3c0091'
  primary-container: '#a078ff'
  on-primary-container: '#340080'
  inverse-primary: '#6d3bd7'
  secondary: '#adc6ff'
  on-secondary: '#002e6a'
  secondary-container: '#0566d9'
  on-secondary-container: '#e6ecff'
  tertiary: '#ffb869'
  on-tertiary: '#482900'
  tertiary-container: '#ca801e'
  on-tertiary-container: '#3f2300'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#e9ddff'
  primary-fixed-dim: '#d0bcff'
  on-primary-fixed: '#23005c'
  on-primary-fixed-variant: '#5516be'
  secondary-fixed: '#d8e2ff'
  secondary-fixed-dim: '#adc6ff'
  on-secondary-fixed: '#001a42'
  on-secondary-fixed-variant: '#004395'
  tertiary-fixed: '#ffdcbb'
  tertiary-fixed-dim: '#ffb869'
  on-tertiary-fixed: '#2c1700'
  on-tertiary-fixed-variant: '#673d00'
  background: '#15121b'
  on-background: '#e7e0ed'
  surface-variant: '#37333d'
typography:
  display-hero:
    fontFamily: Sora
    fontSize: 48px
    fontWeight: '700'
    lineHeight: '1.1'
    letterSpacing: -0.02em
  display-hero-mobile:
    fontFamily: Sora
    fontSize: 32px
    fontWeight: '700'
    lineHeight: '1.2'
  headline-lg:
    fontFamily: Sora
    fontSize: 32px
    fontWeight: '600'
    lineHeight: '1.2'
    letterSpacing: -0.01em
  headline-md:
    fontFamily: Sora
    fontSize: 24px
    fontWeight: '600'
    lineHeight: '1.3'
  body-lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '400'
    lineHeight: '1.6'
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: '1.5'
  label-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '600'
    lineHeight: '1'
    letterSpacing: 0.05em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  base: 8px
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 48px
  hero-gap: 64px
  container-max: 1280px
---

## Brand & Style

The design system is built upon the concept of "Futuristic Financial Clarity." It targets a high-sophistication audience that values precision, speed, and a forward-leaning aesthetic typical of elite developer tools and premium fintech startups. 

The visual style is a hybrid of **Modern Corporate** and **Glassmorphism**, leaning heavily into a premium dark-mode experience. It utilizes a deep, atmospheric color palette punctuated by vibrant, energetic gradients. To maintain a sense of tangibility within a digital-first interface, the system employs subtle noise textures and ambient light leaks (glows) to simulate depth and high-end hardware interfaces. The emotional response is one of absolute control, technical superiority, and calm intelligence.

## Colors

The palette is optimized for high-contrast legibility within a dark environment. The foundation is a two-tier black: a deep obsidian for the background to provide infinite depth, and a slightly lighter charcoal for surfaces to define containment.

The primary accent is a **Deep Violet**, often expressed through a dynamic gradient transition into **Deep Blue**. This gradient represents movement and financial flow. For secondary information, a range of cool grays is used to maintain a clear visual hierarchy, ensuring that primary data points always command attention through luminosity. Functional colors (success, error, warning) should be desaturated to avoid clashing with the primary violet/blue aesthetic.

## Typography

This design system utilizes a dual-font strategy to balance character with utility. **Sora** is the voice of the system; its geometric construction and high-set x-height provide an assertive, technical feel for all headings and primary data visualizations.

**Inter** handles all functional and body text. Its neutral, systematic nature ensures that long-form data and complex financial tables remain readable and unobtrusive. For "Hero" balances, use the Display Hero style with tight letter spacing to emphasize the premium "startup" feel. Labels and secondary metadata should always use Inter in uppercase with slight tracking to differentiate them from interactive body elements.

## Layout & Spacing

The layout operates on a strict **8px grid system**, ensuring consistent vertical and horizontal rhythm. The philosophy is a "Fixed-Fluid" hybrid: content is centered within a 1280px container for desktop, but elements within that container stretch to fill the 12-column grid.

- **Desktop (1200px+):** 12 columns, 24px gutters, 48px side margins.
- **Tablet (768px - 1199px):** 8 columns, 16px gutters, 24px side margins.
- **Mobile (Under 768px):** 4 columns, 16px gutters, 16px side margins.

Hierarchy is reinforced through aggressive vertical spacing between sections (XL spacing) while keeping related KPIs tightly grouped (SM/MD spacing) to maintain a "dashboard" density.

## Elevation & Depth

Depth is achieved through **Glassmorphism** and tonal layering rather than traditional heavy shadows.

1.  **Level 0 (Base):** The #0A0C10 background.
2.  **Level 1 (Cards/Surfaces):** #0F1117 with a 1px solid border at 10% opacity (White).
3.  **Level 2 (Overlays/Modals):** Glassmorphic surfaces with a 12px backdrop blur, desaturated background tint, and a subtle "noise" grain texture (approx 3% opacity) to prevent banding.
4.  **Luminous Depth:** Primary actions and hero elements feature a "Violet Glow"—a diffused outer shadow (#8B5CF6) with a 20-40px blur radius at very low opacity (15-20%). 

Avoid drop shadows on text; instead, use high-contrast color values against dark surfaces to ensure clarity.

## Shapes

The shape language reflects a balance between precision and approachability. 
- **Standard Elements:** Buttons, input fields, and small cards use an **8px (0.5rem)** corner radius.
- **Container Elements:** Main dashboard sections, hero cards, and large containers use a **16px (1rem)** corner radius.

Consistent stroke weights are vital; use a 1px border for all interactive elements to maintain a sharp, "retina-ready" technical look. Avoid fully rounded pill shapes except for status indicators (chips).

## Components

### Buttons
Primary buttons use the violet-to-blue gradient with white text. On hover, a subtle ambient glow expands behind the button. Secondary buttons are "Ghost" style—transparent with a 1px border and a subtle hover-state fill.

### Cards
Cards are the primary structural unit. They should feature a subtle gradient border (top-left to bottom-right) and a background noise texture to simulate a high-end glass finish. KPIs inside cards should use **Sora Bold** for the numeric value.

### Inputs
Input fields are dark, with a #0F1117 fill and an 8px radius. Upon focus, the border transitions to the primary violet and a faint glow appears.

### Chips & Badges
Small, low-contrast pills for status. Use "Glass" variants (semi-transparent backgrounds) for secondary tags to keep the UI from feeling cluttered.

### Hero Balance
The hero component should occupy the top tier of the hierarchy. It uses the largest typography size and is the only element allowed to use a full-bleed ambient glow to anchor the user's focus on the "Financial Clarity" mission.