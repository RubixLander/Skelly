import React, { useEffect, useState } from 'react';
import { useUser } from '../context/UserContext';
import "../styles/CommentSection.css";

interface Comment {
  id: number;
  user_id: string;
  spotify_uri: string;
  content_type: string;
  comment: string;
  parent_comment_id?: number;
  created_at: string;
  nickname: string;
  custom_profile_image_url: string;
}

interface Props {
  spotify_uri: string;
  content_type: 'track' | 'album' | 'playlist';
  image_url: string;
  title: string;
  onBack: () => void;
}

const CommentSection: React.FC<Props> = ({
  spotify_uri,
  content_type,
  image_url,
  title,
  onBack,
}) => {
  const { user } = useUser();
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [parentCommentId, setParentCommentId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  // Estado para manejar cuáles comentarios tienen respuestas visibles
  const [expandedComments, setExpandedComments] = useState<Set<number>>(new Set());

  // 🔹 Nuevo estado para guardar el comentario al que respondemos
  const [replyingTo, setReplyingTo] = useState<Comment | null>(null);

  const fetchComments = async () => {
    try {
      const res = await fetch(
        `http://localhost:3001/comments?spotify_uri=${encodeURIComponent(
          spotify_uri
        )}&content_type=${content_type}`
      );
      const data = await res.json();
      setComments(data);
    } catch (err) {
      console.error('Error fetching comments:', err);
    }
  };

  const handleSubmit = async () => {
    if (!newComment.trim()) return;

    const payload = {
      user_id: user?.user_id,
      content_type,
      spotify_uri,
      comment: newComment,
      parent_comment_id: parentCommentId,
    };

    try {
      setLoading(true);
      const res = await fetch(`http://localhost:3001/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(errorText);
      }

      setNewComment('');
      setParentCommentId(null);
      setReplyingTo(null); // 🔹 limpiar cuando se envía
      await fetchComments(); // Refresh after post
    } catch (err) {
      alert('Error enviando comentario');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (spotify_uri && content_type) fetchComments();
  }, [spotify_uri, content_type]);

  const toggleReplies = (commentId: number) => {
    setExpandedComments((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(commentId)) {
        newSet.delete(commentId);
      } else {
        newSet.add(commentId);
      }
      return newSet;
    });
  };

  const renderComment = (comment: Comment, level = 0) => {
    const replies = comments.filter((c) => c.parent_comment_id === comment.id);
    const isExpanded = expandedComments.has(comment.id);

    return (
      <div
        key={comment.id}
        className={`comment-card ${level > 0 ? 'reply' : ''}`}
        style={{ marginLeft: level > 0 ? `${level * 2}rem` : '0' }}
      >
        <img
          src={comment.custom_profile_image_url || "/profile.png"}
          alt={comment.nickname}
          className="avatar"
        />
        <div className="comment-content">
          <p className="nickname">@{comment.nickname}</p>
          <p>{comment.comment}</p>

          <div className="comment-actions">
            {/* 🔹 Ahora también guardamos el comentario al que respondemos */}
            <button onClick={() => {
              setParentCommentId(comment.id);
              setReplyingTo(comment);
            }}>
              Responder
            </button>
            {replies.length > 0 && (
              <button
                className="toggle-replies-btn"
                onClick={() => toggleReplies(comment.id)}
              >
                {isExpanded
                  ? 'Ocultar respuestas'
                  : `Ver respuestas (${replies.length})`}
              </button>
            )}
          </div>

          {isExpanded && (
            <div className="replies">
              {replies.map((reply) => renderComment(reply, level + 1))}
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="comment-section">
      <button className="back-button" onClick={onBack}>
        ← Volver
      </button>

      <div className="result-item">
        <img src={image_url} className="item-image" />
        <div className="item-title">{title}</div>
        <div className="item-subtitle">{content_type}</div>
      </div>

      <div className="comment-list">
        {comments.filter((c) => !c.parent_comment_id).length === 0 ? (
          <p className="no-comments">No hay comentarios, ¡sé el primero en comentar!</p>
        ) : (
          comments
            .filter((c) => !c.parent_comment_id)
            .sort(
              (a, b) =>
                new Date(b.created_at).getTime() -
                new Date(a.created_at).getTime()
            )
            .map((comment) => renderComment(comment))
        )}
      </div>

      <div className="new-comment-form">
        {/* 🔹 Bloque mejorado mostrando nickname */}
        {parentCommentId && replyingTo && (
          <div className="replying-to">
            <p>
              Respondiendo a: <strong>@{replyingTo.nickname}</strong>
            </p>
            <button onClick={() => {
              setParentCommentId(null);
              setReplyingTo(null);
            }}>
              Cancelar respuesta
            </button>
          </div>
        )}
        <textarea
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          placeholder={
            parentCommentId ? 'Escribe tu respuesta...' : 'Escribe un comentario...'
          }
        />
        <button onClick={handleSubmit} disabled={loading}>
          {loading ? 'Enviando...' : parentCommentId ? 'Responder' : 'Comentar'}
        </button>
      </div>
    </div>
  );
};

export default CommentSection;
