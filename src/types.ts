export interface TranscriptSegment {
  text: string;
  start: number;
  duration: number;
}

export interface TranscriptResult {
  videoId: string;
  segments: TranscriptSegment[];
}

export interface CaptionTrack {
  baseUrl: string;
  languageCode: string;
  name: string;
  kind?: string; // "asr" = auto-generated
}
