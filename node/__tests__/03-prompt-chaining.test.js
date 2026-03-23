/**
 * Tests for 03-prompt-chaining.js
 *
 * Mocks the Anthropic SDK so no real API calls are made.
 * Verifies callClaude() builds the right request and that
 * runPipeline() chains the three steps correctly.
 */

const mockCreate = jest.fn();

jest.mock("@anthropic-ai/sdk", () => ({
  __esModule: true,
  default: jest.fn().mockImplementation(() => ({
    messages: { create: mockCreate },
  })),
}));

jest.mock("dotenv/config", () => ({}));

const { callClaude, runPipeline, main } = require("../03-prompt-chaining.js");

describe("03 – Prompt Chaining", () => {
  beforeEach(() => {
    mockCreate.mockReset();
  });

  describe("callClaude()", () => {
    it("calls the Anthropic API with the correct model and token limit", async () => {
      mockCreate.mockResolvedValue({ content: [{ text: "response text" }] });

      await callClaude("Tell me a joke.");

      expect(mockCreate).toHaveBeenCalledTimes(1);
      const callArgs = mockCreate.mock.calls[0][0];
      expect(callArgs.model).toBe("claude-sonnet-4-20250514");
      expect(callArgs.max_tokens).toBe(500);
    });

    it("uses only the prompt when no context is provided", async () => {
      mockCreate.mockResolvedValue({ content: [{ text: "answer" }] });

      await callClaude("What is the capital of France?");

      const message = mockCreate.mock.calls[0][0].messages[0];
      expect(message.role).toBe("user");
      expect(message.content).toBe("What is the capital of France?");
    });

    it("prepends context to the prompt when context is provided", async () => {
      mockCreate.mockResolvedValue({ content: [{ text: "answer" }] });

      await callClaude("Summarise this.", "Some prior context.");

      const message = mockCreate.mock.calls[0][0].messages[0];
      expect(message.content).toBe("Some prior context.\n\nSummarise this.");
    });

    it("returns the trimmed text from the API response", async () => {
      mockCreate.mockResolvedValue({
        content: [{ text: "  trimmed response  " }],
      });

      const result = await callClaude("prompt");

      expect(result).toBe("trimmed response");
    });
  });

  describe("runPipeline()", () => {
    it("calls the API three times (one per pipeline step)", async () => {
      mockCreate
        .mockResolvedValueOnce({ content: [{ text: "topics output" }] })
        .mockResolvedValueOnce({ content: [{ text: "outline output" }] })
        .mockResolvedValueOnce({ content: [{ text: "summary output" }] });

      await runPipeline();

      expect(mockCreate).toHaveBeenCalledTimes(3);
    });

    it("returns an object containing topics, outline, and summary", async () => {
      mockCreate
        .mockResolvedValueOnce({ content: [{ text: "topics output" }] })
        .mockResolvedValueOnce({ content: [{ text: "outline output" }] })
        .mockResolvedValueOnce({ content: [{ text: "summary output" }] });

      const result = await runPipeline();

      expect(result).toEqual({
        topics: "topics output",
        outline: "outline output",
        summary: "summary output",
      });
    });

    it("passes topics output into the outline step prompt", async () => {
      mockCreate
        .mockResolvedValueOnce({ content: [{ text: "1. AI\n2. Regulation" }] })
        .mockResolvedValueOnce({ content: [{ text: "outline" }] })
        .mockResolvedValueOnce({ content: [{ text: "summary" }] });

      await runPipeline();

      // Second call should contain the topics from step 1
      const step2Content = mockCreate.mock.calls[1][0].messages[0].content;
      expect(step2Content).toContain("1. AI\n2. Regulation");
    });

    it("passes outline output into the summary step prompt", async () => {
      mockCreate
        .mockResolvedValueOnce({ content: [{ text: "topics" }] })
        .mockResolvedValueOnce({
          content: [{ text: "Section 1\nSection 2" }],
        })
        .mockResolvedValueOnce({ content: [{ text: "summary" }] });

      await runPipeline();

      // Third call should contain the outline from step 2
      const step3Content = mockCreate.mock.calls[2][0].messages[0].content;
      expect(step3Content).toContain("Section 1\nSection 2");
    });

    it("logs progress messages for each step", async () => {
      const consoleSpy = jest
        .spyOn(console, "log")
        .mockImplementation(() => {});

      mockCreate.mockResolvedValue({ content: [{ text: "output" }] });

      await runPipeline();

      const logOutput = consoleSpy.mock.calls.flat().join("\n");
      expect(logOutput).toContain("Step 1");
      expect(logOutput).toContain("Step 2");
      expect(logOutput).toContain("Step 3");

      consoleSpy.mockRestore();
    });
  });

  describe("main()", () => {
    it("runs the pipeline and logs the header and observation", async () => {
      const consoleSpy = jest
        .spyOn(console, "log")
        .mockImplementation(() => {});

      mockCreate.mockResolvedValue({ content: [{ text: "output" }] });

      await main();

      const logOutput = consoleSpy.mock.calls.flat().join("\n");
      expect(logOutput).toContain("PROMPT CHAINING PIPELINE");
      expect(logOutput).toContain("Observation");
      expect(mockCreate).toHaveBeenCalledTimes(3);

      consoleSpy.mockRestore();
    });
  });
});
