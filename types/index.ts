export interface Song {
  id: string;
  title: string;
  artist: string;
  thumbnail: string;
  duration?: string;
  category?: string;
  youtubeId: string;
}

export interface ScoreResult {
  pitch: number;
  timing: number;
  stability: number;
  total: number;
  rank: "S" | "A" | "B" | "C" | "D";
}

export interface QueueItem extends Song {
  queueId: string;
}

export interface YouTubeSearchResult {
  kind: string;
  etag: string;
  id: {
    kind: string;
    videoId: string;
  };
  snippet: {
    title: string;
    channelTitle: string;
    thumbnails: {
      medium: { url: string };
      high: { url: string };
    };
  };
}

export interface Category {
  id: string;
  label: string;
  query: string;
}
