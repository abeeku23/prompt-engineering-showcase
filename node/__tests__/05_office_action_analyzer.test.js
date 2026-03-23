/**
 * Tests for 05_office_action_analyzer.js
 *
 * Mocks the Anthropic SDK so no real API calls are made.
 * Verifies that each pipeline step sends the correct request structure,
 * handles both the successful JSON parse path and the error path,
 * and that main() orchestrates the full 5-step pipeline.
 * Also covers loadOfficeAction() for .txt, .pdf, and .docx formats,
 * getMpepContext() for MPEP section lookups, lookupPatentPriorArt() and
 * fetchPriorArtDetails() for the PatentsView API integration.
 */

const mockCreate = jest.fn();

jest.mock("@anthropic-ai/sdk", () => ({
  __esModule: true,
  default: jest.fn().mockImplementation(() => ({
    messages: { create: mockCreate },
  })),
}));

jest.mock("dotenv/config", () => ({}));

// ── fs mock ───────────────────────────────────────────────────────────────
const mockReadFileSync = jest.fn();
jest.mock("fs", () => ({
  readFileSync: (...args) => mockReadFileSync(...args),
}));

// ── pdf-parse mock ────────────────────────────────────────────────────────
const mockPdfParse = jest.fn();
jest.mock("pdf-parse", () => mockPdfParse, { virtual: true });

// ── mammoth mock ──────────────────────────────────────────────────────────
const mockExtractRawText = jest.fn();
jest.mock("mammoth", () => ({ extractRawText: mockExtractRawText }), {
  virtual: true,
});

// ── fetch mock ────────────────────────────────────────────────────────────
const mockFetch = jest.fn();
global.fetch = mockFetch;

const {
  loadOfficeAction,
  parseAndClassify,
  analyzeRejection,
  generateResponseStrategy,
  suggestClaimAmendments,
  generateResponseOutline,
  getMpepContext,
  lookupPatentPriorArt,
  fetchPriorArtDetails,
  main,
} = require("../05_office_action_analyzer.js");

// ── Fixtures ──────────────────────────────────────────────────────────────

const SAMPLE_REJECTION = {
  id: "REJ-1",
  statute: "101",
  subsection: "101",
  claims_affected: [1],
  prior_art_references: [],
  rejection_basis_summary: "Abstract idea rejection.",
  difficulty: "moderate",
};

const SAMPLE_REJECTION_103 = {
  id: "REJ-3",
  statute: "103",
  subsection: "103",
  claims_affected: [2, 4, 5, 6],
  prior_art_references: ["Johnson", "Patel"],
  rejection_basis_summary: "Obvious in view of Johnson and Patel.",
  difficulty: "moderate",
};

const SAMPLE_PARSED = {
  application_number: "17/123,456",
  art_unit: "3689",
  examiner: "John R. Smith",
  total_claims_pending: 20,
  rejections: [SAMPLE_REJECTION, SAMPLE_REJECTION_103],
  objections: [
    {
      id: "OBJ-1",
      target: "drawings",
      basis: "37 C.F.R. § 1.83(a)",
      summary: "Figure 3 fails to show all elements of claim 8.",
    },
  ],
};

const SAMPLE_ANALYSIS = {
  rejection_id: "REJ-1",
  examiner_argument_strength: "moderate",
  key_vulnerabilities_in_examiner_position: ["Fails Alice step two analysis"],
  can_overcome_by_argument_alone: true,
  amendment_likely_required: false,
  relevant_case_law: ["Alice Corp. v. CLS Bank"],
  relevant_mpep_sections: ["MPEP 2106"],
  strategic_notes: "Strong argument-only position.",
};

// ── parseAndClassify() ────────────────────────────────────────────────────

describe("05 – Office Action Analyzer", () => {
  beforeEach(() => {
    mockCreate.mockReset();
    mockReadFileSync.mockReset();
    mockPdfParse.mockReset();
    mockExtractRawText.mockReset();
    mockFetch.mockReset();
  });

  // ── loadOfficeAction() ──────────────────────────────────────────────────

  describe("loadOfficeAction()", () => {
    it("reads plain text from a .txt file", async () => {
      mockReadFileSync.mockReturnValue("OFFICE ACTION PLAIN TEXT");

      const result = await loadOfficeAction("/path/to/action.txt");

      expect(mockReadFileSync).toHaveBeenCalledWith("/path/to/action.txt", "utf-8");
      expect(result).toBe("OFFICE ACTION PLAIN TEXT");
    });

    it("extracts text from a .pdf file using pdf-parse", async () => {
      const pdfBuffer = Buffer.from("pdf bytes");
      mockReadFileSync.mockReturnValue(pdfBuffer);
      mockPdfParse.mockResolvedValue({ text: "EXTRACTED PDF TEXT" });

      const result = await loadOfficeAction("/path/to/action.pdf");

      expect(mockReadFileSync).toHaveBeenCalledWith("/path/to/action.pdf");
      expect(mockPdfParse).toHaveBeenCalledWith(pdfBuffer);
      expect(result).toBe("EXTRACTED PDF TEXT");
    });

    it("extracts text from a .docx file using mammoth", async () => {
      mockExtractRawText.mockResolvedValue({ value: "EXTRACTED DOCX TEXT" });

      const result = await loadOfficeAction("/path/to/action.docx");

      expect(mockExtractRawText).toHaveBeenCalledWith({
        path: "/path/to/action.docx",
      });
      expect(result).toBe("EXTRACTED DOCX TEXT");
    });

    it("throws an error for unsupported file formats", async () => {
      await expect(loadOfficeAction("/path/to/action.rtf")).rejects.toThrow(
        'Unsupported file format ".rtf"'
      );
    });

    it("wraps txt read errors with a helpful message", async () => {
      mockReadFileSync.mockImplementation(() => {
        throw new Error("ENOENT: no such file or directory");
      });

      await expect(loadOfficeAction("/missing/action.txt")).rejects.toThrow(
        'Failed to read .txt file "/missing/action.txt"'
      );
    });

    it("wraps pdf read errors with a helpful message", async () => {
      mockReadFileSync.mockImplementation(() => {
        throw new Error("ENOENT: no such file or directory");
      });

      await expect(loadOfficeAction("/missing/action.pdf")).rejects.toThrow(
        'Failed to read .pdf file "/missing/action.pdf"'
      );
    });
  });

  describe("parseAndClassify()", () => {
    it("calls the Anthropic API with the correct model and parameters", async () => {
      mockCreate.mockResolvedValue({
        content: [{ text: JSON.stringify(SAMPLE_PARSED) }],
      });

      await parseAndClassify("OFFICE ACTION TEXT");

      expect(mockCreate).toHaveBeenCalledTimes(1);
      const callArgs = mockCreate.mock.calls[0][0];
      expect(callArgs.model).toBe("claude-sonnet-4-20250514");
      expect(callArgs.max_tokens).toBe(800);
      expect(callArgs.system).toContain("patent prosecution analyst");
    });

    it("includes the office action text in the user prompt", async () => {
      mockCreate.mockResolvedValue({
        content: [{ text: JSON.stringify(SAMPLE_PARSED) }],
      });

      await parseAndClassify("MY OFFICE ACTION CONTENT");

      const content = mockCreate.mock.calls[0][0].messages[0].content;
      expect(content).toContain("MY OFFICE ACTION CONTENT");
    });

    it("returns { success: true, data } when the response is valid JSON", async () => {
      mockCreate.mockResolvedValue({
        content: [{ text: JSON.stringify(SAMPLE_PARSED) }],
      });

      const result = await parseAndClassify("OFFICE ACTION TEXT");

      expect(result).toEqual({ success: true, data: SAMPLE_PARSED });
    });

    it("returns { success: false, raw } when the response is not valid JSON", async () => {
      mockCreate.mockResolvedValue({
        content: [{ text: "Sorry, I cannot parse this." }],
      });

      const result = await parseAndClassify("OFFICE ACTION TEXT");

      expect(result).toEqual({
        success: false,
        raw: "Sorry, I cannot parse this.",
      });
    });

    it("instructs the model to return valid JSON only", async () => {
      mockCreate.mockResolvedValue({
        content: [{ text: JSON.stringify(SAMPLE_PARSED) }],
      });

      await parseAndClassify("OFFICE ACTION TEXT");

      const content = mockCreate.mock.calls[0][0].messages[0].content;
      expect(content.toLowerCase()).toContain("valid json only");
    });
  });

  // ── analyzeRejection() ────────────────────────────────────────────────────

  describe("analyzeRejection()", () => {
    it("calls the Anthropic API with the correct model and parameters", async () => {
      mockCreate.mockResolvedValue({
        content: [{ text: JSON.stringify(SAMPLE_ANALYSIS) }],
      });

      await analyzeRejection(SAMPLE_REJECTION, "OFFICE ACTION TEXT");

      expect(mockCreate).toHaveBeenCalledTimes(1);
      const callArgs = mockCreate.mock.calls[0][0];
      expect(callArgs.model).toBe("claude-sonnet-4-20250514");
      expect(callArgs.max_tokens).toBe(600);
      expect(callArgs.system).toContain("patent prosecution analyst");
    });

    it("includes the rejection and office action in the user prompt", async () => {
      mockCreate.mockResolvedValue({
        content: [{ text: JSON.stringify(SAMPLE_ANALYSIS) }],
      });

      await analyzeRejection(SAMPLE_REJECTION, "FULL OFFICE ACTION");

      const content = mockCreate.mock.calls[0][0].messages[0].content;
      expect(content).toContain("REJ-1");
      expect(content).toContain("FULL OFFICE ACTION");
    });

    it("returns parsed JSON when the response is valid JSON", async () => {
      mockCreate.mockResolvedValue({
        content: [{ text: JSON.stringify(SAMPLE_ANALYSIS) }],
      });

      const result = await analyzeRejection(SAMPLE_REJECTION, "context");

      expect(result).toEqual(SAMPLE_ANALYSIS);
    });

    it("returns { rejection_id, parse_error } when the response is not valid JSON", async () => {
      mockCreate.mockResolvedValue({
        content: [{ text: "Unable to analyze." }],
      });

      const result = await analyzeRejection(SAMPLE_REJECTION, "context");

      expect(result).toEqual({
        rejection_id: "REJ-1",
        parse_error: "Unable to analyze.",
      });
    });
  });

  // ── generateResponseStrategy() ───────────────────────────────────────────

  describe("generateResponseStrategy()", () => {
    it("calls the Anthropic API with the correct model and parameters", async () => {
      mockCreate.mockResolvedValue({
        content: [{ text: "1. RESPONSE APPROACH\nArgue only." }],
      });

      await generateResponseStrategy(
        SAMPLE_REJECTION,
        SAMPLE_ANALYSIS,
        "OFFICE ACTION TEXT"
      );

      expect(mockCreate).toHaveBeenCalledTimes(1);
      const callArgs = mockCreate.mock.calls[0][0];
      expect(callArgs.model).toBe("claude-sonnet-4-20250514");
      expect(callArgs.max_tokens).toBe(800);
      expect(callArgs.system).toContain("patent prosecution analyst");
    });

    it("includes rejection, analysis, and office action context in the prompt", async () => {
      mockCreate.mockResolvedValue({
        content: [{ text: "strategy text" }],
      });

      await generateResponseStrategy(
        SAMPLE_REJECTION,
        SAMPLE_ANALYSIS,
        "OFFICE ACTION CONTEXT"
      );

      const content = mockCreate.mock.calls[0][0].messages[0].content;
      expect(content).toContain("REJ-1");
      expect(content).toContain("OFFICE ACTION CONTEXT");
    });

    it("returns the trimmed text from the API response", async () => {
      mockCreate.mockResolvedValue({
        content: [{ text: "  strategy content  " }],
      });

      const result = await generateResponseStrategy(
        SAMPLE_REJECTION,
        SAMPLE_ANALYSIS,
        "context"
      );

      expect(result).toBe("strategy content");
    });
  });

  // ── suggestClaimAmendments() ──────────────────────────────────────────────

  describe("suggestClaimAmendments()", () => {
    it("calls the API for a § 103 rejection", async () => {
      mockCreate.mockResolvedValue({
        content: [{ text: "Amend claim 4 to add federated learning." }],
      });

      await suggestClaimAmendments(SAMPLE_REJECTION_103, "OFFICE ACTION TEXT");

      expect(mockCreate).toHaveBeenCalledTimes(1);
      const callArgs = mockCreate.mock.calls[0][0];
      expect(callArgs.model).toBe("claude-sonnet-4-20250514");
      expect(callArgs.max_tokens).toBe(600);
    });

    it("calls the API for a § 112 rejection", async () => {
      const rejection112 = { ...SAMPLE_REJECTION, id: "REJ-4", statute: "112" };
      mockCreate.mockResolvedValue({
        content: [{ text: "Clarify 'substantially real-time'." }],
      });

      await suggestClaimAmendments(rejection112, "OFFICE ACTION TEXT");

      expect(mockCreate).toHaveBeenCalledTimes(1);
    });

    it("returns the trimmed amendment text for § 103", async () => {
      mockCreate.mockResolvedValue({
        content: [{ text: "  amendment text  " }],
      });

      const result = await suggestClaimAmendments(
        SAMPLE_REJECTION_103,
        "context"
      );

      expect(result).toBe("amendment text");
    });

    it("returns null for a § 101 rejection without calling the API", async () => {
      const result = await suggestClaimAmendments(
        SAMPLE_REJECTION,
        "OFFICE ACTION TEXT"
      );

      expect(result).toBeNull();
      expect(mockCreate).not.toHaveBeenCalled();
    });

    it("returns null for a § 102 rejection without calling the API", async () => {
      const rejection102 = { ...SAMPLE_REJECTION, id: "REJ-2", statute: "102" };

      const result = await suggestClaimAmendments(
        rejection102,
        "OFFICE ACTION TEXT"
      );

      expect(result).toBeNull();
      expect(mockCreate).not.toHaveBeenCalled();
    });

    it("includes the statute and rejection details in the prompt", async () => {
      mockCreate.mockResolvedValue({ content: [{ text: "amendments" }] });

      await suggestClaimAmendments(SAMPLE_REJECTION_103, "OA CONTEXT");

      const content = mockCreate.mock.calls[0][0].messages[0].content;
      expect(content).toContain("103");
      expect(content).toContain("REJ-3");
    });
  });

  // ── generateResponseOutline() ─────────────────────────────────────────────

  describe("generateResponseOutline()", () => {
    it("calls the Anthropic API with the correct model and parameters", async () => {
      mockCreate.mockResolvedValue({
        content: [{ text: "CONSOLIDATED OUTLINE TEXT" }],
      });

      await generateResponseOutline(SAMPLE_PARSED, {}, {});

      expect(mockCreate).toHaveBeenCalledTimes(1);
      const callArgs = mockCreate.mock.calls[0][0];
      expect(callArgs.model).toBe("claude-sonnet-4-20250514");
      expect(callArgs.max_tokens).toBe(800);
      expect(callArgs.system).toContain("patent prosecution analyst");
    });

    it("includes application number, examiner, and art unit in the prompt", async () => {
      mockCreate.mockResolvedValue({ content: [{ text: "outline" }] });

      await generateResponseOutline(SAMPLE_PARSED, {}, {});

      const content = mockCreate.mock.calls[0][0].messages[0].content;
      expect(content).toContain("17/123,456");
      expect(content).toContain("John R. Smith");
      expect(content).toContain("3689");
    });

    it("returns the trimmed text from the API response", async () => {
      mockCreate.mockResolvedValue({
        content: [{ text: "  outline content  " }],
      });

      const result = await generateResponseOutline(SAMPLE_PARSED, {}, {});

      expect(result).toBe("outline content");
    });
  });

  // ── main() ────────────────────────────────────────────────────────────────

  describe("main()", () => {
    it("logs a failure message and returns early when parse fails", async () => {
      const originalArgv = process.argv;
      process.argv = ["node", "05_office_action_analyzer.js"];

      const consoleSpy = jest
        .spyOn(console, "log")
        .mockImplementation(() => {});
      const consoleErrorSpy = jest
        .spyOn(console, "error")
        .mockImplementation(() => {});

      // Step 1 returns invalid JSON
      mockCreate.mockResolvedValueOnce({
        content: [{ text: "not valid json" }],
      });

      await main();

      // Should have called the API only once (just the parse step)
      expect(mockCreate).toHaveBeenCalledTimes(1);

      consoleSpy.mockRestore();
      consoleErrorSpy.mockRestore();
      process.argv = originalArgv;
    });

    it("runs the full pipeline and logs the consolidated outline", async () => {
      const originalArgv = process.argv;
      process.argv = ["node", "05_office_action_analyzer.js"];

      const consoleSpy = jest
        .spyOn(console, "log")
        .mockImplementation(() => {});

      // Step 1: parseAndClassify
      mockCreate.mockResolvedValueOnce({
        content: [{ text: JSON.stringify(SAMPLE_PARSED) }],
      });

      // For each of 2 rejections: analyzeRejection + generateResponseStrategy
      // REJ-1 (§101): analyze + strategy  (no amendment)
      mockCreate.mockResolvedValueOnce({
        content: [{ text: JSON.stringify(SAMPLE_ANALYSIS) }],
      });
      mockCreate.mockResolvedValueOnce({
        content: [{ text: "Strategy for REJ-1" }],
      });

      // REJ-3 (§103): analyze + strategy + amendment
      mockCreate.mockResolvedValueOnce({
        content: [
          {
            text: JSON.stringify({
              ...SAMPLE_ANALYSIS,
              rejection_id: "REJ-3",
            }),
          },
        ],
      });
      mockCreate.mockResolvedValueOnce({
        content: [{ text: "Strategy for REJ-3" }],
      });
      mockCreate.mockResolvedValueOnce({
        content: [{ text: "Amendment for REJ-3" }],
      });

      // Step 5: generateResponseOutline
      mockCreate.mockResolvedValueOnce({
        content: [{ text: "CONSOLIDATED RESPONSE OUTLINE" }],
      });

      await main();

      const logOutput = consoleSpy.mock.calls.flat().join("\n");
      expect(logOutput).toContain("OFFICE ACTION ANALYZER");
      expect(logOutput).toContain("CONSOLIDATED RESPONSE OUTLINE");
      expect(logOutput).toContain("Observation");

      consoleSpy.mockRestore();
      process.argv = originalArgv;
    });

    it("logs application metadata after a successful parse", async () => {
      const originalArgv = process.argv;
      process.argv = ["node", "05_office_action_analyzer.js"];

      const consoleSpy = jest
        .spyOn(console, "log")
        .mockImplementation(() => {});

      mockCreate.mockResolvedValueOnce({
        content: [{ text: JSON.stringify(SAMPLE_PARSED) }],
      });

      // Two rejections × (analyze + strategy) + one amendment (REJ-3) + outline
      for (let i = 0; i < 6; i++) {
        mockCreate.mockResolvedValueOnce({
          content: [{ text: i < 4 ? JSON.stringify(SAMPLE_ANALYSIS) : "text" }],
        });
      }

      await main();

      const logOutput = consoleSpy.mock.calls.flat().join("\n");
      expect(logOutput).toContain("17/123,456");
      expect(logOutput).toContain("John R. Smith");
      expect(logOutput).toContain("3689");

      consoleSpy.mockRestore();
      process.argv = originalArgv;
    });

    it("loads office action from a .txt file when a path is supplied via argv", async () => {
      const originalArgv = process.argv;
      process.argv = ["node", "05_office_action_analyzer.js", "/tmp/action.txt"];

      const consoleSpy = jest
        .spyOn(console, "log")
        .mockImplementation(() => {});

      mockReadFileSync.mockReturnValue("OFFICE ACTION FROM FILE");

      // Step 1 returns invalid JSON so the pipeline exits early — we only care
      // that the file was read.
      mockCreate.mockResolvedValueOnce({
        content: [{ text: "not valid json" }],
      });

      const consoleErrorSpy = jest
        .spyOn(console, "error")
        .mockImplementation(() => {});

      await main();

      expect(mockReadFileSync).toHaveBeenCalledWith("/tmp/action.txt", "utf-8");
      const logOutput = consoleSpy.mock.calls.flat().join("\n");
      expect(logOutput).toContain("Loading office action from");

      consoleSpy.mockRestore();
      consoleErrorSpy.mockRestore();
      process.argv = originalArgv;
    });

    it("logs an error and returns early when the supplied file cannot be loaded", async () => {
      const originalArgv = process.argv;
      process.argv = ["node", "05_office_action_analyzer.js", "/tmp/action.xlsx"];

      const consoleSpy = jest
        .spyOn(console, "log")
        .mockImplementation(() => {});
      const consoleErrorSpy = jest
        .spyOn(console, "error")
        .mockImplementation(() => {});

      await main();

      // No API calls should be made when file loading fails.
      expect(mockCreate).not.toHaveBeenCalled();
      const errOutput = consoleErrorSpy.mock.calls.flat().join("\n");
      expect(errOutput).toContain("Failed to load file");

      consoleSpy.mockRestore();
      consoleErrorSpy.mockRestore();
      process.argv = originalArgv;
    });
  });

  // ── getMpepContext() ──────────────────────────────────────────────────────

  describe("getMpepContext()", () => {
    it("returns a non-empty string for § 101", () => {
      const result = getMpepContext("101");
      expect(result).toContain("MPEP");
      expect(result).toContain("101");
      expect(result).toContain("2106");
    });

    it("returns a non-empty string for § 102", () => {
      const result = getMpepContext("102");
      expect(result).toContain("MPEP");
      expect(result).toContain("102");
      expect(result).toContain("2131");
    });

    it("returns a non-empty string for § 103", () => {
      const result = getMpepContext("103");
      expect(result).toContain("MPEP");
      expect(result).toContain("103");
      expect(result).toContain("2141");
    });

    it("returns a non-empty string for § 112", () => {
      const result = getMpepContext("112");
      expect(result).toContain("MPEP");
      expect(result).toContain("112");
      expect(result).toContain("2173");
    });

    it("returns an empty string for an unknown statute", () => {
      expect(getMpepContext("999")).toBe("");
    });

    it("returns an empty string when statute is undefined", () => {
      expect(getMpepContext(undefined)).toBe("");
    });

    it("lists multiple MPEP sections for each statute", () => {
      ["101", "102", "103", "112"].forEach((statute) => {
        const result = getMpepContext(statute);
        // Should contain at least 3 bullet points (•)
        const bulletCount = (result.match(/•/g) ?? []).length;
        expect(bulletCount).toBeGreaterThanOrEqual(3);
      });
    });
  });

  // ── lookupPatentPriorArt() ────────────────────────────────────────────────

  describe("lookupPatentPriorArt()", () => {
    it("calls fetch with the normalized patent number and correct URL", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          patent: {
            patent_id: "10123456",
            patent_title: "Fraud Detection System",
            patent_abstract: "A system for detecting fraud...",
          },
        }),
      });

      await lookupPatentPriorArt("US 10,123,456");

      expect(mockFetch).toHaveBeenCalledTimes(1);
      const [url] = mockFetch.mock.calls[0];
      expect(url).toContain("10123456");
      expect(url).toContain("patent_title");
      expect(url).toContain("patent_abstract");
    });

    it("strips 'US' prefix and commas before querying", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ patent: { patent_id: "9876543" } }),
      });

      await lookupPatentPriorArt("US9,876,543");

      const [url] = mockFetch.mock.calls[0];
      // The normalised patent number should appear without "US" prefix or commas
      expect(url).toContain("9876543");
      expect(url).not.toContain("US9");
      // The patent number segment of the path should have no commas
      const pathSegment = url.split("?")[0];
      expect(pathSegment).not.toContain(",");
    });

    it("returns the patent object on a successful response", async () => {
      const patentData = {
        patent_id: "10123456",
        patent_title: "Fraud Detection System",
        patent_abstract: "A method and apparatus...",
      };
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ patent: patentData }),
      });

      const result = await lookupPatentPriorArt("10123456");

      expect(result).toEqual(patentData);
    });

    it("returns null when the API responds with a non-OK status", async () => {
      mockFetch.mockResolvedValue({ ok: false });

      const result = await lookupPatentPriorArt("10123456");

      expect(result).toBeNull();
    });

    it("returns null when fetch throws a network error", async () => {
      mockFetch.mockRejectedValue(new Error("Network error"));

      const result = await lookupPatentPriorArt("10123456");

      expect(result).toBeNull();
    });

    it("returns null when the response has no patent field", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({}),
      });

      const result = await lookupPatentPriorArt("99999999");

      expect(result).toBeNull();
    });
  });

  // ── fetchPriorArtDetails() ────────────────────────────────────────────────

  describe("fetchPriorArtDetails()", () => {
    it("fetches details for all unique prior art references across rejections", async () => {
      const johnsonData = {
        patent_id: "10123456",
        patent_title: "Fraud Detection System",
        patent_abstract: "Abstract for Johnson.",
      };
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ patent: johnsonData }),
      });

      const rejections = [
        { prior_art_references: ["Johnson (US 10,123,456)"] },
        { prior_art_references: ["Johnson (US 10,123,456)", "Patel (US 9,876,543)"] },
      ];

      await fetchPriorArtDetails(rejections);

      // Unique references = Johnson + Patel → 2 fetch calls
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it("returns a map keyed by reference string", async () => {
      const patentData = { patent_id: "10123456", patent_title: "Fraud Detection" };
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ patent: patentData }),
      });

      const rejections = [{ prior_art_references: ["Johnson (US 10,123,456)"] }];
      const result = await fetchPriorArtDetails(rejections);

      expect(result).toHaveProperty("Johnson (US 10,123,456)");
      expect(result["Johnson (US 10,123,456)"]).toEqual(patentData);
    });

    it("silently skips references that contain no patent number", async () => {
      const rejections = [{ prior_art_references: ["See general knowledge"] }];
      const result = await fetchPriorArtDetails(rejections);

      expect(mockFetch).not.toHaveBeenCalled();
      expect(result).toEqual({});
    });

    it("skips references for which the API returns null", async () => {
      mockFetch.mockResolvedValue({ ok: false });

      const rejections = [{ prior_art_references: ["Johnson (US 10,123,456)"] }];
      const result = await fetchPriorArtDetails(rejections);

      expect(result).toEqual({});
    });

    it("handles rejections with no prior_art_references field", async () => {
      const rejections = [{ prior_art_references: [] }, {}];
      const result = await fetchPriorArtDetails(rejections);

      expect(mockFetch).not.toHaveBeenCalled();
      expect(result).toEqual({});
    });
  });

  // ── analyzeRejection() with enrichmentContext ─────────────────────────────

  describe("analyzeRejection() enrichment context", () => {
    it("includes enrichmentContext in the prompt when provided", async () => {
      mockCreate.mockResolvedValue({
        content: [{ text: JSON.stringify(SAMPLE_ANALYSIS) }],
      });

      await analyzeRejection(SAMPLE_REJECTION, "OFFICE ACTION TEXT", "MPEP § 2106 — Alice framework");

      const content = mockCreate.mock.calls[0][0].messages[0].content;
      expect(content).toContain("MPEP § 2106");
      expect(content).toContain("Additional Context");
    });

    it("does not include 'Additional Context' section when enrichmentContext is empty", async () => {
      mockCreate.mockResolvedValue({
        content: [{ text: JSON.stringify(SAMPLE_ANALYSIS) }],
      });

      await analyzeRejection(SAMPLE_REJECTION, "OFFICE ACTION TEXT");

      const content = mockCreate.mock.calls[0][0].messages[0].content;
      expect(content).not.toContain("Additional Context");
    });

    it("defaults to no enrichment context when the third argument is omitted", async () => {
      mockCreate.mockResolvedValue({
        content: [{ text: JSON.stringify(SAMPLE_ANALYSIS) }],
      });

      // Should not throw and should still call the API
      const result = await analyzeRejection(SAMPLE_REJECTION, "context");

      expect(mockCreate).toHaveBeenCalledTimes(1);
      expect(result).toEqual(SAMPLE_ANALYSIS);
    });
  });

});
