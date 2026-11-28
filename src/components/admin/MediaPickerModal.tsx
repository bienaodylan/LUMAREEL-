import React, { useEffect, useMemo, useRef, useState } from 'react';
import { X, Search, Upload, Check, Image as ImageIcon, Film, Loader2 } from 'lucide-react';
import { apiFetchJson, getAuthHeaders } from '../../lib/apiClient';

export interface MediaAssetItem {
  id: string;
  title: string;
  altText: string;
  fileUrl: string;
  mimeType: string;
  mediaType: 'image' | 'video';
  sizeBytes: number;
  folder: 'general' | 'concerts' | 'black_card' | 'souvenirs' | 'homepage' | 'rewards';
  tags: string[];
  createdBy: string;
  createdAt: string;
  isUsed?: boolean;
}

interface MediaPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (fileUrl: string, item?: MediaAssetItem) => void;
  defaultFolder?: MediaAssetItem['folder'];
  title?: string;
}

const FOLDER_OPTIONS: { value: 'all' | MediaAssetItem['folder']; label: string }[] = [
  { value: 'all', label: 'Tous' },
  { value: 'homepage', label: 'Accueil' },
  { value: 'black_card', label: 'Black Card' },
  { value: 'concerts', label: 'Concerts' },
  { value: 'souvenirs', label: 'Souvenirs' },
  { value: 'rewards', label: 'Récompenses' },
  { value: 'general', label: 'Général' },
];

export const MediaPickerModal: React.FC<MediaPickerModalProps> = ({
  isOpen,
  onClose,
  onSelect,
  defaultFolder = 'general',
  title = 'Sélectionner un média',
}) => {
  const [items, setItems] = useState<MediaAssetItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [search, setSearch] = useState('');
  const [folder, setFolder] = useState<'all' | MediaAssetItem['folder']>('all');
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadMedia = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiFetchJson<{ success: boolean; items: MediaAssetItem[] }>('/api/admin/media');
      setItems(data.items || []);
    } catch (err: any) {
      setError(err.message || 'Impossible de charger la médiathèque.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadMedia();
    }
  }, [isOpen]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter((item) => {
      if (folder !== 'all' && item.folder !== folder) return false;
      if (!q) return true;
      return (
        item.title.toLowerCase().includes(q) ||
        item.fileUrl.toLowerCase().includes(q) ||
        item.tags.some((t) => t.toLowerCase().includes(q))
      );
    });
  }, [items, folder, search]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('title', file.name.replace(/\.[^.]+$/, ''));
      formData.append('folder', folder === 'all' ? defaultFolder : folder);
      const authHeaders = await getAuthHeaders();
      const res = await fetch('/api/admin/media/upload', {
        method: 'POST',
        headers: authHeaders,
        body: formData,
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Échec du téléversement.');
      }
      setItems((prev) => [data.item, ...prev]);
      onSelect(data.item.fileUrl, data.item);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Téléversement impossible.');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[80] bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-[#0d0d0d] border border-white/15 rounded-3xl w-full max-w-4xl max-h-[85vh] flex flex-col overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
          <div>
            <p className="text-[10px] font-agrandir-semibold uppercase tracking-[0.2em] text-neutral-400">
              Médiathèque centrale
            </p>
            <h3 className="text-base font-agrandir-extrabold text-white">{title}</h3>
          </div>
          <div className="flex items-center gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,video/*"
              onChange={handleUpload}
              className="hidden"
            />
            <button
              type="button"
              disabled={uploading}
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white text-black hover:bg-neutral-200 text-xs font-agrandir-extrabold transition-colors cursor-pointer disabled:opacity-50"
            >
              {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
              <span>{uploading ? 'Envoi...' : 'Importer un fichier'}</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-neutral-400 hover:text-white cursor-pointer"
              aria-label="Fermer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Search & Folders */}
        <div className="px-6 py-3 border-b border-white/10 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 text-neutral-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher par titre, tag ou URL..."
              className="w-full bg-[#151515] border border-white/10 rounded-xl pl-9 pr-3 py-2 text-xs text-white focus:outline-none focus:border-white/40"
            />
          </div>
          <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5">
            {FOLDER_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setFolder(opt.value)}
                className={`px-3 py-1.5 rounded-lg text-[11px] font-agrandir-semibold whitespace-nowrap transition-colors cursor-pointer ${
                  folder === opt.value
                    ? 'bg-white text-black'
                    : 'bg-white/5 text-neutral-400 hover:text-white hover:bg-white/10'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {error && (
          <div className="mx-6 mt-3 px-4 py-2.5 rounded-xl bg-red-500/10 border border-red-500/30 text-xs text-red-300">
            {error}
          </div>
        )}

        {/* Grid */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="py-16 flex flex-col items-center justify-center text-neutral-400 text-xs gap-3">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>Chargement des médias...</span>
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-16 text-center text-neutral-400 text-xs">
              Aucun média trouvé dans ce dossier. Importez un fichier ci-dessus.
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3.5">
              {filtered.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    onSelect(item.fileUrl, item);
                    onClose();
                  }}
                  className="group text-left bg-[#141414] border border-white/10 hover:border-white/50 rounded-2xl overflow-hidden transition-all cursor-pointer flex flex-col"
                >
                  <div className="aspect-square w-full bg-black relative overflow-hidden">
                    {item.mediaType === 'video' ? (
                      <div className="w-full h-full flex items-center justify-center bg-neutral-900">
                        <Film className="w-7 h-7 text-neutral-500" />
                      </div>
                    ) : (
                      <img
                        src={item.fileUrl}
                        alt={item.altText || item.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        loading="lazy"
                      />
                    )}
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center">
                      <span className="opacity-0 group-hover:opacity-100 transition-opacity px-2.5 py-1 rounded-full bg-white text-black text-[10px] font-agrandir-extrabold flex items-center gap-1">
                        <Check className="w-3 h-3" /> Choisir
                      </span>
                    </div>
                  </div>
                  <div className="p-2.5 space-y-0.5">
                    <div className="text-[11px] font-agrandir-bold text-white truncate">{item.title}</div>
                    <div className="flex items-center justify-between text-[10px] text-neutral-500">
                      <span className="uppercase">{item.folder}</span>
                      {item.mediaType === 'image' ? <ImageIcon className="w-3 h-3" /> : <Film className="w-3 h-3" />}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
