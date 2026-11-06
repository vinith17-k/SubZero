export default function PrivacyPage() {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--sz-bg)', padding: '80px 24px' }}>
      <div style={{ maxWidth: 680, margin: '0 auto' }}>
        <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 36, fontWeight: 900, color: '#0A0A0A', marginBottom: 8 }}>
          Privacy Policy
        </div>
        <div style={{ fontSize: 13, color: 'var(--sz-gray-500)', marginBottom: 48 }}>Last updated: November 2026</div>

        {[
          {
            title: 'What we collect',
            body: 'SubZero collects only the information you provide: your email address, password (hashed, never stored in plain text), and the subscription data you manually enter. We do not connect to your bank, email, or any third-party service without your explicit action.',
          },
          {
            title: 'How we use it',
            body: 'Your data is used solely to provide the SubZero service — storing your subscriptions, generating insights, and sending renewal reminders you opt into. We do not sell, rent, or share your data with any third party for advertising or analytics purposes.',
          },
          {
            title: 'Data storage',
            body: 'Your data is stored in Supabase (PostgreSQL), hosted on AWS infrastructure in the ap-south-1 (Mumbai) region. All data is encrypted at rest and in transit using TLS 1.2+.',
          },
          {
            title: 'Demo Mode',
            body: 'If you use Demo Mode, all data remains entirely in your browser\'s local storage. Nothing is sent to our servers. Clearing your browser data will erase all demo data.',
          },
          {
            title: 'Your rights',
            body: 'You may request deletion of your account and all associated data at any time by emailing us. We will process deletion requests within 7 business days.',
          },
          {
            title: 'Contact',
            body: 'For privacy-related questions, contact us at privacy@subzero.app.',
          },
        ].map((s, i) => (
          <div key={i} style={{ marginBottom: 36 }}>
            <div style={{ fontSize: 18, fontWeight: 700, color: '#0A0A0A', marginBottom: 10 }}>{s.title}</div>
            <div style={{ fontSize: 15, lineHeight: 1.75, color: '#4A4A44' }}>{s.body}</div>
          </div>
        ))}

        <div style={{ borderTop: '1px solid var(--sz-gray-200)', paddingTop: 24, marginTop: 24 }}>
          <a href="/" style={{ color: 'var(--sz-accent)', fontSize: 14, fontWeight: 600, textDecoration: 'none' }}>Back to SubZero</a>
        </div>
      </div>
    </div>
  );
}
