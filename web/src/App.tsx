import { colors, radius, spacing, SPORTS, APP_URL, ADMIN_URL } from './theme';

const NAV_LINKS = [
  { label: 'Venues', href: `${APP_URL}/search` },
  { label: 'Games', href: `${APP_URL}/games` },
];

const STEPS = [
  { icon: '🔍', title: 'Discover', body: 'Browse venues and open games near you, filtered by sport, price, and rating.' },
  { icon: '📅', title: 'Book', body: 'Pick a court and a slot, split the bill with your group, and pay in seconds.' },
  { icon: '🏆', title: 'Play', body: 'Show up, chat with your group beforehand, and rate the venue when you\'re done.' },
];

export default function App() {
  return (
    <div style={{ background: colors.bg, color: colors.text }}>
      <Header />
      <Hero />
      <PopularSports />
      <HowItWorks />
      <WhereWePlay />
      <Footer />
    </div>
  );
}

function Header() {
  return (
    <header style={styles.header}>
      <div style={styles.headerInner}>
        <div style={styles.brand}>
          <span style={{ fontSize: 22 }}>🏆</span>
          <span style={styles.brandText}>gameOn</span>
        </div>
        <nav style={styles.nav}>
          {NAV_LINKS.map((l) => (
            <a key={l.label} href={l.href} style={styles.navLink}>
              {l.label}
            </a>
          ))}
        </nav>
        <a href={APP_URL} style={styles.headerCta}>
          Open the app
        </a>
      </div>
    </header>
  );
}

function Hero() {
  return (
    <section style={styles.hero}>
      <div style={styles.heroInner}>
        <h1 style={styles.heroTitle}>Book sports venues. Join games. Play more.</h1>
        <p style={styles.heroSubtitle}>
          Find nearby courts and turfs, check real-time availability, and match with players
          around your skill level — all in one place.
        </p>
        <div style={styles.heroCtaRow}>
          <a href={APP_URL} style={styles.primaryCta}>
            Open the app
          </a>
          <a href={ADMIN_URL} style={styles.secondaryCta}>
            List your venue
          </a>
        </div>
      </div>
    </section>
  );
}

function PopularSports() {
  return (
    <section style={styles.section}>
      <h2 style={styles.sectionTitle}>Popular sports</h2>
      <div style={styles.sportsGrid}>
        {SPORTS.map((s) => (
          <a key={s.key} href={`${APP_URL}/search?sport=${encodeURIComponent(s.key)}`} style={styles.sportCard}>
            <span style={{ fontSize: 32 }}>{s.icon}</span>
            <span style={styles.sportLabel}>{s.key}</span>
          </a>
        ))}
      </div>
    </section>
  );
}

function HowItWorks() {
  return (
    <section style={{ ...styles.section, background: colors.bgAlt }}>
      <h2 style={styles.sectionTitle}>How it works</h2>
      <div style={styles.stepsRow}>
        {STEPS.map((s, i) => (
          <div key={s.title} style={styles.stepCard}>
            <div style={styles.stepIcon}>{s.icon}</div>
            <div style={styles.stepNum}>Step {i + 1}</div>
            <h3 style={styles.stepTitle}>{s.title}</h3>
            <p style={styles.stepBody}>{s.body}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function WhereWePlay() {
  return (
    <section style={styles.section}>
      <h2 style={styles.sectionTitle}>Where we play</h2>
      <p style={styles.whereBody}>Live in Bengaluru — more cities coming soon.</p>
    </section>
  );
}

function Footer() {
  return (
    <footer style={styles.footer}>
      <div style={styles.footerInner}>
        <div style={styles.brand}>
          <span style={{ fontSize: 18 }}>🏆</span>
          <span style={styles.brandText}>gameOn</span>
        </div>
        <nav style={styles.nav}>
          {NAV_LINKS.map((l) => (
            <a key={l.label} href={l.href} style={styles.footerLink}>
              {l.label}
            </a>
          ))}
          <a href={ADMIN_URL} style={styles.footerLink}>
            Venue owners
          </a>
        </nav>
        <p style={styles.copyright}>© {new Date().getFullYear()} gameOn. All rights reserved.</p>
      </div>
    </footer>
  );
}

const styles: Record<string, React.CSSProperties> = {
  header: { borderBottom: `1px solid ${colors.border}`, position: 'sticky', top: 0, background: colors.bg, zIndex: 10 },
  headerInner: {
    maxWidth: 1080,
    margin: '0 auto',
    padding: `${spacing.md}px ${spacing.lg}px`,
    display: 'flex',
    alignItems: 'center',
    gap: spacing.xl,
  },
  brand: { display: 'flex', alignItems: 'center', gap: 8 },
  brandText: { fontSize: 18, fontWeight: 800, color: colors.primaryDark },
  nav: { display: 'flex', gap: spacing.lg, flex: 1, flexWrap: 'wrap' },
  navLink: { fontSize: 14, fontWeight: 600, color: colors.textMuted },
  headerCta: {
    background: colors.primary,
    color: '#fff',
    fontWeight: 700,
    fontSize: 14,
    padding: '10px 18px',
    borderRadius: radius.md,
    whiteSpace: 'nowrap',
  },
  hero: { padding: `${spacing.xxxl}px ${spacing.lg}px`, background: colors.bgAlt },
  heroInner: { maxWidth: 720, margin: '0 auto', textAlign: 'center' },
  heroTitle: { fontSize: 40, fontWeight: 800, lineHeight: 1.15, margin: 0, color: colors.text },
  heroSubtitle: { fontSize: 17, color: colors.textMuted, marginTop: spacing.lg, lineHeight: 1.6 },
  heroCtaRow: { display: 'flex', gap: spacing.md, justifyContent: 'center', marginTop: spacing.xl, flexWrap: 'wrap' },
  primaryCta: {
    background: colors.primary,
    color: '#fff',
    fontWeight: 700,
    fontSize: 15,
    padding: '14px 28px',
    borderRadius: radius.md,
  },
  secondaryCta: {
    background: 'transparent',
    color: colors.primaryDark,
    fontWeight: 700,
    fontSize: 15,
    padding: '14px 28px',
    borderRadius: radius.md,
    border: `1.5px solid ${colors.primary}`,
  },
  section: { maxWidth: 1080, margin: '0 auto', padding: `${spacing.xxxl}px ${spacing.lg}px` },
  sectionTitle: { fontSize: 26, fontWeight: 800, textAlign: 'center', margin: `0 0 ${spacing.xl}px` },
  sportsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
    gap: spacing.lg,
  },
  sportCard: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.xl,
    borderRadius: radius.lg,
    border: `1px solid ${colors.border}`,
    background: colors.surface,
  },
  sportLabel: { fontSize: 14, fontWeight: 700, color: colors.text },
  stepsRow: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: spacing.xl },
  stepCard: { background: colors.surface, borderRadius: radius.lg, padding: spacing.xl, border: `1px solid ${colors.border}` },
  stepIcon: { fontSize: 32 },
  stepNum: { fontSize: 12, fontWeight: 700, color: colors.primary, marginTop: spacing.sm, textTransform: 'uppercase', letterSpacing: 0.5 },
  stepTitle: { fontSize: 18, fontWeight: 800, margin: `${spacing.xs}px 0` },
  stepBody: { fontSize: 14, color: colors.textMuted, lineHeight: 1.6, margin: 0 },
  whereBody: { textAlign: 'center', fontSize: 16, color: colors.textMuted },
  footer: { borderTop: `1px solid ${colors.border}`, background: colors.bgAlt },
  footerInner: {
    maxWidth: 1080,
    margin: '0 auto',
    padding: `${spacing.xl}px ${spacing.lg}px`,
    display: 'flex',
    alignItems: 'center',
    gap: spacing.xl,
    flexWrap: 'wrap',
  },
  footerLink: { fontSize: 13, fontWeight: 600, color: colors.textMuted },
  copyright: { fontSize: 12, color: colors.textFaint, marginLeft: 'auto' },
};
