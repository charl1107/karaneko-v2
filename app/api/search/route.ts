export const runtime = "edge";

import { NextRequest, NextResponse } from "next/server";
import { isKaraokeResult } from "@/lib/karaoke-filter";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q");
  const maxResults = searchParams.get("maxResults") || "12";
  const requestedCount = Math.max(parseInt(maxResults, 10) || 12, 12);

  if (!query) {
    return NextResponse.json({ error: "Query is required" }, { status: 400 });
  }

  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "YouTube API key not configured" },
      { status: 500 }
    );
  }

  try {
    const url = new URL("https://www.googleapis.com/youtube/v3/search");
    url.searchParams.set("part", "snippet");
    url.searchParams.set("q", `${query} karaoke OR instrumental OR "backing track"`);
    url.searchParams.set("type", "video");
    url.searchParams.set("maxResults", String(Math.min(requestedCount * 2, 25)));
    url.searchParams.set("videoCategoryId", "10"); // Music category
    url.searchParams.set("key", apiKey);

    const res = await fetch(url.toString(), { next: { revalidate: 3600 } });

    if (!res.ok) {
      const err = await res.json();
      return NextResponse.json(
        { error: err.error?.message || "YouTube API error" },
        { status: res.status }
      );
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
      .slice(0, requestedCount)
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
        category: "Search Result",
      }));

    return NextResponse.json({ songs });
  } catch {
    return NextResponse.json({
      songs: [],
      warning: "YouTube search is temporarily unavailable.",
    });
  }
}
