import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

import { version } from "../package.json" with { type: "json" };
import { fetchTranscript } from "./transcript.js";
import {
  extractVideoId,
  formatTranscriptPlain,
  formatTranscriptTimestamped,
} from "./utils.js";

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
        const result = await fetchTranscript(videoId, lang);
        const text = plain
          ? formatTranscriptPlain(result.segments)
          : formatTranscriptTimestamped(result.segments);
        return {
          content: [{ type: "text" as const, text }],
        };
      } catch (error) {
        const message =
          error instanceof Error ? error.message : String(error);
        return {
          content: [{ type: "text" as const, text: message }],
          isError: true,
        };
      }
    },
  );

  return server;
}
