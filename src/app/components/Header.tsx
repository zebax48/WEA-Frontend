// components/Header.tsx
import { useState } from 'react';
import { useRouter } from 'next/router';
import styles from '../styles/Header.module.css';

const Header: React.FC = () => {
  const [languageMenuOpen, setLanguageMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const router = useRouter();

  const handleLanguageToggle = () => {
    setLanguageMenuOpen(!languageMenuOpen);
    setUserMenuOpen(false);
  };

  const handleUserToggle = () => {
    setUserMenuOpen(!userMenuOpen);
    setLanguageMenuOpen(false);
  };

  const handleLoginClick = () => {
    router.push('/login');
  };

  const handleLogoClick = () => {
    router.push('/');
  };

  return (
    <header className={styles.header}>
      <div className={styles.logo}>
        <img
          src="https://worldeventaccess.com/media/logos/logo.png"
          className={styles.eventImage}
          alt="Event Logo"
          onClick={handleLogoClick}
        />
      </div>
      <div className={styles.actions}>
        <div className={styles.languageSelector} onClick={handleLanguageToggle}>
          Language
          {languageMenuOpen && (
            <ul className={styles.dropdown}>
              <li>English</li>
              <li>Español</li>
              <li>Français</li>
            </ul>
          )}
        </div>
        <div className={styles.userMenu} onClick={handleUserToggle}>
          User
          {userMenuOpen && (
            <ul className={styles.dropdown}>
              <li>Cambiar contraseña</li>
              <li>Cerrar sesión</li>
              <li onClick={handleLoginClick}>Login</li>
            </ul>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;