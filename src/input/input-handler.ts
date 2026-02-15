export type InputEvent =
  | { type: "move"; direction: "up" | "down" | "left" | "right" }
  | { type: "pass" }
  | { type: "quit" }
  | { type: "pickup" }
  | { type: "swapWeapon" }
  | { type: "useItem" }
  | { type: "inventory" }
  | { type: "toggleDebug" }
  | { type: "cycleTarget" }
  | { type: "attack" }
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

  // F1: \x1bOP (xterm) or \x1b[11~ (most terminals)
  if (
    data.length === 3 &&
    data[0] === 0x1b &&
    data[1] === 0x4f &&
    data[2] === 0x50
  ) {
    return { type: "toggleDebug" };
  }
  if (
    data.length === 4 &&
    data[0] === 0x1b &&
    data[1] === 0x5b &&
    data[2] === 0x31 &&
    data[3] === 0x7e
  ) {
    return { type: "toggleDebug" };
  }
  // Also match \x1b[11~ as 5 bytes
  if (
    data.length === 5 &&
    data[0] === 0x1b &&
    data[1] === 0x5b &&
    data[2] === 0x31 &&
    data[3] === 0x31 &&
    data[4] === 0x7e
  ) {
    return { type: "toggleDebug" };
  }

  if (data.length === 1) {
    if (data[0] === 0x1b || data[0] === 0x71) {
      return { type: "quit" };
    }
    if (data[0] === 0x09) {
      return { type: "cycleTarget" };
    }
    if (data[0] === 0x20) {
      return { type: "attack" };
    }
    if (data[0] === 0x2e) {
      return { type: "pass" };
    }
    if (data[0] === 0x65) {
      return { type: "pickup" };
    }
    if (data[0] === 0x73) {
      return { type: "swapWeapon" };
    }
    if (data[0] === 0x75) {
      return { type: "useItem" };
    }
    if (data[0] === 0x69) {
      return { type: "inventory" };
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

export interface RawInput {
  event: InputEvent;
  raw: Buffer;
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

export function waitForRawInput(): Promise<RawInput> {
  return new Promise((resolve) => {
    const handler = (data: Buffer) => {
      process.stdin.removeListener("data", handler);
      resolve({ event: parseInput(data), raw: data });
    };
    process.stdin.on("data", handler);
  });
}
