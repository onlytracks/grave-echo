import { describe, expect, test } from "bun:test";
import { AnsiRenderer } from "../ansi.ts";
import type { Renderer } from "../renderer.ts";

describe("AnsiRenderer", () => {
  test("implements Renderer interface", () => {
    const renderer: Renderer = new AnsiRenderer();
    expect(renderer).toBeDefined();
    expect(typeof renderer.init).toBe("function");
    expect(typeof renderer.shutdown).toBe("function");
    expect(typeof renderer.clear).toBe("function");
    expect(typeof renderer.drawCell).toBe("function");
    expect(typeof renderer.drawText).toBe("function");
    expect(typeof renderer.drawBox).toBe("function");
    expect(typeof renderer.flush).toBe("function");
    expect(typeof renderer.getScreenSize).toBe("function");
  });

  test("getScreenSize returns dimensions", () => {
    const renderer = new AnsiRenderer();
    const size = renderer.getScreenSize();
    expect(size.width).toBeGreaterThan(0);
    expect(size.height).toBeGreaterThan(0);
  });
});
