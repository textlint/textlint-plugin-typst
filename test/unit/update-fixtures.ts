import fs from "node:fs";
import path from "node:path";
import { test } from "@textlint/ast-tester";
import {
	convertRawTypstAstObjectToTextlintAstObject,
	convertRawTypstAstStringToObject,
	convertTypstSourceToTextlintAstObject,
	getRawTypstAstString,
	paragraphizeTextlintAstObject,
} from "../../src/typstToTextlintAst";

/**
 * Sort JSON object keys recursively for consistent output
 * @param obj The object to sort
 * @returns The object with sorted keys
 */

// biome-ignore lint/suspicious/noExplicitAny: JSON structure is not known.
const sortJsonKeys = (obj: any): any => {
	if (obj === null || typeof obj !== "object") {
		return obj;
	}

	if (Array.isArray(obj)) {
		return obj.map(sortJsonKeys);
	}

	// biome-ignore lint/suspicious/noExplicitAny: JSON structure is not known.
	const sorted: any = {};
	for (const key of Object.keys(obj).sort()) {
		sorted[key] = sortJsonKeys(obj[key]);
	}

	return sorted;
};

const fixtureDir = path.join(__dirname, "fixtures");
for (const filePath of fs.readdirSync(fixtureDir)) {
	const dirName = path.basename(filePath);
	const input = fs.readFileSync(
		path.join(fixtureDir, filePath, "input.typ"),
		"utf-8",
	);
	const AST = sortJsonKeys(await convertTypstSourceToTextlintAstObject(input));
	test(AST);
	fs.writeFileSync(
		path.join(fixtureDir, filePath, "output.json"),
		JSON.stringify(AST, null, "\t"),
	);
}

const typstSource = fs.readFileSync(
	path.join(__dirname, "example.typ"),
	"utf-8",
);

const rawTypstAstString = await getRawTypstAstString(typstSource);
fs.writeFileSync(
	path.join(__dirname, "rawTypstAstString.txt"),
	rawTypstAstString,
);

const rawTypstAstObject =
	await convertRawTypstAstStringToObject(rawTypstAstString);
fs.writeFileSync(
	path.join(__dirname, "rawTypstAstObject.json"),
	JSON.stringify(rawTypstAstObject, null, "\t"),
);

const textlintAstObject = convertRawTypstAstObjectToTextlintAstObject(
	rawTypstAstObject,
	typstSource,
);
fs.writeFileSync(
	path.join(__dirname, "textlintAstObject.json"),
	JSON.stringify(textlintAstObject, null, "\t"),
);

const paragraphizedTextlintAstObject =
	paragraphizeTextlintAstObject(textlintAstObject);
fs.writeFileSync(
	path.join(__dirname, "paragraphizedTextlintAstObject.json"),
	JSON.stringify(paragraphizedTextlintAstObject, null, "\t"),
);
