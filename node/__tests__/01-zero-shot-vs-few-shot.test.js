/**
 * Tests for 01-zero-shot-vs-few-shot.js
 *
 * Mocks the Anthropic SDK so no real API calls are made.
 * Verifies that each function sends the right request structure
 * and returns the correct value from the API response.
 */

const mockCreate = jest.fn();

jest.mock("@anthropic-ai/sdk", () => ({
  __esModule: true,
  default: jest.fn().mockImplementation(() => ({
    messages: { create: mockCreate },
  })),
}));

jest.mock("dotenv/config", () => ({}));

const { zeroShot, fewShot, main } = require("../01-zero-shot-vs-few-shot.js");

describe("01 – Zero-Shot vs Few-Shot", () => {
  beforeEach(() => {
    mockCreate.mockReset();
  });

  describe("zeroShot()", () => {
    it("calls the Anthropic API with the correct model and parameters", async () => {
      mockCreate.mockResolvedValue({ content: [{ text: "Sentiment: mixed" }] });

      await zeroShot();

      expect(mockCreate).toHaveBeenCalledTimes(1);
      const callArgs = mockCreate.mock.calls[0][0];
      expect(callArgs.model).toBe("claude-sonnet-4-20250514");
      expect(callArgs.max_tokens).toBe(300);
      expect(callArgs.messages).toHaveLength(1);
      expect(callArgs.messages[0].role).toBe("user");
    });

    it("returns the text from the API response", async () => {
      const expectedText = "This review is mixed with positives and negatives.";
      mockCreate.mockResolvedValue({ content: [{ text: expectedText }] });

      const result = await zeroShot();

      expect(result).toBe(expectedText);
    });

    it("includes the input text in the user prompt", async () => {
      mockCreate.mockResolvedValue({ content: [{ text: "ok" }] });

      await zeroShot();

      const content = mockCreate.mock.calls[0][0].messages[0].content;
      expect(content).toContain("Review:");
      expect(content).toContain("project management tool");
    });
  });

  describe("fewShot()", () => {
    it("calls the Anthropic API with the correct model and parameters", async () => {
      mockCreate.mockResolvedValue({ content: [{ text: "{}" }] });

      await fewShot();

      expect(mockCreate).toHaveBeenCalledTimes(1);
      const callArgs = mockCreate.mock.calls[0][0];
      expect(callArgs.model).toBe("claude-sonnet-4-20250514");
      expect(callArgs.max_tokens).toBe(300);
    });

    it("returns the text from the API response", async () => {
      const jsonResponse = JSON.stringify({
        sentiment: "mixed",
        positives: ["clean interface"],
        negatives: ["limited reporting"],
        overall_score: 3,
      });
      mockCreate.mockResolvedValue({ content: [{ text: jsonResponse }] });

      const result = await fewShot();

      expect(result).toBe(jsonResponse);
    });

    it("includes all three few-shot examples in the prompt", async () => {
      mockCreate.mockResolvedValue({ content: [{ text: "{}" }] });

      await fewShot();

      const content = mockCreate.mock.calls[0][0].messages[0].content;
      expect(content).toContain("Example 1:");
      expect(content).toContain("Example 2:");
      expect(content).toContain("Example 3:");
    });

    it("instructs the model to return JSON in the prompt", async () => {
      mockCreate.mockResolvedValue({ content: [{ text: "{}" }] });

      await fewShot();

      const content = mockCreate.mock.calls[0][0].messages[0].content;
      expect(content.toLowerCase()).toContain("json");
    });
  });

  describe("main()", () => {
    it("calls both zeroShot and fewShot and logs their results", async () => {
      const consoleSpy = jest
        .spyOn(console, "log")
        .mockImplementation(() => {});

      mockCreate
        .mockResolvedValueOnce({ content: [{ text: "zero shot result" }] })
        .mockResolvedValueOnce({ content: [{ text: "few shot result" }] });

      await main();

      const logCalls = consoleSpy.mock.calls.flat();
      expect(logCalls).toContain("zero shot result");
      expect(logCalls).toContain("few shot result");
      expect(mockCreate).toHaveBeenCalledTimes(2);

      consoleSpy.mockRestore();
    });

    it("logs section headers and observation text", async () => {
      const consoleSpy = jest
        .spyOn(console, "log")
        .mockImplementation(() => {});

      mockCreate.mockResolvedValue({ content: [{ text: "" }] });

      await main();

      const logOutput = consoleSpy.mock.calls.flat().join("\n");
      expect(logOutput).toContain("INPUT TEXT");
      expect(logOutput).toContain("ZERO-SHOT OUTPUT");
      expect(logOutput).toContain("FEW-SHOT OUTPUT");
      expect(logOutput).toContain("Observation");

      consoleSpy.mockRestore();
    });
  });
});
