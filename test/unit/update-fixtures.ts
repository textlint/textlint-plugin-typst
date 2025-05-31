import fs from "node:fs";
import path from "node:path";
import { test } from "@textlint/ast-tester";
import { convertTypstSourceToTextlintAstObject } from "../../src/typstToTextlintAst";

const fixtureDir = path.join(__dirname, "fixtures");
for (const filePath of fs.readdirSync(fixtureDir)) {
	const dirName = path.basename(filePath);
	const input = fs.readFileSync(
		path.join(fixtureDir, filePath, "input.typ"),
		"utf-8",
	);
	const AST = await convertTypstSourceToTextlintAstObject(input);
	test(AST);
	fs.writeFileSync(
		path.join(fixtureDir, filePath, "output.json"),
		JSON.stringify(AST, null, "\t"),
	);
}
