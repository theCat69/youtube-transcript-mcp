import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

import { fetchTranscript } from "./transcript.js";
import { extractVideoId } from "./utils.js";

export function createServer(): McpServer {
  const server = new McpServer({
    name: "youtube-transcript",
    version: "1.0.0",
  });

  server.registerTool(
    "get_transcript",
    {
      description:
        "Fetch the transcript of a YouTube video. " +
        "Accepts a YouTube URL or video ID. " +
        "Returns the full transcript as plain text.",
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
      },
    },
    async ({ url, lang }) => {
      try {
        const videoId = extractVideoId(url);
        const result = await fetchTranscript(videoId, lang);
        const text = result.segments.map((s) => s.text).join(" ");
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
