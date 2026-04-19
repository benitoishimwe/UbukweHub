import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';
import {
  Camera, Download, QrCode, Trash2, Heart, Image, Video,
  ArrowLeft, Loader2, RefreshCw, X, ZoomIn, Plus
} from 'lucide-react';

export default function AlbumGalleryPage() {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [qrVisible, setQrVisible] = useState(false);
  const [qrUrl, setQrUrl] = useState(null);
  const [lightbox, setLightbox] = useState(null);
  const [creating, setCreating] = useState(false);
  const [filter, setFilter] = useState('all'); // all | image | video | favorite

  const BASE_URL = process.env.REACT_APP_BACKEND_URL;

  const fetchAlbum = useCallback(async () => {
    try {
      const res = await api.get(`/events/${eventId}/albums`);
      setData(res.data);
      setError(null);
    } catch (err) {
      if (err.response?.status === 404) {
        setData(null);
        setError('no_album');
      } else {
        setError('Failed to load album.');
      }
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  useEffect(() => { fetchAlbum(); }, [fetchAlbum]);

  // Auto-refresh every 15 seconds for live updates
  useEffect(() => {
    if (!data) return;
    const id = setInterval(fetchAlbum, 15000);
    return () => clearInterval(id);
  }, [data, fetchAlbum]);

  const createAlbum = async () => {
    setCreating(true);
    try {
      await api.post(`/events/${eventId}/albums`, { title: 'Wedding Album' });
      await fetchAlbum();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to create album');
    } finally {
      setCreating(false);
    }
  };

  const showQr = async () => {
    if (!qrUrl) {
      const res = await api.get(`/albums/${data.album.albumId}/qrcode`, { responseType: 'blob' });
      setQrUrl(URL.createObjectURL(res.data));
    }
    setQrVisible(true);
  };

  const downloadZip = () => {
    window.open(`${BASE_URL}/api/albums/${data.album.albumId}/download`, '_blank');
  };

  const deleteMedia = async (mediaId) => {
    if (!window.confirm('Delete this photo?')) return;
    await api.delete(`/albums/${data.album.albumId}/media/${mediaId}`);
    setData(prev => ({
      ...prev,
      media: prev.media.filter(m => m.mediaId !== mediaId),
      media_count: prev.media_count - 1,
    }));
    if (lightbox?.mediaId === mediaId) setLightbox(null);
  };

  const toggleFav = async (mediaId) => {
    const res = await api.put(`/albums/${data.album.albumId}/media/${mediaId}/favorite`);
    setData(prev => ({
      ...prev,
      media: prev.media.map(m => m.mediaId === mediaId ? res.data : m),
    }));
  };

  const filteredMedia = data?.media?.filter(m => {
    if (filter === 'image') return m.mediaType === 'image';
    if (filter === 'video') return m.mediaType === 'video';
    if (filter === 'favorite') return m.isFavorite;
    return true;
  }) || [];

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="animate-spin text-[#C9A84C]" size={32} />
    </div>
  );

  // No album yet
  if (error === 'no_album') return (
    <div className="p-6 max-w-2xl mx-auto">
      <button onClick={() => navigate('/events')} className="flex items-center gap-2 text-[#5C5C5C] hover:text-[#2D2D2D] mb-6 text-sm">
        <ArrowLeft size={16} /> Back to Events
      </button>
      <div className="bg-white rounded-2xl p-10 text-center shadow-sm">
        <div className="w-20 h-20 rounded-2xl bg-[#C9A84C15] flex items-center justify-center mx-auto mb-4">
          <Camera className="text-[#C9A84C]" size={36} />
        </div>
        <h2 className="text-xl font-bold text-[#2D2D2D] mb-2" style={{fontFamily:'Playfair Display,serif'}}>
          No Album Yet
        </h2>
        <p className="text-[#5C5C5C] text-sm mb-6">
          Create a live album so guests can upload photos directly from their phones.
        </p>
        <button
          onClick={createAlbum}
          disabled={creating}
          className="px-6 py-2.5 rounded-xl bg-[#C9A84C] text-white font-semibold text-sm hover:bg-[#b8933d] disabled:opacity-50 transition-colors flex items-center gap-2 mx-auto"
        >
          {creating ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
          Create Live Album
        </button>
      </div>
    </div>
  );

  if (error) return (
    <div className="p-6 text-center text-[#D9534F]">{error}</div>
  );

  const album = data?.album;

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between mb-6 gap-4">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/events')} className="p-2 rounded-xl hover:bg-[#EBE5DB] text-[#5C5C5C]">
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-xl font-bold text-[#2D2D2D]" style={{fontFamily:'Playfair Display,serif'}}>
              {album?.title || 'Wedding Album'}
            </h1>
            <p className="text-xs text-[#5C5C5C]">{data?.media_count || 0} photos & videos</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={fetchAlbum}
            className="p-2 rounded-xl hover:bg-[#EBE5DB] text-[#5C5C5C]"
            title="Refresh"
          >
            <RefreshCw size={18} />
          </button>
          <button
            onClick={showQr}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#C9A84C15] text-[#C9A84C] text-sm font-semibold hover:bg-[#C9A84C25] transition-colors"
          >
            <QrCode size={16} /> QR Code
          </button>
          {data?.media_count > 0 && (
            <button
              onClick={downloadZip}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#2D2D2D10] text-[#2D2D2D] text-sm font-semibold hover:bg-[#2D2D2D20] transition-colors"
            >
              <Download size={16} /> Download All
            </button>
          )}
        </div>
      </div>

      {/* Upload link banner */}
      <div className="bg-gradient-to-r from-[#C9A84C15] to-[#E8A4B810] rounded-2xl p-4 mb-6 flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-[#2D2D2D]">Guest Upload Link</p>
          <p className="text-xs text-[#5C5C5C] mt-0.5">Share the QR code so guests can upload directly</p>
        </div>
        <button
          onClick={showQr}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#C9A84C] text-white text-sm font-semibold hover:bg-[#b8933d] transition-colors flex-shrink-0"
        >
          <QrCode size={15} /> Show QR
        </button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 mb-4 overflow-x-auto">
        {[
          { key: 'all', label: `All (${data?.media_count || 0})` },
          { key: 'image', label: `Photos (${data?.media?.filter(m => m.mediaType === 'image').length || 0})` },
          { key: 'video', label: `Videos (${data?.media?.filter(m => m.mediaType === 'video').length || 0})` },
          { key: 'favorite', label: `Favorites (${data?.media?.filter(m => m.isFavorite).length || 0})` },
        ].map(f => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors ${
              filter === f.key
                ? 'bg-[#C9A84C] text-white'
                : 'bg-white text-[#5C5C5C] hover:bg-[#EBE5DB]'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Gallery grid */}
      {filteredMedia.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center shadow-sm">
          <Camera className="text-[#C9A84C] mx-auto mb-3" size={40} />
          <p className="text-[#5C5C5C] text-sm">
            {filter === 'all'
              ? 'No photos yet. Share the QR code with your guests!'
              : `No ${filter === 'favorite' ? 'favorites' : filter + 's'} yet.`}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
          {filteredMedia.map(m => (
            <div key={m.mediaId} className="relative aspect-square rounded-xl overflow-hidden bg-[#EBE5DB] group">
              {m.mediaType === 'image' ? (
                <img
                  src={`${BASE_URL}${m.fileUrl}`}
                  alt={m.originalName}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center bg-[#2D2D2D10]">
                  <Video className="text-[#C9A84C]" size={32} />
                  <span className="text-[10px] text-[#5C5C5C] mt-1">{m.originalName}</span>
                </div>
              )}

              {/* Overlay actions */}
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all flex items-end justify-between p-1.5 opacity-0 group-hover:opacity-100">
                <div className="flex gap-1">
                  <button
                    onClick={() => setLightbox(m)}
                    className="w-7 h-7 rounded-lg bg-white/90 flex items-center justify-center hover:bg-white"
                  >
                    <ZoomIn size={13} className="text-[#2D2D2D]" />
                  </button>
                  <button
                    onClick={() => deleteMedia(m.mediaId)}
                    className="w-7 h-7 rounded-lg bg-white/90 flex items-center justify-center hover:bg-white"
                  >
                    <Trash2 size={13} className="text-[#D9534F]" />
                  </button>
                </div>
                <button
                  onClick={() => toggleFav(m.mediaId)}
                  className="w-7 h-7 rounded-lg bg-white/90 flex items-center justify-center hover:bg-white"
                >
                  <Heart size={13} className={m.isFavorite ? 'text-[#C9A84C] fill-[#C9A84C]' : 'text-[#5C5C5C]'} />
                </button>
              </div>

              {/* Favorite badge */}
              {m.isFavorite && (
                <div className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-[#C9A84C] flex items-center justify-center">
                  <Heart size={10} className="text-white fill-white" />
                </div>
              )}

              {/* Media type badge */}
              <div className="absolute top-1.5 left-1.5">
                {m.mediaType === 'video' ? (
                  <div className="w-5 h-5 rounded-full bg-black/50 flex items-center justify-center">
                    <Video size={10} className="text-white" />
                  </div>
                ) : null}
              </div>

              {/* Uploader name */}
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent px-2 pb-1.5 pt-4 opacity-0 group-hover:opacity-100 transition-opacity">
                <p className="text-white text-[10px] truncate">{m.uploaderName || 'Guest'}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* QR Code modal */}
      {qrVisible && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => setQrVisible(false)}>
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full text-center shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-[#2D2D2D]">Guest Upload QR Code</h3>
              <button onClick={() => setQrVisible(false)} className="p-1 rounded-lg hover:bg-[#F5F0E8]">
                <X size={18} className="text-[#5C5C5C]" />
              </button>
            </div>
            {qrUrl ? (
              <img src={qrUrl} alt="QR Code" className="w-56 h-56 mx-auto rounded-xl border border-[#EBE5DB]" />
            ) : (
              <div className="w-56 h-56 mx-auto flex items-center justify-center">
                <Loader2 className="animate-spin text-[#C9A84C]" size={32} />
              </div>
            )}
            <p className="text-xs text-[#5C5C5C] mt-3">
              Guests scan this to upload photos directly — no app needed.
            </p>
            {qrUrl && (
              <a
                href={qrUrl}
                download="wedding-album-qr.png"
                className="mt-4 block w-full py-2.5 rounded-xl bg-[#C9A84C] text-white font-semibold text-sm hover:bg-[#b8933d] transition-colors"
              >
                Download QR Code
              </a>
            )}
          </div>
        </div>
      )}

      {/* Lightbox */}
      {lightbox && (
        <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4" onClick={() => setLightbox(null)}>
          <button className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20">
            <X size={22} className="text-white" />
          </button>
          <div onClick={e => e.stopPropagation()} className="max-w-3xl w-full">
            {lightbox.mediaType === 'image' ? (
              <img
                src={`${BASE_URL}${lightbox.fileUrl}`}
                alt={lightbox.originalName}
                className="w-full max-h-[80vh] object-contain rounded-xl"
              />
            ) : (
              <video
                src={`${BASE_URL}${lightbox.fileUrl}`}
                controls
                className="w-full max-h-[80vh] rounded-xl"
              />
            )}
            <div className="flex items-center justify-between mt-3 px-1">
              <p className="text-white/70 text-sm">{lightbox.uploaderName || 'Guest'}</p>
              <div className="flex gap-2">
                <button onClick={() => toggleFav(lightbox.mediaId)} className="p-2 rounded-lg bg-white/10 hover:bg-white/20">
                  <Heart size={16} className={lightbox.isFavorite ? 'text-[#C9A84C] fill-[#C9A84C]' : 'text-white'} />
                </button>
                <button onClick={() => deleteMedia(lightbox.mediaId)} className="p-2 rounded-lg bg-white/10 hover:bg-white/20">
                  <Trash2 size={16} className="text-red-400" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
