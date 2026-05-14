export const runtime = "edge";

import { NextRequest, NextResponse } from "next/server";
import { isKaraokeResult } from "@/lib/karaoke-filter";

const CATEGORY_QUERIES: Record<string, string> = {
  pop: "pop karaoke hits 2024",
  rock: "rock karaoke classics",
  kpop: "kpop karaoke BTS BLACKPINK",
  rnb: "R&B karaoke soul",
  opm: "OPM karaoke Filipino songs",
  classic: "classic karaoke oldies",
  hiphop: "hip hop karaoke rap",
  ballad: "ballad karaoke emotional",
};

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const category = searchParams.get("category")?.toLowerCase() || "pop";

  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "YouTube API key not configured" }, { status: 500 });
  }

  const query = CATEGORY_QUERIES[category] || `${category} karaoke`;

  try {
    const url = new URL("https://www.googleapis.com/youtube/v3/search");
    url.searchParams.set("part", "snippet");
    url.searchParams.set("q", `${query} instrumental OR "backing track"`);
    url.searchParams.set("type", "video");
    url.searchParams.set("maxResults", "24");
    url.searchParams.set("key", apiKey);

    const res = await fetch(url.toString(), { next: { revalidate: 3600 } });
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
      .slice(0, 12)
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
        category,
      }));

    return NextResponse.json({ songs });
  } catch {
    return NextResponse.json({
      songs: [],
      warning: "Category songs are temporarily unavailable.",
    });
  }
}
