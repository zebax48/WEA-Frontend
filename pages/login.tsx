// pages/login.tsx
import { useState } from 'react';
import { useRouter } from 'next/router';
import styles from '../src/app/styles/login.module.css';

const fetchSignIn = async (email: string, password: string): Promise<string> => {
  try {
    const response = await fetch('https://new-api.worldeventaccess.com/api/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userName: email,
        password: password,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(errorText || 'Failed to fetch');
    }

    const token = await response.text();
    return token;
  } catch (error) {
    if (error instanceof Error) {
      alert(error.message);
    } else {
      alert('An unexpected error occurred');
    }
    throw error;
  }
};

const LoginScreen = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const router = useRouter();

  const handleSignIn = async () => {
    try {
      const token = await fetchSignIn(email, password);
      
      // Almacena el token en localStorage
      localStorage.setItem('authToken', token);

      // Redirige al dashboard con el token en la URL (opcional)
      router.push(`/dashboard?token=${encodeURIComponent(token)}`);
    } catch (error) {
      // Manejo de errores ya está hecho en `fetchSignIn`
    }
  };

  return (
    <div className={styles.container}>
      <img
        src="https://worldeventaccess.com/media/logos/logo.png"
        alt="Logo"
        className={styles.logo}
      />
      <h1 className={styles.title}>Sign In To Events Management System</h1>
      <input
        type="email"
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className={styles.input}
      />
      <input
        type="password"
        placeholder="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        className={styles.input}
      />
      <button onClick={handleSignIn} className={styles.button}>
        Sign In
      </button>
    </div>
  );
};

export default LoginScreen;