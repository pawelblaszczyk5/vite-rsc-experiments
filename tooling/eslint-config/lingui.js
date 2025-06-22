import tseslint from "typescript-eslint";
import lingui from "eslint-plugin-lingui";

export default tseslint.config({
	name: "Lingui",
	plugins: { lingui },
	rules: {
		"lingui/t-call-in-function": "error",
		"lingui/no-single-tag-to-translate": "error",
		"lingui/no-single-variables-to-translate": "error",
		"lingui/no-trans-inside-trans": "error",
		"lingui/no-expression-in-message": "error",
	},
});
