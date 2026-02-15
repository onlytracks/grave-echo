import { describe, expect, test } from "bun:test";
import { parseInput } from "../input-handler.ts";

describe("parseInput", () => {
  test("arrow up parses to move up", () => {
    expect(parseInput(Buffer.from([0x1b, 0x5b, 0x41]))).toEqual({
      type: "move",
      direction: "up",
    });
  });

  test("arrow down parses to move down", () => {
    expect(parseInput(Buffer.from([0x1b, 0x5b, 0x42]))).toEqual({
      type: "move",
      direction: "down",
    });
  });

  test("arrow right parses to move right", () => {
    expect(parseInput(Buffer.from([0x1b, 0x5b, 0x43]))).toEqual({
      type: "move",
      direction: "right",
    });
  });

  test("arrow left parses to move left", () => {
    expect(parseInput(Buffer.from([0x1b, 0x5b, 0x44]))).toEqual({
      type: "move",
      direction: "left",
    });
  });

  test("escape parses to quit", () => {
    expect(parseInput(Buffer.from([0x1b]))).toEqual({ type: "quit" });
  });

  test("q parses to quit", () => {
    expect(parseInput(Buffer.from([0x71]))).toEqual({ type: "quit" });
  });

  test("unknown bytes parse to unknown", () => {
    expect(parseInput(Buffer.from([0x61]))).toEqual({ type: "unknown" });
  });

  test("i key parses to inventory", () => {
    expect(parseInput(Buffer.from([0x69]))).toEqual({ type: "inventory" });
  });
});
