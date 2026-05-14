// components/layout/Footer.tsx
import Link from 'next/link';
import { Mic } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="bg-zinc-950 border-t border-zinc-800 mt-auto">
      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 bg-gradient-to-br from-pink-500 to-violet-500 rounded-xl flex items-center justify-center">
                <Mic className="w-4 h-4 text-white" />
              </div>
              <span className="text-2xl font-bold">karaneko</span>
            </div>
            <p className="text-sm text-gray-400 max-w-xs">
              Modern online karaoke platform. Sing together. Compete globally.
            </p>
          </div>

          {/* Product */}
          <div>
            <h3 className="font-semibold mb-4 text-white">Product</h3>
            <div className="flex flex-col gap-3 text-sm text-gray-400">
              <Link href="/search" className="hover:text-white transition">Search Songs</Link>
              <Link href="/rooms" className="hover:text-white transition">Party Rooms</Link>
              <Link href="/leaderboard" className="hover:text-white transition">Leaderboard</Link>
            </div>
          </div>

          {/* Company */}
          <div>
            <h3 className="font-semibold mb-4 text-white">Company</h3>
            <div className="flex flex-col gap-3 text-sm text-gray-400">
              <Link href="/about" className="hover:text-white transition">About Us</Link>
              <Link href="/contact" className="hover:text-white transition">Contact</Link>
            </div>
          </div>

          {/* Legal */}
          <div>
            <h3 className="font-semibold mb-4 text-white">Legal</h3>
            <div className="flex flex-col gap-3 text-sm text-gray-400">
              <Link href="/privacy" className="hover:text-white transition">Privacy Policy</Link>
              <Link href="/terms" className="hover:text-white transition">Terms of Service</Link>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-zinc-800 mt-12 pt-8 text-center text-xs text-gray-500">
          © {new Date().getFullYear()} Karaneko. All rights reserved.
          <p className="mt-1">Built with ❤️ for karaoke lovers worldwide.</p>
        </div>
      </div>
    </footer>
  );
}
