const MAX_INPUT_LENGTH = 2048;

export function extractVideoId(input: string): string {
  if (input.length > MAX_INPUT_LENGTH) {
    throw new Error("Input exceeds maximum allowed length");
  }

  // Handle direct 11-char video IDs
  if (/^[a-zA-Z0-9_-]{11}$/.test(input)) {
    return input;
  }

  const patterns = [
    /(?:youtube\.com\/watch\?.*v=)([a-zA-Z0-9_-]{11})/,
    /(?:youtu\.be\/)([a-zA-Z0-9_-]{11})/,
    /(?:youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
    /(?:youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/,
  ];

  for (const pattern of patterns) {
    const match = input.match(pattern);
    if (match) {
      return match[1];
    }
  }

  const truncated = input.length > 100 ? input.slice(0, 100) + "…" : input;
  throw new Error(`Could not extract video ID from: ${truncated}`);
}
