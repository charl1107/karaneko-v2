export const runtime = "edge";

import { NextResponse } from "next/server";
import { isKaraokeResult } from "@/lib/karaoke-filter";

const TRENDING_QUERIES = [
  "Taylor Swift karaoke",
  "BTS karaoke",
  "Ed Sheeran karaoke",
  "Olivia Rodrigo karaoke",
];

export async function GET() {
  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "YouTube API key not configured" },
      { status: 500 }
    );
  }

  try {
    const query = TRENDING_QUERIES[Math.floor(Math.random() * TRENDING_QUERIES.length)];
    const url = new URL("https://www.googleapis.com/youtube/v3/search");
    url.searchParams.set("part", "snippet");
    url.searchParams.set("q", `${query} instrumental OR "backing track"`);
    url.searchParams.set("type", "video");
    url.searchParams.set("maxResults", "16");
    url.searchParams.set("order", "viewCount");
    url.searchParams.set("key", apiKey);

    const res = await fetch(url.toString(), { next: { revalidate: 7200 } });

    if (!res.ok) {
      return NextResponse.json({ error: "YouTube API error" }, { status: res.status });
    }

    const data = await res.json();

    const songs = data.items
      .filter((item: { id: { videoId?: string } }) => item.id.videoId)
      .filter((item: {
        snippet: {
          title: string;
          channelTitle: string;
          description?: string;
        };
      }) => isKaraokeResult(item.snippet.title, item.snippet.channelTitle, item.snippet.description || ""))
      .slice(0, 8)
      .map((item: {
        id: { videoId: string };
        snippet: {
          title: string;
          channelTitle: string;
          thumbnails: { medium: { url: string }; high?: { url: string } };
        };
      }) => ({
        id: item.id.videoId,
        youtubeId: item.id.videoId,
        title: item.snippet.title,
        artist: item.snippet.channelTitle,
        thumbnail:
          item.snippet.thumbnails.high?.url ||
          item.snippet.thumbnails.medium.url,
        category: "Trending",
      }));

    return NextResponse.json({ songs });
  } catch {
    return NextResponse.json({
      songs: [],
      warning: "Trending songs are temporarily unavailable.",
    });
  }
}
