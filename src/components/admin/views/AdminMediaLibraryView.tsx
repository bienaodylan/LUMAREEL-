import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Upload,
  Search,
  Trash2,
  Copy,
  Check,
  Image as ImageIcon,
  Film,
  FolderOpen,
  Loader2,
  Eye,
  X,
} from 'lucide-react';
import { apiFetchJson, getAuthHeaders } from '../../../lib/apiClient';
import { MediaAssetItem } from '../MediaPickerModal';

interface AdminMediaLibraryViewProps {
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

const FOLDERS: { value: 'all' | MediaAssetItem['folder']; label: string }[] = [
  { value: 'all', label: 'Tous les dossiers' },
  { value: 'homepage', label: 'Accueil' },
  { value: 'black_card', label: 'Black Card' },
  { value: 'concerts', label: 'Concerts' },
  { value: 'souvenirs', label: 'Souvenirs' },
  { value: 'rewards', label: 'Récompenses' },
  { value: 'general', label: 'Général' },
];

export const AdminMediaLibraryView: React.FC<AdminMediaLibraryViewProps> = ({ showToast }) => {
  const [items, setItems] = useState<MediaAssetItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [search, setSearch] = useState('');
  const [folderFilter, setFolderFilter] = useState<'all' | MediaAssetItem['folder']>('all');
  const [usageFilter, setUsageFilter] = useState<'all' | 'used' | 'unused'>('all');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [previewItem, setPreviewItem] = useState<MediaAssetItem | null>(null);

  // Upload metadata fields
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadFolder, setUploadFolder] = useState<MediaAssetItem['folder']>('concerts');
  const [uploadTags, setUploadTags] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadMedia = async () => {
    setLoading(true);
    try {
      const data = await apiFetchJson<{ success: boolean; items: MediaAssetItem[] }>('/api/admin/media');
      setItems(data.items || []);
    } catch (err: any) {
      showToast(err.message || 'Erreur lors du chargement de la médiathèque.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMedia();
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter((item) => {
      if (folderFilter !== 'all' && item.folder !== folderFilter) return false;
      if (usageFilter === 'used' && !item.isUsed) return false;
      if (usageFilter === 'unused' && item.isUsed) return false;
      if (!q) return true;
      return (
        item.title.toLowerCase().includes(q) ||
        item.fileUrl.toLowerCase().includes(q) ||
        item.tags.some((t) => t.toLowerCase().includes(q))
      );
    });
  }, [items, folderFilter, usageFilter, search]);

  const stats = useMemo(() => {
    const used = items.filter((i) => i.isUsed).length;
    const unused = items.length - used;
    return { total: items.length, used, unused };
  }, [items]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('title', uploadTitle.trim() || file.name.replace(/\.[^.]+$/, ''));
      formData.append('folder', uploadFolder);
      formData.append('tags', uploadTags);

      const authHeaders = await getAuthHeaders();
      const res = await fetch('/api/admin/media/upload', {
        method: 'POST',
        headers: authHeaders,
        body: formData,
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Téléversement refusé.');
      }

      setItems((prev) => [{ ...data.item, isUsed: false }, ...prev]);
      setUploadTitle('');
      setUploadTags('');
      showToast('Média ajouté à la bibliothèque centrale.', 'success');
    } catch (err: any) {
      showToast(err.message || 'Impossible de téléverser le fichier.', 'error');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDelete = async (item: MediaAssetItem) => {
    if (item.isUsed) {
      showToast('Ce média est actuellement utilisé sur le site. Retirez-le d’abord avant suppression.', 'error');
      return;
    }
    try {
      await apiFetchJson(`/api/admin/media/${item.id}`, { method: 'DELETE' });
      setItems((prev) => prev.filter((m) => m.id !== item.id));
      showToast('Média supprimé.', 'success');
    } catch (err: any) {
      showToast(err.message || 'Suppression impossible.', 'error');
    }
  };

  const copyUrl = (item: MediaAssetItem) => {
    navigator.clipboard?.writeText(item.fileUrl);
    setCopiedId(item.id);
    showToast('Lien du média copié.', 'info');
    setTimeout(() => setCopiedId(null), 1500);
  };

  const formatBytes = (bytes: number) => {
    if (!bytes) return 'Asset interne';
    if (bytes < 1024) return `${bytes} o`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} Ko`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
  };

  return (
    <div className="space-y-6">
      {/* Header & KPIs */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <p className="text-[10px] font-agrandir-semibold uppercase tracking-[0.2em] text-neutral-400">
            Référentiel unique des visuels
          </p>
          <h1 className="text-2xl font-agrandir-extrabold text-white mt-1">Médiathèque Centrale</h1>
        </div>

        <div className="flex items-center gap-3">
          <div className="px-4 py-2 rounded-2xl bg-[#111] border border-white/10 text-center">
            <div className="text-base font-agrandir-extrabold text-white">{stats.total}</div>
            <div className="text-[10px] text-neutral-400 uppercase">Médias</div>
          </div>
          <div className="px-4 py-2 rounded-2xl bg-[#111] border border-white/10 text-center">
            <div className="text-base font-agrandir-extrabold text-emerald-400">{stats.used}</div>
            <div className="text-[10px] text-neutral-400 uppercase">Utilisés</div>
          </div>
          <div className="px-4 py-2 rounded-2xl bg-[#111] border border-white/10 text-center">
            <div className="text-base font-agrandir-extrabold text-amber-400">{stats.unused}</div>
            <div className="text-[10px] text-neutral-400 uppercase">Inutilisés</div>
          </div>
        </div>
      </div>

      {/* Upload Box */}
      <div className="bg-[#0e0e0e] border border-white/10 rounded-3xl p-5 space-y-4">
        <div className="flex items-center gap-2 text-xs font-agrandir-bold text-white">
          <Upload className="w-4 h-4 text-neutral-300" />
          <span>Importer un nouveau média (image ou vidéo)</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <input
            type="text"
            value={uploadTitle}
            onChange={(e) => setUploadTitle(e.target.value)}
            placeholder="Titre du média (ex: Affiche Concert)"
            className="bg-[#161616] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-white/40"
          />
          <select
            value={uploadFolder}
            onChange={(e) => setUploadFolder(e.target.value as MediaAssetItem['folder'])}
            className="bg-[#161616] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-white/40"
          >
            {FOLDERS.filter((f) => f.value !== 'all').map((f) => (
              <option key={f.value} value={f.value}>
                Dossier : {f.label}
              </option>
            ))}
          </select>
          <input
            type="text"
            value={uploadTags}
            onChange={(e) => setUploadTags(e.target.value)}
            placeholder="Tags séparés par virgule"
            className="bg-[#161616] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-white/40"
          />
          <div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,video/*"
              onChange={handleFileUpload}
              className="hidden"
            />
            <button
              type="button"
              disabled={uploading}
              onClick={() => fileInputRef.current?.click()}
              className="w-full h-full min-h-[40px] flex items-center justify-center gap-2 rounded-xl bg-white hover:bg-neutral-200 text-black text-xs font-agrandir-extrabold transition-colors cursor-pointer disabled:opacity-50"
            >
              {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
              <span>{uploading ? 'Téléversement...' : 'Choisir un fichier'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-neutral-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher un visuel, tag ou lien..."
            className="w-full bg-[#111] border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white focus:outline-none focus:border-white/40"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1 bg-[#111] border border-white/10 p-1 rounded-xl">
            {(['all', 'used', 'unused'] as const).map((u) => (
              <button
                key={u}
                type="button"
                onClick={() => setUsageFilter(u)}
                className={`px-3 py-1 rounded-lg text-[11px] font-agrandir-semibold transition-colors cursor-pointer ${
                  usageFilter === u ? 'bg-white text-black' : 'text-neutral-400 hover:text-white'
                }`}
              >
                {u === 'all' ? 'Tout' : u === 'used' ? 'Utilisés' : 'Inutilisés'}
              </button>
            ))}
          </div>

          <select
            value={folderFilter}
            onChange={(e) => setFolderFilter(e.target.value as any)}
            className="bg-[#111] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
          >
            {FOLDERS.map((f) => (
              <option key={f.value} value={f.value}>
                {f.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Media Grid */}
      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center text-neutral-400 text-xs gap-3">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span>Chargement de la médiathèque...</span>
        </div>
      ) : filtered.length === 0 ? (
        <div className="py-20 text-center bg-[#0d0d0d] border border-white/10 rounded-3xl text-neutral-400 text-xs">
          <FolderOpen className="w-8 h-8 mx-auto mb-2 text-neutral-600" />
          Aucun média ne correspond à ces filtres.
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {filtered.map((item) => (
            <div
              key={item.id}
              className="group bg-[#0e0e0e] border border-white/10 rounded-2xl overflow-hidden flex flex-col hover:border-white/25 transition-colors"
            >
              <div className="aspect-[4/3] bg-black relative overflow-hidden">
                {item.mediaType === 'video' ? (
                  <div className="w-full h-full flex items-center justify-center bg-neutral-950">
                    <Film className="w-8 h-8 text-neutral-500" />
                  </div>
                ) : (
                  <img
                    src={item.fileUrl}
                    alt={item.altText || item.title}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                )}
                <div className="absolute top-2 left-2 flex items-center gap-1.5">
                  <span
                    className={`px-2 py-0.5 rounded-full text-[9px] font-agrandir-bold uppercase ${
                      item.isUsed
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                        : 'bg-black/70 text-neutral-300 border border-white/15'
                    }`}
                  >
                    {item.isUsed ? 'Utilisé' : 'Libre'}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setPreviewItem(item)}
                  className="absolute top-2 right-2 p-1.5 rounded-lg bg-black/70 text-white opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                  title="Aperçu"
                >
                  <Eye className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="p-3 flex-1 flex flex-col justify-between gap-2">
                <div>
                  <div className="text-xs font-agrandir-bold text-white truncate" title={item.title}>
                    {item.title}
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-neutral-500 mt-1">
                    <span className="uppercase">{item.folder}</span>
                    <span>{formatBytes(item.sizeBytes)}</span>
                  </div>
                  {item.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {item.tags.slice(0, 3).map((tag) => (
                        <span
                          key={tag}
                          className="px-1.5 py-0.5 rounded bg-white/5 text-[9px] text-neutral-400"
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-white/10">
                  <button
                    type="button"
                    onClick={() => copyUrl(item)}
                    className="flex items-center gap-1 text-[10px] font-agrandir-semibold text-neutral-300 hover:text-white cursor-pointer"
                  >
                    {copiedId === item.id ? (
                      <>
                        <Check className="w-3 h-3 text-emerald-400" /> Copié
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3" /> Copier lien
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDelete(item)}
                    disabled={Boolean(item.isUsed)}
                    className={`p-1.5 rounded-lg transition-colors ${
                      item.isUsed
                        ? 'text-neutral-700 cursor-not-allowed'
                        : 'text-neutral-400 hover:text-red-400 hover:bg-red-500/10 cursor-pointer'
                    }`}
                    title={item.isUsed ? 'Média actuellement utilisé' : 'Supprimer ce média'}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Lightbox preview */}
      {previewItem && (
        <div
          onClick={() => setPreviewItem(null)}
          className="fixed inset-0 z-[90] bg-black/90 backdrop-blur-md flex items-center justify-center p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-[#0e0e0e] border border-white/15 rounded-3xl max-w-2xl w-full overflow-hidden"
          >
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/10">
              <div className="flex items-center gap-2 text-xs font-agrandir-bold text-white truncate">
                {previewItem.mediaType === 'video' ? <Film className="w-4 h-4" /> : <ImageIcon className="w-4 h-4" />}
                <span className="truncate">{previewItem.title}</span>
              </div>
              <button
                type="button"
                onClick={() => setPreviewItem(null)}
                className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-neutral-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="bg-black flex items-center justify-center max-h-[65vh] overflow-hidden">
              {previewItem.mediaType === 'video' ? (
                <video src={previewItem.fileUrl} controls className="max-h-[65vh] w-full" />
              ) : (
                <img src={previewItem.fileUrl} alt={previewItem.title} className="max-h-[65vh] object-contain" />
              )}
            </div>
            <div className="px-5 py-3 text-[11px] text-neutral-400 flex items-center justify-between gap-3">
              <span className="truncate font-mono">{previewItem.fileUrl}</span>
              <button
                type="button"
                onClick={() => copyUrl(previewItem)}
                className="px-3 py-1.5 rounded-lg bg-white text-black font-agrandir-bold text-[10px] shrink-0 cursor-pointer"
              >
                Copier l'URL
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
