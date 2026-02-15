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

const GLYPH_GROUPS: { label: string; entries: GlyphEntry[] }[] = [
  {
    label: "Terrain",
    entries: [
      { glyph: "·", label: "Floor", fg: "gray" },
      { glyph: "▓", label: "Wall", fg: "white" },
    ],
  },
  {
    label: "Entities",
    entries: [
      { glyph: "@", label: "You", fg: "brightWhite" },
      { glyph: "\u{0121}", label: "Goblin", fg: "red" },
      { glyph: "\u{0120}", label: "Boss", fg: "brightRed" },
      { glyph: "a", label: "Archer", fg: "brightYellow" },
      { glyph: "\u{040B}", label: "Guardian", fg: "brightGreen" },
      { glyph: "\u{03DB}", label: "Skulker", fg: "green" },
      { glyph: "\u{020E}", label: "Patrol", fg: "gray" },
    ],
  },
  {
    label: "Weapons",
    entries: [
      { glyph: "\u{F04E5}", label: "Sword", fg: "cyan" },
      { glyph: "\u{F18BE}", label: "Sword+Shield", fg: "cyan" },
      { glyph: "\u{F1842}", label: "Axe", fg: "cyan" },
      { glyph: "\u{F1843}", label: "Mace+Shield", fg: "cyan" },
      { glyph: "\u{F1845}", label: "Spear", fg: "cyan" },
      { glyph: "\u{F08C8}", label: "Halberd", fg: "cyan" },
      { glyph: "\u{F1841}", label: "Bow / Crossbow", fg: "cyan" },
      { glyph: "\u{F1844}", label: "Staff", fg: "cyan" },
      { glyph: "\u{F0AD0}", label: "Wand", fg: "cyan" },
    ],
  },
  {
    label: "Equipment",
    entries: [
      { glyph: "\u{F0893}", label: "Armor", fg: "cyan" },
      { glyph: "\u{1AAD}", label: "Ring", fg: "cyan" },
      { glyph: "\u{0920}", label: "Amulet", fg: "cyan" },
      { glyph: "\u{16C3}", label: "Boots", fg: "cyan" },
    ],
  },
  {
    label: "Consumables",
    entries: [{ glyph: "\u{13A3}", label: "Potion", fg: "green" }],
  },
];

function countGlyphLines(): number {
  let lines = 0;
  for (const group of GLYPH_GROUPS) {
    lines += 1 + group.entries.length + 1; // header + entries + blank
  }
  return lines;
}

function countKeybindLines(): number {
  const categories = new Map<string, number>();
  for (const kb of KEYBINDINGS) {
    categories.set(kb.category, (categories.get(kb.category) ?? 0) + 1);
  }
  let lines = 0;
  for (const [, count] of categories) {
    lines += 1 + count + 1;
  }
  return lines;
}

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
  const glyphColW = 22;
  const dividerW = 1;
  const padding = 4;
  const boxW = Math.min(
    keybindColW + dividerW + glyphColW + padding,
    region.width - 2,
  );

  const keyColW = 14;
  const keybindLines = countKeybindLines();
  const glyphLines = countGlyphLines();
  const contentLines = Math.max(keybindLines, glyphLines);
  const boxH = Math.min(contentLines + 3, region.height - 2);

  const boxX = region.x + Math.floor((region.width - boxW) / 2);
  const boxY = region.y + Math.floor((region.height - boxH) / 2);

  for (let y = boxY; y < boxY + boxH; y++) {
    for (let x = boxX; x < boxX + boxW; x++) {
      renderer.drawCell(x, y, " ", "white", "black");
    }
  }

  renderer.drawBox(boxX, boxY, boxW, boxH, "Help");

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

  const divX = boxX + 2 + keybindColW;
  for (let y = boxY + 1; y < boxY + boxH - 1; y++) {
    renderer.drawCell(divX, y, "│", "gray", "black");
  }

  const rightX = divX + 2;
  row = boxY + 1;

  for (const group of GLYPH_GROUPS) {
    if (row >= boxY + boxH - 1) break;
    renderer.drawText(rightX, row, group.label, "brightYellow");
    row++;

    for (const entry of group.entries) {
      if (row >= boxY + boxH - 1) break;
      renderer.drawCell(rightX + 1, row, entry.glyph, entry.fg, "black");
      renderer.drawText(
        rightX + 4,
        row,
        entry.label.slice(0, glyphColW - 5),
        "gray",
      );
      row++;
    }
    row++;
  }

  const innerW = boxW - 4;
  const footer = "[?/Esc] close";
  const footerX = boxX + 2 + Math.floor((innerW - footer.length) / 2);
  renderer.drawText(footerX, boxY + boxH - 2, footer, "gray");
}
