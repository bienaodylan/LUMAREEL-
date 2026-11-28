import React, { useEffect, useState } from 'react';
import { Plus, Trash2, Image as ImageIcon, Layers, Check, Loader2, Camera } from 'lucide-react';
import { apiFetchJson } from '../../../lib/apiClient';
import { MediaPickerModal } from '../MediaPickerModal';

interface SouvenirPhoto {
  id: string;
  photoKey: string;
  photoUrl: string;
  title: string;
  caption: string;
  artist: string;
  eventId: string;
  eventTitle: string;
  eventDate: string;
  eventVenue: string;
  aspectRatio: number;
  downloadable: boolean;
  isPublished: boolean;
  tags: string[];
}

interface EditorialCollection {
  id: string;
  slug: string;
  title: string;
  description: string;
  coverUrl: string;
  isPublished: boolean;
  photoKeys: string[];
}

interface AdminSouvenirsCmsViewProps {
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export const AdminSouvenirsCmsView: React.FC<AdminSouvenirsCmsViewProps> = ({ showToast }) => {
  const [tab, setTab] = useState<'photos' | 'collections'>('photos');
  const [photos, setPhotos] = useState<SouvenirPhoto[]>([]);
  const [collections, setCollections] = useState<EditorialCollection[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // New photo form
  const [photoUrl, setPhotoUrl] = useState('');
  const [photoTitle, setPhotoTitle] = useState('');
  const [photoArtist, setPhotoArtist] = useState('');
  const [photoEventTitle, setPhotoEventTitle] = useState('');
  const [photoVenue, setPhotoVenue] = useState('Palais de la Culture, Abidjan');
  const [photoDate, setPhotoDate] = useState(new Date().toISOString().slice(0, 10));
  const [photoAspect, setPhotoAspect] = useState(0.78);

  // Editorial collection form
  const [editingCollectionId, setEditingCollectionId] = useState<string | null>(null);
  const [colTitle, setColTitle] = useState('');
  const [colDesc, setColDesc] = useState('');
  const [colCover, setColCover] = useState('');
  const [colPhotoKeys, setColPhotoKeys] = useState<string[]>([]);

  const [pickerFor, setPickerFor] = useState<'photo' | 'collection_cover' | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await apiFetchJson<{
        success: boolean;
        photos: SouvenirPhoto[];
        editorialCollections: EditorialCollection[];
      }>('/api/souvenirs/feed');
      setPhotos(data.photos || []);
      setCollections(data.editorialCollections || []);
    } catch (err: any) {
      showToast(err.message || 'Impossible de charger les souvenirs.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleAddPhoto = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!photoUrl.trim()) {
      showToast('Sélectionnez une image dans la médiathèque.', 'error');
      return;
    }
    setSubmitting(true);
    try {
      const data = await apiFetchJson<{ success: boolean; photo: SouvenirPhoto }>('/api/admin/souvenirs/photos', {
        method: 'POST',
        body: JSON.stringify({
          photoUrl: photoUrl.trim(),
          title: photoTitle.trim() || 'Instant Live LUMARÉEL',
          artist: photoArtist.trim() || 'LUMARÉEL',
          eventTitle: photoEventTitle.trim() || 'Concert LUMARÉEL',
          eventVenue: photoVenue.trim(),
          eventDate: photoDate,
          aspectRatio: Number(photoAspect) || 0.8,
          downloadable: true,
          isPublished: true,
        }),
      });
      setPhotos((prev) => [data.photo, ...prev]);
      setPhotoUrl('');
      setPhotoTitle('');
      setPhotoArtist('');
      showToast('Photo ajoutée à la galerie Souvenirs.', 'success');
    } catch (err: any) {
      showToast(err.message || 'Erreur lors de l’ajout.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeletePhoto = async (photoId: string) => {
    try {
      await apiFetchJson(`/api/admin/souvenirs/photos/${photoId}`, { method: 'DELETE' });
      setPhotos((prev) => prev.filter((p) => p.id !== photoId));
      showToast('Photo retirée des souvenirs.', 'success');
    } catch (err: any) {
      showToast(err.message || 'Suppression impossible.', 'error');
    }
  };

  const resetCollectionForm = () => {
    setEditingCollectionId(null);
    setColTitle('');
    setColDesc('');
    setColCover('');
    setColPhotoKeys([]);
  };

  const startEditCollection = (col: EditorialCollection) => {
    setEditingCollectionId(col.id);
    setColTitle(col.title);
    setColDesc(col.description);
    setColCover(col.coverUrl);
    setColPhotoKeys(col.photoKeys || []);
    setTab('collections');
  };

  const togglePhotoInCollection = (photoKey: string) => {
    setColPhotoKeys((prev) =>
      prev.includes(photoKey) ? prev.filter((k) => k !== photoKey) : [...prev, photoKey]
    );
  };

  const handleSaveCollection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!colTitle.trim()) {
      showToast('Titre de collection requis.', 'error');
      return;
    }
    setSubmitting(true);
    try {
      const cover =
        colCover.trim() ||
        photos.find((p) => colPhotoKeys.includes(p.photoKey))?.photoUrl ||
        photos[0]?.photoUrl ||
        '';
      const data = await apiFetchJson<{ success: boolean; collection: EditorialCollection }>(
        '/api/admin/souvenirs/collections',
        {
          method: 'POST',
          body: JSON.stringify({
            id: editingCollectionId || undefined,
            title: colTitle.trim(),
            description: colDesc.trim(),
            coverUrl: cover,
            photoKeys: colPhotoKeys,
            isPublished: true,
          }),
        }
      );
      setCollections((prev) => {
        const exists = prev.some((c) => c.id === data.collection.id);
        return exists
          ? prev.map((c) => (c.id === data.collection.id ? data.collection : c))
          : [...prev, data.collection];
      });
      resetCollectionForm();
      showToast(editingCollectionId ? 'Collection éditoriale mise à jour.' : 'Collection éditoriale créée.', 'success');
    } catch (err: any) {
      showToast(err.message || 'Impossible d’enregistrer la collection.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteCollection = async (id: string) => {
    try {
      await apiFetchJson(`/api/admin/souvenirs/collections/${id}`, { method: 'DELETE' });
      setCollections((prev) => prev.filter((c) => c.id !== id));
      if (editingCollectionId === id) resetCollectionForm();
      showToast('Collection éditoriale supprimée.', 'success');
    } catch (err: any) {
      showToast(err.message || 'Suppression impossible.', 'error');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <p className="text-[10px] font-agrandir-semibold uppercase tracking-[0.2em] text-neutral-400">
            Découverte visuelle & curation
          </p>
          <h1 className="text-2xl font-agrandir-extrabold text-white mt-1">Souvenirs & Collections</h1>
        </div>

        <div className="flex items-center gap-1.5 bg-[#111] border border-white/10 p-1 rounded-2xl w-fit">
          <button
            type="button"
            onClick={() => setTab('photos')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-agrandir-bold cursor-pointer ${
              tab === 'photos' ? 'bg-white text-black' : 'text-neutral-400 hover:text-white'
            }`}
          >
            <Camera className="w-3.5 h-3.5" />
            <span>Galerie ({photos.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setTab('collections')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-agrandir-bold cursor-pointer ${
              tab === 'collections' ? 'bg-white text-black' : 'text-neutral-400 hover:text-white'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Collections éditoriales ({collections.length})</span>
          </button>
        </div>
      </div>

      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center gap-3 text-neutral-400 text-xs">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span>Chargement des souvenirs...</span>
        </div>
      ) : tab === 'photos' ? (
        <div className="space-y-6">
          {/* Add Photo Form */}
          <form onSubmit={handleAddPhoto} className="bg-[#0e0e0e] border border-white/10 rounded-3xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-agrandir-extrabold uppercase tracking-wider text-white">
                Publier une photo dans Souvenirs
              </h2>
              <button
                type="button"
                onClick={() => setPickerFor('photo')}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-agrandir-bold text-white cursor-pointer"
              >
                <ImageIcon className="w-3.5 h-3.5" /> Choisir depuis la médiathèque
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <input
                type="text"
                required
                value={photoUrl}
                onChange={(e) => setPhotoUrl(e.target.value)}
                placeholder="URL image (ou sélection médiathèque)"
                className="bg-[#161616] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white font-mono"
              />
              <input
                type="text"
                value={photoTitle}
                onChange={(e) => setPhotoTitle(e.target.value)}
                placeholder="Titre / Moment (ex: Entrée sur scène)"
                className="bg-[#161616] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white"
              />
              <input
                type="text"
                value={photoArtist}
                onChange={(e) => setPhotoArtist(e.target.value)}
                placeholder="Artiste (ex: Didi B, Himra...)"
                className="bg-[#161616] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white"
              />
              <input
                type="text"
                value={photoEventTitle}
                onChange={(e) => setPhotoEventTitle(e.target.value)}
                placeholder="Concert associé"
                className="bg-[#161616] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white"
              />
              <input
                type="text"
                value={photoVenue}
                onChange={(e) => setPhotoVenue(e.target.value)}
                placeholder="Lieu / Salle"
                className="bg-[#161616] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white"
              />
              <div className="flex gap-2">
                <input
                  type="date"
                  value={photoDate}
                  onChange={(e) => setPhotoDate(e.target.value)}
                  className="flex-1 bg-[#161616] border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white"
                />
                <select
                  value={photoAspect}
                  onChange={(e) => setPhotoAspect(Number(e.target.value))}
                  className="bg-[#161616] border border-white/10 rounded-xl px-2.5 py-2.5 text-xs text-white"
                  title="Format Masonry"
                >
                  <option value={0.68}>Portrait haut</option>
                  <option value={0.8}>Portrait 4:5</option>
                  <option value={1}>Carré 1:1</option>
                  <option value={1.35}>Paysage</option>
                </select>
              </div>
            </div>

            <div className="flex items-center justify-between">
              {photoUrl ? (
                <div className="flex items-center gap-2.5">
                  <img src={photoUrl} alt="Aperçu" className="w-10 h-10 rounded-lg object-cover border border-white/15" />
                  <span className="text-[11px] text-neutral-400">Image prête à être publiée</span>
                </div>
              ) : (
                <span className="text-[11px] text-neutral-500">Aucun visuel sélectionné</span>
              )}
              <button
                type="submit"
                disabled={submitting}
                className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-white hover:bg-neutral-200 text-black text-xs font-agrandir-extrabold cursor-pointer disabled:opacity-50"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Publier la photo</span>
              </button>
            </div>
          </form>

          {/* Existing Photos */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {photos.map((p) => (
              <div
                key={p.id}
                className="bg-[#0e0e0e] border border-white/10 rounded-2xl overflow-hidden flex flex-col"
              >
                <div className="aspect-[4/5] bg-black relative overflow-hidden">
                  <img src={p.photoUrl} alt={p.title} className="w-full h-full object-cover" loading="lazy" />
                  <button
                    type="button"
                    onClick={() => handleDeletePhoto(p.id)}
                    className="absolute top-2 right-2 p-2 rounded-xl bg-black/75 hover:bg-red-600 text-white transition-colors cursor-pointer"
                    title="Supprimer cette photo"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="p-3 space-y-0.5">
                  <div className="text-xs font-agrandir-bold text-white truncate">{p.title}</div>
                  <div className="text-[11px] text-neutral-400 truncate">
                    {p.artist} · {p.eventTitle}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Collection Editor */}
          <form
            onSubmit={handleSaveCollection}
            className="lg:col-span-3 bg-[#0e0e0e] border border-white/10 rounded-3xl p-5 space-y-4 h-fit"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-agrandir-extrabold uppercase tracking-wider text-white">
                {editingCollectionId ? 'Modifier la collection éditoriale' : 'Nouvelle collection éditoriale'}
              </h2>
              {editingCollectionId && (
                <button
                  type="button"
                  onClick={resetCollectionForm}
                  className="text-[11px] text-neutral-400 hover:text-white cursor-pointer"
                >
                  Annuler l’édition
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <input
                type="text"
                required
                value={colTitle}
                onChange={(e) => setColTitle(e.target.value)}
                placeholder="Titre (ex: Best of Abidjan Live)"
                className="bg-[#161616] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white"
              />
              <div className="flex gap-2">
                <input
                  type="text"
                  value={colCover}
                  onChange={(e) => setColCover(e.target.value)}
                  placeholder="Couverture (URL ou médiathèque)"
                  className="flex-1 bg-[#161616] border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white font-mono"
                />
                <button
                  type="button"
                  onClick={() => setPickerFor('collection_cover')}
                  className="px-3 rounded-xl bg-white/10 hover:bg-white/20 text-white cursor-pointer"
                  title="Choisir dans la médiathèque"
                >
                  <ImageIcon className="w-4 h-4" />
                </button>
              </div>
            </div>

            <textarea
              rows={2}
              value={colDesc}
              onChange={(e) => setColDesc(e.target.value)}
              placeholder="Courte description éditoriale..."
              className="w-full bg-[#161616] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white resize-none"
            />

            <div>
              <div className="text-[10px] uppercase tracking-wider text-neutral-400 mb-2">
                Sélectionner les photos ({colPhotoKeys.length} choisies)
              </div>
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-64 overflow-y-auto pr-1">
                {photos.map((p) => {
                  const selected = colPhotoKeys.includes(p.photoKey);
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => togglePhotoInCollection(p.photoKey)}
                      className={`relative aspect-square rounded-xl overflow-hidden border-2 transition-all cursor-pointer ${
                        selected ? 'border-white scale-[0.98]' : 'border-transparent opacity-60 hover:opacity-100'
                      }`}
                    >
                      <img src={p.photoUrl} alt={p.title} className="w-full h-full object-cover" />
                      {selected && (
                        <span className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-white text-black flex items-center justify-center">
                          <Check className="w-3 h-3" />
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={submitting}
                className="px-5 py-2.5 rounded-xl bg-white hover:bg-neutral-200 text-black text-xs font-agrandir-extrabold cursor-pointer disabled:opacity-50"
              >
                {editingCollectionId ? 'Mettre à jour' : 'Créer la collection'}
              </button>
            </div>
          </form>

          {/* Collections List */}
          <div className="lg:col-span-2 space-y-3">
            {collections.map((col) => (
              <div
                key={col.id}
                className="bg-[#0e0e0e] border border-white/10 rounded-2xl p-3.5 flex items-center gap-3.5"
              >
                <img
                  src={col.coverUrl || photos[0]?.photoUrl}
                  alt={col.title}
                  className="w-16 h-16 rounded-xl object-cover bg-black shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-agrandir-bold text-white truncate">{col.title}</div>
                  <div className="text-[11px] text-neutral-400 truncate mt-0.5">{col.description}</div>
                  <div className="text-[10px] text-neutral-500 mt-1">{col.photoKeys.length} photos</div>
                </div>
                <div className="flex flex-col gap-1.5">
                  <button
                    type="button"
                    onClick={() => startEditCollection(col)}
                    className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-[10px] font-agrandir-bold text-white cursor-pointer"
                  >
                    Éditer
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteCollection(col.id)}
                    className="px-2.5 py-1 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-[10px] font-agrandir-bold text-red-400 cursor-pointer"
                  >
                    Suppr.
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <MediaPickerModal
        isOpen={pickerFor !== null}
        onClose={() => setPickerFor(null)}
        defaultFolder="souvenirs"
        title={pickerFor === 'photo' ? 'Choisir une photo Souvenir' : 'Choisir la couverture de la collection'}
        onSelect={(url) => {
          if (pickerFor === 'photo') setPhotoUrl(url);
          if (pickerFor === 'collection_cover') setColCover(url);
        }}
      />
    </div>
  );
};
