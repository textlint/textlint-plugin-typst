import { createTypstCompiler } from "@myriaddreamin/typst.ts/dist/esm/compiler.mjs";
import {
	ASTNodeTypes,
	type TxtDocumentNode,
	type TxtNode,
	type TxtNodePosition,
	type TxtParentNode,
	type TxtTextNode,
} from "@textlint/ast-node-types";
import type { Content } from "@textlint/ast-node-types/lib/src/NodeType";
import { parse } from "yaml";

/**
 * Get the raw Typst AST string from a source string.
 * @param source The source string.
 * @returns The raw Typst AST string.
 */
export const getRawTypstAstString = async (source: string) => {
	const compiler = createTypstCompiler();
	await compiler.init();
	compiler.addSource("/main.typ", source);

	const rawTypstAstString = await compiler.getAst("/main.typ");

	return rawTypstAstString;
};

/**
 * Convert a raw Typst AST string to a Typst AST object.
 * @param rawTypstAstString The raw Typst AST string.
 * @returns The Typst AST object.
 */
export const convertRawTypstAstStringToObject = (rawTypstAstString: string) => {
	const removeFirstLine = (input: string): string => {
		const lines = input.split("\n");
		lines.shift();
		return lines.join("\n");
	};

	const escapeYamlValues = (yamlString: string): string => {
		return yamlString
			.split("\n")
			.reduce<string[]>((acc, line) => {
				// NOTE: If the line does not match the pattern, it is considered a continuation of the previous value.
				if (!/^\s*(path:|ast:|- s: |s: |c:)/.test(line)) {
					if (acc.length > 0) {
						acc[acc.length - 1] =
							`${acc[acc.length - 1].slice(0, -1)}\\n${line}"`;
					}
					return acc;
				}
				const [key, ...rest] = line.split(":");
				if (rest[0] === "") {
					acc.push(line);
					return acc;
				}
				const value = rest.join(":").trim();
				acc.push(`${key}: "${value}"`);
				return acc;
			}, [])
			.join("\n");
	};

	const escapedRawTypstAstYamlString = escapeYamlValues(
		removeFirstLine(rawTypstAstString),
	);

	const parsed = parse(escapedRawTypstAstYamlString);

	// Handle empty file case
	if (parsed.ast.c === null) {
		parsed.ast.c = [];
	}

	return parsed.ast as TypstAstNode;
};

interface TypstAstNode {
	s: string;
	c?: TypstAstNode[];
}

// Temporary AST node interface for converting Typst AST to textlint AST
interface AstNode {
	// Typst AST node properties
	s: string;
	c?: AstNode[];

	// textlint AST node properties
	type: string; //TxtNode["type"];
	raw: TxtNode["raw"];
	range: TxtNode["range"];
	loc: TxtNode["loc"];
	//parent?: TxtNode["parent"];

	value?: TxtTextNode["value"]; // If the node is a TxtTextNode
	children?: TxtParentNode["children"]; // If the node is a TxtParentNode
}

type TxtNodeLineLocation = TxtNode["loc"];

/**
 * Extract the raw source code from the specified location.
 * @param typstSource The raw Typst source code.
 * @param location The location specifying the start and end positions.
 * @returns The extracted source code.
 */
export const extractRawSourceByLocation = (
	typstSource: string,
	location: TxtNodeLineLocation,
): string => {
	const { start, end } = location;
	const lines = typstSource.split("\n");

	// NOTE: Line numbers are 1-based, but array indexes are 0-based.
	const targetLines = lines.slice(start.line - 1, end.line);

	const targetLinesFirst = targetLines[0].slice(start.column);
	const targetLinesMiddle = targetLines.slice(1, -1);
	const targetLinesLast = targetLines[targetLines.length - 1].slice(
		0,
		end.column,
	);
	let result: string;
	if (start.line === end.line) {
		result = targetLinesFirst.slice(0, end.column - start.column);
	} else {
		result = targetLinesFirst;
		if (targetLinesMiddle.length > 0) {
			result += `\n${targetLinesMiddle.join("\n")}`;
		}
		result += `\n${targetLinesLast}`;
	}

	return result;
};

/**
 * Convert a raw Typst AST object to a textlint AST object.
 * @param rawTypstAstObject The raw Typst AST object.
 * @returns The textlint AST object.
 **/
export const convertRawTypstAstObjectToTextlintAstObject = (
	rawTypstAstObject: TypstAstNode,
	typstSource: string,
) => {
	// Copy from rawTypstAstObject to textlintAstObject
	const textlintAstObject: AstNode = JSON.parse(
		JSON.stringify(rawTypstAstObject),
	);

	const parsePosition = (position: string): TxtNodePosition => {
		const [line, column] = position.split(":").map(Number);
		return {
			line,
			column,
		};
	};

	const extractNodeType = (s: string): string => {
		const match = s.match(
			/(?:<span style='color:[^']+'>([^<]+)<\/span>|([^<]+))/,
		);
		if (!match) throw new Error("Invalid format");
		return match[1] || match[2];
	};

	const extractLocation = (s: string, c?: AstNode[]): TxtNodeLineLocation => {
		const match = s.match(/&lt;(\d+:\d+)~(\d+:\d+)&gt;/);
		if (!match) {
			if (c !== undefined) {
				// If root node

				if (c.length === 0) {
					return {
						start: { line: 1, column: 0 },
						end: { line: 1, column: 0 },
					};
				}

				const rootChildrenStartLocation = extractLocation(c[0].s, c[0].c);
				const rootChildrenEndLocation = extractLocation(
					c[c.length - 1].s,
					c[c.length - 1].c,
				);
				return {
					start: rootChildrenStartLocation.start,
					end: rootChildrenEndLocation.end,
				};
			}
			throw new Error("Invalid format");
		}

		const startLocation = parsePosition(match[1]);
		const endLocation = parsePosition(match[2]);

		return {
			start: startLocation,
			end: endLocation,
		};
	};

	const calculateOffsets = (node: AstNode, currentOffset = 0): number => {
		const startOffset = currentOffset;

		const location = extractLocation(node.s, node.c);
		const nodeRawText = extractRawSourceByLocation(typstSource, location);
		const nodeLength = nodeRawText.length;

		if (node.c) {
			// If TxtParentNode
			let childOffset = startOffset;
			const whitespaceNodes: TxtTextNode[] = [];
			const softBreakNodes: TxtTextNode[] = [];
			for (
				let nodeChildIndex = 0;
				nodeChildIndex < node.c.length;
				nodeChildIndex++
			) {
				const child = node.c[nodeChildIndex];
				childOffset = calculateOffsets(child, childOffset);

				// Check between child nodes
				if (nodeChildIndex < node.c.length - 1) {
					const nextChild = node.c[nodeChildIndex + 1];

					const currentEndLine = child.loc.end.line;
					const currentEndColumn = child.loc.end.column;
					const nextStartLine = extractLocation(nextChild.s, nextChild.c).start
						.line;
					const nextStartColumn = extractLocation(nextChild.s, nextChild.c)
						.start.column;

					// whitespace
					if (
						currentEndLine === nextStartLine &&
						currentEndColumn !== nextStartColumn
					) {
						const whitespaceNode: TxtTextNode = {
							type: "Str",
							raw: " ".repeat(nextStartColumn - currentEndColumn),
							value: " ".repeat(nextStartColumn - currentEndColumn),
							range: [childOffset, childOffset + 1],
							loc: {
								start: { line: currentEndLine, column: currentEndColumn },
								end: { line: nextStartLine, column: nextStartColumn },
							},
						};
						whitespaceNodes.push(whitespaceNode);
						childOffset += 1;
					}

					// soft breaks
					if (
						currentEndLine !== nextStartLine &&
						child.type !== ASTNodeTypes.Break &&
						nextChild.type !== ASTNodeTypes.Break
					) {
						const breakNode: TxtTextNode = {
							type: "Str",
							raw: "\n",
							value: "\n",
							range: [childOffset, childOffset + 1],
							loc: {
								start: { line: currentEndLine, column: currentEndColumn },
								end: { line: nextStartLine, column: nextStartColumn },
							},
						};
						softBreakNodes.push(breakNode);
						childOffset += 1;
					}
				}
			}

			node.c = node.c
				// @ts-expect-error
				.concat(softBreakNodes)
				// @ts-expect-error
				.concat(whitespaceNodes)
				.sort((a, b) => a.range[0] - b.range[0]);
			node.children = node.c as Content[];
		} else {
			// If TxtTextNode
			node.value = extractRawSourceByLocation(typstSource, location);
		}

		const endOffset = currentOffset + nodeLength;

		node.raw = extractRawSourceByLocation(typstSource, location);
		node.range = [startOffset, endOffset];
		node.loc = location;
		node.type = extractNodeType(node.s);
		if (/^Marked::Heading$/.test(node.type)) {
			node.type = ASTNodeTypes.Header;
		}
		if (/^Marked::Text/.test(node.type)) {
			node.type = ASTNodeTypes.Str;
		}
		if (/^Marked::Parbreak/.test(node.type)) {
			node.type = ASTNodeTypes.Break;
		}
		if (/^Escape::Linebreak/.test(node.type)) {
			node.type = ASTNodeTypes.Break;
		}
		if (/^Marked::ListItem$/.test(node.type)) {
			node.type = ASTNodeTypes.ListItem;
			// @ts-expect-error
			node.spread = false;
			// @ts-expect-error
			node.checked = null;

			if (node.children && node.children.length > 0) {
				// Remove list marker and empty Str nodes.
				const contentChildren = node.children.filter(
					(child) =>
						// @ts-expect-error
						child.type !== "Marked::ListMarker" &&
						!(child.type === "Str" && child.raw?.trim() === ""),
				);

				// Use the children of Marked::Markup nodes if they exist.
				const actualContent: Content[] = [];
				for (const child of contentChildren) {
					// @ts-expect-error
					if (child.type === "Marked::Markup" && child.children) {
						// @ts-expect-error
						actualContent.push(...child.children);
					} else {
						actualContent.push(child);
					}
				}

				if (actualContent.length > 0) {
					const firstContentChild = actualContent[0];
					const lastContentChild = actualContent[actualContent.length - 1];

					node.children = [
						{
							type: ASTNodeTypes.Paragraph,
							// @ts-expect-error
							children: actualContent,
							loc: {
								start: firstContentChild.loc.start,
								end: lastContentChild.loc.end,
							},
							range: [firstContentChild.range[0], lastContentChild.range[1]],
							raw: actualContent.map((child) => child.raw).join(""),
						},
					];
				}
			}
		}
		if (node.type === "Marked::Raw") {
			if (node.loc.start.line === node.loc.end.line) {
				// If Code
				node.type = ASTNodeTypes.Code;
				if (/^```([\s\S]*?)```$/.test(node.raw)) {
					const codeBlockPattern = /^```(\w+)?\s([\s\S]*?)\s*```$/;
					const match = node.raw.match(codeBlockPattern);
					node.value = match ? match[2].trim() : "";
				} else {
					node.value = node.raw.replace(/`([\s\S]*?)`/, "$1");
				}
			} else {
				// If CodeBlock
				node.type = ASTNodeTypes.CodeBlock;
				node.value = node.raw.replace(/```(?:\w*)\n([\s\S]*?)\n```/, "$1");

				// @ts-expect-error
				node.lang =
					// @ts-expect-error
					node.children[1].type === "Marked::RawLang"
						? // @ts-expect-error
							node.children[1].value
						: null;
			}
			// biome-ignore lint/performance/noDelete: Convert TxtParentNode to TxtTextNode
			delete node.children;
		}
		if (node.type === "Marked::Link") {
			node.type = ASTNodeTypes.Link;
			// @ts-expect-error
			node.title = null;
			// @ts-expect-error
			node.url = node.value;
			node.children = [
				{
					type: ASTNodeTypes.Str,
					value: node.raw,
					loc: node.loc,
					range: node.range,
					raw: node.raw,
				},
			];
			// biome-ignore lint/performance/noDelete: Marked::Link node have value property but textlint AST object does not.
			delete node.value;
		}
		if (node.type === "Marked::Strong") {
			node.type = ASTNodeTypes.Strong;
			// @ts-expect-error
			node.children[1].type = ASTNodeTypes.Str;
			// @ts-expect-error
			node.children[1].value = node.children[1].children[0].value;
			// @ts-expect-error
			// biome-ignore lint/performance/noDelete: Typst AST object requires 'children' property but textlint AST object does not.
			delete node.children[1].children;
		}
		if (node.type === "Marked::Emph") {
			node.type = ASTNodeTypes.Emphasis;
			// @ts-expect-error
			node.children[1].type = ASTNodeTypes.Str;
			// @ts-expect-error
			node.children[1].value = node.children[1].children[0].value;
			// @ts-expect-error
			// biome-ignore lint/performance/noDelete: Typst AST object requires 'children' property but textlint AST object does not.
			delete node.children[1].children;
		}
		if (node.type === "Ct::LineComment") {
			node.type = ASTNodeTypes.Comment;
			node.value = node.raw.replace(/^\/\/\s*/, "");
		}
		if (node.type === "Ct::BlockComment") {
			node.type = ASTNodeTypes.Comment;
			node.value = node.raw.replace(/^\/\*\s*/, "").replace(/\s*\*\/$/, "");
		}

		// @ts-expect-error
		// biome-ignore lint/performance/noDelete: Typst AST object requires 's' property but textlint AST object does not.
		delete node.s;
		// biome-ignore lint/performance/noDelete: Typst AST object requires 'c' property but textlint AST object does not.
		delete node.c;

		return endOffset;
	};

	// If the source code starts with a single newline, add a Break node before the first node.
	if (textlintAstObject.c && textlintAstObject.c.length > 0) {
		const rootChildrenStartLocation = extractLocation(
			textlintAstObject.c[0].s,
			textlintAstObject.c[0].c,
		);
		if (rootChildrenStartLocation.start.line === 2) {
			// @ts-expect-error
			textlintAstObject.c.unshift({
				s: "<span style='color:#7dcfff'>Marked::Parbreak</span> &lt;1:0~2:0&gt;",
			});
		}
	}

	calculateOffsets(textlintAstObject);

	// Root node is always `Document` node
	textlintAstObject.type = ASTNodeTypes.Document;

	return textlintAstObject as TxtDocumentNode;
};

/**
 * Paragraphize a textlint AST object.
 * @param rootNode The textlint AST object.
 * @returns The paragraphized textlint AST object.
 */
export const paragraphizeTextlintAstObject = (
	rootNode: TxtDocumentNode,
): TxtDocumentNode => {
	const children: Content[] = [];
	let i = 0;

	while (i < rootNode.children.length) {
		const node = rootNode.children[i];

		// Collect consecutive ListItems into a single List node.
		if (node.type === ASTNodeTypes.ListItem) {
			const listItems: Content[] = [node];
			i++;

			// Collect consecutive ListItems including those separated by line breaks.
			while (i < rootNode.children.length) {
				const currentNode = rootNode.children[i];

				if (currentNode.type === ASTNodeTypes.ListItem) {
					listItems.push(currentNode);
					i++;
					continue;
				}

				// Skip line breaks between ListItems.
				if (currentNode.type === ASTNodeTypes.Str && currentNode.raw === "\n") {
					if (
						i + 1 < rootNode.children.length &&
						rootNode.children[i + 1].type === ASTNodeTypes.ListItem
					) {
						i++;
						continue;
					}
				}

				// Skip line-break-only Paragraphs between ListItems.
				if (
					currentNode.type === ASTNodeTypes.Paragraph &&
					currentNode.children.length === 1 &&
					currentNode.children[0].type === ASTNodeTypes.Str &&
					currentNode.children[0].raw === "\n"
				) {
					if (
						i + 1 < rootNode.children.length &&
						rootNode.children[i + 1].type === ASTNodeTypes.ListItem
					) {
						i++;
						continue;
					}
				}

				break;
			}

			// Create List node from collected ListItems.
			const firstItem = listItems[0];
			const lastItem = listItems[listItems.length - 1];

			children.push({
				type: ASTNodeTypes.List,
				ordered: false,
				start: null,
				spread: false,
				// @ts-expect-error
				children: [...listItems],
				loc: {
					start: firstItem.loc.start,
					end: lastItem.loc.end,
				},
				range: [firstItem.range[0], lastItem.range[1]],
				raw: listItems.map((item) => item.raw).join("\n"),
			});
		}
		// Skip line-break-only Paragraphs.
		else if (
			node.type === ASTNodeTypes.Paragraph &&
			node.children.length === 1 &&
			node.children[0].type === ASTNodeTypes.Str &&
			node.children[0].raw === "\n"
		) {
			i++;
		} else {
			const paragraph: Content[] = [];

			// Add standalone nodes directly without wrapping in Paragraph.
			if (
				node.type === ASTNodeTypes.Header ||
				node.type === ASTNodeTypes.CodeBlock ||
				node.type === ASTNodeTypes.Break
			) {
				children.push(node);
				i++;
			}
			// Group other nodes into paragraphs.
			else {
				paragraph.push(node);
				i++;

				// Collect consecutive nodes for paragraph grouping.
				while (i < rootNode.children.length) {
					const currentNode = rootNode.children[i];

					if (
						currentNode.type === ASTNodeTypes.Header ||
						currentNode.type === ASTNodeTypes.CodeBlock ||
						currentNode.type === ASTNodeTypes.Break ||
						currentNode.type === ASTNodeTypes.ListItem
					) {
						break;
					}

					paragraph.push(currentNode);
					i++;
				}

				if (paragraph.length > 0) {
					const headNode = paragraph[0];
					const lastNode = paragraph[paragraph.length - 1];

					// Special handling for hash symbols.
					if (
						["Kw::Hash", "Fn::(Hash: &quot;#&quot;)"].includes(headNode.type)
					) {
						children.push(...paragraph);
					} else {
						children.push({
							loc: {
								start: headNode.loc.start,
								end: lastNode.loc.end,
							},
							range: [headNode.range[0], lastNode.range[1]],
							raw: paragraph.map((node) => node.raw).join(""),
							type: ASTNodeTypes.Paragraph,
							// @ts-expect-error
							children: paragraph,
						});
					}
				}
			}
		}
	}

	return { ...rootNode, children };
};

/**
 * Convert a Typst source code to a textlint AST object.
 * @param typstSource The Typst source code.
 * @returns The textlint AST object.
 */
export const convertTypstSourceToTextlintAstObject = async (
	typstSource: string,
) => {
	const rawTypstAstString = await getRawTypstAstString(typstSource);
	const rawTypstAstObject = convertRawTypstAstStringToObject(rawTypstAstString);
	const textlintAstObject = convertRawTypstAstObjectToTextlintAstObject(
		rawTypstAstObject,
		typstSource,
	);
	const paragraphizedTextlintAstObject =
		paragraphizeTextlintAstObject(textlintAstObject);
	return paragraphizedTextlintAstObject as TxtDocumentNode;
};
