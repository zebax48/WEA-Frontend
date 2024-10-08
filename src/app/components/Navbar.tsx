import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import styles from '../styles/DashboardNavbar.module.css';

const Navbar = () => {
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const storedToken = localStorage.getItem('authToken');
    if (storedToken) {
      setToken(storedToken);
    } else {
      router.push('/login');
    }
  }, [router]);

  const handleNavigation = (path: string) => {
    if (token) {
      router.push(`${path}?token=${encodeURIComponent(token)}`);
    }
  };

  const toggleMenu = () => {
    setMenuOpen(!menuOpen);
  };

  return (
    <div className={styles['navbar-container']}>
      <div className={styles['navbar-content']}>
        <div className={styles['menu-toggle']} onClick={toggleMenu}>
          ☰
        </div>
        <div className={`${styles['navbar-links']} ${menuOpen ? styles['open'] : ''}`}>
          <a onClick={() => handleNavigation('/dashboard')} className={router.pathname === '/dashboard' ? styles['active'] : ''}>Dashboard</a>
          <a onClick={() => handleNavigation('/usersTable')} className={router.pathname === '/users' ? styles['active'] : ''}>Users</a>
          <a onClick={() => handleNavigation('/eventManager')} className={router.pathname === '/eventManager' ? styles['active'] : ''}>Events</a>
          <a onClick={() => handleNavigation('/coupons')} className={router.pathname === '/coupons' ? styles['active'] : ''}>Coupons</a>
          <a onClick={() => handleNavigation('/tickets')} className={router.pathname === '/tickets' ? styles['active'] : ''}>Tickets</a>
          <a onClick={() => handleNavigation('/zelleTickets')} className={router.pathname === '/zelleTickets' ? styles['active'] : ''}>Zelle Tickets</a>
          <a onClick={() => handleNavigation('/cashAppTickets')} className={router.pathname === '/cashAppTickets' ? styles['active'] : ''}>CashApp Tickets</a>
          <a onClick={() => handleNavigation('/moncashTickets')} className={router.pathname === '/moncashTickets' ? styles['active'] : ''}>MonCash Tickets</a>
          <a onClick={() => handleNavigation('/natcashTickets')} className={router.pathname === '/natcashTickets' ? styles['active'] : ''}>NatCash Tickets</a>
          <a onClick={() => handleNavigation('/pseTickets')} className={router.pathname === '/pseTickets' ? styles['active'] : ''}>Pse Tickets</a>
          <a onClick={() => handleNavigation('/expositors')} className={router.pathname === '/expositors' ? styles['active'] : ''}>Expositors</a>
        </div>
      </div>
    </div>
  );
};

export default Navbar;