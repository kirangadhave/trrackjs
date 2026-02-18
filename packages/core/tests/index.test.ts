import { describe, expect, it } from "vitest";

describe("@trrack/core", () => {
	it("should be importable", async () => {
		const mod = await import("../src/index");
		expect(mod).toBeDefined();
	});
});
