// src/pages/login.tsx
'use client';

import React from 'react';
import { useRouter } from 'next/router';

const LoginPage = () => {
  const router = useRouter();

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    localStorage.setItem("appLoggedIn", "true");
    router.push('/');
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
      {/* 🔥 Contenedor para imagen de fondo: ocupa TODA la pantalla */}
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
              objectFit: 'cover', // 👈 CAMBIA 'contain' por 'cover'
            }}
          />

      </div>

      {/* ✅ Contenido centrado y sin modificar */}
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
              style={{
                padding: '12px',
                borderRadius: '6px',
                border: 'none',
                fontSize: '15px',
                outline: 'none',
              }}
            />
            <input
              type="password"
              placeholder="Contraseña"
              required
              style={{
                padding: '12px',
                borderRadius: '6px',
                border: 'none',
                fontSize: '15px',
                outline: 'none',
              }}
            />
            <button
              type="submit"
              style={{
                marginTop: '12px',
                padding: '12px',
                backgroundColor: '#1DB954',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                fontWeight: 'bold',
                cursor: 'pointer',
              }}
            >
              Iniciar sesión
            </button>
          </form>

          <button
            onClick={goToRegister}
            style={{
              marginTop: '16px',
              padding: '12px',
              backgroundColor: 'transparent',
              color: '#fff',
              border: '1px solid #fff',
              borderRadius: '6px',
              fontWeight: 'bold',
              cursor: 'pointer',
              width: '100%',
            }}
          >
            Crear cuenta
          </button>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;