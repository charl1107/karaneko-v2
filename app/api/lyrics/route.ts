export const runtime = "edge";

import { NextRequest, NextResponse } from "next/server";

export interface LyricLine {
  time: number; // seconds
  text: string;
}

interface LrcLibResult {
  syncedLyrics?: string | null;
  plainLyrics?: string | null;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const title = searchParams.get("title");
  const artist = searchParams.get("artist");

  if (!title || !artist) {
    return NextResponse.json({ error: "title and artist required" }, { status: 400 });
  }

  try {
    const results = await findLyrics(title, artist);
    if (!results.length) return NextResponse.json({ lyrics: [] });

    const best = results.find((r) => r.syncedLyrics) || results.find((r) => r.plainLyrics) || results[0];

    if (best?.syncedLyrics) {
      const lyrics = parseLRC(best.syncedLyrics);
      return NextResponse.json({ lyrics, plain: best.plainLyrics || null });
    }

    // Fallback: plain lyrics, no timestamps
    if (best?.plainLyrics) {
      return NextResponse.json({ lyrics: [], plain: best.plainLyrics });
    }

    return NextResponse.json({ lyrics: [] });
  } catch {
    return NextResponse.json({ lyrics: [] });
  }
}

async function findLyrics(title: string, artist: string): Promise<LrcLibResult[]> {
  const cleanTrack = cleanTitle(title);
  const cleanArtistName = cleanArtist(artist);
  const urls: URL[] = [];

  const exact = new URL("https://lrclib.net/api/get");
  exact.searchParams.set("track_name", cleanTrack);
  exact.searchParams.set("artist_name", cleanArtistName);
  urls.push(exact);

  const searchWithArtist = new URL("https://lrclib.net/api/search");
  searchWithArtist.searchParams.set("track_name", cleanTrack);
  searchWithArtist.searchParams.set("artist_name", cleanArtistName);
  urls.push(searchWithArtist);

  const broadSearch = new URL("https://lrclib.net/api/search");
  broadSearch.searchParams.set("q", `${cleanTrack} ${cleanArtistName}`.trim());
  urls.push(broadSearch);

  for (const url of urls) {
    const res = await fetch(url.toString(), {
      headers: { "User-Agent": "Karaneko/1.0 (https://karaneko.app)" },
      next: { revalidate: 86400 },
    });

    if (!res.ok) continue;

    const data = await res.json();
    const results = Array.isArray(data) ? data : [data];
    const usable = results.filter((item: LrcLibResult) => item?.syncedLyrics || item?.plainLyrics);
    if (usable.length) return usable;
  }

  return [];
}

function cleanTitle(value: string): string {
  return value
    .replace(/\([^)]*(official|video|audio|lyrics?|karaoke|mv|hd|4k)[^)]*\)/gi, "")
    .replace(/\[[^\]]*(official|video|audio|lyrics?|karaoke|mv|hd|4k)[^\]]*\]/gi, "")
    .replace(/\b(official|music|video|audio|lyrics?|karaoke|mv|hd|4k)\b/gi, "")
    .replace(/\s+/g, " ")
    .trim();
}

function cleanArtist(value: string): string {
  return value
    .replace(/\b(feat\.?|ft\.?|featuring)\b.*$/i, "")
    .replace(/\s+(x|&)\s+.*$/i, "")
    .replace(/\s+/g, " ")
    .trim();
}

function parseLRC(lrc: string): LyricLine[] {
  const lines = lrc.split("\n");
  const result: LyricLine[] = [];
  const timeRegex = /\[(\d{2}):(\d{2})\.(\d{2,3})\]/g;

  for (const line of lines) {
    const matches = [...line.matchAll(timeRegex)];
    if (!matches.length) continue;

    const text = line.replace(timeRegex, "").trim();
    if (!text) continue;

    for (const match of matches) {
      const minutes = parseInt(match[1]);
      const seconds = parseInt(match[2]);
      const fraction = match[3].padEnd(3, "0").slice(0, 3);
      const milliseconds = parseInt(fraction);
      const time = minutes * 60 + seconds + milliseconds / 1000;
      result.push({ time, text });
    }
  }

  return result.sort((a, b) => a.time - b.time);
}
