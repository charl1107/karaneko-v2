import { Song } from "@/types";

type YouTubeSearchItem = {
  id: { videoId?: string };
  snippet: {
    title: string;
    channelTitle: string;
    thumbnails: { medium: { url: string }; high?: { url: string } };
  };
};

const KARAOKE_SIGNALS = [
  "karaoke",
  "instrumental",
  "backing track",
  "minus one",
  "piano karaoke",
  "acoustic karaoke",
  "sing along",
  "sing-along",
];

const NON_KARAOKE_SIGNALS = [
  "official music video",
  "official video",
  "official audio",
  "audio only",
  "lyrics video",
  "lyric video",
  "visualizer",
  "live performance",
  "live at",
  "reaction",
  "cover by",
  "full album",
  "sped up",
  "nightcore",
  "remix",
];

const TRUSTED_KARAOKE_CHANNEL_SIGNALS = [
  "karaoke",
  "sing king",
  "karafun",
  "zoom karaoke",
  "starmaker",
  "minus one",
];

export function buildStrictKaraokeQuery(query: string) {
  return `${query} karaoke instrumental backing track lyrics -\"official audio\" -\"official music video\" -\"music video\"`;
}

export function youtubeSearchLimit(desiredCount: string | number, multiplier = 3) {
  const parsed = Number(desiredCount);
  const target = Number.isFinite(parsed) && parsed > 0 ? parsed : 12;
  return String(Math.min(50, Math.max(target, target * multiplier)));
}

export function mapStrictKaraokeSongs(
  items: YouTubeSearchItem[] = [],
  category: string,
  limit: number
): Song[] {
  return items
    .filter((item) => Boolean(item.id.videoId))
    .map((item) => ({ item, score: karaokeConfidence(item) }))
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(({ item }) => ({
      id: item.id.videoId!,
      youtubeId: item.id.videoId!,
      title: decodeHtmlEntities(item.snippet.title),
      artist: decodeHtmlEntities(item.snippet.channelTitle),
      thumbnail:
        item.snippet.thumbnails.high?.url ||
        item.snippet.thumbnails.medium.url,
      category,
    }));
}

function karaokeConfidence(item: YouTubeSearchItem) {
  const title = normalize(item.snippet.title);
  const channel = normalize(item.snippet.channelTitle);
  const searchable = `${title} ${channel}`;

  const hasKaraokeSignal = KARAOKE_SIGNALS.some((signal) =>
    searchable.includes(signal)
  );
  const trustedKaraokeChannel = TRUSTED_KARAOKE_CHANNEL_SIGNALS.some((signal) =>
    channel.includes(signal)
  );
  const hasNonKaraokeSignal = NON_KARAOKE_SIGNALS.some((signal) =>
    title.includes(signal)
  );

  if (hasNonKaraokeSignal || (!hasKaraokeSignal && !trustedKaraokeChannel)) {
    return 0;
  }

  let score = 10;
  if (title.includes("karaoke")) score += 35;
  if (title.includes("instrumental")) score += 20;
  if (title.includes("backing track")) score += 20;
  if (title.includes("minus one")) score += 18;
  if (title.includes("piano karaoke")) score += 8;
  if (trustedKaraokeChannel) score += 25;
  if (title.includes("guide melody")) score += 5;
  if (title.includes("lower key") || title.includes("higher key")) score += 4;
  if (title.includes("official")) score -= 30;

  return Math.max(0, score);
}

function normalize(value: string) {
  return value
    .toLowerCase()
    .replace(/&amp;/g, "&")
    .replace(/[()[\]{}]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function decodeHtmlEntities(value: string) {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, "\"")
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}
