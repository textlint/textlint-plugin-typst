import { createTypstCompiler } from "@myriaddreamin/typst.ts/dist/esm/compiler.mjs";
import {
	ASTNodeTypes,
	type TxtCodeBlockNode,
	type TxtDocumentNode,
	type TxtLinkNode,
	type TxtListItemNode,
	type TxtListNode,
	type TxtNode,
	type TxtNodePosition,
	type TxtParentNode,
	type TxtStrNode,
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
						acc[acc.length - 1] = `${acc[acc.length - 1].slice(
							0,
							-1,
						)}\\n${line}"`;
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

// Flexible AST node type for conversion process
// This allows gradual transformation from Typst AST to textlint AST
interface AstNode {
	// Typst AST node properties (present during conversion, removed afterward)
	s?: string;
	c?: AstNode[];

	// textlint AST node properties (from @textlint/ast-node-types)
	// During conversion, type can be either Typst type (e.g., "Marked::Raw") or textlint type
	type: TxtNode["type"] | string;
	raw: TxtNode["raw"];
	range: TxtNode["range"];
	loc: TxtNode["loc"];

	value?: TxtTextNode["value"]; // For text nodes, code nodes, etc.
	children?: Content[]; // For parent nodes (using Content[] during conversion)

	// List-specific properties (from TxtListNode)
	ordered?: TxtListNode["ordered"];
	start?: TxtListNode["start"];
	spread?: TxtListNode["spread"];

	// ListItem-specific properties (from TxtListItemNode)
	checked?: TxtListItemNode["checked"];

	// Link-specific properties (from TxtLinkNode)
	title?: TxtLinkNode["title"];
	url?: TxtLinkNode["url"];

	// CodeBlock-specific properties (from TxtCodeBlockNode)
	lang?: TxtCodeBlockNode["lang"];
}

// Type guard functions
const hasChildren = (
	node: AstNode,
): node is AstNode & { children: Content[] } => {
	return node.children !== undefined && Array.isArray(node.children);
};

const hasValue = (
	node: AstNode,
): node is AstNode & { value: TxtTextNode["value"] } => {
	return node.value !== undefined && typeof node.value === "string";
};

const hasSProperty = (node: AstNode): node is AstNode & { s: string } => {
	return node.s !== undefined && typeof node.s === "string";
};

const hasCProperty = (node: AstNode): node is AstNode & { c: AstNode[] } => {
	return node.c !== undefined && Array.isArray(node.c);
};

const isAstNode = (value: unknown): value is AstNode => {
	if (typeof value !== "object" || value === null) {
		return false;
	}
	const maybeNode = value as Record<string, unknown>;
	return (
		typeof maybeNode.type === "string" &&
		typeof maybeNode.raw === "string" &&
		Array.isArray(maybeNode.range) &&
		maybeNode.range.length === 2 &&
		typeof maybeNode.loc === "object" &&
		maybeNode.loc !== null
	);
};

const extractFirstTextValue = (node: AstNode): string | undefined => {
	if (hasValue(node)) {
		return node.value;
	}
	if (!hasChildren(node)) {
		return undefined;
	}
	for (const child of node.children) {
		if (isAstNode(child)) {
			const value = extractFirstTextValue(child);
			if (value !== undefined) {
				return value;
			}
		}
	}
	return undefined;
};

const getAstChild = (node: AstNode, index: number): AstNode | undefined => {
	if (!hasChildren(node)) {
		return undefined;
	}
	const child = node.children[index];
	if (!isAstNode(child)) {
		return undefined;
	}
	return child;
};

// Type guard to check if a node has a Typst type (during conversion)
const isTypstType = (type: string, pattern: string): boolean => {
	return new RegExp(pattern).test(type);
};

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

				const firstChild = c[0];
				const lastChild = c[c.length - 1];
				if (!hasSProperty(firstChild) || !hasSProperty(lastChild)) {
					throw new Error(
						"Cannot extract location: AST node is missing position information",
					);
				}
				const rootChildrenStartLocation = extractLocation(
					firstChild.s,
					firstChild.c,
				);
				const rootChildrenEndLocation = extractLocation(
					lastChild.s,
					lastChild.c,
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
		const calculateOffsetFromLocation = (
			location: TxtNodeLineLocation,
		): number => {
			const lines = typstSource.split("\n");
			let offset = 0;
			for (let i = 0; i < location.start.line - 1; i++) {
				offset += lines[i].length + 1; // +1 for newline
			}
			offset += location.start.column;
			return offset;
		};
		if (!hasSProperty(node)) {
			throw new Error(
				"Cannot calculate offsets: AST node is missing position information",
			);
		}
		const location = extractLocation(node.s, node.c);
		const nodeRawText = extractRawSourceByLocation(typstSource, location);
		const nodeLength = nodeRawText.length;
		const startOffset = calculateOffsetFromLocation(location);

		if (node.c) {
			// If TxtParentNode
			let childOffset = startOffset;
			const whitespaceNodes: AstNode[] = [];
			const softBreakNodes: AstNode[] = [];
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
					if (!hasSProperty(nextChild)) {
						throw new Error(
							"Cannot calculate child positions: AST node is missing position information",
						);
					}

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
						const whitespaceNode: AstNode = {
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
						const breakNode: AstNode = {
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

			node.c = [...node.c, ...softBreakNodes, ...whitespaceNodes].sort(
				(a, b) => a.range[0] - b.range[0],
			);
			node.children = node.c as Content[];
		} else {
			// If TxtTextNode
			node.value = extractRawSourceByLocation(typstSource, location);
		}

		const endOffset = startOffset + nodeLength;

		node.raw = extractRawSourceByLocation(typstSource, location);
		node.range = [startOffset, endOffset];
		node.loc = location;
		if (!hasSProperty(node)) {
			throw new Error(
				"Cannot determine node type: AST node is missing type information",
			);
		}
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
		if (/^Marked::(ListItem|EnumItem)$/.test(node.type)) {
			node.type = ASTNodeTypes.ListItem;
			node.spread = false;
			node.checked = null;

			if (hasChildren(node)) {
				const originalRange = node.range;
				const originalLoc = node.loc;
				const originalRaw = node.raw;

				const contentChildren = node.children.filter(
					(child) =>
						!["Marked::ListMarker", "Marked::EnumMarker"].includes(child.type),
				);

				const flattenedContent: Content[] = [];
				for (const child of contentChildren) {
					if (
						typeof child.type === "string" &&
						isTypstType(child.type, "^Marked::Markup$") &&
						isAstNode(child) &&
						hasChildren(child)
					) {
						flattenedContent.push(...child.children);
					} else {
						flattenedContent.push(child);
					}
				}
				const textContent: Content[] = [];
				const nestedListItems: Content[] = [];

				for (const child of flattenedContent) {
					if (child.type === ASTNodeTypes.ListItem) {
						nestedListItems.push(child);
					} else {
						textContent.push(child);
					}
				}

				const processedChildren: Content[] = [];

				if (textContent.length > 0) {
					const validTextContent = textContent.filter(
						(child) =>
							!(child.type === ASTNodeTypes.Str && child.raw?.trim() === ""),
					);

					if (validTextContent.length > 0) {
						const firstChild = validTextContent[0];
						const lastChild = validTextContent[validTextContent.length - 1];

						processedChildren.push({
							type: ASTNodeTypes.Paragraph,
							children: validTextContent,
							loc: {
								start: firstChild.loc.start,
								end: lastChild.loc.end,
							},
							range: [firstChild.range[0], lastChild.range[1]],
							raw: validTextContent.map((c) => c.raw).join(""),
						} as Content);
					}
				}

				if (nestedListItems.length > 0) {
					const isOrdered = nestedListItems.some((item) =>
						/^\d+\./.test(item.raw?.trim() || ""),
					);

					const firstNestedItem = nestedListItems[0];
					const lastNestedItem = nestedListItems[nestedListItems.length - 1];

					processedChildren.push({
						type: ASTNodeTypes.List,
						ordered: isOrdered,
						start: isOrdered ? 1 : null,
						spread: false,
						children: nestedListItems,
						loc: {
							start: firstNestedItem.loc.start,
							end: lastNestedItem.loc.end,
						},
						range: [firstNestedItem.range[0], lastNestedItem.range[1]],
						raw: nestedListItems.map((item) => item.raw).join("\n"),
					} as Content);
				}

				for (const child of processedChildren) {
					if (
						child.type === ASTNodeTypes.Paragraph &&
						isAstNode(child) &&
						hasChildren(child) &&
						child.children.length > 0
					) {
						const firstStr = child.children[0];
						const lastStr = child.children[child.children.length - 1];

						const actualStart = calculateOffsetFromLocation(firstStr.loc);
						const actualEnd = calculateOffsetFromLocation({
							start: lastStr.loc.end,
							end: lastStr.loc.end,
						});

						child.range = [actualStart, actualEnd];

						for (const strChild of child.children) {
							if (strChild.type === ASTNodeTypes.Str) {
								const strStart = calculateOffsetFromLocation(strChild.loc);
								const strEnd = calculateOffsetFromLocation({
									start: strChild.loc.end,
									end: strChild.loc.end,
								});
								strChild.range = [strStart, strEnd];
							}
						}
					} else if (
						child.type === ASTNodeTypes.List &&
						isAstNode(child) &&
						hasChildren(child) &&
						child.children.length > 0
					) {
						const firstListItem = child.children[0];
						const lastListItem = child.children[child.children.length - 1];
						if (firstListItem && lastListItem) {
							child.range = [firstListItem.range[0], lastListItem.range[1]];
						}
					}
				}

				node.children = processedChildren;
				if (processedChildren.length > 0) {
					const firstChild = processedChildren[0];
					const lastChild = processedChildren[processedChildren.length - 1];

					const markerStart = calculateOffsetFromLocation(originalLoc);
					const contentEnd = lastChild.range[1];

					node.range = [markerStart, contentEnd];
					node.loc = {
						start: originalLoc.start,
						end: lastChild.loc.end,
					};

					node.raw = extractRawSourceByLocation(typstSource, node.loc);
				} else {
					const nodeStart = calculateOffsetFromLocation(originalLoc);
					const nodeEnd = nodeStart + originalRaw.length;
					node.range = [nodeStart, nodeEnd];
					node.loc = originalLoc;
					node.raw = originalRaw;
				}

				Reflect.deleteProperty(node, "s");
				Reflect.deleteProperty(node, "c");

				return node.range[1];
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

				if (hasChildren(node) && node.children.length > 1) {
					const langNode = node.children[1];
					if (
						isAstNode(langNode) &&
						isTypstType(langNode.type, "^Marked::RawLang$") &&
						hasValue(langNode)
					) {
						node.lang = langNode.value ?? null;
					} else {
						node.lang = null;
					}
				} else {
					node.lang = null;
				}
			}
			// biome-ignore lint/performance/noDelete: Convert TxtParentNode to TxtTextNode
			delete node.children;
		}
		if (node.type === "Marked::Equation") {
			const value = node.raw
				.replace(/^[\s\n]*\$[\s\n]*/, "")
				.replace(/[\s\n]*\$[\s\n]*$/, "");

			const lineText = typstSource.split("\n")[node.loc.start.line - 1];
			const isCodeBlock =
				lineText.trim().startsWith("$") &&
				lineText.trim().endsWith("$") &&
				lineText.trim().length > 2 &&
				lineText
					.trim()
					.replace(/^\$|\$$/g, "")
					.trim().length > 0 &&
				lineText
					.trim()
					.replace(/^\$|\$$/g, "")
					.trim().length === value.length;

			if (isCodeBlock) {
				node.type = ASTNodeTypes.CodeBlock;
				node.value = value;
			} else if (node.loc.start.line === node.loc.end.line) {
				node.type = ASTNodeTypes.Code;
				node.value = value;
			} else {
				node.type = ASTNodeTypes.CodeBlock;
				node.value = value;
			}
			// biome-ignore lint/performance/noDelete: Marked::Equation node have children property but textlint AST object does not.
			delete node.children;
		}
		if (node.type === "Marked::Link") {
			node.type = ASTNodeTypes.Link;
			node.title = null;
			node.url = node.value ?? "";
			const linkTextNode: TxtStrNode = {
				type: ASTNodeTypes.Str,
				value: node.raw,
				loc: node.loc,
				range: node.range,
				raw: node.raw,
			};
			node.children = [linkTextNode];
			// biome-ignore lint/performance/noDelete: Marked::Link node have value property but textlint AST object does not.
			delete node.value;
		}
		if (node.type === "Marked::Strong") {
			node.type = ASTNodeTypes.Strong;
			const childNode = getAstChild(node, 1);
			if (childNode) {
				childNode.type = ASTNodeTypes.Str;
				const value = extractFirstTextValue(childNode);
				childNode.value = value ?? "";
				if (hasChildren(childNode)) {
					Reflect.deleteProperty(childNode, "children");
				}
			}
		}
		if (node.type === "Marked::Emph") {
			node.type = ASTNodeTypes.Emphasis;
			const childNode = getAstChild(node, 1);
			if (childNode) {
				childNode.type = ASTNodeTypes.Str;
				const value = extractFirstTextValue(childNode);
				childNode.value = value ?? "";
				if (hasChildren(childNode)) {
					Reflect.deleteProperty(childNode, "children");
				}
			}
		}
		if (node.type === "Ct::LineComment") {
			node.type = ASTNodeTypes.Comment;
			node.value = node.raw.replace(/^\/\/\s*/, "");
		}
		if (node.type === "Ct::BlockComment") {
			node.type = ASTNodeTypes.Comment;
			node.value = node.raw.replace(/^\/\*\s*/, "").replace(/\s*\*\/$/, "");
		}

		Reflect.deleteProperty(node, "s");
		Reflect.deleteProperty(node, "c");

		return endOffset;
	};

	// If the source code starts with a single newline, add a Break node before the first node.
	if (hasCProperty(textlintAstObject) && textlintAstObject.c.length > 0) {
		const firstChild = textlintAstObject.c[0];
		if (hasSProperty(firstChild)) {
			const rootChildrenStartLocation = extractLocation(
				firstChild.s,
				firstChild.c,
			);
			if (rootChildrenStartLocation.start.line === 2) {
				const breakNode: AstNode = {
					s: "<span style='color:#7dcfff'>Marked::Parbreak</span> &lt;1:0~2:0&gt;",
					type: "Marked::Parbreak",
					raw: "",
					range: [0, 0],
					loc: { start: { line: 1, column: 0 }, end: { line: 1, column: 0 } },
				};
				textlintAstObject.c.unshift(breakNode);
			}
		}
	}

	if (hasSProperty(textlintAstObject)) {
		calculateOffsets(textlintAstObject);
	}

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

			// Determine if this is an ordered list by checking the original node type.
			// Look at the raw content to determine if it's ordered.
			const isOrdered = /^\d+\./.test(node.raw?.trim() || "");

			// Collect consecutive ListItems including those separated by line breaks.
			while (i < rootNode.children.length) {
				const currentNode = rootNode.children[i];

				if (currentNode.type === ASTNodeTypes.ListItem) {
					// Check if the current item matches the list type (ordered/unordered).
					const currentIsOrdered = /^\d+\./.test(currentNode.raw?.trim() || "");
					if (currentIsOrdered === isOrdered) {
						listItems.push(currentNode);
						i++;
						continue;
					}
					// Different list type, break here.
					break;
				}

				// Skip line breaks between ListItems.
				if (currentNode.type === ASTNodeTypes.Str && currentNode.raw === "\n") {
					if (
						i + 1 < rootNode.children.length &&
						rootNode.children[i + 1].type === ASTNodeTypes.ListItem
					) {
						const nextIsOrdered = /^\d+\./.test(
							rootNode.children[i + 1].raw?.trim() || "",
						);
						if (nextIsOrdered === isOrdered) {
							i++;
							continue;
						}
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
						const nextIsOrdered = /^\d+\./.test(
							rootNode.children[i + 1].raw?.trim() || "",
						);
						if (nextIsOrdered === isOrdered) {
							i++;
							continue;
						}
					}
				}

				break;
			}

			// Create List node from collected ListItems.
			const firstItem = listItems[0];
			const lastItem = listItems[listItems.length - 1];

			children.push({
				type: ASTNodeTypes.List,
				ordered: isOrdered,
				start: isOrdered ? 1 : null,
				spread: false,
				children: [...listItems],
				loc: {
					start: firstItem.loc.start,
					end: lastItem.loc.end,
				},
				range: [firstItem.range[0], lastItem.range[1]],
				raw: listItems.map((item) => item.raw).join("\n"),
			} as Content);
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
			// Group other nodes into paragraphs, but handle EnumItems specially.
			else {
				// Check if this paragraph contains EnumItems that should be converted to a List.
				if (
					node.type === ASTNodeTypes.Paragraph &&
					isAstNode(node) &&
					hasChildren(node)
				) {
					const enumItems = node.children.filter(
						(child) =>
							isAstNode(child) && isTypstType(child.type, "^Marked::EnumItem$"),
					);
					if (enumItems.length > 0) {
						// Convert EnumItems to ListItems.
						const listItems = enumItems.map((enumItem) => {
							const enumItemNode = enumItem as AstNode;
							// Remove enum marker and empty Str nodes.
							const contentChildren: Content[] = hasChildren(enumItemNode)
								? enumItemNode.children.filter((child) => {
										if (!isAstNode(child)) {
											return false;
										}
										return (
											!isTypstType(child.type, "^Marked::EnumMarker$") &&
											!(
												child.type === ASTNodeTypes.Str &&
												child.raw?.trim() === ""
											)
										);
									})
								: [];
							// Use the children of Marked::Markup nodes if they exist.
							const actualContent: AstNode[] = [];
							for (const child of contentChildren) {
								if (
									typeof child.type === "string" &&
									isTypstType(child.type, "^Marked::Markup$") &&
									isAstNode(child) &&
									hasChildren(child)
								) {
									actualContent.push(...child.children.filter(isAstNode));
								} else if (isAstNode(child)) {
									actualContent.push(child);
								}
							}

							const firstContentChild = actualContent[0];
							const lastContentChild = actualContent[actualContent.length - 1];

							const paragraphNode: AstNode = {
								type: ASTNodeTypes.Paragraph,
								children: actualContent as Content[],
								loc: {
									start:
										firstContentChild?.loc?.start || enumItemNode.loc.start,
									end: lastContentChild?.loc?.end || enumItemNode.loc.end,
								},
								range: [
									firstContentChild?.range?.[0] || enumItemNode.range[0],
									lastContentChild?.range?.[1] || enumItemNode.range[1],
								],
								raw: actualContent.map((childNode) => childNode.raw).join(""),
							};

							const listItemNode: AstNode = {
								type: ASTNodeTypes.ListItem,
								spread: false,
								checked: null,
								children:
									actualContent.length > 0 ? [paragraphNode as Content] : [],
								loc: enumItemNode.loc,
								range: enumItemNode.range,
								raw: enumItemNode.raw,
							};

							return listItemNode;
						});

						const firstItem = listItems[0];
						const lastItem = listItems[listItems.length - 1];

						const listNode: TxtListNode = {
							type: ASTNodeTypes.List,
							ordered: true,
							start: 1,
							spread: false,
							children: listItems as Content[] as TxtListItemNode[],
							loc: {
								start: firstItem.loc.start,
								end: lastItem.loc.end,
							},
							range: [firstItem.range[0], lastItem.range[1]],
							raw: listItems.map((item) => item.raw).join("\n"),
						};

						children.push(listNode);

						i++;
						continue;
					}
				}

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
							children: paragraph,
						} as Content);
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
