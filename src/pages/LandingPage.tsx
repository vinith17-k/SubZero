import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatedThemeToggler } from '@/components/ui/animated-theme-toggler';
import { NumberTicker } from '@/components/ui/number-ticker';
import { InteractiveHoverButton } from '@/components/ui/interactive-hover-button';

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
          <li><a href="#pricing">Pricing</a></li>
        </ul>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <AnimatedThemeToggler variant="circle" />
          <button className="sz-nav-cta" onClick={() => navigate('/auth')}>Open SubZero</button>
        </div>
      </nav>

      <div style={{ position: 'relative', zIndex: 1, paddingTop: 80 }}>
        {/* HERO */}
        <div className="sz-hero">
          <div>
            <div className="sz-hero-badge sz-fade-in sz-fade-in-1">Subscription operations</div>
            <h1 className="sz-hero-title sz-fade-in sz-fade-in-2">
              Know every charge.<br />Keep every decision.
            </h1>
            <p className="sz-hero-sub sz-fade-in sz-fade-in-3">
              Put renewals, recurring costs, and actual usage in one workspace built for quick decisions.
            </p>
            <div className="sz-hero-ctas sz-fade-in sz-fade-in-4" style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <InteractiveHoverButton onClick={() => navigate('/auth')}>
                Start for Free
              </InteractiveHoverButton>
              <button className="sz-btn-secondary" onClick={() => navigate('/auth')}>Use offline</button>
            </div>
            <div className="sz-fade-in sz-fade-in-5" style={{ marginTop: 32, display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 12, maxWidth: 390 }}>
              <div>
                <div style={{ fontSize: 18, fontWeight: 800 }}>Renewals</div>
                <div style={{ fontSize: 12, color: 'var(--sz-gray-500)' }}>Calendar view</div>
              </div>
              <div>
                <div style={{ fontSize: 18, fontWeight: 800 }}>Usage</div>
                <div style={{ fontSize: 12, color: 'var(--sz-gray-500)' }}>Frequency data</div>
              </div>
              <div>
                <div style={{ fontSize: 18, fontWeight: 800 }}>Actions</div>
                <div style={{ fontSize: 12, color: 'var(--sz-gray-500)' }}>Keep or cancel</div>
              </div>
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
                <span style={{ fontSize: 12, color: '#8A8A82' }}>Aug 2026</span>
              </div>
              <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 36, fontWeight: 900, color: '#0A0A0A', padding: '20px 24px 8px' }}>₹8,490</div>
              <div style={{ fontSize: 13, color: '#8A8A82', padding: '0 24px 16px' }}>Total subscription spend</div>
              <div style={{ padding: '16px 24px', display: 'flex', gap: 6, alignItems: 'flex-end', height: 80 }}>
                {[35, 55, 42, 68, 52, 75, 60].map((h, i) => (
                  <div key={i} style={{ flex: 1, height: h, background: i === 6 ? '#E8541A' : '#E2E1DC', borderRadius: '4px 4px 0 0' }} />
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
            <div className="sz-float-card sz-float-card-2">₹1,890 potential savings</div>
          </div>
        </div>

        {/* Mobile hero fallback — shown on small screens instead of preview card */}
        <div className="sz-mobile-hero-stat sz-fade-in sz-fade-in-4">
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            {[
              { emoji: '', label: 'Renewal control', val: 'Calendar' },
              { emoji: '', label: 'Local workspace', val: 'Offline' },
              { emoji: '', label: 'Saved records', val: 'Browser' },
            ].map((s, i) => (
              <div key={i} style={{ background: 'white', borderRadius: 16, padding: '16px 20px', textAlign: 'center', boxShadow: 'var(--sz-card-shadow)', minWidth: 100 }}>
                <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 20, fontWeight: 900 }}>{s.val}</div>
                <div style={{ fontSize: 11, color: 'var(--sz-gray-500)', marginTop: 2 }}>{s.label}</div>
              </div>
            ))}
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
                { icon: '01', title: 'Renewal Calendar', desc: 'Review every upcoming charge in one chronological view.' },
                { icon: '02', title: 'Usage Insights', desc: 'Compare recurring cost with actual frequency and recent activity.' },
                { icon: '03', title: 'Spend Analytics', desc: 'See category and billing-cycle changes without a spreadsheet.' },
                { icon: '04', title: 'Smart Alerts', desc: 'Bring renewal and price changes to the top of your attention list.' },
                { icon: '05', title: 'Overlap Detection', desc: 'Identify services serving the same workflow before renewal.' },
                { icon: '06', title: 'Offline Workspace', desc: 'Keep working when Supabase or the internet is unavailable.' },
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

        {/* PRICING */}
        <div className="sz-section sz-reveal" id="pricing">
          <div style={{ textAlign: 'center', marginBottom: 48 }}>
            <span className="sz-section-label">Simple Pricing</span>
            <h2 className="sz-section-title">Free, <em style={{ color: 'var(--sz-accent)', fontStyle: 'italic' }}>forever</em></h2>
            <p style={{ fontSize: 16, color: 'var(--sz-gray-500)', marginTop: 8 }}>No credit card. No subscriptions about subscriptions. Just free.</p>
          </div>
          <div style={{ maxWidth: 480, margin: '0 auto' }}>
            <div className="sz-card" style={{ padding: 40, textAlign: 'center', border: '2px solid var(--sz-black)', position: 'relative', overflow: 'visible' }}>
              <div style={{ position: 'absolute', top: -14, left: '50%', transform: 'translateX(-50%)', background: 'var(--sz-accent)', color: 'white', fontSize: 12, fontWeight: 700, padding: '4px 16px', borderRadius: 100, whiteSpace: 'nowrap' }}>
              </div>
              <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 48, fontWeight: 900, color: '#0A0A0A', lineHeight: 1 }}>₹0</div>
              <div style={{ fontSize: 15, color: 'var(--sz-gray-500)', marginTop: 4, marginBottom: 32 }}>per month, forever</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 32, textAlign: 'left' }}>
                {[
                  'Unlimited subscriptions',
                  'AI-powered insights & recommendations',
                  'Renewal alerts & calendar',
                  'Spend analytics & charts',
                  'CSV data export',
                  'Multi-device sync via Supabase',
                  'Overlap & duplicate detection',
                ].map((f, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 14 }}>
                    <span style={{ color: '#16a34a', fontWeight: 700, fontSize: 16 }}>✓</span>
                    <span style={{ color: 'var(--sz-gray-700)' }}>{f}</span>
                  </div>
                ))}
              </div>
              <button className="sz-btn-primary" style={{ width: '100%', padding: 16, fontSize: 16 }} onClick={() => navigate('/auth')}>
                Get Started Free →
              </button>
              <div style={{ fontSize: 12, color: 'var(--sz-gray-300)', marginTop: 16 }}>No credit card required · Takes 3 minutes</div>
            </div>
          </div>
        </div>

        {/* FINAL CTA */}
        <div className="sz-final-cta-section sz-reveal">
          <div className="sz-final-cta-card">
            <h2 className="sz-final-cta-title">Your subscriptions,<br />under control.</h2>
            <p className="sz-final-cta-sub">Open your workspace, review the next renewal, and decide what stays.</p>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap', position: 'relative', zIndex: 1, alignItems: 'center' }}>
              <InteractiveHoverButton
                onClick={() => navigate('/auth')}
                className="bg-white text-black border-transparent hover:border-white/50 text-base py-3 px-8"
              >
                Open the workspace
              </InteractiveHoverButton>
              <button style={{ background: 'transparent', color: 'white', border: '1.5px solid rgba(255,255,255,0.2)', padding: '16px 28px', borderRadius: 100, fontSize: 15, fontWeight: 500, cursor: 'default', fontFamily: "'DM Sans', sans-serif" }}>
                No credit card needed
              </button>
            </div>
            <div style={{ marginTop: 48, display: 'flex', gap: 48, justifyContent: 'center', flexWrap: 'wrap', position: 'relative', zIndex: 1 }}>
              {['Inventory', 'Renewals', 'Decisions'].map((step, index) => (
                <div key={step} style={{ textAlign: 'center' }}>
                  <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 32, fontWeight: 900, color: 'white' }}>0{index + 1}</div>
                  <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', marginTop: 4 }}>{step}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{ borderTop: '1px solid var(--sz-gray-200)', padding: '32px 48px' }}>
          <div style={{ maxWidth: 1200, margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
            <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 18, fontWeight: 900, color: '#0A0A0A' }}>SubZero</div>
            <div style={{ display: 'flex', gap: 24, fontSize: 13, color: 'var(--sz-gray-500)' }}>
              <a href="#features" style={{ textDecoration: 'none', color: 'var(--sz-gray-500)', transition: 'color 0.2s' }} onMouseEnter={e => { (e.currentTarget).style.color = '#0A0A0A'; }} onMouseLeave={e => { (e.currentTarget).style.color = 'var(--sz-gray-500)'; }}>Features</a>
              <a href="#pricing" style={{ textDecoration: 'none', color: 'var(--sz-gray-500)', transition: 'color 0.2s' }} onMouseEnter={e => { (e.currentTarget).style.color = '#0A0A0A'; }} onMouseLeave={e => { (e.currentTarget).style.color = 'var(--sz-gray-500)'; }}>Pricing</a>
              <a href="#how-it-works" style={{ textDecoration: 'none', color: 'var(--sz-gray-500)', transition: 'color 0.2s' }} onMouseEnter={e => { (e.currentTarget).style.color = '#0A0A0A'; }} onMouseLeave={e => { (e.currentTarget).style.color = 'var(--sz-gray-500)'; }}>How It Works</a>
              <button onClick={() => navigate('/auth')} style={{ background: 'none', border: 'none', color: 'var(--sz-accent)', fontWeight: 600, fontSize: 13, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}>Sign Up →</button>
            </div>
            <div style={{ fontSize: 13, color: 'var(--sz-gray-300)' }}>© 2026 SubZero · Built with ❤️ in India</div>
          </div>
        </div>

        {/* Sticky mobile CTA */}
        <div className="sz-sticky-mobile-cta">
          <button className="sz-btn-primary" style={{ width: '100%', padding: 16, fontSize: 16, borderRadius: 16 }} onClick={() => navigate('/auth')}>
            Get Started Free →
          </button>
        </div>
      </div>
    </div>
  );
}
