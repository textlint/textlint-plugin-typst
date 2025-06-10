import fs from "node:fs";
import path from "node:path";
import {
	TextlintKernel,
	type TextlintKernelRule,
	type TextlintResult,
} from "@textlint/kernel";
// @ts-expect-error
import textlintRulePeriodInListItem from "textlint-rule-period-in-list-item";
import {
	rules as textlintRulePresetJaTechnicalWritingRules,
	rulesConfig as textlintRulePresetJaTechnicalWritingRulesConfig,
	// @ts-expect-error
} from "textlint-rule-preset-ja-technical-writing";

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
							...Object.entries(textlintRulePresetJaTechnicalWritingRules).map(
								([id, rule]) =>
									({
										ruleId: `ja-technical-writing/${id}`,
										rule: rule,
										options:
											textlintRulePresetJaTechnicalWritingRulesConfig[id] ||
											true,
									}) as TextlintKernelRule,
							),
						],
					},
				);
			});

			// Rule test configurations
			const ruleTests = [
				{
					ruleId: "sentence-length",
					expectedMessage: "exceeds the maximum sentence length",
				},
				{
					ruleId: "max-ten",
					expectedMessage: '一つの文で"、"を4つ以上使用',
				},
				{
					ruleId: "max-kanji-continuous-len",
					expectedMessage: "漢字が7つ以上連続",
				},
				{
					ruleId: "no-mix-dearu-desumasu",
					expectedMessage: '"ですます"調 でなければなりません',
				},
				{
					ruleId: "ja-no-mixed-period",
					expectedMessage: '文末が"。"で終わっていません',
				},
				{
					ruleId: "no-doubled-joshi",
					expectedMessage: "一文に二回以上利用されている助詞",
				},
				{
					ruleId: "no-dropping-the-ra",
					expectedMessage: "ら抜き言葉を使用",
				},
				{
					ruleId: "no-doubled-conjunctive-particle-ga",
					expectedMessage: '逆接の接続助詞 "が" が二回以上使われています',
				},
				{
					ruleId: "no-doubled-conjunction",
					expectedMessage: "同じ接続詞（しかし）が連続",
				},
				{
					ruleId: "no-exclamation-question-mark",
					expectedMessage: 'Disallow to use "！"',
				},
				{
					ruleId: "no-hankaku-kana",
					expectedMessage: "Disallow to use 半角カタカナ",
				},
				{
					ruleId: "ja-no-weak-phrase",
					expectedMessage: '弱い表現: "かも" が使われています',
				},
				{
					ruleId: "ja-no-successive-word",
					expectedMessage: "が連続して2回使われています",
				},
				{
					ruleId: "ja-no-redundant-expression",
					expectedMessage: 'することが可能です"は冗長な表現',
				},
				{
					ruleId: "ja-unnatural-alphabet",
					expectedMessage: "不自然なアルファベット",
				},
				{
					ruleId: "no-unmatched-pair",
					expectedMessage: "Cannot find a pairing character for （",
				},
			];

			// Special cases with multiple expected messages
			const multiMessageTests = [
				{
					ruleId: "arabic-kanji-numbers",
					expectedMessages: ["十番目 => 10番目", "1時的 => 一時的"],
				},
				{
					ruleId: "no-double-negative-ja",
					expectedMessages: [
						"二重否定: 〜なくもない",
						"二重否定: 〜ないことはない",
					],
				},
				{
					ruleId: "no-nfd",
					expectedMessages: ['ホ゜" => "ポ"', 'シ゛" => "ジ"'],
				},
				{
					ruleId: "ja-no-abusage",
					expectedMessages: ["可変する", "適用"],
				},
			];

			const getViolations = (ruleId: string) => {
				return textlintResult.messages.filter(
					(message) => message.ruleId === `ja-technical-writing/${ruleId}`,
				);
			};

			// Single message tests
			for (const { ruleId, expectedMessage } of ruleTests) {
				it(`should detect ${ruleId} violations`, () => {
					const violations = getViolations(ruleId);
					expect(violations.length).toBeGreaterThan(0);
					expect(violations[0].message).toContain(expectedMessage);
				});
			}

			// Multi-message tests
			for (const { ruleId, expectedMessages } of multiMessageTests) {
				it(`should detect ${ruleId} violations`, () => {
					const violations = getViolations(ruleId);
					expect(violations.length).toBeGreaterThan(0);

					for (const expectedMessage of expectedMessages) {
						expect(
							violations.some((v) => v.message.includes(expectedMessage)),
						).toBe(true);
					}
				});
			}
		});
		describe("textlint-rule-period-in-list-item", () => {
			let textlintResult: TextlintResult;

			beforeAll(async () => {
				const kernel = new TextlintKernel();
				textlintResult = await kernel.lintText(
					fs.readFileSync(
						path.join(
							__dirname,
							"./fixtures/smoke/textlint-rule-period-in-list-item/main.typ",
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
							{
								ruleId: "period-in-list-item",
								rule: textlintRulePeriodInListItem,
							},
						],
					},
				);
			});
			const getViolations = () => {
				return textlintResult.messages.filter(
					(message) => message.ruleId === "period-in-list-item",
				);
			};

			it("should detect period in single line bullet list items", () => {
				const violations = getViolations();

				const singleLineBulletViolation = violations.find(
					(v) => v.loc.start.line === 6,
				);
				expect(singleLineBulletViolation).toBeDefined();
				expect(singleLineBulletViolation?.message).toBe(
					'Should remove period mark(".") at end of list item.',
				);
			});

			it("should detect period in multiple lines bullet list items", () => {
				const violations = getViolations();

				const multipleLinesBulletViolation = violations.find(
					(v) => v.loc.start.line === 12,
				);
				expect(multipleLinesBulletViolation).toBeDefined();
				expect(multipleLinesBulletViolation?.message).toBe(
					'Should remove period mark(".") at end of list item.',
				);
			});

			it("should detect period in single line numbered list items", () => {
				const violations = getViolations();

				const singleLineNumberedViolation = violations.find(
					(v) => v.loc.start.line === 27,
				);
				expect(singleLineNumberedViolation).toBeDefined();
				expect(singleLineNumberedViolation?.message).toBe(
					'Should remove period mark(".") at end of list item.',
				);
			});

			it("should detect period in multiple lines numbered list items", () => {
				const violations = getViolations();

				const multipleLineNumberedViolation = violations.find(
					(v) => v.loc.start.line === 41,
				);
				expect(multipleLineNumberedViolation).toBeDefined();
				expect(multipleLineNumberedViolation?.message).toBe(
					'Should remove period mark(".") at end of list item.',
				);
			});
		});
	});
});
