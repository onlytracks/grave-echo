export type Color =
  | "black"
  | "red"
  | "green"
  | "yellow"
  | "blue"
  | "magenta"
  | "cyan"
  | "white"
  | "gray"
  | "brightRed"
  | "brightGreen"
  | "brightYellow"
  | "brightBlue"
  | "brightMagenta"
  | "brightCyan"
  | "brightWhite";

export interface Renderer {
  init(): void;
  shutdown(): void;
  clear(): void;
  drawCell(x: number, y: number, char: string, fg: Color, bg: Color): void;
  drawText(x: number, y: number, text: string, fg: Color): void;
  drawBox(
    x: number,
    y: number,
    width: number,
    height: number,
    title?: string,
  ): void;
  flush(): void;
  getScreenSize(): { width: number; height: number };
}
