import { describe, expect, test } from "bun:test";
import { World } from "../world.ts";
import type { Position, Renderable } from "../components.ts";

describe("World", () => {
  test("createEntity returns unique IDs", () => {
    const world = new World();
    const a = world.createEntity();
    const b = world.createEntity();
    expect(a).not.toBe(b);
  });

  test("add and get component", () => {
    const world = new World();
    const e = world.createEntity();
    world.addComponent(e, "Position", { x: 5, y: 10 });
    const pos = world.getComponent<"Position">(e, "Position");
    expect(pos).toEqual({ x: 5, y: 10 });
  });

  test("getComponent returns undefined for missing component", () => {
    const world = new World();
    const e = world.createEntity();
    expect(world.getComponent(e, "Position")).toBeUndefined();
  });

  test("removeComponent removes the component", () => {
    const world = new World();
    const e = world.createEntity();
    world.addComponent(e, "Position", { x: 0, y: 0 });
    world.removeComponent(e, "Position");
    expect(world.getComponent(e, "Position")).toBeUndefined();
  });

  test("destroyEntity removes all components", () => {
    const world = new World();
    const e = world.createEntity();
    world.addComponent(e, "Position", { x: 1, y: 2 });
    world.addComponent(e, "Renderable", {
      char: "@",
      fg: "white",
      bg: "black",
    });
    world.destroyEntity(e);
    expect(world.getComponent(e, "Position")).toBeUndefined();
    expect(world.getComponent(e, "Renderable")).toBeUndefined();
  });

  test("query by single component", () => {
    const world = new World();
    const a = world.createEntity();
    const b = world.createEntity();
    world.addComponent(a, "Position", { x: 0, y: 0 });
    const result = world.query("Position");
    expect(result).toContain(a);
    expect(result).not.toContain(b);
  });

  test("query by multiple components", () => {
    const world = new World();
    const a = world.createEntity();
    const b = world.createEntity();
    const c = world.createEntity();
    world.addComponent(a, "Position", { x: 0, y: 0 });
    world.addComponent(a, "Renderable", {
      char: "@",
      fg: "white",
      bg: "black",
    });
    world.addComponent(b, "Position", { x: 1, y: 1 });
    world.addComponent(c, "Renderable", { char: "#", fg: "gray", bg: "black" });
    const result = world.query("Position", "Renderable");
    expect(result).toEqual([a]);
  });

  test("query excludes entities missing required components", () => {
    const world = new World();
    const a = world.createEntity();
    world.addComponent(a, "Position", { x: 0, y: 0 });
    const result = world.query("Position", "Collidable");
    expect(result).toEqual([]);
  });

  test("destroyed entity excluded from queries", () => {
    const world = new World();
    const a = world.createEntity();
    world.addComponent(a, "Position", { x: 0, y: 0 });
    world.destroyEntity(a);
    expect(world.query("Position")).toEqual([]);
  });

  test("addComponent on destroyed entity is no-op", () => {
    const world = new World();
    const e = world.createEntity();
    world.destroyEntity(e);
    world.addComponent(e, "Position", { x: 0, y: 0 });
    expect(world.getComponent(e, "Position")).toBeUndefined();
  });

  test("tag component (PlayerControlled)", () => {
    const world = new World();
    const e = world.createEntity();
    world.addComponent(e, "PlayerControlled", {});
    expect(world.hasComponent(e, "PlayerControlled")).toBe(true);
    expect(world.query("PlayerControlled")).toEqual([e]);
  });
});
