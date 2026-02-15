import type { Renderer } from "../renderer.ts";
import type { Region } from "../layout.ts";

interface Keybinding {
  key: string;
  action: string;
  category: string;
}

const KEYBINDINGS: Keybinding[] = [
  { key: "Arrow Keys", action: "Move", category: "Movement" },
  { key: ".", action: "Pass turn", category: "Movement" },
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

  const keyColW = 14;
  let lineCount = 0;
  for (const [, bindings] of categories) {
    lineCount += 1 + bindings.length + 1; // header + bindings + blank
  }
  lineCount += 1; // footer

  const boxW = Math.min(36, region.width - 2);
  const boxH = Math.min(lineCount + 3, region.height - 2);
  const boxX = region.x + Math.floor((region.width - boxW) / 2);
  const boxY = region.y + Math.floor((region.height - boxH) / 2);

  for (let y = boxY; y < boxY + boxH; y++) {
    for (let x = boxX; x < boxX + boxW; x++) {
      renderer.drawCell(x, y, " ", "white", "black");
    }
  }

  renderer.drawBox(boxX, boxY, boxW, boxH, "Help");

  const cx = boxX + 2;
  const innerW = boxW - 4;
  let row = boxY + 1;

  for (const [category, bindings] of categories) {
    if (row >= boxY + boxH - 1) break;
    renderer.drawText(cx, row, category, "brightYellow");
    row++;

    for (const kb of bindings) {
      if (row >= boxY + boxH - 1) break;
      const keyStr = `  ${kb.key}`;
      const pad = Math.max(1, keyColW - keyStr.length);
      const line = (keyStr + " ".repeat(pad) + kb.action).slice(0, innerW);
      renderer.drawText(cx, row, line, "gray");
      row++;
    }
    row++;
  }

  const footer = "[?/Esc] close";
  const footerX = cx + Math.floor((innerW - footer.length) / 2);
  renderer.drawText(footerX, boxY + boxH - 2, footer, "gray");
}
