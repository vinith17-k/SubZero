import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

export default function LandingPage() {
  const navigate = useNavigate();
  const observerRef = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) entry.target.classList.add('sz-visible');
        });
      },
      { threshold: 0.15 }
    );
    document.querySelectorAll('.sz-reveal').forEach(el => observerRef.current?.observe(el));
    return () => observerRef.current?.disconnect();
  }, []);

  return (
    <div style={{ background: 'var(--sz-bg)', minHeight: '100vh' }}>
      {/* Background SVG lines */}
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0, overflow: 'hidden' }}>
        <svg viewBox="0 0 1440 900" preserveAspectRatio="xMidYMid slice" fill="none" style={{ width: '100%', height: '100%' }}>
          <path d="M-100 600 Q 300 400 700 500 Q 1100 600 1500 300" stroke="#0A0A0A" strokeWidth="0.5" opacity="0.07" />
          <path d="M-100 700 Q 400 500 800 600 Q 1200 700 1600 400" stroke="#0A0A0A" strokeWidth="0.5" opacity="0.05" />
          <circle cx="1200" cy="150" r="300" stroke="#0A0A0A" strokeWidth="0.5" opacity="0.04" />
          <circle cx="100" cy="800" r="250" stroke="#0A0A0A" strokeWidth="0.5" opacity="0.04" />
        </svg>
      </div>

      {/* NAV */}
      <nav className="sz-nav" style={{ position: 'fixed', zIndex: 1000 }}>
        <div className="sz-nav-logo" onClick={() => window.scrollTo(0, 0)}>
          <div className="sz-nav-logo-mark">
            <svg viewBox="0 0 16 16" style={{ width: 16, height: 16, fill: 'white' }}>
              <path d="M8 2L14 5.5V10.5L8 14L2 10.5V5.5L8 2Z" />
            </svg>
          </div>
          SubZero
        </div>
        <ul className="sz-nav-links">
          <li><a href="#features">Features</a></li>
          <li><a href="#how-it-works">How it works</a></li>
          <li><a href="#insights">Insights</a></li>
        </ul>
        <button className="sz-nav-cta" onClick={() => navigate('/auth')}>Get Started Free</button>
      </nav>

      <div style={{ position: 'relative', zIndex: 1, paddingTop: 80 }}>
        {/* HERO */}
        <div className="sz-hero">
          <div>
            <div className="sz-hero-badge sz-fade-in sz-fade-in-1">Subscription Intelligence ✦</div>
            <h1 className="sz-hero-title sz-fade-in sz-fade-in-2">
              Track What<br />You Pay <em>vs</em><br />What You Use
            </h1>
            <p className="sz-hero-sub sz-fade-in sz-fade-in-3">
              Most people unknowingly waste thousands per year on forgotten, overlapping, or underused subscriptions. SubZero gives you total clarity.
            </p>
            <div className="sz-hero-ctas sz-fade-in sz-fade-in-4">
              <button className="sz-btn-primary" onClick={() => navigate('/auth')}>Start for Free →</button>
              <button className="sz-btn-secondary" onClick={() => navigate('/auth')}>See Demo ↗</button>
            </div>
          </div>

          <div className="sz-hero-preview sz-fade-in sz-fade-in-4">
            <div className="sz-float-card sz-float-card-1">
              <div className="sz-float-dot" />
              ₹3,200 wasted this month
            </div>
            <div className="sz-preview-card">
              <div style={{ padding: '20px 24px', borderBottom: '1px solid #F0EFEC', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: '#8A8A82', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Monthly Overview</span>
                <span style={{ fontSize: 12, color: '#8A8A82' }}>Apr 2025</span>
              </div>
              <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 36, fontWeight: 900, color: '#0A0A0A', padding: '20px 24px 8px' }}>₹8,490</div>
              <div style={{ fontSize: 13, color: '#8A8A82', padding: '0 24px 16px' }}>Total subscription spend</div>
              <div style={{ padding: '16px 24px', display: 'flex', gap: 6, alignItems: 'flex-end', height: 80 }}>
                {[35, 55, 42, 68, 52, 75, 60].map((h, i) => (
                  <div key={i} style={{ flex: 1, height: h, background: i === 6 ? '#0A0A0A' : '#E2E1DC', borderRadius: '4px 4px 0 0' }} />
                ))}
              </div>
              <div style={{ padding: '16px 24px 20px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                {[
                  { icon: 'YT', bg: '#FF0000', name: 'YouTube Premium', freq: 'Monthly · Active', cost: '₹189', textColor: 'white', textSize: '11px' },
                  { icon: '♪', bg: '#1DB954', name: 'Spotify', freq: 'Monthly · Low Usage', cost: '₹119', textColor: 'black', textSize: '16px' },
                  { icon: 'N', bg: '#E50914', name: 'Netflix', freq: 'Monthly · Unused', cost: '₹649', textColor: 'white', textSize: '14px' },
                ].map((s, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: '#F0EFEC', borderRadius: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ width: 28, height: 28, borderRadius: 8, background: s.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: s.textSize, fontWeight: 700, color: s.textColor }}>{s.icon}</div>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 600 }}>{s.name}</div>
                        <div style={{ fontSize: 11, color: '#8A8A82' }}>{s.freq}</div>
                      </div>
                    </div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: i === 2 ? '#dc2626' : '#0A0A0A' }}>{s.cost}</div>
                  </div>
                ))}
              </div>
            </div>
            <div className="sz-float-card sz-float-card-2">💰 Save ₹1,890/mo</div>
          </div>
        </div>

        {/* LOGOS STRIP */}
        <div className="sz-logos-strip sz-reveal">
          <div className="sz-logos-label">Tracks subscriptions from</div>
          <div className="sz-logos-row">
            {[
              { dot: '#E50914', text: 'Netflix', icon: 'N' },
              { dot: '#1DB954', text: 'Spotify', icon: '♪' },
              { dot: '#FF0000', text: 'Adobe', icon: '🅰' },
              { dot: '#0078D4', text: 'Microsoft', icon: 'M' },
              { dot: '#000', text: 'Notion', icon: 'N' },
              { dot: '#F24E1E', text: 'Figma', icon: 'F' },
              { dot: '#4A154B', text: 'Slack', icon: 'S' },
            ].map((l, i) => (
              <div key={i} className="sz-logo-item">
                <div className="sz-logo-dot" style={{ background: l.dot }}>{l.icon}</div>
                <span className="sz-logo-text">{l.text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* INSIGHTS SPLIT */}
        <div className="sz-section" id="insights">
          <div className="sz-split-layout">
            <div className="sz-reveal">
              <span className="sz-section-label">Real Intelligence</span>
              <h2 className="sz-section-title">Know exactly what you're <em style={{ color: 'var(--sz-accent)', fontStyle: 'italic' }}>paying for</em></h2>
              <p style={{ fontSize: 16, lineHeight: 1.7, color: '#4A4A44', marginBottom: 24 }}>SubZero connects your spending patterns with your actual usage. Not just what you're subscribed to — but whether you're actually using it.</p>
              <p style={{ fontSize: 14, lineHeight: 1.7, color: '#8A8A82' }}>Our AI scans your subscription stack weekly, identifies patterns, detects overlap, and surfaces specific cancellation recommendations with clear reasoning.</p>
            </div>
            <div className="sz-reveal sz-reveal-delay-2">
              <div className="sz-card" style={{ padding: 32, background: 'linear-gradient(135deg, #F0EFEC 0%, #FFFFFF 100%)' }}>
                <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#8A8A82', marginBottom: 20 }}>Usage vs Spend Analysis</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {[
                    { icon: 'YT', bg: '#FF0000', name: 'YouTube Premium', usage: 'Daily', width: '95%', barBg: '#16a34a' },
                    { icon: '♪', bg: '#1DB954', name: 'Spotify', usage: 'Rare', width: '12%', barBg: '#ea580c' },
                    { icon: 'N', bg: '#E50914', name: 'Netflix', usage: '0 uses', width: '0%', barBg: '#dc2626' },
                  ].map((s, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{ width: 32, height: 32, borderRadius: 9, background: s.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: 11, fontWeight: 800, flexShrink: 0 }}>{s.icon}</div>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                          <span style={{ fontSize: 13, fontWeight: 600 }}>{s.name}</span>
                          <span style={{ fontSize: 12, color: i === 2 ? '#dc2626' : '#8A8A82', fontWeight: i === 2 ? 600 : 400 }}>{s.usage}</span>
                        </div>
                        <div style={{ height: 6, borderRadius: 100, background: '#E2E1DC', overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: s.width, background: s.barBg, borderRadius: 100, transition: 'width 1s ease' }} />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <div style={{ marginTop: 20, paddingTop: 20, borderTop: '1px solid #E2E1DC', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 13, color: '#8A8A82' }}>Potential monthly savings</span>
                  <span style={{ fontFamily: "'Playfair Display', serif", fontSize: 24, fontWeight: 900, color: '#E8541A' }}>₹768</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="sz-section-divider" />

        {/* HIGHLIGHT DARK CARD */}
        <div className="sz-highlight-section">
          <div className="sz-highlight-card sz-reveal">
            <svg style={{ position: 'absolute', top: -100, right: -100, width: 500, height: 500, pointerEvents: 'none' }} viewBox="0 0 500 500">
              <circle cx="400" cy="100" r="150" fill="none" stroke="rgba(255,255,255,0.04)" />
              <circle cx="400" cy="100" r="220" fill="none" stroke="rgba(255,255,255,0.04)" />
              <circle cx="400" cy="100" r="300" fill="none" stroke="rgba(255,255,255,0.04)" />
            </svg>
            <div>
              <div className="sz-highlight-label">The Problem</div>
              <h2 className="sz-highlight-title">₹38,400 lost<br />every year to<br />forgotten subs</h2>
              <p className="sz-highlight-sub">The average Indian professional has 11 active subscriptions and actively uses only 6. The rest silently drain your account every month.</p>
              <div style={{ marginTop: 32, position: 'relative' }}>
                <button onClick={() => navigate('/auth')} style={{ background: 'white', color: '#0A0A0A', border: 'none', padding: '14px 32px', borderRadius: 100, fontSize: 15, fontWeight: 600, cursor: 'pointer', transition: 'all 0.25s', fontFamily: "'DM Sans', sans-serif" }}>
                  See Your Waste →
                </button>
              </div>
            </div>
            <div className="sz-highlight-stats">
              {[
                { value: '₹8,490', accent: '/mo', label: 'Average subscription spend for tracked users' },
                { value: '38%', accent: '', label: 'Of that spend goes to unused or duplicate services', isAccent: true },
                { value: '3 min', accent: '', label: 'Time to set up SubZero and get your first insight' },
              ].map((s, i) => (
                <div key={i} className="sz-stat-card-dark">
                  <div className="sz-stat-value">
                    <span style={s.isAccent ? { color: 'var(--sz-accent)' } : {}}>{s.value}</span>
                    {s.accent && <span className="sz-stat-accent">{s.accent}</span>}
                  </div>
                  <div className="sz-stat-label">{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* PROCESS */}
        <div className="sz-process-section" id="how-it-works">
          <div style={{ textAlign: 'center', maxWidth: 560, margin: '0 auto 16px' }} className="sz-reveal">
            <span className="sz-section-label">How It Works</span>
            <h2 className="sz-section-title">Four steps to financial clarity</h2>
          </div>
          <div className="sz-process-steps">
            {[
              { n: 1, title: 'Add Your Subs', desc: 'Manually add your subscriptions in under 2 minutes. No bank linking required.' },
              { n: 2, title: 'AI Scans Usage', desc: 'Our models analyze your actual usage patterns across services each week.' },
              { n: 3, title: 'Get Insights', desc: 'Clear recommendations: cancel this, downgrade that, swap these two overlapping ones.' },
              { n: 4, title: 'Save Money', desc: 'Act on the suggestions. Track your growing savings. Repeat monthly.' },
            ].map((s, i) => (
              <div key={i} className={`sz-process-step sz-reveal sz-reveal-delay-${i + 1}`}>
                <div className="sz-step-num">{s.n}</div>
                <div className="sz-step-title">{s.title}</div>
                <div className="sz-step-desc">{s.desc}</div>
              </div>
            ))}
          </div>
        </div>

        {/* FEATURES */}
        <div className="sz-features-section sz-reveal" id="features">
          <div className="sz-features-inner">
            <div className="sz-features-header">
              <span className="sz-section-label" style={{ color: 'rgba(255,255,255,0.5)' }}>Everything Included</span>
              <h2 className="sz-section-title" style={{ color: 'white', marginBottom: 8 }}>Built to save you<br /><em style={{ color: 'var(--sz-accent)' }}>real money</em></h2>
            </div>
            <div className="sz-features-grid">
              {[
                { icon: '📅', title: 'Renewal Calendar', desc: 'Visual calendar showing all upcoming renewals. Never get surprised by a charge again.' },
                { icon: '🤖', title: 'AI Insights', desc: 'Machine learning models analyze your patterns and surface actionable savings opportunities.' },
                { icon: '📊', title: 'Spend Analytics', desc: 'Beautiful charts showing where your money goes across categories and time periods.' },
                { icon: '🔔', title: 'Smart Alerts', desc: 'Customizable notifications for renewals, price changes, and cancellation opportunities.' },
                { icon: '🔗', title: 'Overlap Detection', desc: 'Automatically finds duplicate or overlapping services in your subscription stack.' },
                { icon: '📱', title: 'Multi-device Sync', desc: 'Access your subscription data from any device, any time, in real-time.' },
              ].map((f, i) => (
                <div key={i} className="sz-feature-card">
                  <div className="sz-feature-icon">{f.icon}</div>
                  <div className="sz-feature-title">{f.title}</div>
                  <div className="sz-feature-desc">{f.desc}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* FINAL CTA */}
        <div className="sz-final-cta-section sz-reveal">
          <div className="sz-final-cta-card">
            <h2 className="sz-final-cta-title">Start <em>Saving</em><br />Money Now</h2>
            <p className="sz-final-cta-sub">Join thousands of users who've already taken control of their subscriptions. Setup takes under 3 minutes.</p>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap', position: 'relative', zIndex: 1 }}>
              <button onClick={() => navigate('/auth')} style={{ background: 'white', color: 'black', border: 'none', padding: '16px 40px', borderRadius: 100, fontSize: 16, fontWeight: 600, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", transition: 'all 0.25s' }}>
                Get Started Free →
              </button>
              <button style={{ background: 'transparent', color: 'white', border: '1.5px solid rgba(255,255,255,0.2)', padding: '16px 28px', borderRadius: 100, fontSize: 15, fontWeight: 500, cursor: 'default', fontFamily: "'DM Sans', sans-serif" }}>
                No credit card needed
              </button>
            </div>
            <div style={{ marginTop: 48, display: 'flex', gap: 40, justifyContent: 'center', flexWrap: 'wrap', position: 'relative', zIndex: 1 }}>
              {[{ val: '12k+', label: 'Active users' }, { val: '₹2.4Cr', label: 'Saved this year' }, { val: '4.9★', label: 'User rating' }].map((s, i) => (
                <div key={i} style={{ textAlign: 'center' }}>
                  <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 32, fontWeight: 900, color: 'white' }}>{s.val}</div>
                  <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', marginTop: 4 }}>{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{ textAlign: 'center', padding: '32px 48px', borderTop: '1px solid var(--sz-gray-200)', color: 'var(--sz-gray-500)', fontSize: 13 }}>
          © 2025 SubZero · Subscription Intelligence · Built with ❤️
        </div>
      </div>
    </div>
  );
}
