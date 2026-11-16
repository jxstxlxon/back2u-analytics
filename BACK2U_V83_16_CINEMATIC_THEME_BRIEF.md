# BACK2U V8.3 — 16 cinematic themes / implementation brief

These are **specifications, not yet activated presets**. Do not count them among the live 56 themes until the assets, CSS, and functional previews are merged and verified.

## Required release quality

Every theme needs a unique self-hosted cinematic hero illustration (1920×1080 or equivalent high-density art direction), an actual gallery thumbnail, a matching hero mask, coherent card and nav material, and readable dark/light UI. The dashboard must remain semantic HTML with real stats; artwork must never contain fake charts, synthetic account numbers, or misleading widgets. Static, compressed WebP/JPEG AVIF as available; no shader or scroll-time blur. Respect reduced motion and keep the 7/28/90-day analytics intact. Aim for unique **world silhouette** as well as color. Screenshots must pass at 320/390/430/834/1440 CSS px.

## Cinematic collection (IDs proposed: cx01–cx10)
| ID | Name | Hero world | Unique materials and card language |
|----|------|------------|------------------------------------|
| cx01 | Hyperdrive Tokyo | Rainy megacity highway, magenta-cyan speed trails, layered elevated roads | Wet chrome, speed-slit KPI borders, technical typography, restrained HUD lines |
| cx02 | Chrome Cathedral | Polished silver vault, ice-blue luminous arches, giant suspended prism | Mirror-aluminum with prismatic split rims; sparse sculpture-like cards |
| cx03 | Inferno Velocity | Lava-red turbine circuit, ember exhaust and charcoal industrial towers | Blackened titanium, asymmetric molten edge beams, rectangular motor panels |
| cx04 | Arctic Singularity | Blue-black glacier cathedral under aurora with floating ring singularity | Frosted crystalline relief, beveled diamond corners, glacial blue metric glow |
| cx05 | Emerald Reactor | Enormous luminous green energy core amid dark glass control chambers | Reactor cores, segmented green-laser guides, distinct emerald crystal tiles |
| cx06 | Void Pulse | Near-black cosmic cavity, violet plasma fault lines and star dust | Obsidian matte ceramic, electric violet fractured highlights, deep inset cards |
| cx07 | Hologram Rush | Neon holographic tunnel with floating diffracting translucent screens | Iridescent refraction, split-color card edges, high-contrast clean numeric ink |
| cx08 | Golden Phantom | Deep bronze superstructure, warm champagne light shafts, golden floating rings | Brushed gold/platinum cutlines, quiet luxury tabs, high-polish pearl highlights |
| cx09 | Midnight Grid | Midnight navy data center/city silhouette, cyan beam matrix | Fine etched graphite grid, restrained monitors and precise information hierarchy |
| cx10 | Toxic Dream | Bioluminescent acid-green fantasy jungle with black liquid pools | Slime-glass capsule forms, black-green metal edges, vivid lime signal accents |

## Frutiger Aero collection (IDs proposed: ca01–ca04)
| ID | Name | Hero world | Unique materials and card language |
|----|------|------------|------------------------------------|
| ca01 | Aqua Sphere OS | Aqua sky with huge transparent floating orbs and refracted sunbeams | Rounded translucent aqua panels, clean white UI, buoyant soft highlights |
| ca02 | Lime Vista Glass | Rolling meadow, translucent lake, blue sky and fresh lime sunlight | Vibrant grass-glass panels, gentle ceramic gradients, airy controls |
| ca03 | Cloudwave 2007 | Dreamy cloud sea, glass helix, warm optimistic sunlit horizon | Early-web gloss and milky glass, vapor-like pale blue cards, legible charcoal text |
| ca04 | Ocean Bubble UI | Underwater sun caustics, enormous bubbles and smooth aqua shapes | Soft transparent capsules, wet specular highlights, larger friendly numeric blocks |

## Liminal / atmospheric collection (IDs proposed: cl01–cl02)
| ID | Name | Hero world | Unique materials and card language |
|----|------|------------|------------------------------------|
| cl01 | Backrooms Fluorescence | Vast yellow fluorescent carpet maze, impossible repeating walls | Aged glossy plastic, pale yellow-green tube-light borders; readability first |
| cl02 | Mallsoft Mirage | Empty pastel shopping atrium, 1990s skylights and misty escalators | Nostalgic pastel pearlescence, tubular chrome and lavender glass cards |

## Acceptance gates

1. 16 real, distinct art assets and previews, not one image tinted 16 ways.
2. Every preset integrates with the existing Theme Studio edits, local storage, chart-mode toggle and guest read-only permissions.
3. Light themes pass contrast checks and dark themes preserve component hierarchy; stats never wrap at supported mobile widths.
4. iPhone/iPad/desktop Chromium runs plus a manual iPhone Safari acceptance before claiming verified device smoothness.
5. Backups, production-safety tests, independent Cloudflare deployment verification.
