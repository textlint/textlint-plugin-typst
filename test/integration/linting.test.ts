import fs from "node:fs";
import path from "node:path";
import {
	TextlintKernel,
	type TextlintKernelRule,
	type TextlintResult,
} from "@textlint/kernel";
// @ts-expect-error
import { rules } from "textlint-rule-preset-ja-technical-writing";

import { beforeAll, describe, expect, it } from "vitest";

import typstPlugin from "../../src";

describe("linting", () => {
	describe("smoke tests", () => {
		describe("textlint-rule-preset-ja-technical-writing", () => {
			let textlintResult: TextlintResult;

			beforeAll(async () => {
				const kernel = new TextlintKernel();
				textlintResult = await kernel.lintText(
					fs.readFileSync(
						path.join(
							__dirname,
							"./fixtures/smoke/textlint-rule-preset-ja-technical-writing/main.typ",
						),
						"utf-8",
					),
					{
						ext: ".typ",
						plugins: [
							{
								pluginId: "typst",
								plugin: typstPlugin,
							},
						],
						rules: [
							// Set each rule in the preset individually
							...Object.entries(rules).map(
								([id, rule]) =>
									({
										ruleId: `ja-technical-writing/${id}`,
										rule: rule,
									}) as TextlintKernelRule,
							),
						],
					},
				);
			});

			it("should detect sentence-length violations", () => {
				const violations = textlintResult.messages.filter(
					(message) =>
						message.ruleId === "ja-technical-writing/sentence-length",
				);
				expect(violations.length).toBeGreaterThan(0);
				expect(violations[0].message).toContain(
					"exceeds the maximum sentence length",
				);
			});

			it("should detect max-ten violations", () => {
				const violations = textlintResult.messages.filter(
					(message) => message.ruleId === "ja-technical-writing/max-ten",
				);
				expect(violations.length).toBeGreaterThan(0);
				expect(violations[0].message).toContain('一つの文で"、"を4つ以上使用');
			});

			it("should detect max-kanji-continuous-len violations", () => {
				const violations = textlintResult.messages.filter(
					(message) =>
						message.ruleId === "ja-technical-writing/max-kanji-continuous-len",
				);
				expect(violations.length).toBeGreaterThan(0);
				expect(violations[0].message).toContain("漢字が6つ以上連続");
			});

			it("should detect arabic-kanji-numbers violations", () => {
				const violations = textlintResult.messages.filter(
					(message) =>
						message.ruleId === "ja-technical-writing/arabic-kanji-numbers",
				);
				expect(violations.length).toBeGreaterThan(0);
				expect(
					violations.some((v) => v.message.includes("十番目 => 10番目")),
				).toBe(true);
				expect(
					violations.some((v) => v.message.includes("1時的 => 一時的")),
				).toBe(true);
			});

			it("should detect no-mix-dearu-desumasu violations", () => {
				const violations = textlintResult.messages.filter(
					(message) =>
						message.ruleId === "ja-technical-writing/no-mix-dearu-desumasu",
				);
				expect(violations.length).toBeGreaterThan(0);
				expect(violations[0].message).toContain(
					'である"調 と "ですます"調 が混在',
				);
			});

			it("should detect ja-no-mixed-period violations", () => {
				const violations = textlintResult.messages.filter(
					(message) =>
						message.ruleId === "ja-technical-writing/ja-no-mixed-period",
				);
				expect(violations.length).toBeGreaterThan(0);
				expect(violations[0].message).toContain('文末が"。"で終わっていません');
			});

			it("should detect no-double-negative-ja violations", () => {
				const violations = textlintResult.messages.filter(
					(message) =>
						message.ruleId === "ja-technical-writing/no-double-negative-ja",
				);
				expect(violations.length).toBeGreaterThan(0);
				expect(
					violations.some((v) => v.message.includes("二重否定: 〜なくもない")),
				).toBe(true);
				expect(
					violations.some((v) =>
						v.message.includes("二重否定: 〜ないことはない"),
					),
				).toBe(true);
			});

			it("should detect no-doubled-joshi violations", () => {
				const violations = textlintResult.messages.filter(
					(message) =>
						message.ruleId === "ja-technical-writing/no-doubled-joshi",
				);
				expect(violations.length).toBeGreaterThan(0);
				expect(violations[0].message).toContain(
					"一文に二回以上利用されている助詞",
				);
			});

			it("should detect no-dropping-the-ra violations", () => {
				const violations = textlintResult.messages.filter(
					(message) =>
						message.ruleId === "ja-technical-writing/no-dropping-the-ra",
				);
				expect(violations.length).toBeGreaterThan(0);
				expect(violations[0].message).toContain("ら抜き言葉を使用");
			});

			it("should detect no-doubled-conjunctive-particle-ga violations", () => {
				const violations = textlintResult.messages.filter(
					(message) =>
						message.ruleId ===
						"ja-technical-writing/no-doubled-conjunctive-particle-ga",
				);
				expect(violations.length).toBeGreaterThan(0);
				expect(violations[0].message).toContain(
					'逆接の接続助詞 "が" が二回以上使われています',
				);
			});

			it("should detect no-doubled-conjunction violations", () => {
				const violations = textlintResult.messages.filter(
					(message) =>
						message.ruleId === "ja-technical-writing/no-doubled-conjunction",
				);
				expect(violations.length).toBeGreaterThan(0);
				expect(violations[0].message).toContain("同じ接続詞（しかし）が連続");
			});

			it("should detect no-nfd violations", () => {
				const violations = textlintResult.messages.filter(
					(message) => message.ruleId === "ja-technical-writing/no-nfd",
				);
				expect(violations.length).toBeGreaterThan(0);
				expect(
					violations.some((v) => v.message.includes('ホ゜" => "ポ"')),
				).toBe(true);
				expect(
					violations.some((v) => v.message.includes('シ゛" => "ジ"')),
				).toBe(true);
			});

			it("should detect no-exclamation-question-mark violations", () => {
				const violations = textlintResult.messages.filter(
					(message) =>
						message.ruleId ===
						"ja-technical-writing/no-exclamation-question-mark",
				);
				expect(violations.length).toBeGreaterThan(0);
				expect(violations[0].message).toContain('Disallow to use "！"');
			});

			it("should detect no-hankaku-kana violations", () => {
				const violations = textlintResult.messages.filter(
					(message) =>
						message.ruleId === "ja-technical-writing/no-hankaku-kana",
				);
				expect(violations.length).toBeGreaterThan(0);
				expect(violations[0].message).toContain("Disallow to use 半角カタカナ");
			});

			it("should detect ja-no-weak-phrase violations", () => {
				const violations = textlintResult.messages.filter(
					(message) =>
						message.ruleId === "ja-technical-writing/ja-no-weak-phrase",
				);
				expect(violations.length).toBeGreaterThan(0);
				expect(violations[0].message).toContain(
					'弱い表現: "かも" が使われています',
				);
			});

			it("should detect ja-no-successive-word violations", () => {
				const violations = textlintResult.messages.filter(
					(message) =>
						message.ruleId === "ja-technical-writing/ja-no-successive-word",
				);
				expect(violations.length).toBeGreaterThan(0);
				expect(violations[0].message).toContain("が連続して2回使われています");
			});

			it("should detect ja-no-abusage violations", () => {
				const violations = textlintResult.messages.filter(
					(message) => message.ruleId === "ja-technical-writing/ja-no-abusage",
				);
				expect(violations.length).toBeGreaterThan(0);
				expect(violations.some((v) => v.message.includes("可変する"))).toBe(
					true,
				);
				expect(violations.some((v) => v.message.includes("適用"))).toBe(true);
			});

			it("should detect ja-no-redundant-expression violations", () => {
				const violations = textlintResult.messages.filter(
					(message) =>
						message.ruleId ===
						"ja-technical-writing/ja-no-redundant-expression",
				);
				expect(violations.length).toBeGreaterThan(0);
				expect(violations[0].message).toContain(
					'することが可能です"は冗長な表現',
				);
			});

			it("should detect ja-unnatural-alphabet violations", () => {
				const violations = textlintResult.messages.filter(
					(message) =>
						message.ruleId === "ja-technical-writing/ja-unnatural-alphabet",
				);
				expect(violations.length).toBeGreaterThan(0);
				expect(violations[0].message).toContain("不自然なアルファベット");
			});

			it("should detect no-unmatched-pair violations", () => {
				const violations = textlintResult.messages.filter(
					(message) =>
						message.ruleId === "ja-technical-writing/no-unmatched-pair",
				);
				expect(violations.length).toBeGreaterThan(0);
				expect(violations[0].message).toContain(
					"Cannot find a pairing character for （",
				);
			});
		});
	});
});
