import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Privacy Policy | Karaneko',
  description: 'Karaneko Privacy Policy',
};

export default function PrivacyPolicy() {
  return (
    <div className="max-w-3xl mx-auto px-6 py-12 prose dark:prose-invert">
      <h1 className="text-4xl font-bold mb-8">Privacy Policy</h1>
      <p className="text-sm text-gray-500 mb-8">Last updated: May 14, 2026</p>

      <h2>1. Information We Collect</h2>
      <ul>
        <li>Email address and account information</li>
        <li>Singing scores and performance history</li>
        <li>Room participation and chat messages (in party rooms)</li>
        <li>Technical data (device, browser, IP for security)</li>
      </ul>

      <h2>2. How We Use Your Information</h2>
      <p>We use your data to provide the karaoke service, calculate rankings, improve the app, and maintain security.</p>

      <h2>3. Data Sharing</h2>
      <p>We do not sell your personal data. We may share anonymized data for analytics.</p>

      <h2>4. Your Rights</h2>
      <p>You can request deletion of your account and data at any time via the Contact page.</p>

      <h2>5. Cookies & Local Storage</h2>
      <p>We use cookies for authentication and local storage for preferences and offline features.</p>

      <p className="mt-10 text-sm text-gray-500">
        For questions, please visit our <a href="/contact" className="underline">Contact page</a>.
      </p>
    </div>
  );
}
