import { describe, expect, it } from "vitest";
import { createNodeId } from "../../src/types/id";
import { isCheckpoint, isTrrackPatch } from "../../src/types/storage";
import { makeCheckpoint, makePatchState } from "../fixtures/storage";

describe("isCheckpoint", () => {
	it("should return true for checkpoint", () => {
		const cp = makeCheckpoint({ counter: 0 });
		expect(isCheckpoint(cp)).toBe(true);
	});

	it("should return false for patch", () => {
		const patch = makePatchState(createNodeId());
		expect(isCheckpoint(patch)).toBe(false);
	});
});

describe("isTrrackPatch", () => {
	it("should return true for patch", () => {
		const patch = makePatchState(createNodeId());
		expect(isTrrackPatch(patch)).toBe(true);
	});

	it("should return false for checkpoint", () => {
		const cp = makeCheckpoint({ counter: 0 });
		expect(isTrrackPatch(cp)).toBe(false);
	});
});
