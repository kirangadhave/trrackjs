/** Simple state type used across tests */
export type TestState = {
	counter: number;
	name: string;
};

export const initialState: TestState = { counter: 0, name: "initial" };
