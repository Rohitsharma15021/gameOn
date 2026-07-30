import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/auth';

export default function Layout() {
  const user = useAuthStore((s) => s.user);
  const signOut = useAuthStore((s) => s.signOut);
  const navigate = useNavigate();

  const onSignOut = () => {
    signOut();
    navigate('/login');
  };

  return (
    <div style={styles.shell}>
      <aside style={styles.sidebar}>
        <div style={styles.brand}>
          <span style={styles.brandIcon}>🏆</span>
          <span style={styles.brandText}>gameOn</span>
        </div>
        <span style={styles.brandSub}>Venue Owner Console</span>

        <nav style={styles.nav}>
          <NavLink to="/venues" style={navStyle}>
            My Venues
          </NavLink>
        </nav>

        <div style={styles.footer}>
          <div style={styles.userName}>{user?.name}</div>
          <div style={styles.userPhone}>{user?.phone}</div>
          <button style={styles.signOutBtn} onClick={onSignOut}>
            Sign out
          </button>
        </div>
      </aside>
      <main style={styles.main}>
        <Outlet />
      </main>
    </div>
  );
}

function navStyle({ isActive }: { isActive: boolean }) {
  return {
    display: 'block',
    padding: '10px 14px',
    borderRadius: 8,
    fontWeight: 600,
    fontSize: 14,
    color: isActive ? '#15803d' : '#52514e',
    background: isActive ? '#dcfce7' : 'transparent',
    marginBottom: 4,
  };
}

const styles: Record<string, React.CSSProperties> = {
  shell: { display: 'flex', minHeight: '100vh' },
  sidebar: {
    width: 240,
    background: '#fcfcfb',
    borderRight: '1px solid rgba(11,11,11,0.1)',
    padding: 20,
    display: 'flex',
    flexDirection: 'column',
    position: 'sticky',
    top: 0,
    height: '100vh',
  },
  brand: { display: 'flex', alignItems: 'center', gap: 8 },
  brandIcon: { fontSize: 22 },
  brandText: { fontSize: 18, fontWeight: 800, color: '#15803d' },
  brandSub: { fontSize: 12, color: '#898781', marginTop: 2, marginBottom: 24 },
  nav: { flex: 1 },
  footer: { borderTop: '1px solid rgba(11,11,11,0.1)', paddingTop: 16 },
  userName: { fontSize: 14, fontWeight: 700 },
  userPhone: { fontSize: 12, color: '#898781', marginBottom: 12 },
  signOutBtn: {
    width: '100%',
    padding: '8px 0',
    borderRadius: 8,
    border: '1px solid rgba(11,11,11,0.1)',
    background: 'transparent',
    color: '#d03b3b',
    fontWeight: 600,
    cursor: 'pointer',
  },
  main: { flex: 1, padding: '32px 40px', maxWidth: 1200 },
};
