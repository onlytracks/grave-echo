import type { Color, Renderer } from "./renderer.ts";

const COLOR_CODES: Record<Color, number> = {
  black: 0,
  red: 1,
  green: 2,
  yellow: 3,
  blue: 4,
  magenta: 5,
  cyan: 6,
  white: 7,
  gray: 8,
  brightRed: 9,
  brightGreen: 10,
  brightYellow: 11,
  brightBlue: 12,
  brightMagenta: 13,
  brightCyan: 14,
  brightWhite: 15,
};

const ESC = "\x1b[";

function moveTo(x: number, y: number): string {
  return `${ESC}${y + 1};${x + 1}H`;
}

function fgCode(color: Color): string {
  const code = COLOR_CODES[color];
  return `${ESC}38;5;${code}m`;
}

function bgCode(color: Color): string {
  const code = COLOR_CODES[color];
  return `${ESC}48;5;${code}m`;
}

const RESET = `${ESC}0m`;

export class AnsiRenderer implements Renderer {
  private buffer = "";

  init(): void {
    process.stdout.write(`${ESC}?1049h`); // alternate screen
    process.stdout.write(`${ESC}?25l`); // hide cursor
  }

  shutdown(): void {
    process.stdout.write(`${ESC}?25h`); // show cursor
    process.stdout.write(`${ESC}?1049l`); // exit alternate screen
  }

  clear(): void {
    this.buffer = "";
    this.bufferWrite(`${ESC}2J`);
  }

  drawCell(x: number, y: number, char: string, fg: Color, bg: Color): void {
    this.bufferWrite(
      `${moveTo(x, y)}${fgCode(fg)}${bgCode(bg)}${char}${RESET}`,
    );
  }

  drawText(x: number, y: number, text: string, fg: Color): void {
    this.bufferWrite(`${moveTo(x, y)}${fgCode(fg)}${text}${RESET}`);
  }

  drawBox(
    x: number,
    y: number,
    width: number,
    height: number,
    title?: string,
  ): void {
    const top =
      "┌" +
      (title
        ? `─ ${title} ` +
          "─".repeat(Math.max(0, width - title.length - 5)) +
          "┐"
        : "─".repeat(width - 2) + "┐");
    const bottom = "└" + "─".repeat(width - 2) + "┘";

    this.drawText(x, y, top, "white");
    for (let row = 1; row < height - 1; row++) {
      this.drawText(x, y + row, "│", "white");
      this.drawText(x + width - 1, y + row, "│", "white");
    }
    this.drawText(x, y + height - 1, bottom, "white");
  }

  flush(): void {
    process.stdout.write(this.buffer);
    this.buffer = "";
  }

  getScreenSize(): { width: number; height: number } {
    return {
      width: process.stdout.columns ?? 80,
      height: process.stdout.rows ?? 24,
    };
  }

  private bufferWrite(data: string): void {
    this.buffer += data;
  }
}
