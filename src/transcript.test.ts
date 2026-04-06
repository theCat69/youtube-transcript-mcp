import { describe, it, expect, vi, beforeEach } from "vitest";

import { decodeHtmlEntities, fetchTranscript } from "./transcript.js";

// Mock undici
vi.mock("undici", () => ({
  request: vi.fn(),
}));

import { request } from "undici";

const mockRequest = vi.mocked(request);

// ─── Helpers ────────────────────────────────────────────────────────────────

interface MockBody {
  [Symbol.asyncIterator](): AsyncIterableIterator<Buffer>;
  destroy(): void;
}

function createMockBody(content: string): MockBody {
  return {
    async *[Symbol.asyncIterator]() {
      yield Buffer.from(content, "utf-8");
    },
    destroy: vi.fn(),
  };
}

function createInnerTubeResponse(
  captionTracks: unknown[],
): { statusCode: number; body: MockBody } {
  const json = JSON.stringify({
    captions: {
      playerCaptionsTracklistRenderer: { captionTracks },
    },
  });
  return {
    statusCode: 200,
    body: createMockBody(json),
  };
}

function createXmlResponse(
  xml: string,
): { statusCode: number; body: MockBody } {
  return {
    statusCode: 200,
    body: createMockBody(xml),
  };
}

function createOversizedBody(sizeBytes: number): MockBody {
  const chunk = Buffer.alloc(sizeBytes, "x");
  return {
    async *[Symbol.asyncIterator]() {
      yield chunk;
    },
    destroy: vi.fn(),
  };
}

function createHtmlResponse(
  captionTracks: unknown[],
): { statusCode: number; body: MockBody } {
  const playerResponse = JSON.stringify({
    captions: {
      playerCaptionsTracklistRenderer: { captionTracks },
    },
  });
  const html =
    `<html><script>var ytInitialPlayerResponse = ${playerResponse};</script></html>`;
  return {
    statusCode: 200,
    body: createMockBody(html),
  };
}

const ENGLISH_TRACK = {
  baseUrl: "https://www.youtube.com/api/timedtext?v=xxx&lang=en",
  name: { simpleText: "English" },
  languageCode: "en",
};

const SPANISH_TRACK = {
  baseUrl: "https://www.youtube.com/api/timedtext?v=xxx&lang=es",
  name: { simpleText: "Spanish" },
  languageCode: "es",
};

const ASR_TRACK = {
  baseUrl: "https://www.youtube.com/api/timedtext?v=xxx&lang=en&kind=asr",
  name: { simpleText: "English (auto-generated)" },
  languageCode: "en",
  kind: "asr",
};

const CLASSIC_XML = `<?xml version="1.0" encoding="utf-8"?>
<transcript>
  <text start="0.0" dur="5.0">Hello world</text>
  <text start="5.0" dur="3.0">This is a test</text>
</transcript>`;

const SRV3_XML = `<?xml version="1.0" encoding="utf-8"?>
<timedtext>
  <body>
    <p t="0" d="5000"><s>Hello</s> <s>world</s></p>
    <p t="5000" d="3000"><s>This</s> <s>is</s> <s>a</s> <s>test</s></p>
  </body>
</timedtext>`;

const ENTITIES_XML = `<?xml version="1.0" encoding="utf-8"?>
<transcript>
  <text start="0.0" dur="5.0">Tom &amp; Jerry &lt;3 &quot;fun&quot; &#39;times&#39;</text>
  <text start="5.0" dur="3.0">&#72;&#101;&#108;&#108;&#111;</text>
  <text start="8.0" dur="2.0">&#x48;&#x65;&#x78;</text>
</transcript>`;

// ─── Tests ──────────────────────────────────────────────────────────────────

describe("decodeHtmlEntities", () => {
  it("should decode named HTML entities", () => {
    expect(decodeHtmlEntities("&amp; &lt; &gt; &quot; &#39; &apos;"))
      .toBe("& < > \" ' '");
  });

  it("should decode numeric decimal entities", () => {
    expect(decodeHtmlEntities("&#72;&#101;&#108;&#108;&#111;"))
      .toBe("Hello");
  });

  it("should decode hex entities", () => {
    expect(decodeHtmlEntities("&#x48;&#x65;&#x78;")).toBe("Hex");
  });

  it("should strip HTML tags", () => {
    expect(decodeHtmlEntities("<b>bold</b> and <i>italic</i>"))
      .toBe("bold and italic");
  });

  it("should replace newlines with spaces", () => {
    expect(decodeHtmlEntities("line1\nline2")).toBe("line1 line2");
  });

  it("should not double-decode entities like &amp;lt;", () => {
    expect(decodeHtmlEntities("&amp;lt;")).toBe("&lt;");
  });
});

describe("fetchTranscript", () => {
  beforeEach(() => {
    mockRequest.mockReset();
  });

  it("should parse classic XML transcript format", async () => {
    // First call: InnerTube API
    mockRequest.mockResolvedValueOnce(
      createInnerTubeResponse([ENGLISH_TRACK]) as never,
    );
    // Second call: transcript XML
    mockRequest.mockResolvedValueOnce(
      createXmlResponse(CLASSIC_XML) as never,
    );

    const result = await fetchTranscript("dQw4w9WgXcQ");

    expect(result.videoId).toBe("dQw4w9WgXcQ");
    expect(result.segments).toHaveLength(2);
    expect(result.segments[0]).toEqual({
      text: "Hello world",
      start: 0.0,
      duration: 5.0,
    });
    expect(result.segments[1]).toEqual({
      text: "This is a test",
      start: 5.0,
      duration: 3.0,
    });
  });

  it("should parse srv3 XML transcript format", async () => {
    mockRequest.mockResolvedValueOnce(
      createInnerTubeResponse([ENGLISH_TRACK]) as never,
    );
    mockRequest.mockResolvedValueOnce(
      createXmlResponse(SRV3_XML) as never,
    );

    const result = await fetchTranscript("dQw4w9WgXcQ");

    expect(result.segments).toHaveLength(2);
    expect(result.segments[0].text).toBe("Hello world");
    expect(result.segments[0].start).toBe(0);
    expect(result.segments[0].duration).toBe(5);
    expect(result.segments[1].text).toBe("This is a test");
    expect(result.segments[1].start).toBe(5);
    expect(result.segments[1].duration).toBe(3);
  });

  it("should decode HTML entities in transcript text", async () => {
    mockRequest.mockResolvedValueOnce(
      createInnerTubeResponse([ENGLISH_TRACK]) as never,
    );
    mockRequest.mockResolvedValueOnce(
      createXmlResponse(ENTITIES_XML) as never,
    );

    const result = await fetchTranscript("dQw4w9WgXcQ");

    expect(result.segments[0].text).toBe("Tom & Jerry <3 \"fun\" 'times'");
    expect(result.segments[1].text).toBe("Hello");
    expect(result.segments[2].text).toBe("Hex");
  });

  it("should select the requested language track", async () => {
    mockRequest.mockResolvedValueOnce(
      createInnerTubeResponse([ENGLISH_TRACK, SPANISH_TRACK]) as never,
    );
    mockRequest.mockResolvedValueOnce(
      createXmlResponse(CLASSIC_XML) as never,
    );

    const result = await fetchTranscript("dQw4w9WgXcQ", "es");

    // Verify that the second call used the Spanish track URL
    const secondCall = mockRequest.mock.calls[1];
    expect(secondCall[0]).toBe(SPANISH_TRACK.baseUrl);
    expect(result.segments).toHaveLength(2);
  });

  it("should throw when no captions are available", async () => {
    // InnerTube returns empty captions
    mockRequest.mockResolvedValueOnce(
      createInnerTubeResponse([]) as never,
    );
    // HTML fallback also returns empty
    mockRequest.mockResolvedValueOnce(
      createHtmlResponse([]) as never,
    );

    await expect(fetchTranscript("dQw4w9WgXcQ"))
      .rejects.toThrow("No captions available");
  });

  it("should throw when requested language is not available", async () => {
    mockRequest.mockResolvedValueOnce(
      createInnerTubeResponse([ENGLISH_TRACK]) as never,
    );

    await expect(fetchTranscript("dQw4w9WgXcQ", "fr"))
      .rejects.toThrow('Language "fr" not available');
  });

  it("should fall back to HTML scraping when InnerTube fails", async () => {
    // InnerTube fails
    mockRequest.mockResolvedValueOnce({
      statusCode: 500,
      body: createMockBody("Server Error"),
    } as never);
    // HTML fallback succeeds
    mockRequest.mockResolvedValueOnce(
      createHtmlResponse([ENGLISH_TRACK]) as never,
    );
    // Transcript XML
    mockRequest.mockResolvedValueOnce(
      createXmlResponse(CLASSIC_XML) as never,
    );

    const result = await fetchTranscript("dQw4w9WgXcQ");

    expect(result.videoId).toBe("dQw4w9WgXcQ");
    expect(result.segments).toHaveLength(2);
    expect(mockRequest).toHaveBeenCalledTimes(3);
  });

  it("should validate transcript URL hostname", async () => {
    const maliciousTrack = {
      baseUrl: "https://evil.com/steal-data",
      name: { simpleText: "English" },
      languageCode: "en",
    };

    mockRequest.mockResolvedValueOnce(
      createInnerTubeResponse([maliciousTrack]) as never,
    );

    await expect(fetchTranscript("dQw4w9WgXcQ"))
      .rejects.toThrow("Untrusted transcript URL hostname");
  });

  it("should prefer manual track over ASR when no lang specified", async () => {
    mockRequest.mockResolvedValueOnce(
      createInnerTubeResponse([ASR_TRACK, ENGLISH_TRACK]) as never,
    );
    mockRequest.mockResolvedValueOnce(
      createXmlResponse(CLASSIC_XML) as never,
    );

    await fetchTranscript("dQw4w9WgXcQ");

    // Should use the non-ASR (manual) track URL
    const secondCall = mockRequest.mock.calls[1];
    expect(secondCall[0]).toBe(ENGLISH_TRACK.baseUrl);
  });

  it("should reject non-HTTPS transcript URLs", async () => {
    const httpTrack = {
      baseUrl: "http://www.youtube.com/api/timedtext?v=xxx&lang=en",
      name: { simpleText: "English" },
      languageCode: "en",
    };

    mockRequest.mockResolvedValueOnce(
      createInnerTubeResponse([httpTrack]) as never,
    );

    await expect(fetchTranscript("dQw4w9WgXcQ"))
      .rejects.toThrow("Untrusted transcript URL protocol");
  });

  it("should throw generic message when both InnerTube and HTML fallback fail", async () => {
    // InnerTube request throws
    mockRequest.mockRejectedValueOnce(new Error("Network error"));
    // HTML fallback request also throws
    mockRequest.mockRejectedValueOnce(new Error("Connection refused"));

    await expect(fetchTranscript("dQw4w9WgXcQ"))
      .rejects.toThrow("No captions could be retrieved for this video.");
  });

  it("should throw when transcript XML fetch returns non-200 status", async () => {
    // InnerTube succeeds
    mockRequest.mockResolvedValueOnce(
      createInnerTubeResponse([ENGLISH_TRACK]) as never,
    );
    // XML fetch returns 403
    mockRequest.mockResolvedValueOnce({
      statusCode: 403,
      body: createMockBody("Forbidden"),
    } as never);

    await expect(fetchTranscript("dQw4w9WgXcQ"))
      .rejects.toThrow("Failed to fetch transcript XML (status 403)");
  });

  it("should sanitize track names with special characters in language-not-found error", async () => {
    const maliciousTrack = {
      baseUrl: "https://www.youtube.com/api/timedtext?v=xxx&lang=en",
      name: { simpleText: "English <inject>payload</inject>" },
      languageCode: "en!@#$",
    };

    mockRequest.mockResolvedValueOnce(
      createInnerTubeResponse([maliciousTrack]) as never,
    );

    const error = await fetchTranscript("dQw4w9WgXcQ", "fr").catch((e: Error) => e);

    expect(error).toBeInstanceOf(Error);
    expect((error as Error).message).not.toContain("<inject>");
    expect((error as Error).message).not.toContain("!@#$");
  });

  it("should throw when HTML page contains CAPTCHA challenge", async () => {
    mockRequest.mockRejectedValueOnce(new Error("InnerTube failed"));
    mockRequest.mockResolvedValueOnce({
      statusCode: 200,
      body: createMockBody(
        '<html><div class="g-recaptcha"></div></html>',
      ),
    } as never);

    await expect(fetchTranscript("dQw4w9WgXcQ"))
      .rejects.toThrow("Rate limited by YouTube");
  });

  it("should throw when ytInitialPlayerResponse marker is missing from HTML", async () => {
    mockRequest.mockRejectedValueOnce(new Error("InnerTube failed"));
    mockRequest.mockResolvedValueOnce({
      statusCode: 200,
      body: createMockBody("<html><body>No player response here</body></html>"),
    } as never);

    await expect(fetchTranscript("dQw4w9WgXcQ"))
      .rejects.toThrow("Could not find player response");
  });

  it("should throw when ytInitialPlayerResponse JSON has unmatched braces", async () => {
    mockRequest.mockRejectedValueOnce(new Error("InnerTube failed"));
    // Inject a response where the JSON object is never closed
    const html =
      '<html><script>var ytInitialPlayerResponse = {"captions": {</script></html>';
    mockRequest.mockResolvedValueOnce({
      statusCode: 200,
      body: createMockBody(html),
    } as never);

    await expect(fetchTranscript("dQw4w9WgXcQ"))
      .rejects.toThrow("Failed to extract player response JSON from HTML");
  });

  it("should throw when transcript XML format is unrecognized", async () => {
    mockRequest.mockResolvedValueOnce(
      createInnerTubeResponse([ENGLISH_TRACK]) as never,
    );
    mockRequest.mockResolvedValueOnce(
      createXmlResponse("<unknown><element/></unknown>") as never,
    );

    await expect(fetchTranscript("dQw4w9WgXcQ"))
      .rejects.toThrow("Failed to parse transcript XML");
  });

  it("should handle track name as plain string instead of simpleText object", async () => {
    const trackWithStringName = {
      baseUrl: "https://www.youtube.com/api/timedtext?v=xxx&lang=en",
      name: "English",
      languageCode: "en",
    };

    mockRequest.mockResolvedValueOnce(
      createInnerTubeResponse([trackWithStringName]) as never,
    );
    mockRequest.mockResolvedValueOnce(
      createXmlResponse(CLASSIC_XML) as never,
    );

    const result = await fetchTranscript("dQw4w9WgXcQ");
    expect(result.segments).toHaveLength(2);
  });

  it("should fall back to HTML scraping when InnerTube returns non-object JSON", async () => {
    // InnerTube returns a JSON array instead of an object
    mockRequest.mockResolvedValueOnce({
      statusCode: 200,
      body: createMockBody("[]"),
    } as never);
    mockRequest.mockResolvedValueOnce(
      createHtmlResponse([ENGLISH_TRACK]) as never,
    );
    mockRequest.mockResolvedValueOnce(
      createXmlResponse(CLASSIC_XML) as never,
    );

    const result = await fetchTranscript("dQw4w9WgXcQ");
    expect(result.segments).toHaveLength(2);
    expect(mockRequest).toHaveBeenCalledTimes(3);
  });
});

describe("readResponseText (via fetchTranscript)", () => {
  beforeEach(() => {
    mockRequest.mockReset();
  });

  it("should abort and throw when response body exceeds 5 MB", async () => {
    const oversizedBody = createOversizedBody(5 * 1024 * 1024 + 1);
    mockRequest.mockResolvedValueOnce({
      statusCode: 200,
      body: oversizedBody,
    } as never);

    await expect(fetchTranscript("dQw4w9WgXcQ"))
      .rejects.toThrow("Response body exceeds maximum allowed size");

    expect(oversizedBody.destroy).toHaveBeenCalled();
  });
});
