import { describe, expect, test } from "bun:test";
import { MessageLog } from "../messages.ts";

describe("MessageLog categories", () => {
  test("add() defaults to gameplay category", () => {
    const log = new MessageLog();
    log.add("hello");
    const all = log.getAllMessagesWithTurns();
    expect(all).toHaveLength(1);
    expect(all[0]!.category).toBe("gameplay");
  });

  test("debug messages excluded from getRecent()", () => {
    const log = new MessageLog();
    log.add("visible");
    log.add("[debug] hidden", "debug");
    log.add("also visible");
    expect(log.getRecent(10)).toEqual(["visible", "also visible"]);
  });

  test("debug messages excluded from getMessages()", () => {
    const log = new MessageLog();
    log.add("a");
    log.add("b", "debug");
    log.add("c");
    expect(log.getMessages()).toEqual(["a", "c"]);
  });

  test("debug messages excluded from getMessagesWithTurns()", () => {
    const log = new MessageLog();
    log.setTurn(1);
    log.add("gameplay msg");
    log.add("debug msg", "debug");
    const msgs = log.getMessagesWithTurns();
    expect(msgs).toHaveLength(1);
    expect(msgs[0]!.text).toBe("gameplay msg");
  });

  test("debug messages included in getRecentAll()", () => {
    const log = new MessageLog();
    log.add("a");
    log.add("b", "debug");
    log.add("c");
    const all = log.getRecentAll(10);
    expect(all).toHaveLength(3);
    expect(all[1]!.text).toBe("b");
    expect(all[1]!.category).toBe("debug");
  });

  test("debug messages included in getAllMessagesWithTurns()", () => {
    const log = new MessageLog();
    log.setTurn(2);
    log.add("gameplay");
    log.add("debug", "debug");
    const all = log.getAllMessagesWithTurns();
    expect(all).toHaveLength(2);
    expect(all[0]!.category).toBe("gameplay");
    expect(all[1]!.category).toBe("debug");
  });

  test("getRecentAll respects count limit", () => {
    const log = new MessageLog();
    for (let i = 0; i < 10; i++) log.add(`msg${i}`);
    const recent = log.getRecentAll(3);
    expect(recent).toHaveLength(3);
    expect(recent[0]!.text).toBe("msg7");
  });
});
