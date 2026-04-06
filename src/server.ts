import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

import { version } from "../package.json" with { type: "json" };
import { fetchTranscript } from "./transcript.js";
import {
  extractVideoId,
  formatTranscriptPlain,
  formatTranscriptTimestamped,
} from "./utils.js";

/**
 * Error message prefixes considered safe to surface to the MCP client.
 * All other errors are replaced with a generic message to avoid leaking internals.
 */
const USER_SAFE_PREFIXES = [
  "No captions",
  "Invalid",
  "Could not extract",
  "Language ",
];

function sanitizeErrorMessage(message: string): string {
  const isSafe = USER_SAFE_PREFIXES.some((prefix) =>
    message.startsWith(prefix),
  );
  if (isSafe) {
    return message;
  }
  return "Failed to fetch transcript. Please check the video URL and try again.";
}

export function createServer(): McpServer {
  const server = new McpServer({
    name: "youtube-transcript",
    version,
  });

  server.registerTool(
    "get_transcript",
    {
      description:
        "Fetch the transcript of a YouTube video. " +
        "Accepts a YouTube URL or video ID. " +
        "Returns the transcript with timestamps by default.",
      inputSchema: {
        url: z
          .string()
          .max(2048)
          .describe("YouTube video URL or video ID"),
        lang: z
          .string()
          .regex(
            /^[a-zA-Z]{2,3}(-[a-zA-Z]{2,8})?$/,
            "Invalid language code format",
          )
          .max(10)
          .optional()
          .describe(
            "Language code (e.g. 'en', 'es'). " +
            "Defaults to the video's primary language.",
          ),
        plain: z
          .boolean()
          .optional()
          .describe(
            "When true, returns the transcript as plain text " +
            "without timestamps. Defaults to false.",
          ),
      },
    },
    async ({ url, lang, plain }) => {
      try {
        const videoId = extractVideoId(url);
        const transcriptResult = await fetchTranscript(videoId, lang);
        const text = plain
          ? formatTranscriptPlain(transcriptResult.segments)
          : formatTranscriptTimestamped(transcriptResult.segments);
        return {
          content: [{ type: "text" as const, text }],
        };
      } catch (error) {
        const rawMessage =
          error instanceof Error ? error.message : String(error);
        console.error("get_transcript error:", rawMessage);
        const message = sanitizeErrorMessage(rawMessage);
        return {
          content: [{ type: "text" as const, text: message }],
          isError: true,
        };
      }
    },
  );

  return server;
}
