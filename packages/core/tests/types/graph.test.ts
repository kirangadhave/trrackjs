import { describe, expect, it } from "vitest";
import { addNode, createTrrackGraph } from "../../src/types/graph";
import { createNodeId } from "../../src/types/id";
import { createStateNode } from "../../src/types/node";
import { getNode } from "../fixtures/graph";
import { type TestState, initialState } from "../fixtures/state";
import { makeCheckpoint } from "../fixtures/storage";

describe("createTrrackGraph", () => {
	it("should create a graph with a root node", () => {
		const graph = createTrrackGraph(initialState);

		expect(graph.nodes.size).toBe(1);
		expect(graph.root).toBe(graph.current);

		const root = getNode(graph, graph.root);
		expect(root.type).toBe("root");
	});

	it("should use custom label when provided", () => {
		const graph = createTrrackGraph(initialState, { label: "Start" });
		const root = getNode(graph, graph.root);
		expect(root.label).toBe("Start");
	});

	it("should store initial state as checkpoint in root", () => {
		const graph = createTrrackGraph(initialState);
		const root = getNode(graph, graph.root);
		expect(root.state).toEqual({ type: "checkpoint", value: initialState });
	});
});

describe("addNode", () => {
	it("should add a node and update current", () => {
		const graph = createTrrackGraph<TestState>(initialState);
		const root = getNode(graph, graph.root);

		const child = createStateNode<TestState>({
			parent: root.id,
			level: 1,
			label: "Increment",
			state: makeCheckpoint({ counter: 1, name: "updated" }),
		});

		addNode(graph, child);

		expect(graph.nodes.size).toBe(2);
		expect(graph.current).toBe(child.id);
		expect(graph.nodes.get(child.id)).toBe(child);
	});

	it("should add child id to parent's children", () => {
		const graph = createTrrackGraph<TestState>(initialState);
		const root = getNode(graph, graph.root);

		const child = createStateNode<TestState>({
			parent: root.id,
			level: 1,
			label: "Increment",
			state: makeCheckpoint({ counter: 1, name: "updated" }),
		});

		addNode(graph, child);

		expect(root.children).toContain(child.id);
	});

	it("should throw if node already exists", () => {
		const graph = createTrrackGraph<TestState>(initialState);
		const root = getNode(graph, graph.root);

		expect(() => addNode(graph, root)).toThrowError("Node already exists.");
	});

	it("should throw if parent not found", () => {
		const graph = createTrrackGraph<TestState>(initialState);

		const orphan = createStateNode<TestState>({
			parent: createNodeId(),
			level: 1,
			label: "Orphan",
			state: makeCheckpoint({ counter: 0, name: "orphan" }),
		});

		expect(() => addNode(graph, orphan)).toThrowError("Parent node not found.");
	});
});
