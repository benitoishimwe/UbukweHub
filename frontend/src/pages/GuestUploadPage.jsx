import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import { Camera, Upload, CheckCircle, X, Image, Video, Loader2, Heart } from 'lucide-react';

const BASE_URL = process.env.REACT_APP_BACKEND_URL;

export default function GuestUploadPage() {
  const { token } = useParams();
  const [album, setAlbum] = useState(null);
  const [error, setError] = useState(null);
  const [uploaderName, setUploaderName] = useState('');
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState({});
  const [done, setDone] = useState(false);
  const fileInputRef = useRef();

  useEffect(() => {
    axios.get(`${BASE_URL}/api/upload/${token}`)
      .then(r => setAlbum(r.data))
      .catch(() => setError('This album link is invalid or has expired.'));
  }, [token]);

  const handleFileSelect = (e) => {
    const selected = Array.from(e.target.files || []);
    const previews = selected.map(f => ({
      file: f,
      id: Math.random().toString(36).slice(2),
      preview: f.type.startsWith('image/') ? URL.createObjectURL(f) : null,
      type: f.type.startsWith('video/') ? 'video' : 'image',
      size: f.size,
    }));
    setFiles(prev => [...prev, ...previews]);
  };

  const removeFile = (id) => {
    setFiles(prev => prev.filter(f => f.id !== id));
  };

  const handleUpload = async () => {
    if (!files.length) return;
    setUploading(true);

    const formData = new FormData();
    files.forEach(f => formData.append('files', f.file));
    if (uploaderName.trim()) formData.append('uploader_name', uploaderName.trim());

    try {
      await axios.post(`${BASE_URL}/api/upload/${token}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (e) => {
          const pct = Math.round((e.loaded * 100) / (e.total || 1));
          setProgress({ overall: pct });
        },
      });
      setDone(true);
      files.forEach(f => { if (f.preview) URL.revokeObjectURL(f.preview); });
    } catch (err) {
      setError(err.response?.data?.error || 'Upload failed. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const formatSize = (bytes) => {
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  };

  if (error) return (
    <div className="min-h-screen bg-[#F5F0E8] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl p-8 max-w-sm w-full text-center shadow-lg">
        <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
          <X className="text-red-500" size={32} />
        </div>
        <h2 className="text-xl font-bold text-[#2D2D2D] mb-2">Link Not Found</h2>
        <p className="text-[#5C5C5C] text-sm">{error}</p>
      </div>
    </div>
  );

  if (!album) return (
    <div className="min-h-screen bg-[#F5F0E8] flex items-center justify-center">
      <Loader2 className="animate-spin text-[#C9A84C]" size={40} />
    </div>
  );

  if (done) return (
    <div className="min-h-screen bg-[#F5F0E8] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl p-8 max-w-sm w-full text-center shadow-lg">
        <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
          <CheckCircle className="text-green-500" size={40} />
        </div>
        <h2 className="text-2xl font-bold text-[#2D2D2D] mb-2" style={{fontFamily:'Playfair Display,serif'}}>
          Thank You!
        </h2>
        <p className="text-[#5C5C5C] mb-4">
          Your {files.length} photo{files.length !== 1 ? 's' : ''} {files.length !== 1 ? 'have' : 'has'} been added to the wedding album.
        </p>
        <div className="flex items-center justify-center gap-1 text-[#C9A84C]">
          <Heart size={16} fill="currentColor" />
          <span className="text-sm font-medium">Wishing the couple a lifetime of happiness</span>
        </div>
        <button
          onClick={() => { setDone(false); setFiles([]); setProgress({}); setError(null); }}
          className="mt-6 w-full py-2.5 rounded-xl bg-[#C9A84C15] text-[#C9A84C] font-semibold text-sm hover:bg-[#C9A84C25] transition-colors"
        >
          Upload More Photos
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F5F0E8] flex flex-col items-center px-4 py-8">
      {/* Header */}
      <div className="w-full max-w-md mb-6 text-center">
        <div className="w-14 h-14 rounded-2xl bg-[#C9A84C] flex items-center justify-center mx-auto mb-3 shadow-md">
          <Camera className="text-white" size={28} />
        </div>
        <h1 className="text-2xl font-bold text-[#2D2D2D]" style={{fontFamily:'Playfair Display,serif'}}>
          {album.title}
        </h1>
        {album.description && (
          <p className="text-[#5C5C5C] text-sm mt-1">{album.description}</p>
        )}
        <p className="text-xs text-[#5C5C5C] mt-2">
          {album.media_count} photo{album.media_count !== 1 ? 's' : ''} shared so far
        </p>
      </div>

      <div className="w-full max-w-md space-y-4">
        {/* Name field */}
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <label className="block text-sm font-semibold text-[#2D2D2D] mb-2">Your Name (optional)</label>
          <input
            type="text"
            value={uploaderName}
            onChange={e => setUploaderName(e.target.value)}
            placeholder="e.g. Aunt Marie"
            className="w-full border border-[#EBE5DB] rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#C9A84C40]"
          />
        </div>

        {/* Drop zone */}
        <div
          className="bg-white rounded-2xl border-2 border-dashed border-[#C9A84C60] p-8 text-center cursor-pointer hover:border-[#C9A84C] hover:bg-[#C9A84C05] transition-all shadow-sm"
          onClick={() => fileInputRef.current?.click()}
          onDragOver={e => e.preventDefault()}
          onDrop={e => {
            e.preventDefault();
            const dt = e.dataTransfer;
            if (dt.files.length) {
              const ev = { target: { files: dt.files } };
              handleFileSelect(ev);
            }
          }}
        >
          <Upload className="text-[#C9A84C] mx-auto mb-2" size={32} />
          <p className="font-semibold text-[#2D2D2D] text-sm">Tap to select photos & videos</p>
          <p className="text-xs text-[#5C5C5C] mt-1">
            {album.allow_videos ? 'Images and videos' : 'Images only'} · Max {album.max_file_size_mb}MB per file
          </p>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept={album.allow_videos ? 'image/*,video/*' : 'image/*'}
            className="hidden"
            onChange={handleFileSelect}
          />
        </div>

        {/* File previews */}
        {files.length > 0 && (
          <div className="bg-white rounded-2xl p-4 shadow-sm">
            <p className="text-sm font-semibold text-[#2D2D2D] mb-3">{files.length} file{files.length !== 1 ? 's' : ''} selected</p>
            <div className="grid grid-cols-3 gap-2">
              {files.map(f => (
                <div key={f.id} className="relative aspect-square rounded-xl overflow-hidden bg-[#F5F0E8] group">
                  {f.preview ? (
                    <img src={f.preview} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center gap-1">
                      <Video className="text-[#C9A84C]" size={20} />
                      <span className="text-[10px] text-[#5C5C5C] text-center px-1 truncate w-full text-center">
                        {formatSize(f.size)}
                      </span>
                    </div>
                  )}
                  <button
                    onClick={() => removeFile(f.id)}
                    className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X size={10} className="text-white" />
                  </button>
                  {f.type === 'image' ? (
                    <div className="absolute bottom-1 left-1">
                      <Image size={10} className="text-white drop-shadow" />
                    </div>
                  ) : (
                    <div className="absolute bottom-1 left-1">
                      <Video size={10} className="text-white drop-shadow" />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Upload progress */}
        {uploading && progress.overall !== undefined && (
          <div className="bg-white rounded-2xl p-4 shadow-sm">
            <div className="flex justify-between text-sm mb-2">
              <span className="font-medium text-[#2D2D2D]">Uploading…</span>
              <span className="text-[#C9A84C] font-semibold">{progress.overall}%</span>
            </div>
            <div className="h-2 bg-[#F5F0E8] rounded-full overflow-hidden">
              <div
                className="h-full bg-[#C9A84C] rounded-full transition-all duration-300"
                style={{ width: `${progress.overall}%` }}
              />
            </div>
          </div>
        )}

        {/* Upload button */}
        <button
          onClick={handleUpload}
          disabled={!files.length || uploading}
          className="w-full py-3.5 rounded-2xl bg-[#C9A84C] text-white font-bold text-base shadow-md hover:bg-[#b8933d] disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
        >
          {uploading ? (
            <><Loader2 size={20} className="animate-spin" /> Uploading…</>
          ) : (
            <><Upload size={20} /> Share {files.length > 0 ? `${files.length} ` : ''}Photo{files.length !== 1 ? 's' : ''}</>
          )}
        </button>
      </div>
    </div>
  );
}
