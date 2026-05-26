---
name: Equal Glass-Fintech
colors:
  surface: '#15121b'
  surface-dim: '#141317'
  surface-bright: '#3b383d'
  surface-container-lowest: '#0f0e11'
  surface-container-low: '#1c1b1f'
  surface-container: '#211e27'
  surface-container-high: '#2b292d'
  surface-container-highest: '#363438'
  on-surface: '#e6e1e7'
  on-surface-variant: '#cbc3d7'
  inverse-surface: '#e6e1e7'
  inverse-on-surface: '#323034'
  outline: '#948f9a'
  outline-variant: '#49454f'
  surface-tint: '#d0bcff'
  primary: '#e9ddff'
  on-primary: '#37265e'
  primary-container: '#d0bcff'
  on-primary-container: '#594983'
  inverse-primary: '#665590'
  secondary: '#adc6ff'
  on-secondary: '#122f5f'
  secondary-container: '#2c4677'
  on-secondary-container: '#9cb5ed'
  tertiary: '#6ffbbe'
  on-tertiary: '#003824'
  tertiary-container: '#4edea3'
  on-tertiary-container: '#005f40'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#e9ddff'
  primary-fixed-dim: '#d0bcff'
  on-primary-fixed: '#210f48'
  on-primary-fixed-variant: '#4d3d76'
  secondary-fixed: '#d8e2ff'
  secondary-fixed-dim: '#adc6ff'
  on-secondary-fixed: '#001a42'
  on-secondary-fixed-variant: '#2c4677'
  tertiary-fixed: '#6ffbbe'
  tertiary-fixed-dim: '#4edea3'
  on-tertiary-fixed: '#002114'
  on-tertiary-fixed-variant: '#005236'
  background: '#141317'
  on-background: '#e6e1e7'
  surface-variant: '#363438'
  glass-bg: rgba(33, 30, 39, 0.4)
  glass-border: rgba(255, 255, 255, 0.08)
  success: '#4edea3'
typography:
  display-lg:
    fontFamily: Hanken Grotesk
    fontSize: 48px
    fontWeight: '700'
    lineHeight: 56px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Hanken Grotesk
    fontSize: 32px
    fontWeight: '600'
    lineHeight: 40px
    letterSpacing: -0.01em
  headline-lg-mobile:
    fontFamily: Hanken Grotesk
    fontSize: 28px
    fontWeight: '600'
    lineHeight: 36px
  title-md:
    fontFamily: Hanken Grotesk
    fontSize: 20px
    fontWeight: '500'
    lineHeight: 28px
  body-lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  label-sm:
    fontFamily: JetBrains Mono
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
    letterSpacing: 0.05em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  xs: 4px
  base: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 48px
  gutter: 24px
  margin-mobile: 16px
  margin-desktop: 64px
---

## Brand & Style

Equal represents a high-end, contemporary fintech brand that balances professional financial management with an immersive, digital-first aesthetic. The design style is **Glassmorphism**, characterized by frosted-glass surfaces, vibrant background blurs, and a deep violet-to-black foundation. 

The brand evokes a sense of "precision in the dark"—it is technical, futuristic, and sophisticated. It targets a tech-savvy audience that values transparency and elegance in their financial tooling. The interface utilizes high-contrast accents (Emerald and Violet) against a muted backdrop to guide the eye toward critical financial data.

## Colors

The palette is anchored in a deep, "Midnight Purple" dark mode. 

- **Primary (Violet #d0bcff):** Used for branding, active states, and primary CTAs. It represents the "Equal" core identity.
- **Secondary (Blue #adc6ff):** Used for secondary metrics and decorative chart elements.
- **Tertiary (Emerald #4edea3):** Symbolizes growth, "Ingresos" (Income), and positive balances.
- **Surface & Containers:** Surfaces use a tiered dark violet approach. The "Glass" layer is the signature container style, using a 40% opacity background and heavy backdrop blur to create depth over ambient background glows.

## Typography

The system uses a tri-font hierarchy to communicate different levels of data:
- **Hanken Grotesk** is used for all "Display" and "Headline" roles. It provides a sharp, contemporary feel for branding and major numeric totals.
- **Inter** handles all "Body" and descriptive text, ensuring high legibility for transaction details and secondary information.
- **JetBrains Mono** is reserved for labels, currency indicators (ARS/USD), and metadata. This monospaced choice emphasizes the technical, "calculated" nature of the product.

Hierarchy is maintained through dramatic size shifts (e.g., 48px display values) and uppercase mono labels for context.

## Layout & Spacing

The layout utilizes a **Fixed Grid** approach for desktop (max-width: 1280px) and a fluid, single-column approach for mobile. 

- **Desktop:** Employs a 12-column logic with 24px gutters and wide 64px margins. Content is organized into semantic sections: Hero (top), Summary Grid (4 columns), and Detail Charts (2 columns).
- **Mobile:** Margins shrink to 16px. The Summary Grid collapses from a 4-column layout to 1 or 2 columns based on device width.
- **Spacing Rhythm:** Based on a 4px/8px baseline. Large internal card padding (24px) ensures data doesn't feel cramped despite the heavy visual effects.

## Elevation & Depth

Depth is achieved through **Glassmorphism** and **Ambient Glows** rather than traditional drop shadows.

1.  **The Base Layer:** Solid `#15121b` surface.
2.  **The Ambient Layer:** Large, extremely diffused radial gradients (`blur-100px`) in primary and tertiary colors sit behind cards to suggest light sources.
3.  **The Glass Layer:** Cards use `backdrop-filter: blur(12px)` and a thin `1px` border at 8% white opacity. This creates a "frosted" separation from the background glows.
4.  **Interaction:** On hover, glass cards increase their border opacity or background tint (`surface-container-high`) to simulate the card moving "closer" to the user.

## Shapes

The design uses a "Soft-Modern" shape language. 
- **Cards & Hero Sections:** Use `1.5rem` (xl) or `1rem` (lg) corner radii to appear approachable and premium.
- **Buttons & Chips:** Follow a similar rounded logic, with the Floating Action Button (FAB) using a unique `rounded-2xl` for distinction.
- **Icons:** Material Symbols Outlined are used with a thin weight (200) to match the elegant typography and glass borders.

## Components

### Buttons
- **Primary FAB:** A 56x56px `rounded-2xl` button in solid Primary color. Includes a 90-degree icon rotation on hover.
- **Ghost Buttons:** Text-only with Mono labels and high tracking, used for secondary actions like "Histórico completo."

### Cards (The Glass-Card)
The standard container for all dashboard items. It must include a 1px `white/08` border, a 40% opaque dark background, and a 12px blur. Hover states should transition the border color to the card's specific accent color (e.g., Emerald for Income, Red for Expenses).

### Charts
- **Donut Charts:** Use a 6px stroke-width with `stroke-linecap: round`. Use the `surface-container-highest` for the empty track to maintain low-contrast depth.
- **Legends:** List items with 8px circular color swatches and percentage labels in Mono font.

### Navigation
- **Top Bar:** A blurred, sticky header with a subtle bottom border.
- **Mobile Bottom Bar:** A high-blur navigation strip with centered icons and labels. The active state uses a solid Primary color.

### Feedback
- **Growth/Positive:** Tertiary (Emerald) text and icons.
- **Loss/Negative:** Error (Salmon/Red) text and icons.