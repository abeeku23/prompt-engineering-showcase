/**
 * Tests for 02-chain-of-thought.js
 *
 * Mocks the Anthropic SDK so no real API calls are made.
 * Verifies that both evaluation approaches build the right prompts
 * and that main() logs results from both approaches.
 */

const mockCreate = jest.fn();

jest.mock("@anthropic-ai/sdk", () => ({
  __esModule: true,
  default: jest.fn().mockImplementation(() => ({
    messages: { create: mockCreate },
  })),
}));

jest.mock("dotenv/config", () => ({}));

const { withoutCoT, withCoT, main } = require("../02-chain-of-thought.js");

describe("02 – Chain-of-Thought", () => {
  beforeEach(() => {
    mockCreate.mockReset();
  });

  describe("withoutCoT()", () => {
    it("calls the Anthropic API with the correct model and token limit", async () => {
      mockCreate.mockResolvedValue({ content: [{ text: "YES — candidate meets requirements." }] });

      await withoutCoT();

      expect(mockCreate).toHaveBeenCalledTimes(1);
      const callArgs = mockCreate.mock.calls[0][0];
      expect(callArgs.model).toBe("claude-sonnet-4-20250514");
      expect(callArgs.max_tokens).toBe(200);
    });

    it("returns the text from the API response", async () => {
      const expected = "NO — candidate lacks required experience.";
      mockCreate.mockResolvedValue({ content: [{ text: expected }] });

      const result = await withoutCoT();

      expect(result).toBe(expected);
    });

    it("asks for a YES or NO answer in the prompt", async () => {
      mockCreate.mockResolvedValue({ content: [{ text: "YES" }] });

      await withoutCoT();

      const content = mockCreate.mock.calls[0][0].messages[0].content;
      expect(content).toContain("YES or NO");
    });

    it("includes the job description and candidate summary in the prompt", async () => {
      mockCreate.mockResolvedValue({ content: [{ text: "YES" }] });

      await withoutCoT();

      const content = mockCreate.mock.calls[0][0].messages[0].content;
      expect(content).toContain("Senior Backend Engineer");
      expect(content).toContain("Jordan M.");
    });
  });

  describe("withCoT()", () => {
    it("calls the Anthropic API with the correct model and larger token limit", async () => {
      mockCreate.mockResolvedValue({ content: [{ text: "ADVANCE — strong candidate." }] });

      await withCoT();

      expect(mockCreate).toHaveBeenCalledTimes(1);
      const callArgs = mockCreate.mock.calls[0][0];
      expect(callArgs.model).toBe("claude-sonnet-4-20250514");
      expect(callArgs.max_tokens).toBe(600);
    });

    it("returns the text from the API response", async () => {
      const expected = "HOLD — candidate partially meets requirements.";
      mockCreate.mockResolvedValue({ content: [{ text: expected }] });

      const result = await withCoT();

      expect(result).toBe(expected);
    });

    it("instructs the model to reason step by step", async () => {
      mockCreate.mockResolvedValue({ content: [{ text: "ADVANCE" }] });

      await withCoT();

      const content = mockCreate.mock.calls[0][0].messages[0].content;
      expect(content).toContain("step by step");
    });

    it("asks for ADVANCE, HOLD, or REJECT recommendation", async () => {
      mockCreate.mockResolvedValue({ content: [{ text: "ADVANCE" }] });

      await withCoT();

      const content = mockCreate.mock.calls[0][0].messages[0].content;
      expect(content).toContain("ADVANCE");
      expect(content).toContain("HOLD");
      expect(content).toContain("REJECT");
    });

    it("includes the job description and candidate summary in the prompt", async () => {
      mockCreate.mockResolvedValue({ content: [{ text: "ADVANCE" }] });

      await withCoT();

      const content = mockCreate.mock.calls[0][0].messages[0].content;
      expect(content).toContain("Senior Backend Engineer");
      expect(content).toContain("Jordan M.");
    });
  });

  describe("main()", () => {
    it("calls both withoutCoT and withCoT and logs their results", async () => {
      const consoleSpy = jest
        .spyOn(console, "log")
        .mockImplementation(() => {});

      mockCreate
        .mockResolvedValueOnce({ content: [{ text: "YES — move forward" }] })
        .mockResolvedValueOnce({ content: [{ text: "ADVANCE — strong fit" }] });

      await main();

      const logCalls = consoleSpy.mock.calls.flat();
      expect(logCalls).toContain("YES — move forward");
      expect(logCalls).toContain("ADVANCE — strong fit");
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
      expect(logOutput).toContain("WITHOUT CHAIN-OF-THOUGHT");
      expect(logOutput).toContain("WITH CHAIN-OF-THOUGHT");
      expect(logOutput).toContain("Observation");

      consoleSpy.mockRestore();
    });
  });
});
