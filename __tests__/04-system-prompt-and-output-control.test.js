/**
 * Tests for 04-system-prompt-and-output-control.js
 *
 * Mocks the Anthropic SDK so no real API calls are made.
 * Verifies weak-prompt and strong-prompt triage functions, including
 * both the successful JSON parse path and the error path.
 */

const mockCreate = jest.fn();

jest.mock("@anthropic-ai/sdk", () => ({
  __esModule: true,
  default: jest.fn().mockImplementation(() => ({
    messages: { create: mockCreate },
  })),
}));

jest.mock("dotenv/config", () => ({}));

const {
  triageWithWeakPrompt,
  triageWithStrongPrompt,
  main,
} = require("../04-system-prompt-and-output-control.js");

describe("04 – System Prompt & Output Control", () => {
  beforeEach(() => {
    mockCreate.mockReset();
  });

  describe("triageWithWeakPrompt()", () => {
    it("calls the Anthropic API with the correct model and token limit", async () => {
      mockCreate.mockResolvedValue({
        content: [{ text: "Here is my assessment of the ticket." }],
      });

      await triageWithWeakPrompt("I need help.");

      expect(mockCreate).toHaveBeenCalledTimes(1);
      const callArgs = mockCreate.mock.calls[0][0];
      expect(callArgs.model).toBe("claude-sonnet-4-20250514");
      expect(callArgs.max_tokens).toBe(300);
    });

    it("uses the weak system prompt", async () => {
      mockCreate.mockResolvedValue({ content: [{ text: "response" }] });

      await triageWithWeakPrompt("I need help.");

      const callArgs = mockCreate.mock.calls[0][0];
      expect(callArgs.system).toContain("helpful assistant");
    });

    it("includes the ticket text in the user message", async () => {
      mockCreate.mockResolvedValue({ content: [{ text: "response" }] });

      await triageWithWeakPrompt("My invoice is wrong.");

      const message = mockCreate.mock.calls[0][0].messages[0];
      expect(message.role).toBe("user");
      expect(message.content).toContain("My invoice is wrong.");
    });

    it("returns the trimmed text from the API response", async () => {
      mockCreate.mockResolvedValue({
        content: [{ text: "  This ticket is about billing.  " }],
      });

      const result = await triageWithWeakPrompt("billing issue");

      expect(result).toBe("This ticket is about billing.");
    });
  });

  describe("triageWithStrongPrompt()", () => {
    it("calls the Anthropic API with the correct model and token limit", async () => {
      const validJson = JSON.stringify({
        category: "billing",
        priority: "high",
        sentiment: "frustrated",
        suggested_response: "We will resolve this quickly.",
        route_to: "billing_team",
      });
      mockCreate.mockResolvedValue({ content: [{ text: validJson }] });

      await triageWithStrongPrompt("billing issue");

      expect(mockCreate).toHaveBeenCalledTimes(1);
      const callArgs = mockCreate.mock.calls[0][0];
      expect(callArgs.model).toBe("claude-sonnet-4-20250514");
      expect(callArgs.max_tokens).toBe(300);
    });

    it("uses the strong system prompt with JSON schema instructions", async () => {
      mockCreate.mockResolvedValue({
        content: [{ text: '{"category":"billing"}' }],
      });

      await triageWithStrongPrompt("billing issue");

      const callArgs = mockCreate.mock.calls[0][0];
      expect(callArgs.system).toContain("JSON");
      expect(callArgs.system).toContain("category");
      expect(callArgs.system).toContain("priority");
      expect(callArgs.system).toContain("sentiment");
      expect(callArgs.system).toContain("route_to");
    });

    it("returns { parsed: true, data } when the response is valid JSON", async () => {
      const data = {
        category: "technical",
        priority: "critical",
        sentiment: "frustrated",
        suggested_response: "We are on it.",
        route_to: "engineering",
      };
      mockCreate.mockResolvedValue({
        content: [{ text: JSON.stringify(data) }],
      });

      const result = await triageWithStrongPrompt("production is down");

      expect(result).toEqual({ parsed: true, data });
    });

    it("returns { parsed: false, raw } when the response is not valid JSON", async () => {
      mockCreate.mockResolvedValue({
        content: [{ text: "Sorry, I cannot help with that." }],
      });

      const result = await triageWithStrongPrompt("some ticket");

      expect(result).toEqual({
        parsed: false,
        raw: "Sorry, I cannot help with that.",
      });
    });

    it("sends the ticket text directly as the user message content", async () => {
      mockCreate.mockResolvedValue({
        content: [{ text: '{"category":"general_inquiry"}' }],
      });

      await triageWithStrongPrompt("Does your API support batch requests?");

      const message = mockCreate.mock.calls[0][0].messages[0];
      expect(message.content).toBe("Does your API support batch requests?");
    });
  });

  describe("main()", () => {
    it("processes all tickets and logs output for each", async () => {
      const consoleSpy = jest
        .spyOn(console, "log")
        .mockImplementation(() => {});

      // 4 tickets × 2 calls each = 8 total
      // Alternate between valid JSON (parsed) and plain text (not parsed)
      for (let i = 0; i < 4; i++) {
        // weak prompt response
        mockCreate.mockResolvedValueOnce({
          content: [{ text: "Here is my triage." }],
        });
        // strong prompt response — valid JSON for even, invalid for odd
        if (i % 2 === 0) {
          mockCreate.mockResolvedValueOnce({
            content: [
              {
                text: JSON.stringify({
                  category: "billing",
                  priority: "high",
                  sentiment: "frustrated",
                  suggested_response: "We will help.",
                  route_to: "billing_team",
                }),
              },
            ],
          });
        } else {
          mockCreate.mockResolvedValueOnce({
            content: [{ text: "not valid json" }],
          });
        }
      }

      await main();

      expect(mockCreate).toHaveBeenCalledTimes(8);

      const logOutput = consoleSpy.mock.calls.flat().join("\n");
      expect(logOutput).toContain("TICKET:");
      expect(logOutput).toContain("Weak System Prompt");
      expect(logOutput).toContain("Strong System Prompt");
      expect(logOutput).toContain("Observation");
      // Verify both branches of the if/else were hit
      expect(logOutput).toContain("JSON parse failed");

      consoleSpy.mockRestore();
    });
  });
});
