import React, { useState } from 'react';
import { ArchiveProduction } from '../../../types';
import { Plus, Edit3, Trash2, Film, Play, Upload, Image as ImageIcon, CheckCircle2, X } from 'lucide-react';
import { convertToYouTubeEmbed, readFileAsDataURL } from '../../../utils/mediaUtils';

interface AdminArchivesViewProps {
  archives: ArchiveProduction[];
  onSaveArchive: (archive: Partial<ArchiveProduction> & { title: string; coverImage: string }) => Promise<void>;
  onDeleteArchive: (id: string) => Promise<void>;
  showToast: (msg: string, type?: 'info' | 'success' | 'error') => void;
}

export const AdminArchivesView: React.FC<AdminArchivesViewProps> = ({
  archives,
  onSaveArchive,
  onDeleteArchive,
  showToast,
}) => {
  const [editingArchive, setEditingArchive] = useState<Partial<ArchiveProduction> | null>(null);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [uploadingGallery, setUploadingGallery] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingArchive?.title) {
      showToast('Le titre de l’archive est requis.', 'error');
      return;
    }
    if (!editingArchive?.coverImage) {
      showToast('La couverture de l’archive est obligatoire.', 'error');
      return;
    }

    try {
      await onSaveArchive({
        id: editingArchive.id,
        title: editingArchive.title,
        coverImage: editingArchive.coverImage,
        year: editingArchive.year || '2026',
        date: editingArchive.date || '2026',
        city: editingArchive.city || 'Abidjan',
        country: editingArchive.country || 'Côte d’Ivoire',
        venue: editingArchive.venue || 'Palais de la Culture',
        artists: editingArchive.artists || [editingArchive.title],
        description: editingArchive.description || '',
        youtubeUrl: editingArchive.youtubeUrl || '',
        youtubeEmbedUrl: editingArchive.youtubeEmbedUrl || (editingArchive.youtubeUrl ? convertToYouTubeEmbed(editingArchive.youtubeUrl) : ''),
        duration: editingArchive.duration || 'Live HD',
        photos: editingArchive.photos || [],
        isPublished: true,
        orderIndex: editingArchive.orderIndex || archives.length + 1,
      });

      showToast('Archive vidéo enregistrée avec succès !', 'success');
      setEditingArchive(null);
    } catch (err: any) {
      showToast(err.message || 'Erreur lors de la sauvegarde.', 'error');
    }
  };

  const handleCoverUpload = async (file: File) => {
    try {
      setUploadingCover(true);
      let fileUrl = '';
      try {
        const formData = new FormData();
        formData.append('file', file);
        const res = await fetch('/api/upload', { method: 'POST', body: formData });
        if (res.ok) {
          const data = await res.json();
          if (data.success && data.url) {
            fileUrl = data.url;
          }
        }
      } catch (uploadErr) {
        console.warn('Upload fallback to dataUrl', uploadErr);
      }

      if (!fileUrl) {
        fileUrl = await readFileAsDataURL(file);
      }

      setEditingArchive((prev) => ({ ...prev, coverImage: fileUrl }));
      showToast('Couverture importée et synchronisée.', 'success');
    } catch {
      showToast("Erreur lors de l'import de la couverture.", 'error');
    } finally {
      setUploadingCover(false);
    }
  };

  const handleGalleryUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    try {
      setUploadingGallery(true);
      const promises = Array.from(files).map((f) => readFileAsDataURL(f));
      const newPhotos = await Promise.all(promises);
      setEditingArchive((prev) => ({
        ...prev,
        photos: [...(prev?.photos || []), ...newPhotos],
      }));
      showToast(`${newPhotos.length} photo(s) ajoutée(s) à la galerie.`, 'success');
    } catch {
      showToast('Erreur lors de l’import des photos.', 'error');
    } finally {
      setUploadingGallery(false);
    }
  };

  return (
    <div className="space-y-6 select-none">
      
      {/* 1. Header Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="text-[10px] font-agrandir-semibold tracking-[0.25em] text-[#d4af37] uppercase mb-1">
            MÉTHODOLOGIE VIDÉO YOUTUBE &amp; RÉCAPS
          </div>
          <h1 className="font-agrandir-extrabold text-2xl sm:text-3xl text-white tracking-tight uppercase">
            ARCHIVES &amp; RÉCAPS VIDÉO ({archives.length})
          </h1>
          <p className="text-xs text-[#888] mt-1">
            Les 3 premières archives de cette liste s'affichent automatiquement sur la page d'accueil.
          </p>
        </div>

        <button
          onClick={() =>
            setEditingArchive({
              title: '',
              year: '2026',
              venue: 'Palais de la Culture Bernard Binlin-Dadié',
              city: 'Abidjan',
              country: 'Côte d’Ivoire',
              description: '',
              youtubeUrl: '',
              coverImage: '/assets/aistudio/WhatsApp_Image_2026-10-28_at_16.54.31__2__4a5b834d.jpeg',
              photos: [],
              orderIndex: archives.length + 1,
            })
          }
          className="self-start sm:self-auto px-5 py-2.5 rounded-xl bg-white hover:bg-neutral-200 text-black font-agrandir-extrabold text-xs uppercase tracking-wider flex items-center gap-2 transition-colors cursor-pointer shadow-lg"
        >
          <Plus className="w-4 h-4" />
          <span>Nouvelle archive vidéo</span>
        </button>
      </div>

      {/* 2. Grid of Archives */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {archives.map((arc, idx) => (
          <div
            key={arc.id}
            className="bg-[#0c0c0c] border border-white/10 hover:border-white/20 rounded-3xl p-5 shadow-xl space-y-4 group transition-all"
          >
            {/* 16:9 Thumbnail preview */}
            <div className="aspect-[16/9] w-full rounded-2xl overflow-hidden bg-black relative border border-white/10">
              <img
                src={arc.coverImage}
                alt={arc.title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
              <div className="absolute top-2.5 left-2.5 px-2 py-0.5 rounded-full bg-black/70 backdrop-blur-md text-[9px] font-agrandir-semibold text-[#d4af37] border border-white/10">
                #{idx + 1} {idx < 3 ? '· ACCUEIL' : ''}
              </div>

              {arc.youtubeUrl && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/30 pointer-events-none">
                  <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-md border border-white/30 flex items-center justify-center text-white">
                    <Play className="w-4 h-4 fill-white" />
                  </div>
                </div>
              )}
            </div>

            {/* Info */}
            <div>
              <div className="text-[10px] text-[#888] uppercase font-mono">{arc.year} · {arc.venue}</div>
              <h3 className="font-agrandir-extrabold text-base text-white uppercase truncate mt-0.5">
                {arc.title}
              </h3>
              <p className="text-xs text-[#777] line-clamp-2 mt-1 font-agrandir-regular">
                {arc.description || 'Production scénique exclusive signée LUMARÉEL CO.'}
              </p>
            </div>

            {/* Gallery count & Actions */}
            <div className="pt-3 border-t border-white/10 flex items-center justify-between text-xs">
              <span className="text-[#888] text-[11px]">
                {arc.photos?.length || 0} photo(s) backstage
              </span>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setEditingArchive(arc)}
                  className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-white border border-white/10 transition-colors"
                  title="Modifier"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => onDeleteArchive(arc.id)}
                  className="p-2 rounded-xl bg-white/5 hover:bg-rose-500/20 text-[#888] hover:text-rose-400 border border-white/10 transition-colors"
                  title="Supprimer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* 3. Modal Formulaire Archive */}
      {editingArchive && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-[#0f0f0f] border border-white/20 rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 sm:p-8 space-y-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div>
                <div className="text-[10px] font-agrandir-semibold text-[#d4af37] uppercase">CMS ARCHIVES VIDÉO</div>
                <h2 className="font-agrandir-extrabold text-xl text-white uppercase">
                  {editingArchive.id ? 'Modifier l’archive' : 'Nouvelle archive de concert'}
                </h2>
              </div>
              <button
                onClick={() => setEditingArchive(null)}
                className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-neutral-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-[10px] font-agrandir-semibold uppercase text-[#888] mb-1">
                  Titre du Concert / Production
                </label>
                <input
                  type="text"
                  required
                  value={editingArchive.title || ''}
                  onChange={(e) => setEditingArchive({ ...editingArchive, title: e.target.value })}
                  placeholder="Ex: Leto en concert, Nocturne #01..."
                  className="w-full bg-[#161616] border border-white/15 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-white font-agrandir-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-agrandir-semibold uppercase text-[#888] mb-1">
                    Année
                  </label>
                  <input
                    type="text"
                    value={editingArchive.year || '2026'}
                    onChange={(e) => setEditingArchive({ ...editingArchive, year: e.target.value })}
                    className="w-full bg-[#161616] border border-white/15 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-agrandir-semibold uppercase text-[#888] mb-1">
                    Lieu / Salle
                  </label>
                  <input
                    type="text"
                    value={editingArchive.venue || ''}
                    onChange={(e) => setEditingArchive({ ...editingArchive, venue: e.target.value })}
                    className="w-full bg-[#161616] border border-white/15 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-agrandir-semibold uppercase text-[#888] mb-1">
                  Lien Vidéo YouTube
                </label>
                <input
                  type="text"
                  value={editingArchive.youtubeUrl || ''}
                  onChange={(e) => {
                    const url = e.target.value;
                    setEditingArchive({
                      ...editingArchive,
                      youtubeUrl: url,
                      youtubeEmbedUrl: convertToYouTubeEmbed(url),
                    });
                  }}
                  placeholder="https://www.youtube.com/watch?v=..."
                  className="w-full bg-[#161616] border border-white/15 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-white font-mono"
                />
              </div>

              {/* Cover upload */}
              <div>
                <label className="block text-[10px] font-agrandir-semibold uppercase text-[#888] mb-1">
                  Miniature Couverture (16:9)
                </label>
                <div className="flex items-center gap-3">
                  {editingArchive.coverImage && (
                    <img
                      src={editingArchive.coverImage}
                      alt="Aperçu"
                      className="w-20 h-12 rounded-lg object-cover border border-white/20"
                    />
                  )}
                  <label className="py-2 px-4 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-xs font-agrandir-semibold text-white flex items-center gap-2 cursor-pointer transition-colors">
                    <Upload className="w-3.5 h-3.5 text-[#d4af37]" />
                    <span>{uploadingCover ? 'Chargement...' : 'Téléverser fichier image'}</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleCoverUpload(file);
                      }}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>

              {/* Photos Gallery */}
              <div>
                <label className="block text-[10px] font-agrandir-semibold uppercase text-[#888] mb-1">
                  Galerie Photos Backstage ({editingArchive.photos?.length || 0} photos)
                </label>
                <label className="w-full py-2.5 px-4 rounded-xl bg-white/5 hover:bg-white/10 border border-white/15 text-xs font-agrandir-semibold text-white flex items-center justify-center gap-2 cursor-pointer transition-colors">
                  <ImageIcon className="w-3.5 h-3.5 text-[#d4af37]" />
                  <span>{uploadingGallery ? 'Importation en cours...' : 'Ajouter des photos à la galerie (sélection multiple)'}</span>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={(e) => handleGalleryUpload(e.target.files)}
                    className="hidden"
                  />
                </label>
              </div>

              <div>
                <label className="block text-[10px] font-agrandir-semibold uppercase text-[#888] mb-1">
                  Description &amp; Crédits
                </label>
                <textarea
                  rows={3}
                  value={editingArchive.description || ''}
                  onChange={(e) => setEditingArchive({ ...editingArchive, description: e.target.value })}
                  placeholder="Scénographie, équipe artistique et partenaires..."
                  className="w-full bg-[#161616] border border-white/15 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-white font-agrandir-regular"
                />
              </div>

              <div className="pt-4 border-t border-white/10 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setEditingArchive(null)}
                  className="px-4 py-2 rounded-xl text-xs text-[#888] hover:text-white"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-white hover:bg-neutral-200 text-black font-agrandir-extrabold text-xs uppercase tracking-wider transition-colors shadow-lg"
                >
                  Enregistrer l'archive
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
