export interface TranscriptSegment {
  text: string;
  start: number;
  duration: number;
}

export interface TranscriptResult {
  videoId: string;
  title?: string;
  segments: TranscriptSegment[];
}
