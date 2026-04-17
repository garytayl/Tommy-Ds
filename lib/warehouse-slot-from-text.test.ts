import { describe, expect, it } from "vitest";

import { findWarehouseSlotInText } from "./warehouse-slot-from-text";

describe("findWarehouseSlotInText", () => {
  it("reads simple codes", () => {
    expect(findWarehouseSlotInText("A1")).toBe("A1");
    expect(findWarehouseSlotInText("B8")).toBe("B8");
    expect(findWarehouseSlotInText("c3")).toBe("C3");
  });

  it("prefers A10 over embedded A1", () => {
    expect(findWarehouseSlotInText("ZONE A10")).toBe("A10");
    expect(findWarehouseSlotInText("A10")).toBe("A10");
  });

  it("finds code in clutter", () => {
    expect(findWarehouseSlotInText("WAREHOUSE  RACK  B4  NORTH")).toBe("B4");
  });

  it("returns null when no valid slot", () => {
    expect(findWarehouseSlotInText("hello")).toBe(null);
    expect(findWarehouseSlotInText("D5")).toBe(null);
    expect(findWarehouseSlotInText("A99")).toBe(null);
  });
});
