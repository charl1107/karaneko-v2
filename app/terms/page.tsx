export default function TermsOfService() {
  return (
    <div className="min-h-screen bg-zinc-950 text-white py-12">
      <div className="max-w-4xl mx-auto px-6">
        <h1 className="text-4xl font-bold mb-8 text-center bg-gradient-to-r from-pink-500 to-violet-500 bg-clip-text text-transparent">
          Terms of Service
        </h1>
        <div className="prose prose-invert max-w-none">
          <p className="text-zinc-400 mb-8">Last updated: May 2026</p>
          {/* Add full terms content here */}
          <h2 className="text-2xl font-semibold mt-10 mb-4">1. Acceptance of Terms</h2>
          <p>By using Karaneko, you agree to these terms.</p>
          {/* More sections */}
        </div>
      </div>
    </div>
  );
}