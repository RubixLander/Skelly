import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import FullHeader from '../components/Fullheader';
import { useUser } from '../context/UserContext';
import '../styles/Comunidades.css';

type Comunidad = {
  group_id: string;
  owner_id: string;
  name: string;
  description?: string | null;
  image_url?: string | null;
  created_at?: string;
};

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:3001/api/groups';

const Comunidades: React.FC = () => {
  const { user } = useUser();
  const router = useRouter();
  const [tab, setTab] = useState<'descubrir' | 'tus' | 'crear'>('descubrir');

  const [misComunidades, setMisComunidades] = useState<Comunidad[]>([]);
  const [descubrirComunidades, setDescubrirComunidades] = useState<Comunidad[]>([]);
  const [loadingMis, setLoadingMis] = useState(false);
  const [loadingDescubrir, setLoadingDescubrir] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [creando, setCreando] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [imageUrlInput, setImageUrlInput] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);

  const token =
    typeof window !== 'undefined'
      ? localStorage.getItem('access_token')
      : null;

  const authHeaders: HeadersInit = token
    ? { Authorization: `Bearer ${token}` }
    : {};

  useEffect(() => {
    if (!user || !user.user_id) return;
    fetchMisComunidades();
    fetchDescubrir();
  }, [user]);

  const fetchMisComunidades = async () => {
    if (!user || !user.user_id) return;
    setLoadingMis(true);
    setError(null);
    try {
      const res = await fetch(
        `${API_BASE}/user/${encodeURIComponent(user.user_id)}`,
        { headers: authHeaders }
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: Comunidad[] = await res.json();

      const uniqueComunidades = Array.from(
        new Map(data.map((c) => [c.group_id, c])).values()
      );

      setMisComunidades(uniqueComunidades);
    } catch (err) {
      console.error(err);
      setError('No se pudieron cargar tus comunidades');
    } finally {
      setLoadingMis(false);
    }
  };

  const fetchDescubrir = async () => {
    if (!user || !user.user_id) return;
    setLoadingDescubrir(true);
    setError(null);
    try {
      const res = await fetch(
        `${API_BASE}/discover/${encodeURIComponent(user.user_id)}`,
        { headers: authHeaders }
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setDescubrirComunidades(data || []);
    } catch (err) {
      console.error(err);
      setError('No se pudieron cargar comunidades para descubrir');
    } finally {
      setLoadingDescubrir(false);
    }
  };

  const fileToBase64 = (file: File) =>
    new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (e) => reject(e);
      reader.readAsDataURL(file);
    });

  const handleCreate = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!user || !user.user_id) return alert('Debes estar autenticado');
    if (!name.trim()) return alert('El nombre es obligatorio');

    setCreando(true);
    setError(null);

    try {
      let image_url = imageUrlInput.trim() || null;
      if (imageFile) image_url = await fileToBase64(imageFile);

      const body = {
        user_id: user.user_id,
        name: name.trim(),
        description: description.trim() || null,
        image_url,
      };

      const res = await fetch(`${API_BASE}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders,
        },
        body: JSON.stringify(body),
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      await fetchMisComunidades();
      await fetchDescubrir();
      setName('');
      setDescription('');
      setImageFile(null);
      setImageUrlInput('');
      setTab('tus');
    } catch (err) {
      console.error(err);
      setError('Error creando comunidad');
      alert('No se pudo crear la comunidad');
    } finally {
      setCreando(false);
    }
  };

  const irAlChat = (group_id: string) => {
    router.push(`/comunidad/${group_id}`);
  };

  const getImageSrc = (image_url?: string | null) => {
    return image_url && typeof image_url === 'string' && image_url.trim() !== ''
      ? image_url
      : '/comunidad.jpg';
  };

  return (
    <>
      <FullHeader />

      <div className="comunidades-container">
        <div className="comunidades-tabs">
          <div
            className={`comunidades-tab ${tab === 'descubrir' ? 'active' : ''}`}
            onClick={() => setTab('descubrir')}
          >
            Descubrir
          </div>
          <div
            className={`comunidades-tab ${tab === 'tus' ? 'active' : ''}`}
            onClick={() => setTab('tus')}
          >
            Tus comunidades
          </div>
          <div
            className={`comunidades-tab ${tab === 'crear' ? 'active' : ''}`}
            onClick={() => setTab('crear')}
          >
            Crear comunidad
          </div>
        </div>

        {error && <p className="error-text">{error}</p>}

        {/* 🔹 DESCUBRIR */}
        {tab === 'descubrir' && (
          <div>
            <div className="comunidades-descubrir-header">
              <button onClick={fetchDescubrir}>
                {loadingDescubrir ? 'Cargando...' : 'Refrescar 20 comunidades'}
              </button>
              <p>
                Mostrando hasta 20 comunidades aleatorias a las que no
                perteneces.
              </p>
            </div>

            <div className="comunidades-grid">
              {loadingDescubrir ? (
                <p>Cargando comunidades...</p>
              ) : descubrirComunidades.length === 0 ? (
                <p>No hay comunidades para descubrir en este momento.</p>
              ) : (
                descubrirComunidades.map((c) => (
                  <div
                    key={c.group_id}
                    className="comunidades-card hover:bg-[#222] cursor-pointer transition"
                    onClick={() => irAlChat(c.group_id)}
                  >
                    <img
                      src={getImageSrc(c.image_url)}
                      alt={c.name}
                      className="comunidad-image"
                    />
                    <h3>{c.name}</h3>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* 🔹 TUS COMUNIDADES */}
        {tab === 'tus' && (
          <div className="comunidades-grid">
            {loadingMis ? (
              <p>Cargando tus comunidades...</p>
            ) : misComunidades.length === 0 ? (
              <p>No perteneces a ninguna comunidad todavía.</p>
            ) : (
              misComunidades.map((c) => (
                <div
                  key={c.group_id}
                  className="comunidades-card hover:bg-[#222] cursor-pointer transition"
                  onClick={() => irAlChat(c.group_id)}
                >
                  <img
                    src={getImageSrc(c.image_url)}
                    alt={c.name}
                    className="comunidad-image"
                  />
                  <h3>{c.name}</h3>
                </div>
              ))
            )}
          </div>
        )}

        {/* 🔹 CREAR COMUNIDAD */}
        {tab === 'crear' && (
          <form onSubmit={handleCreate} className="comunidades-form">
            <label>Nombre</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nombre de la comunidad"
            />

            <label>Descripción</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe tu comunidad"
            />

            <label>O subir archivo (opcional)</label>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setImageFile(e.target.files?.[0] || null)}
            />

            <div className="comunidades-form-buttons">
              <button type="submit" disabled={creando}>
                {creando ? 'Creando...' : 'Crear comunidad'}
              </button>
              <button
                type="button"
                className="secondary"
                onClick={() => {
                  setName('');
                  setDescription('');
                  setImageFile(null);
                  setImageUrlInput('');
                }}
              >
                Limpiar
              </button>
            </div>
          </form>
        )}
      </div>
    </>
  );
};

export default Comunidades;