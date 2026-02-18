import { describe, expect, it } from "vitest";
import { createNodeId } from "../../src/types/id";

describe("createNodeId", () => {
	it("should return a string", () => {
		const id = createNodeId();
		expect(typeof id).toBe("string");
	});

	it("should return unique ids", () => {
		const ids = new Set(Array.from({ length: 100 }, () => createNodeId()));
		expect(ids.size).toBe(100);
	});
});
