import type { Color, Renderer } from "../renderer.ts";
import type { Region } from "../layout.ts";

interface Keybinding {
  key: string;
  action: string;
  category: string;
}

interface GlyphEntry {
  glyph: string;
  label: string;
  fg: Color;
}

const KEYBINDINGS: Keybinding[] = [
  { key: "Arrow Keys", action: "Move", category: "Movement" },
  { key: ".", action: "Defend / end turn", category: "Movement" },
  { key: "Tab", action: "Cycle targets", category: "Combat" },
  { key: "Space", action: "Attack target", category: "Combat" },
  { key: "e", action: "Pick up item", category: "Items" },
  { key: "i", action: "Inventory", category: "Items" },
  { key: "s", action: "Swap weapon", category: "Items" },
  { key: "u", action: "Use consumable", category: "Items" },
  { key: "F1", action: "Toggle debug", category: "Other" },
  { key: "?", action: "This help", category: "Other" },
  { key: "Esc / q", action: "Quit", category: "Other" },
];

const GLYPH_LEGEND: GlyphEntry[] = [
  { glyph: "@", label: "You", fg: "brightWhite" },
  { glyph: "\u{0121}", label: "Goblin", fg: "red" },
  { glyph: "\u{0120}", label: "Boss", fg: "brightRed" },
  { glyph: "·", label: "Floor", fg: "gray" },
  { glyph: "▓", label: "Wall", fg: "white" },
  { glyph: "\u{F04E5}", label: "Weapon", fg: "cyan" },
  { glyph: "\u{F0893}", label: "Armor", fg: "cyan" },
  { glyph: "\u{1AAD}", label: "Ring", fg: "cyan" },
  { glyph: "\u{0920}", label: "Amulet", fg: "cyan" },
  { glyph: "\u{16C3}", label: "Boots", fg: "cyan" },
  { glyph: "\u{13A3}", label: "Potion", fg: "green" },
];

export function renderHelpScreen(renderer: Renderer, region: Region): void {
  const categories = new Map<string, Keybinding[]>();
  for (const kb of KEYBINDINGS) {
    let list = categories.get(kb.category);
    if (!list) {
      list = [];
      categories.set(kb.category, list);
    }
    list.push(kb);
  }

  const keybindColW = 32;
  const glyphColW = 18;
  const dividerW = 1;
  const padding = 4; // 2 padding on each side
  const boxW = Math.min(
    keybindColW + dividerW + glyphColW + padding,
    region.width - 2,
  );

  const keyColW = 14;
  let keybindLines = 0;
  for (const [, bindings] of categories) {
    keybindLines += 1 + bindings.length + 1;
  }
  // +1 header "Glyphs" +1 blank
  const glyphContentLines = 1 + GLYPH_LEGEND.length + 1;
  const contentLines = Math.max(keybindLines, glyphContentLines);
  // +2 for box border top/bottom, +1 for footer
  const boxH = Math.min(contentLines + 3, region.height - 2);

  const boxX = region.x + Math.floor((region.width - boxW) / 2);
  const boxY = region.y + Math.floor((region.height - boxH) / 2);

  for (let y = boxY; y < boxY + boxH; y++) {
    for (let x = boxX; x < boxX + boxW; x++) {
      renderer.drawCell(x, y, " ", "white", "black");
    }
  }

  renderer.drawBox(boxX, boxY, boxW, boxH, "Help");

  // Left column: keybindings
  const leftX = boxX + 2;
  let row = boxY + 1;

  for (const [category, bindings] of categories) {
    if (row >= boxY + boxH - 1) break;
    renderer.drawText(leftX, row, category, "brightYellow");
    row++;

    for (const kb of bindings) {
      if (row >= boxY + boxH - 1) break;
      const keyStr = `  ${kb.key}`;
      const pad = Math.max(1, keyColW - keyStr.length);
      const line = (keyStr + " ".repeat(pad) + kb.action).slice(0, keybindColW);
      renderer.drawText(leftX, row, line, "gray");
      row++;
    }
    row++;
  }

  // Vertical divider
  const divX = boxX + 2 + keybindColW;
  for (let y = boxY + 1; y < boxY + boxH - 1; y++) {
    renderer.drawCell(divX, y, "│", "gray", "black");
  }

  // Right column: glyph legend
  const rightX = divX + 2;
  row = boxY + 1;

  renderer.drawText(rightX, row, "Glyphs", "brightYellow");
  row++;

  for (const entry of GLYPH_LEGEND) {
    if (row >= boxY + boxH - 1) break;
    renderer.drawCell(rightX + 1, row, entry.glyph, entry.fg, "black");
    renderer.drawText(rightX + 4, row, entry.label, "gray");
    row++;
  }

  // Footer centered across full box
  const innerW = boxW - 4;
  const footer = "[?/Esc] close";
  const footerX = boxX + 2 + Math.floor((innerW - footer.length) / 2);
  renderer.drawText(footerX, boxY + boxH - 2, footer, "gray");
}
