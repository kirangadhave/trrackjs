export default {
	extends: ["@commitlint/config-conventional"],
	rules: {
		"scope-enum": [2, "always", ["core"]],
		"scope-empty": [1, "never"],
	},
};
