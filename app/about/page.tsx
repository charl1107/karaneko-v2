import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'About Karaneko | Karaoke App',
};

export default function About() {
  return (
    <div className="max-w-3xl mx-auto px-6 py-12 prose dark:prose-invert">
      <h1 className="text-4xl font-bold mb-6">About Karaneko</h1>
      
      <p className="text-xl text-gray-600 dark:text-gray-400">
        Karaneko v2 is a modern, full-featured online karaoke platform built for real KTV experience.
      </p>

      <h2>Features</h2>
      <ul>
        <li>Real-time pitch scoring with mic input</li>
        <li>Synced lyrics with YouTube videos</li>
        <li>Multiplayer Party Rooms</li>
        <li>Mobile-first KTV Mode</li>
        <li>Global leaderboard & rankings</li>
        <li>Favorites and singing history</li>
      </ul>

      <p>
        Built with Next.js 15, Cloudflare, and Web Audio API. 
        Designed to bring the classic karaoke experience to your browser.
      </p>
    </div>
  );
}
