import fs from "node:fs";
import path from "node:path";
import * as ASTTester from "@textlint/ast-tester";
import { describe, expect, it } from "vitest";
import {
	convertRawTypstAstObjectToTextlintAstObject,
	convertRawTypstAstStringToObject,
	convertTypstSourceToTextlintAstObject,
	extractRawSourceByLocation,
	getRawTypstAstString,
	paragraphizeTextlintAstObject,
} from "../../src/typstToTextlintAst";

const typstSource = fs.readFileSync(
	path.join(__dirname, "example.typ"),
	"utf-8",
);

const rawTypstAstString = fs
	.readFileSync(path.join(__dirname, "rawTypstAstString.txt"), "utf-8")
	.replace(/\n$/, "");

const rawTypstAstObject = JSON.parse(
	fs.readFileSync(path.join(__dirname, "rawTypstAstObject.json"), "utf-8"),
);

const textlintAstObject = JSON.parse(
	fs.readFileSync(path.join(__dirname, "textlintAstObject.json"), "utf-8"),
);

const paragraphizedTextlintAstObject = JSON.parse(
	fs.readFileSync(
		path.join(__dirname, "paragraphizedTextlintAstObject.json"),
		"utf-8",
	),
);

describe("getRawTypstAstString", () => {
	it("should return raw typst ast string", async () => {
		const actualRawTypstAstString = await getRawTypstAstString(typstSource);
		expect(actualRawTypstAstString).toStrictEqual(rawTypstAstString);
	});
});

describe("convertRawTypstAstStringToObject", () => {
	it("should convert raw Typst AST to raw Typst AST object", async () => {
		const actualRawTypstAstObject =
			await convertRawTypstAstStringToObject(rawTypstAstString);
		expect(actualRawTypstAstObject).toStrictEqual(rawTypstAstObject);
	});
});

describe("extractRawSourceByLocation", () => {
	it("should extract substring from a single line", async () => {
		const location = {
			start: { line: 1, column: 3 },
			end: { line: 1, column: 8 },
		};
		const actualRawSource = await extractRawSourceByLocation(
			typstSource,
			location,
		);
		expect(actualRawSource).toStrictEqual("t pag");
	});

	it("should extract substring across multiple lines", async () => {
		const location = {
			start: { line: 1, column: 2 },
			end: { line: 2, column: 12 },
		};
		const actualRawSource = await extractRawSourceByLocation(
			typstSource,
			location,
		);
		expect(actualRawSource).toStrictEqual(`et page(width: 10cm, height: auto)
#set heading`);
	});
});

describe("convertRawTypstAstObjectToTextlintAstObject", () => {
	it("should convert raw Typst AST object to textlint AST object", async () => {
		const actualTextlintAstObject =
			await convertRawTypstAstObjectToTextlintAstObject(
				rawTypstAstObject,
				typstSource,
			);
		expect(actualTextlintAstObject).toStrictEqual(textlintAstObject);
		ASTTester.test(actualTextlintAstObject);
	});
});

describe("paragraphizeTextlintAstObject", () => {
	it("should convert textlint AST object to paragraphized textlint AST object", async () => {
		const actualParagraphizedTextlintAstObject =
			await paragraphizeTextlintAstObject(textlintAstObject);
		expect(actualParagraphizedTextlintAstObject).toStrictEqual(
			paragraphizedTextlintAstObject,
		);
		ASTTester.test(actualParagraphizedTextlintAstObject);
	});
});

describe("convertTypstSourceToParagraphizedTextlintAstObject", () => {
	it("should convert Typst source to textlint AST object", async () => {
		const actualTextlintAstObject =
			await convertTypstSourceToTextlintAstObject(typstSource);
		expect(actualTextlintAstObject).toStrictEqual(
			paragraphizedTextlintAstObject,
		);
		ASTTester.test(actualTextlintAstObject);
	});
});
