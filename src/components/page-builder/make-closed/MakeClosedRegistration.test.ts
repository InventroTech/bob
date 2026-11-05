import { describe, expect, it } from "vitest";

import { componentMap } from "@/features/page-builder/componentMap";
import { MakeFreshComponent } from "@/components/page-builder/make-fresh/MakeFreshComponent";
import { MakeClosedComponent } from "./MakeClosedComponent";

describe("Close Leads page builder registration", () => {
  it("registers Close Leads as its own widget type", () => {
    expect(componentMap.makeClosed).toBe(MakeClosedComponent);
  });

  it("leaves Make Fresh as a separate widget", () => {
    expect(componentMap.makeFresh).toBe(MakeFreshComponent);
    expect(componentMap.makeFresh).not.toBe(MakeClosedComponent);
  });
});
