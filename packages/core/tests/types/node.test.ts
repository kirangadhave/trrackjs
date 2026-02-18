import { describe, expect, it } from "vitest";
import { createRootNode, createStateNode, isRootNode, isStateNode } from "../../src/types/node";
import { type TestState, initialState } from "../fixtures/state";
import { makeCheckpoint } from "../fixtures/storage";

describe("createRootNode", () => {
	it("should create a root node with correct defaults", () => {
		const node = createRootNode(initialState);

		expect(node.type).toBe("root");
		expect(node.level).toBe(0);
		expect(node.label).toBe("Root");
		expect(node.children).toEqual([]);
		expect(node.state).toEqual({ type: "checkpoint", value: initialState });
		expect(node.createdOn).toBeTypeOf("number");
	});

	it("should accept a custom label", () => {
		const node = createRootNode(initialState, "Start");
		expect(node.label).toBe("Start");
	});

	it("should always store state as checkpoint", () => {
		const node = createRootNode(initialState);
		expect(node.state.type).toBe("checkpoint");
	});
});

describe("createStateNode", () => {
	it("should create a state node with provided options", () => {
		const root = createRootNode<TestState>(initialState);
		const state = makeCheckpoint<TestState>({ counter: 1, name: "updated" });

		const node = createStateNode<TestState>({
			parent: root.id,
			level: 1,
			label: "Increment",
			state,
		});

		expect(node.type).toBe("state");
		expect(node.parent).toBe(root.id);
		expect(node.level).toBe(1);
		expect(node.label).toBe("Increment");
		expect(node.children).toEqual([]);
		expect(node.state).toEqual(state);
		expect(node.createdOn).toBeTypeOf("number");
	});
});

describe("type guards", () => {
	const root = createRootNode(initialState);
	const child = createStateNode({
		parent: root.id,
		level: 1,
		label: "Child",
		state: makeCheckpoint({ counter: 1, name: "child" }),
	});

	it("isRootNode returns true for root", () => {
		expect(isRootNode(root)).toBe(true);
	});

	it("isRootNode returns false for state node", () => {
		expect(isRootNode(child)).toBe(false);
	});

	it("isStateNode returns true for state node", () => {
		expect(isStateNode(child)).toBe(true);
	});

	it("isStateNode returns false for root", () => {
		expect(isStateNode(root)).toBe(false);
	});
});
