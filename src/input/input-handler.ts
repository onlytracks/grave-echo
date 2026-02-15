export type InputEvent =
  | { type: "move"; direction: "up" | "down" | "left" | "right" }
  | { type: "pass" }
  | { type: "quit" }
  | { type: "unknown" };

export function parseInput(data: Buffer): InputEvent {
  if (data.length === 3 && data[0] === 0x1b && data[1] === 0x5b) {
    switch (data[2]) {
      case 0x41:
        return { type: "move", direction: "up" };
      case 0x42:
        return { type: "move", direction: "down" };
      case 0x43:
        return { type: "move", direction: "right" };
      case 0x44:
        return { type: "move", direction: "left" };
    }
  }

  if (data.length === 1) {
    if (data[0] === 0x1b || data[0] === 0x71) {
      return { type: "quit" };
    }
    if (data[0] === 0x2e) {
      return { type: "pass" };
    }
  }

  return { type: "unknown" };
}

export function enableRawMode(): void {
  if (process.stdin.isTTY) {
    process.stdin.setRawMode(true);
    process.stdin.resume();
  }
}

export function disableRawMode(): void {
  if (process.stdin.isTTY) {
    process.stdin.setRawMode(false);
    process.stdin.pause();
  }
}

export function waitForInput(): Promise<InputEvent> {
  return new Promise((resolve) => {
    const handler = (data: Buffer) => {
      process.stdin.removeListener("data", handler);
      resolve(parseInput(data));
    };
    process.stdin.on("data", handler);
  });
}
