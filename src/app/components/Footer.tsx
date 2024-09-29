import styles from '../styles/Footer.module.css';

const Footer: React.FC = () => {
  return (
    <footer className={styles.footer}>
      <div className={styles.topFooter}>
        <div className={styles.about}>
          <h3>About</h3>
          <p className={styles.textP}>Events Management System</p>
          <p>Simplify the way you manage your entire event portfolio so you can build and execute events with ease.</p>
        </div>
        <div className={styles.quickLinks}>
          <h3>Quick Links</h3>
          <ul>
            <li><a href="#">Inicio</a></li>
            <li><a href="#">Eventos</a></li>
            <li><a href="#">Contacto</a></li>
          </ul>
        </div>
      </div>
      <div className={styles.bottomFooter}>
        <p>&copy; 2024  Events Management System</p>
      </div>
    </footer>
  );
};

export default Footer;