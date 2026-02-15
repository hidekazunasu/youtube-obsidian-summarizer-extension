export class NoTranscriptError extends Error {
  constructor(message = 'Transcript unavailable for this video.') {
    super(message);
    this.name = 'NoTranscriptError';
  }
}
