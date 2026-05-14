// app/terms/page.tsx
export default function TermsOfService() {
  return (
    <div className="max-w-3xl mx-auto px-6 py-12 prose dark:prose-invert">
      <h1 className="text-4xl font-bold mb-8">Terms of Service</h1>
      <p className="text-sm text-gray-500 mb-8">Last updated: May 14, 2026</p>

      <h2>1. Acceptance of Terms</h2>
      <p>By using Karaneko, you agree to these terms.</p>

      <h2>2. User Conduct</h2>
      <ul>
        <li>You must not upload harmful content or harass other users.</li>
        <li>Respect copyright when using YouTube videos.</li>
        <li>Do not attempt to abuse or overload the service.</li>
      </ul>

      <h2>3. Account Termination</h2>
      <p>We reserve the right to suspend or terminate accounts that violate these terms.</p>

      <h2>4. Disclaimer</h2>
      <p>The service is provided "as is". We are not responsible for any data loss or service interruptions.</p>
    </div>
  );
}
