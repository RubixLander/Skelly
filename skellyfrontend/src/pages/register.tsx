// src/pages/register.tsx
'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/router';

const RegisterPage = () => {
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [emailConfirm, setEmailConfirm] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [error, setError] = useState('');

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();

    if (email !== emailConfirm) {
      setError('Los correos no coinciden');
      return;
    }
    if (password !== passwordConfirm) {
      setError('Las contraseñas no coinciden');
      return;
    }

    setError('');
    localStorage.setItem('appLoggedIn', 'true');
    router.push('/');
  };

  const goToLogin = () => {
    router.push('/login');
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
      {/* 🔥 Imagen de fondo como <img> con filtro */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          zIndex: -1,
          overflow: 'hidden',
        }}
      >
        <img
          src="/SkellyRegister.gif"
          alt="Background"
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            filter: 'grayscale(1) brightness(0.4)', // 💀 Desaturado + oscuro
          }}
        />
      </div>

      {/* Contenido centrado */}
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
          <h1 style={{ marginBottom: '24px' }}>💀Registro💀</h1>

          <form
            onSubmit={handleRegister}
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
              type="email"
              placeholder="Confirmar correo"
              required
              value={emailConfirm}
              onChange={(e) => setEmailConfirm(e.target.value)}
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
            <input
              type="password"
              placeholder="Confirmar contraseña"
              required
              value={passwordConfirm}
              onChange={(e) => setPasswordConfirm(e.target.value)}
              style={inputStyle}
            />

            {error && (
              <div style={{ color: 'red', fontWeight: 'bold', marginTop: '8px' }}>
                {error}
              </div>
            )}

            <button
              type="submit"
              style={submitButtonStyle}
            >
              Registrarse
            </button>
          </form>

          <button
            onClick={goToLogin}
            style={secondaryButtonStyle}
          >
            Volver a Iniciar Sesión
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
  width: '100%',
};

export default RegisterPage;
