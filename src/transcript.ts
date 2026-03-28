import { request } from "undici";
import type { Dispatcher } from "undici";

import type {
  CaptionTrack,
  TranscriptResult,
  TranscriptSegment,
} from "./types.js";

const INNERTUBE_URL =
  "https://www.youtube.com/youtubei/v1/player?prettyPrint=false";

const ANDROID_USER_AGENT =
  "com.google.android.youtube/20.10.38 (Linux; U; Android 14)";

const BROWSER_USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36";

const REQUEST_TIMEOUT_MS = 10_000;
const MAX_RESPONSE_SIZE = 5 * 1024 * 1024; // 5MB

/**
 * Read response body text with a size limit to prevent memory exhaustion.
 */
async function readResponseText(
  body: Dispatcher.ResponseData["body"],
  maxSize: number = MAX_RESPONSE_SIZE,
): Promise<string> {
  const chunks: Buffer[] = [];
  let totalSize = 0;
  for await (const chunk of body) {
    totalSize += chunk.length;
    if (totalSize > maxSize) {
      // Destroy the stream to free resources
      body.destroy();
      throw new Error("Response body exceeds maximum allowed size");
    }
    chunks.push(Buffer.from(chunk));
  }
  return Buffer.concat(chunks).toString("utf-8");
}

/**
 * Decode HTML entities in transcript text.
 */
export function decodeHtmlEntities(text: string): string {
  let decoded = text;

  // Strip HTML tags first (before entity decoding to avoid
  // decoded < and > being treated as tag delimiters)
  decoded = decoded.replace(/<[^>]+>/g, "");

  // Decode &amp; LAST to avoid double-decoding (e.g., &amp;lt; → &lt; → <)
  decoded = decoded.replace(/&lt;/g, "<");
  decoded = decoded.replace(/&gt;/g, ">");
  decoded = decoded.replace(/&quot;/g, "\"");
  decoded = decoded.replace(/&#39;/g, "'");
  decoded = decoded.replace(/&apos;/g, "'");

  // Numeric entities before &amp; to avoid double-decode
  decoded = decoded.replace(/&#(\d+);/g, (_match, digits: string) =>
    String.fromCharCode(parseInt(digits, 10)),
  );
  decoded = decoded.replace(/&#x([0-9a-fA-F]+);/g, (_match, hex: string) =>
    String.fromCharCode(parseInt(hex, 16)),
  );

  // &amp; decoded last
  decoded = decoded.replace(/&amp;/g, "&");

  // Handle literal \n in captions
  decoded = decoded.replace(/\n/g, " ");

  return decoded;
}

/**
 * Validate that a URL hostname is safe (belongs to YouTube/Google).
 */
function validateTranscriptUrl(url: string): void {
  const parsed = new URL(url);

  if (parsed.protocol !== "https:") {
    throw new Error(
      `Untrusted transcript URL protocol: ${parsed.protocol}`,
    );
  }

  const hostname = parsed.hostname.toLowerCase();
  const ALLOWED_HOSTNAMES = [
    "www.youtube.com",
    "youtube.com",
    "video.google.com",
    "www.google.com",
  ];
  const ALLOWED_SUFFIXES = [
    ".youtube.com",
    ".google.com",
  ];

  const isAllowed = ALLOWED_HOSTNAMES.includes(hostname) ||
    ALLOWED_SUFFIXES.some((suffix) => hostname.endsWith(suffix));

  if (!isAllowed) {
    throw new Error(
      `Untrusted transcript URL hostname: ${hostname}`,
    );
  }
}

/**
 * Extract caption tracks from a raw player response object.
 */
function extractCaptionTracks(
  playerResponse: unknown,
): CaptionTrack[] {
  if (
    typeof playerResponse !== "object" ||
    playerResponse === null
  ) {
    return [];
  }

  const resp = playerResponse as Record<string, unknown>;
  const captions = resp["captions"];
  if (typeof captions !== "object" || captions === null) {
    return [];
  }

  const captionsObj = captions as Record<string, unknown>;
  const renderer = captionsObj["playerCaptionsTracklistRenderer"];
  if (typeof renderer !== "object" || renderer === null) {
    return [];
  }

  const rendererObj = renderer as Record<string, unknown>;
  const rawTracks = rendererObj["captionTracks"];
  if (!Array.isArray(rawTracks)) {
    return [];
  }

  const tracks: CaptionTrack[] = [];
  for (const raw of rawTracks) {
    if (typeof raw !== "object" || raw === null) {
      continue;
    }
    const track = raw as Record<string, unknown>;
    const baseUrl = track["baseUrl"];
    const languageCode = track["languageCode"];
    const nameObj = track["name"];
    const kind = track["kind"];

    if (typeof baseUrl !== "string" || typeof languageCode !== "string") {
      continue;
    }

    let name = "";
    if (typeof nameObj === "string") {
      name = nameObj;
    } else if (
      typeof nameObj === "object" &&
      nameObj !== null &&
      "simpleText" in nameObj
    ) {
      const nameRecord = nameObj as Record<string, unknown>;
      name = typeof nameRecord["simpleText"] === "string"
        ? nameRecord["simpleText"]
        : "";
    }

    tracks.push({
      baseUrl,
      languageCode,
      name,
      kind: typeof kind === "string" ? kind : undefined,
    });
  }

  return tracks;
}

/**
 * Fetch caption tracks using the InnerTube ANDROID API.
 */
async function fetchCaptionTracksInnerTube(
  videoId: string,
): Promise<CaptionTrack[]> {
  const body = JSON.stringify({
    context: {
      client: {
        clientName: "ANDROID",
        clientVersion: "20.10.38",
        hl: "en",
      },
    },
    videoId,
  });

  const { statusCode, body: responseBody } = await request(INNERTUBE_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "User-Agent": ANDROID_USER_AGENT,
    },
    body,
    headersTimeout: REQUEST_TIMEOUT_MS,
    bodyTimeout: REQUEST_TIMEOUT_MS,
  });

  if (statusCode !== 200) {
    throw new Error(
      `InnerTube API returned status ${statusCode}`,
    );
  }

  const responseText = await readResponseText(responseBody);
  const playerResponse: unknown = JSON.parse(responseText);

  return extractCaptionTracks(playerResponse);
}

/**
 * Fetch caption tracks by scraping the YouTube watch page HTML.
 */
async function fetchCaptionTracksHtml(
  videoId: string,
): Promise<CaptionTrack[]> {
  const url = `https://www.youtube.com/watch?v=${videoId}`;

  const { statusCode, body: responseBody } = await request(url, {
    method: "GET",
    headers: {
      "User-Agent": BROWSER_USER_AGENT,
      "Accept-Language": "en-US,en;q=0.9",
    },
    headersTimeout: REQUEST_TIMEOUT_MS,
    bodyTimeout: REQUEST_TIMEOUT_MS,
  });

  if (statusCode !== 200) {
    throw new Error(
      `YouTube watch page returned status ${statusCode}`,
    );
  }

  const html = await readResponseText(responseBody);

  // Check for rate limiting
  if (html.includes("class=\"g-recaptcha\"")) {
    throw new Error(
      "Rate limited by YouTube — CAPTCHA challenge detected",
    );
  }

  // Find ytInitialPlayerResponse
  const marker = "var ytInitialPlayerResponse = ";
  const startIdx = html.indexOf(marker);
  if (startIdx === -1) {
    throw new Error(
      "Could not find player response in YouTube page HTML",
    );
  }

  const jsonStart = startIdx + marker.length;

  // Match braces to find the end of the JSON object
  let braceCount = 0;
  let jsonEnd = jsonStart;
  for (let i = jsonStart; i < html.length; i++) {
    if (html[i] === "{") {
      braceCount++;
    } else if (html[i] === "}") {
      braceCount--;
      if (braceCount === 0) {
        jsonEnd = i + 1;
        break;
      }
    }
  }

  if (braceCount !== 0) {
    throw new Error(
      "Failed to extract player response JSON from HTML",
    );
  }

  const jsonStr = html.slice(jsonStart, jsonEnd);
  const playerResponse: unknown = JSON.parse(jsonStr);

  return extractCaptionTracks(playerResponse);
}

/**
 * Select the best caption track based on language preference.
 */
function selectCaptionTrack(
  tracks: CaptionTrack[],
  lang?: string,
): CaptionTrack {
  if (tracks.length === 0) {
    throw new Error("No captions available for this video");
  }

  if (lang) {
    const match = tracks.find((t) => t.languageCode === lang);
    if (!match) {
      const available = tracks
        .map((t) => `${t.languageCode} (${t.name})`)
        .join(", ");
      throw new Error(
        `Language "${lang}" not available. Available: ${available}`,
      );
    }
    return match;
  }

  // Prefer non-ASR (manual) track, fall back to ASR
  const manual = tracks.find((t) => t.kind !== "asr");
  return manual ?? tracks[0];
}

/**
 * Parse classic XML transcript format:
 * <text start="1.23" dur="4.56">encoded text</text>
 */
function parseClassicXml(xml: string): TranscriptSegment[] {
  const segments: TranscriptSegment[] = [];
  const regex = /<text start="([^"]*)" dur="([^"]*)"[^>]*>([\s\S]*?)<\/text>/g;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(xml)) !== null) {
    const start = parseFloat(match[1]);
    const duration = parseFloat(match[2]);
    const text = decodeHtmlEntities(match[3]);

    segments.push({ text, start, duration });
  }

  return segments;
}

/**
 * Parse srv3 XML transcript format:
 * <p t="1230" d="4560"><s>word</s>...</p>
 */
function parseSrv3Xml(xml: string): TranscriptSegment[] {
  const segments: TranscriptSegment[] = [];
  const regex = /<p t="([^"]*)" d="([^"]*)"[^>]*>([\s\S]*?)<\/p>/g;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(xml)) !== null) {
    const t = parseInt(match[1], 10);
    const d = parseInt(match[2], 10);
    const rawText = match[3];

    // Strip <s> tags and decode
    const text = decodeHtmlEntities(rawText);

    segments.push({
      text,
      start: t / 1000,
      duration: d / 1000,
    });
  }

  return segments;
}

/**
 * Parse transcript XML, handling both classic and srv3 formats.
 */
function parseTranscriptXml(xml: string): TranscriptSegment[] {
  // Try classic format first
  const classicSegments = parseClassicXml(xml);
  if (classicSegments.length > 0) {
    return classicSegments;
  }

  // Try srv3 format
  const srv3Segments = parseSrv3Xml(xml);
  if (srv3Segments.length > 0) {
    return srv3Segments;
  }

  throw new Error("Failed to parse transcript XML — unrecognized format");
}

/**
 * Fetch and parse the transcript for a YouTube video.
 */
export async function fetchTranscript(
  videoId: string,
  lang?: string,
): Promise<TranscriptResult> {
  // Step 1: Get caption tracks (try InnerTube first, then HTML fallback)
  let tracks: CaptionTrack[];
  let innerTubeError: Error | undefined;
  let htmlError: Error | undefined;

  try {
    tracks = await fetchCaptionTracksInnerTube(videoId);
  } catch (error) {
    innerTubeError = error instanceof Error
      ? error
      : new Error(String(error));
    tracks = [];
  }

  if (tracks.length === 0) {
    try {
      tracks = await fetchCaptionTracksHtml(videoId);
    } catch (error) {
      htmlError = error instanceof Error
        ? error
        : new Error(String(error));
    }
  }

  if (tracks.length === 0) {
    if (innerTubeError && htmlError) {
      throw new Error(
        `No captions available. InnerTube: ${innerTubeError.message}. ` +
        `HTML fallback: ${htmlError.message}`,
      );
    }
    throw new Error("No captions available for this video");
  }

  // Step 2: Select track
  const track = selectCaptionTrack(tracks, lang);

  // Step 3: Fetch transcript XML
  validateTranscriptUrl(track.baseUrl);

  const { statusCode, body: xmlBody } = await request(track.baseUrl, {
    method: "GET",
    headersTimeout: REQUEST_TIMEOUT_MS,
    bodyTimeout: REQUEST_TIMEOUT_MS,
  });

  if (statusCode !== 200) {
    throw new Error(
      `Failed to fetch transcript XML (status ${statusCode})`,
    );
  }

  const xml = await readResponseText(xmlBody);

  // Step 4: Parse XML
  const segments = parseTranscriptXml(xml);

  // Step 5: Build result
  return {
    videoId,
    segments,
  };
}
