'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/router';
import { useUser } from '../context/UserContext'; // ✅ Importa el contexto

const RegisterPage = () => {
  const router = useRouter();
  const { setUser } = useUser(); // ✅ Obtén setUser del contexto

  const [nickname, setNickname] = useState('');
  const [email, setEmail] = useState('');
  const [emailConfirm, setEmailConfirm] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [error, setError] = useState('');

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!nickname.trim()) {
      setError('El nombre de usuario es obligatorio');
      return;
    }
    if (email !== emailConfirm) {
      setError('Los correos no coinciden');
      return;
    }
    if (password !== passwordConfirm) {
      setError('Las contraseñas no coinciden');
      return;
    }

    try {
      const response = await fetch('http://localhost:3001/users/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          nickname,
          display_email: email,
          password,
          custom_profile_image_url: null,
          bio: null,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        setError(data.message || 'Error al registrar usuario');
        return;
      }

      // 🛑 Eliminamos: const registeredUser = await response.json();
      // 🛑 Eliminamos: const userData = { ... };
      // 🛑 Eliminamos: setUser(userData);
      // 🛑 Eliminamos: localStorage.setItem('user', JSON.stringify(userData));
      // 🛑 Eliminamos: localStorage.setItem('appLoggedIn', 'true');
      
      // ✅ Solamente dejamos la limpieza de error y la redirección

      setError('');
      // 🔑 CAMBIO: Redirige a /login para que el usuario inicie sesión manualmente
      router.push('/login');
      
    } catch (err) {
      console.error(err);
      setError('Error al conectar con el servidor');
    }
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
      {/* Imagen de fondo */}
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
            filter: 'grayscale(1) brightness(0.4)',
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
              type="text"
              placeholder="Nombre de usuario"
              required
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              style={inputStyle}
            />
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