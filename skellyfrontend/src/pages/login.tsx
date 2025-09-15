'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/router';
import { useUser } from '../context/UserContext'; // Asegúrate de importar el hook del contexto

const LoginPage = () => {
  const { setUser } = useUser(); // Usamos el hook del contexto
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const response = await fetch('http://localhost:3001/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          display_email: email,
          password: password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.message || 'Error al iniciar sesión');
        return;
      }

      // Login exitoso
      setUser(data.user); // Guardamos el usuario en el contexto
      localStorage.setItem('appLoggedIn', 'true');
      localStorage.setItem('user', JSON.stringify(data.user));
      setError('');
      router.push('/');
    } catch (err) {
      console.error(err);
      setError('Error al conectar con el servidor');
    }
  };

  const goToRegister = () => {
    router.push('/register');
  };

  return (
    <div
      style={{
        position: 'relative',
        height: '100vh',
        width: '100vw',
        margin: 0,
        padding: 0,
        overflow: 'hidden',
      }}
    >
      {/* 🔥 Imagen de fondo */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          zIndex: -1,
          backgroundColor: 'black',
        }}
      >
        <img
          src="/SkellyInicioSesion.gif"
          alt="Background"
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
          }}
        />
      </div>

      {/* Formulario */}
      <div
        style={{
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <div
          style={{
            width: '100%',
            maxWidth: '400px',
            padding: '30px',
            borderRadius: '12px',
            backgroundColor: 'rgba(0, 0, 0, 0.6)',
            color: 'white',
            textAlign: 'center',
            boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
          }}
        >
          <h1 style={{ marginBottom: '24px' }}>💀 Iniciar Sesión 💀</h1>

          <form
            onSubmit={handleLogin}
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
            }}
          >
            <input
              type="email"
              placeholder="Correo electrónico"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={inputStyle}
            />
            <input
              type="password"
              placeholder="Contraseña"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={inputStyle}
            />

            {error && (
              <div style={{ color: 'red', fontWeight: 'bold', marginTop: '8px' }}>
                {error}
              </div>
            )}

            <button type="submit" style={submitButtonStyle}>
              Iniciar sesión
            </button>
          </form>

          <button onClick={goToRegister} style={secondaryButtonStyle}>
            Crear cuenta
          </button>
        </div>
      </div>
    </div>
  );
};

const inputStyle = {
  padding: '12px',
  borderRadius: '6px',
  border: 'none',
  fontSize: '15px',
  outline: 'none',
};

const submitButtonStyle = {
  marginTop: '12px',
  padding: '12px',
  backgroundColor: '#1DB954',
  color: 'white',
  border: 'none',
  borderRadius: '6px',
  fontWeight: 'bold',
  cursor: 'pointer',
};

const secondaryButtonStyle = {
  marginTop: '16px',
  padding: '12px',
  backgroundColor: 'transparent',
  color: '#fff',
  border: '1px solid #fff',
  borderRadius: '6px',
  fontWeight: 'bold',
  cursor: 'pointer',
};

export default LoginPage;