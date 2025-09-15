// src/components/Library.tsx
import React, { useEffect, useState } from 'react';
import { useUser } from '../context/UserContext';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

interface Favorite {
  id: number;
  content_type: 'song' | 'album' | 'artist' | 'playlist';
  spotify_uri: string;
  name: string;
  image_url: string;
  added_at: string;
}

const Library: React.FC = () => {
  const { user } = useUser();
  const navigate = useNavigate();

  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [activeTab, setActiveTab] = useState<'song' | 'album' | 'artist' | 'playlist'>('song');

  useEffect(() => {
    if (!user) {
      navigate('/login'); // redirige si no hay usuario
      return;
    }

    // Obtener favoritos desde el backend
    const fetchFavorites = async () => {
      try {
        const res = await axios.get(`/api/user-favorites/${user.user_id}`);
        setFavorites(res.data);
      } catch (err) {
        console.error('Error al obtener favoritos:', err);
      }
    };

    fetchFavorites();
  }, [user, navigate]);

  const filteredFavorites = favorites.filter(fav => fav.content_type === activeTab);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'center', gap: '2rem', marginBottom: '1rem' }}>
        {['song', 'album', 'artist', 'playlist'].map(type => (
          <button
            key={type}
            onClick={() => setActiveTab(type as any)}
            style={{
              backgroundColor: activeTab === type ? '#27ae60' : '#333',
              color: 'white',
              padding: '10px 20px',
              borderRadius: '20px',
              border: 'none',
              cursor: 'pointer'
            }}
          >
            {type[0].toUpperCase() + type.slice(1)}s
          </button>
        ))}
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '2rem', justifyContent: 'center' }}>
        {filteredFavorites.map(fav => (
          <div key={fav.id} style={{ width: '220px', textAlign: 'center' }}>
            <img src={fav.image_url} alt={fav.name} style={{ width: '100%', borderRadius: '10px' }} />
            <h4>{fav.name}</h4>
            <button
              onClick={() => window.open(`https://open.spotify.com/${fav.content_type}/${fav.spotify_uri}`, '_blank')}
              style={{
                backgroundColor: '#2ecc71',
                color: 'white',
                border: 'none',
                padding: '8px 16px',
                borderRadius: '20px',
                marginTop: '10px',
                cursor: 'pointer'
              }}
            >
              Reproducir
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Library;