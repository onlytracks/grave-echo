# Grave Echo — Ideas

Ideas and inspiration for future features. Not committed — just captured for later evaluation.

## Illuminated ASCII (Global Illumination for Terminal)

Inspiration: https://jason.today/ascii-gi

Instead of flat foreground/background colors per tile, simulate lighting by adjusting
glyph colors based on proximity to light sources. This would make torches, magical items,
and spells cast visible light that affects nearby tiles.

**How it could work:**
- Light sources emit light with a color and intensity (torch = warm orange, magic = blue)
- Each visible tile's foreground color is blended with nearby light sources
- Tiles far from light are dim/dark; tiles near light are bright and tinted
- The existing fog of war (hidden/explored/visible) still applies — illumination only
  affects visible tiles
- Could use the same raycasting as the vision system to determine light reach

**Potential light sources:**
- Torches on walls (static, warm orange glow)
- Player carrying a torch (moves with them)
- Magical items (blue/purple glow)
- Spell effects (temporary, colored flash)
- Lava/fire terrain (red glow)
- Glowing mushrooms (green, ambient)

**Challenges:**
- Terminal color palette is limited (256 colors or 24-bit if supported)
- Performance — recalculating light for every tile each frame
- The Renderer interface currently uses named Color type (16 colors). Would need to
  extend to support RGB or at least 256-color mode for smooth gradients.
- Blending multiple light sources on a single tile

**Could start simple:** just dim tiles based on distance from the player (treating the
player as a light source), then add static light sources later.
