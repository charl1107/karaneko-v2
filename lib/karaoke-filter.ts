const REQUIRED_TERMS = [
  "karaoke",
  "instrumental",
  "backing track",
  "minus one",
];

const BLOCKED_TERMS = [
  "official music video",
  "official video",
  "music video",
  "live performance",
  "live session",
  "live version",
  "reaction",
  "cover by",
  "covered by",
  "interview",
  "trailer",
  "behind the scenes",
  "documentary",
  "dance practice",
  "choreography",
  "album version",
  "full album",
  "official audio",
  "official lyric",
  "lyrics video",
  "lyric video",
  "with vocals",
  "with vocal",
  "original vocals",
  "original vocal",
  "lead vocals",
  "lead vocal",
  "vocal guide",
  "guide vocal",
  "guide melody",
  "with voice",
  "vocal cover",
];

export function isKaraokeResult(title: string, channelTitle: string, description = "") {
  const haystack = `${title} ${channelTitle} ${description}`.toLowerCase();
  const titleText = title.toLowerCase();

  if (!REQUIRED_TERMS.some((term) => titleText.includes(term))) return false;
  if (BLOCKED_TERMS.some((term) => titleText.includes(term))) return false;
  if (titleText.includes("lyrics") && !titleText.includes("karaoke")) return false;
  if (haystack.includes("not karaoke")) return false;

  return true;
}
