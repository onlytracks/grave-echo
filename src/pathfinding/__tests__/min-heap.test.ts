import { describe, expect, test } from "bun:test";
import { MinHeap } from "../min-heap.ts";

describe("MinHeap", () => {
  test("push/pop maintains min ordering", () => {
    const heap = new MinHeap<number>((a, b) => a - b);
    heap.push(5);
    heap.push(3);
    heap.push(7);
    heap.push(1);
    heap.push(4);

    expect(heap.pop()).toBe(1);
    expect(heap.pop()).toBe(3);
    expect(heap.pop()).toBe(4);
    expect(heap.pop()).toBe(5);
    expect(heap.pop()).toBe(7);
    expect(heap.pop()).toBeUndefined();
  });

  test("with custom comparator", () => {
    const heap = new MinHeap<{ val: number }>((a, b) => a.val - b.val);
    heap.push({ val: 10 });
    heap.push({ val: 2 });
    heap.push({ val: 8 });

    expect(heap.pop()!.val).toBe(2);
    expect(heap.pop()!.val).toBe(8);
    expect(heap.pop()!.val).toBe(10);
  });

  test("size tracks correctly", () => {
    const heap = new MinHeap<number>((a, b) => a - b);
    expect(heap.size).toBe(0);
    heap.push(1);
    expect(heap.size).toBe(1);
    heap.push(2);
    expect(heap.size).toBe(2);
    heap.pop();
    expect(heap.size).toBe(1);
  });

  test("single element", () => {
    const heap = new MinHeap<number>((a, b) => a - b);
    heap.push(42);
    expect(heap.pop()).toBe(42);
    expect(heap.size).toBe(0);
  });
});
