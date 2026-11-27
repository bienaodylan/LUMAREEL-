import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ConcertEvent } from '../../../types';
import {
  ContributorAccessInvite,
  ContributorRole,
  EventVisualOverride,
  MediaHubItem,
  MediaPlacement,
  VisualContextRole,
  VisualOverridesMap,
  deleteMediaHubItem,
  generateContributorCode,
  getPublishedMediaItems,
  isSafeMediaUrl,
  loadContributorInvites,
  loadMediaHubItems,
  loadVisualOverrides,
  saveContributorInvites,
  saveEventVisualOverride,
  subscribeMediaHub,
  upsertMediaHubItem,
} from '../../../utils/mediaHubStorage';
import { selectEventVisual } from '../../../utils/visualSelector';
import { uploadAdminImage } from '../../../utils/uploadAdminImage';
import { convertToYouTubeEmbed, readFileAsDataURL } from '../../../utils/mediaUtils';
import {
  Camera,
  Check,
  CheckCircle2,
  Clapperboard,
  Copy,
  Crown,
  Download,
  Eye,
  EyeOff,
  Image as ImageIcon,
  Lock,
  Plus,
  RefreshCw,
  Shield,
  Sparkles,
  Trash2,
  Upload,
  UserPlus,
  Users,
  Video,
  XCircle,
} from 'lucide-react';

interface AdminMediaHubViewProps {
  events: ConcertEvent[];
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

type StudioTab = 'library' | 'visuals' | 'contributors';
type LibraryFilter = 'all' | 'draft' | 'published' | 'backstage' | 'memories';

export const AdminMediaHubView: React.FC<AdminMediaHubViewProps> = ({
  events,
  showToast,
}) => {
  const [activeTab, setActiveTab] = useState<StudioTab>('library');
  const [items, setItems] = useState<MediaHubItem[]>(() => loadMediaHubItems());
  const [overrides, setOverrides] = useState<VisualOverridesMap>(() => loadVisualOverrides());
  const [invites, setInvites] = useState<ContributorAccessInvite[]>(() =>
    loadContributorInvites()
  );

  // Sync live updates across tabs / photographer submissions
  useEffect(() => {
    const sync = () => {
      setItems(loadMediaHubItems());
      setOverrides(loadVisualOverrides());
      setInvites(loadContributorInvites());
    };
    sync();
    return subscribeMediaHub(sync);
  }, []);

  // ============================================================================
  // TAB 1 : MÉDIATHÈQUE & MODÉRATION
  // ============================================================================
  const [libraryFilter, setLibraryFilter] = useState<LibraryFilter>('all');
  const [showAddForm, setShowAddForm] = useState(false);

  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newMediaType, setNewMediaType] = useState<'photo' | 'video'>('photo');
  const [newPlacement, setNewPlacement] = useState<MediaPlacement>('backstage');
  const [newEventId, setNewEventId] = useState<string>('');
  const [newArtistName, setNewArtistName] = useState('');
  const [newAlbumTitle, setNewAlbumTitle] = useState('');
  const [newTag, setNewTag] = useState('Officiel');
  const [newDuration, setNewDuration] = useState('');
  const [newUrl, setNewUrl] = useState('');
  const [newEmbedUrl, setNewEmbedUrl] = useState('');
  const [newVisualRole, setNewVisualRole] = useState<VisualContextRole>('none');
  const [newDownloadable, setNewDownloadable] = useState(true);
  const [newMembersOnly, setNewMembersOnly] = useState(false);
  const [newPublishNow, setNewPublishNow] = useState(true);
  const [isUploadingFile, setIsUploadingFile] = useState(false);
  const photoInputRef = useRef<HTMLInputElement>(null);

  const draftCount = useMemo(
    () => items.filter((i) => i.status === 'draft').length,
    [items]
  );

  const publishedMedia = useMemo(() => getPublishedMediaItems(items), [items]);

  const filteredItems = useMemo(() => {
    if (libraryFilter === 'draft') return items.filter((i) => i.status === 'draft');
    if (libraryFilter === 'published') return items.filter((i) => i.status === 'published');
    if (libraryFilter === 'backstage') return items.filter((i) => i.placement === 'backstage');
    if (libraryFilter === 'memories') return items.filter((i) => i.placement === 'memories');
    return items;
  }, [items, libraryFilter]);

  const handleUploadMediaPhoto = async (file: File) => {
    setIsUploadingFile(true);
    try {
      try {
        const publicUrl = await uploadAdminImage(file, 'media-hub');
        setNewUrl(publicUrl);
        showToast('Photo téléversée dans le stockage cloud.', 'success');
      } catch {
        const dataUrl = await readFileAsDataURL(file);
        setNewUrl(dataUrl);
        showToast('Photo chargée localement (mode aperçu).', 'info');
      }
    } finally {
      setIsUploadingFile(false);
    }
  };

  const handleCreateMedia = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) {
      showToast('Le titre du média est obligatoire.', 'error');
      return;
    }

    const finalEmbed =
      newMediaType === 'video' && newEmbedUrl.trim()
        ? convertToYouTubeEmbed(newEmbedUrl.trim())
        : undefined;

    const finalUrl = newUrl.trim();
    if (!finalUrl || !isSafeMediaUrl(finalUrl)) {
      showToast(
        'Ajoutez une photo valide (import fichier ou URL https://) pour la couverture/image.',
        'error'
      );
      return;
    }

    const linkedEvent = events.find((ev) => ev.id === newEventId);
    const created: MediaHubItem = {
      id: `media_admin_${Date.now()}`,
      title: newTitle.trim(),
      description: newDescription.trim() || 'Production officielle LUMARÉEL.',
      mediaType: newMediaType,
      url: finalUrl,
      thumbnailUrl: finalUrl,
      embedUrl: finalEmbed,
      duration: newMediaType === 'video' ? newDuration.trim() || '04:30' : undefined,
      tag: newTag.trim() || (newPlacement === 'backstage' ? 'Backstage' : 'Officiel'),
      placement: newPlacement,
      albumTitle: newAlbumTitle.trim() || linkedEvent?.title || undefined,
      eventId: linkedEvent?.id || undefined,
      artistName: newArtistName.trim() || linkedEvent?.artist || undefined,
      date: new Date().toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' }),
      status: newPublishNow ? 'published' : 'draft',
      downloadable: newDownloadable,
      membersOnly: newMembersOnly,
      visualContextRole: newVisualRole,
      submittedByName: 'Administration LUMARÉEL',
      submittedByRole: 'super_admin',
      createdAt: new Date().toISOString(),
    };

    const next = upsertMediaHubItem(created);
    setItems(next);
    setNewTitle('');
    setNewDescription('');
    setNewUrl('');
    setNewEmbedUrl('');
    setNewDuration('');
    setNewVisualRole('none');
    setShowAddForm(false);
    showToast(
      newPublishNow
        ? 'Média publié immédiatement sur la plateforme.'
        : 'Média enregistré en brouillon.',
      'success'
    );
  };

  const handleSetStatus = (item: MediaHubItem, status: MediaHubItem['status']) => {
    const next = upsertMediaHubItem({ ...item, status });
    setItems(next);
    showToast(
      status === 'published'
        ? 'Média validé et publié.'
        : status === 'rejected'
        ? 'Soumission refusée.'
        : 'Média repassé en brouillon.',
      'info'
    );
  };

  const handleToggleItemFlag = (
    item: MediaHubItem,
    field: 'downloadable' | 'membersOnly'
  ) => {
    const next = upsertMediaHubItem({ ...item, [field]: !item[field] });
    setItems(next);
  };

  const handleDeleteItem = (id: string) => {
    const next = deleteMediaHubItem(id);
    setItems(next);
    showToast('Média supprimé de la médiathèque.', 'info');
  };

  // ============================================================================
  // TAB 2 : VISUELS PRINCIPAUX PAR CONCERT (CONTRÔLE MANUEL + SÉLECTION AUTO)
  // ============================================================================
  const [selectedVisualEventId, setSelectedVisualEventId] = useState<string>(
    () => events[0]?.id || ''
  );
  const [overrideUrlDraft, setOverrideUrlDraft] = useState<Record<string, string>>({});
  const [uploadingSlot, setUploadingSlot] = useState<string | null>(null);

  useEffect(() => {
    if (!selectedVisualEventId && events[0]?.id) {
      setSelectedVisualEventId(events[0].id);
    }
  }, [events, selectedVisualEventId]);

  const selectedVisualEvent = useMemo(
    () => events.find((e) => e.id === selectedVisualEventId) || events[0] || null,
    [events, selectedVisualEventId]
  );

  const handleUploadOverrideSlot = async (
    eventId: string,
    context: keyof EventVisualOverride,
    file: File
  ) => {
    setUploadingSlot(context);
    try {
      let url = '';
      try {
        url = await uploadAdminImage(file, `visuals-${context}`);
      } catch {
        url = await readFileAsDataURL(file);
      }
      const next = saveEventVisualOverride(eventId, context, url);
      setOverrides(next);
      showToast(`Visuel "${context}" mis à jour pour ce concert.`, 'success');
    } finally {
      setUploadingSlot(null);
    }
  };

  const handleApplyUrlOverride = (
    eventId: string,
    context: keyof EventVisualOverride
  ) => {
    const raw = (overrideUrlDraft[context] || '').trim();
    if (!raw || !isSafeMediaUrl(raw)) {
      showToast('URL invalide (utilisez https:// ou un chemin local).', 'error');
      return;
    }
    const next = saveEventVisualOverride(eventId, context, raw);
    setOverrides(next);
    setOverrideUrlDraft((prev) => ({ ...prev, [context]: '' }));
    showToast('Surcharge visuelle enregistrée.', 'success');
  };

  const handleResetOverride = (
    eventId: string,
    context: keyof EventVisualOverride
  ) => {
    const next = saveEventVisualOverride(eventId, context, undefined);
    setOverrides(next);
    showToast('Sélection contextuelle automatique rétablie.', 'info');
  };

  // ============================================================================
  // TAB 3 : PHOTOGRAPHES & COLLABORATEURS (ACCÈS RESTREINT BROUILLON UNIQUEMENT)
  // ============================================================================
  const [contribName, setContribName] = useState('');
  const [contribEmail, setContribEmail] = useState('');
  const [contribRole, setContribRole] = useState<ContributorRole>('photographer');
  const [contribEventIds, setContribEventIds] = useState<string[]>([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const toggleContribEvent = (evId: string) => {
    setContribEventIds((prev) =>
      prev.includes(evId) ? prev.filter((id) => id !== evId) : [...prev, evId]
    );
  };

  const handleCreateInvite = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = contribName.trim();
    const cleanEmail = contribEmail.trim().toLowerCase();
    if (!cleanName || !cleanEmail) {
      showToast('Le nom et l’adresse e-mail sont obligatoires.', 'error');
      return;
    }
    if (contribEventIds.length === 0) {
      showToast('Assignez au moins un concert à ce collaborateur.', 'error');
      return;
    }

    const invite: ContributorAccessInvite = {
      id: `inv_${Date.now()}`,
      name: cleanName,
      email: cleanEmail,
      role: contribRole,
      accessCode: generateContributorCode(contribRole),
      assignedEventIds: contribEventIds,
      status: 'active',
      createdAt: new Date().toISOString(),
    };

    const next = [invite, ...invites];
    saveContributorInvites(next);
    setInvites(next);
    setContribName('');
    setContribEmail('');
    setContribEventIds([]);
    showToast(`Accès créé pour ${cleanName} (${invite.accessCode}).`, 'success');
  };

  const handleToggleInviteStatus = (id: string) => {
    const next = invites.map((inv) =>
      inv.id === id
        ? { ...inv, status: inv.status === 'active' ? ('revoked' as const) : ('active' as const) }
        : inv
    );
    saveContributorInvites(next);
    setInvites(next);
    showToast('Statut d’accès mis à jour.', 'info');
  };

  const handleDeleteInvite = (id: string) => {
    const next = invites.filter((inv) => inv.id !== id);
    saveContributorInvites(next);
    setInvites(next);
    showToast('Accès collaborateur supprimé.', 'info');
  };

  const handleCopyInvite = (inv: ContributorAccessInvite) => {
    const text = `Accès Studio Photographe LUMARÉEL\nE-mail : ${inv.email}\nCode : ${inv.accessCode}`;
    navigator.clipboard?.writeText(text);
    setCopiedId(inv.id);
    setTimeout(() => setCopiedId(null), 2000);
    showToast('Identifiants copiés dans le presse-papiers.', 'success');
  };

  const sourceLabels: Record<string, string> = {
    admin_override: 'Surcharge manuelle admin',
    media_hub: 'Médiathèque taggée',
    artist_portrait: 'Portrait artiste',
    official_poster: 'Affiche officielle',
    banner: 'Bannière concert',
    fallback: 'Visuel par défaut',
  };

  const roleLabels: Record<ContributorRole, string> = {
    photographer: 'Photographe',
    media_collaborator: 'Collaborateur média',
    editorial: 'Équipe éditoriale',
  };

  return (
    <div className="space-y-8 text-white font-agrandir-regular">
      {/* En-tête Studio Médias */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-white/[0.1] pb-6">
        <div>
          <p className="text-[10px] font-agrandir-semibold uppercase tracking-[0.22em] text-neutral-400 mb-1">
            ADMINISTRATION MONOCHROME · MÉDIAS
          </p>
          <h1 className="font-agrandir-extrabold text-2xl sm:text-3xl tracking-tight text-white">
            Studio Médias & Photographes
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-neutral-400 max-w-2xl">
            Centralisez les contenus Backstage & Memories, arbitrez les dépôts photographes en brouillon et pilotez les visuels principaux par concert.
          </p>
        </div>

        {/* Navigation interne du Studio */}
        <div className="flex flex-wrap items-center gap-1.5 bg-[#0E0E0E] p-1 rounded-full border border-white/[0.1] self-start md:self-auto">
          <button
            type="button"
            onClick={() => setActiveTab('library')}
            className={`min-h-[36px] px-4 rounded-full text-xs font-agrandir-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer ${
              activeTab === 'library'
                ? 'bg-white text-black font-agrandir-extrabold'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            <Clapperboard className="w-3.5 h-3.5" />
            <span>Médiathèque</span>
            {draftCount > 0 && (
              <span
                className={`ml-1 px-1.5 py-0.5 rounded-full text-[10px] tabular-nums ${
                  activeTab === 'library'
                    ? 'bg-black text-white'
                    : 'bg-white text-black font-agrandir-extrabold'
                }`}
              >
                {draftCount}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('visuals')}
            className={`min-h-[36px] px-4 rounded-full text-xs font-agrandir-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer ${
              activeTab === 'visuals'
                ? 'bg-white text-black font-agrandir-extrabold'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Visuels concerts</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('contributors')}
            className={`min-h-[36px] px-4 rounded-full text-xs font-agrandir-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer ${
              activeTab === 'contributors'
                ? 'bg-white text-black font-agrandir-extrabold'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Photographes ({invites.filter((i) => i.status === 'active').length})</span>
          </button>
        </div>
      </div>

      {/* ====================================================================
          ONGLET 1 : MÉDIATHÈQUE & MODÉRATION
         ==================================================================== */}
      {activeTab === 'library' && (
        <div className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-1.5">
              {(
                [
                  { id: 'all', label: `Tous (${items.length})` },
                  { id: 'draft', label: `En attente (${draftCount})` },
                  { id: 'published', label: `Publiés (${publishedMedia.length})` },
                  { id: 'backstage', label: 'Backstage' },
                  { id: 'memories', label: 'Memories' },
                ] as Array<{ id: LibraryFilter; label: string }>
              ).map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setLibraryFilter(f.id)}
                  className={`min-h-[34px] px-3.5 rounded-full text-xs font-agrandir-semibold transition-colors cursor-pointer ${
                    libraryFilter === f.id
                      ? 'bg-white text-black font-agrandir-extrabold'
                      : 'bg-white/[0.05] text-neutral-400 hover:text-white border border-white/[0.08]'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() => setShowAddForm((v) => !v)}
              className="min-h-[38px] px-4 rounded-full bg-white hover:bg-neutral-200 text-black text-xs font-agrandir-extrabold inline-flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{showAddForm ? 'Fermer le formulaire' : 'Ajouter un média'}</span>
            </button>
          </div>

          {/* Formulaire d'import média admin */}
          {showAddForm && (
            <form
              onSubmit={handleCreateMedia}
              className="rounded-2xl border border-white/[0.14] bg-[#0B0B0B] p-5 sm:p-6 space-y-5"
            >
              <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
                <h2 className="font-agrandir-extrabold text-base text-white">
                  Importer une photo ou vidéo officielle
                </h2>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setNewMediaType('photo')}
                    className={`px-3 py-1.5 rounded-full text-xs font-agrandir-semibold inline-flex items-center gap-1.5 cursor-pointer ${
                      newMediaType === 'photo'
                        ? 'bg-white text-black font-agrandir-extrabold'
                        : 'bg-white/[0.06] text-neutral-400'
                    }`}
                  >
                    <ImageIcon className="w-3.5 h-3.5" />
                    <span>Photo</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewMediaType('video')}
                    className={`px-3 py-1.5 rounded-full text-xs font-agrandir-semibold inline-flex items-center gap-1.5 cursor-pointer ${
                      newMediaType === 'video'
                        ? 'bg-white text-black font-agrandir-extrabold'
                        : 'bg-white/[0.06] text-neutral-400'
                    }`}
                  >
                    <Video className="w-3.5 h-3.5" />
                    <span>Vidéo</span>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] text-neutral-400 mb-1">Titre *</label>
                  <input
                    type="text"
                    required
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    placeholder="Ex: Soundcheck au Palais — 19h00"
                    className="w-full min-h-[42px] px-3.5 rounded-xl bg-[#141414] border border-white/[0.12] text-xs text-white focus:outline-none focus:border-white"
                  />
                </div>

                <div>
                  <label className="block text-[11px] text-neutral-400 mb-1">
                    Destination
                  </label>
                  <select
                    value={newPlacement}
                    onChange={(e) => setNewPlacement(e.target.value as MediaPlacement)}
                    className="w-full min-h-[42px] px-3.5 rounded-xl bg-[#141414] border border-white/[0.12] text-xs text-white focus:outline-none focus:border-white"
                  >
                    <option value="backstage">BACKSTAGE (Coulisses & Captations)</option>
                    <option value="memories">MEMORIES (Souvenirs & Photos officielles)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] text-neutral-400 mb-1">
                    Concert associé
                  </label>
                  <select
                    value={newEventId}
                    onChange={(e) => setNewEventId(e.target.value)}
                    className="w-full min-h-[42px] px-3.5 rounded-xl bg-[#141414] border border-white/[0.12] text-xs text-white focus:outline-none focus:border-white"
                  >
                    <option value="">Aucun concert spécifique</option>
                    {events.map((ev) => (
                      <option key={ev.id} value={ev.id}>
                        {ev.artist} — {ev.title}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] text-neutral-400 mb-1">
                    Rôle dans la sélection visuelle intelligente
                  </label>
                  <select
                    value={newVisualRole}
                    onChange={(e) => setNewVisualRole(e.target.value as VisualContextRole)}
                    className="w-full min-h-[42px] px-3.5 rounded-xl bg-[#141414] border border-white/[0.12] text-xs text-white focus:outline-none focus:border-white"
                  >
                    <option value="none">Standard (galerie uniquement)</option>
                    <option value="artist">Portrait Artiste (Explorer · cadrage visage)</option>
                    <option value="concert">Visuel Principal Concert (Fiche concert)</option>
                    <option value="editorial">Visuel Éditorial / Panoramique</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] text-neutral-400 mb-1">
                    Artiste / Étiquette
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      value={newArtistName}
                      onChange={(e) => setNewArtistName(e.target.value)}
                      placeholder="Artiste"
                      className="w-full min-h-[42px] px-3 rounded-xl bg-[#141414] border border-white/[0.12] text-xs text-white focus:outline-none focus:border-white"
                    />
                    <input
                      type="text"
                      value={newTag}
                      onChange={(e) => setNewTag(e.target.value)}
                      placeholder="Tag (ex: Soundcheck)"
                      className="w-full min-h-[42px] px-3 rounded-xl bg-[#141414] border border-white/[0.12] text-xs text-white focus:outline-none focus:border-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] text-neutral-400 mb-1">
                    {newMediaType === 'video' ? 'Durée (ex: 06:45)' : 'Album Memories'}
                  </label>
                  {newMediaType === 'video' ? (
                    <input
                      type="text"
                      value={newDuration}
                      onChange={(e) => setNewDuration(e.target.value)}
                      placeholder="06:45"
                      className="w-full min-h-[42px] px-3.5 rounded-xl bg-[#141414] border border-white/[0.12] text-xs text-white focus:outline-none focus:border-white font-mono"
                    />
                  ) : (
                    <input
                      type="text"
                      value={newAlbumTitle}
                      onChange={(e) => setNewAlbumTitle(e.target.value)}
                      placeholder="Ex: LUMARÉEL Live Abidjan"
                      className="w-full min-h-[42px] px-3.5 rounded-xl bg-[#141414] border border-white/[0.12] text-xs text-white focus:outline-none focus:border-white"
                    />
                  )}
                </div>
              </div>

              <div>
                <label className="block text-[11px] text-neutral-400 mb-1">
                  Description éditoriale
                </label>
                <textarea
                  rows={2}
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  placeholder="Contexte, moment capturé, équipe technique ou souvenir de scène..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#141414] border border-white/[0.12] text-xs text-white focus:outline-none focus:border-white"
                />
              </div>

              {/* Fichier image ou URL + Lien YouTube si vidéo */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="block text-[11px] text-neutral-400">
                    {newMediaType === 'video' ? 'Miniature vidéo (photo) *' : 'Photo *'}
                  </label>
                  <input
                    ref={photoInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) handleUploadMediaPhoto(f);
                    }}
                    className="hidden"
                  />
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={isUploadingFile}
                      onClick={() => photoInputRef.current?.click()}
                      className="min-h-[42px] px-4 rounded-xl bg-white/[0.08] hover:bg-white/[0.14] border border-white/[0.14] text-xs font-agrandir-semibold text-white inline-flex items-center gap-2 cursor-pointer shrink-0"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>{isUploadingFile ? 'Envoi...' : 'Importer fichier'}</span>
                    </button>
                    <input
                      type="url"
                      value={newUrl}
                      onChange={(e) => setNewUrl(e.target.value)}
                      placeholder="ou coller une URL https://..."
                      className="flex-1 min-h-[42px] px-3 rounded-xl bg-[#141414] border border-white/[0.12] text-xs text-white focus:outline-none focus:border-white"
                    />
                  </div>
                </div>

                {newMediaType === 'video' && (
                  <div className="space-y-2">
                    <label className="block text-[11px] text-neutral-400">
                      Lien vidéo YouTube (converti automatiquement)
                    </label>
                    <input
                      type="text"
                      value={newEmbedUrl}
                      onChange={(e) => setNewEmbedUrl(e.target.value)}
                      placeholder="https://youtube.com/watch?v=..."
                      className="w-full min-h-[42px] px-3.5 rounded-xl bg-[#141414] border border-white/[0.12] text-xs text-white focus:outline-none focus:border-white"
                    />
                  </div>
                )}
              </div>

              {/* Options de diffusion */}
              <div className="flex flex-wrap items-center gap-5 pt-2 border-t border-white/[0.08]">
                <label className="inline-flex items-center gap-2 text-xs text-neutral-200 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newPublishNow}
                    onChange={(e) => setNewPublishNow(e.target.checked)}
                    className="accent-white"
                  />
                  <span>Publier immédiatement</span>
                </label>
                <label className="inline-flex items-center gap-2 text-xs text-neutral-200 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newDownloadable}
                    onChange={(e) => setNewDownloadable(e.target.checked)}
                    className="accent-white"
                  />
                  <span>Autoriser le téléchargement public</span>
                </label>
                <label className="inline-flex items-center gap-2 text-xs text-neutral-200 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newMembersOnly}
                    onChange={(e) => setNewMembersOnly(e.target.checked)}
                    className="accent-white"
                  />
                  <span>Réservé aux membres Black Card</span>
                </label>
              </div>

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="min-h-[40px] px-4 rounded-xl text-xs text-neutral-400 hover:text-white cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="min-h-[40px] px-5 rounded-xl bg-white hover:bg-neutral-200 text-black font-agrandir-extrabold text-xs cursor-pointer"
                >
                  Enregistrer dans la médiathèque
                </button>
              </div>
            </form>
          )}

          {/* Liste des médias */}
          {filteredItems.length === 0 ? (
            <div className="rounded-2xl border border-white/[0.08] bg-[#0B0B0B] p-12 text-center">
              <Camera className="w-7 h-7 text-neutral-500 mx-auto mb-3" />
              <p className="text-sm font-agrandir-extrabold text-white">
                Aucun média dans cette vue
              </p>
              <p className="text-xs text-neutral-400 mt-1">
                Ajoutez un contenu ou invitez un photographe pour alimenter la plateforme.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredItems.map((item) => {
                const linkedEvent = events.find((e) => e.id === item.eventId);
                const statusBadge =
                  item.status === 'published'
                    ? { label: 'Publié', cls: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30' }
                    : item.status === 'rejected'
                    ? { label: 'Refusé', cls: 'bg-rose-500/15 text-rose-300 border-rose-500/30' }
                    : { label: 'Brouillon à valider', cls: 'bg-white text-black border-white font-agrandir-extrabold' };

                return (
                  <article
                    key={item.id}
                    className="rounded-2xl border border-white/[0.1] bg-[#0B0B0B] overflow-hidden flex flex-col justify-between"
                  >
                    <div>
                      <div className="relative aspect-[16/10] bg-black overflow-hidden">
                        <img
                          src={item.thumbnailUrl || item.url}
                          alt={item.title}
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute top-2.5 left-2.5 flex flex-wrap gap-1.5">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10px] border ${statusBadge.cls}`}
                          >
                            {statusBadge.label}
                          </span>
                          <span className="px-2 py-0.5 rounded-full text-[10px] bg-black/75 text-white border border-white/15 uppercase">
                            {item.placement}
                          </span>
                        </div>
                        {item.membersOnly && (
                          <span className="absolute top-2.5 right-2.5 w-7 h-7 rounded-full bg-black/75 border border-white/20 flex items-center justify-center text-white">
                            <Crown className="w-3.5 h-3.5" />
                          </span>
                        )}
                      </div>

                      <div className="p-4 space-y-1.5">
                        <p className="text-[11px] text-neutral-400 truncate">
                          {linkedEvent ? `${linkedEvent.artist} · ${linkedEvent.title}` : item.artistName || item.date}
                        </p>
                        <h3 className="font-agrandir-extrabold text-sm text-white line-clamp-1">
                          {item.title}
                        </h3>
                        <p className="text-[11px] text-neutral-500 line-clamp-2">
                          Par {item.submittedByName} ({item.submittedByRole})
                        </p>
                      </div>
                    </div>

                    <div className="px-4 pb-4 pt-2 border-t border-white/[0.06] space-y-2.5">
                      <div className="flex flex-wrap items-center gap-1.5">
                        {item.status !== 'published' ? (
                          <button
                            type="button"
                            onClick={() => handleSetStatus(item, 'published')}
                            className="flex-1 min-h-[34px] px-3 rounded-lg bg-white hover:bg-neutral-200 text-black text-[11px] font-agrandir-extrabold inline-flex items-center justify-center gap-1 cursor-pointer"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Publier</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleSetStatus(item, 'draft')}
                            className="flex-1 min-h-[34px] px-3 rounded-lg bg-white/[0.07] hover:bg-white/[0.14] text-neutral-200 text-[11px] font-agrandir-semibold inline-flex items-center justify-center gap-1 cursor-pointer"
                          >
                            <EyeOff className="w-3.5 h-3.5" />
                            <span>Dépublier</span>
                          </button>
                        )}

                        {item.status === 'draft' && (
                          <button
                            type="button"
                            onClick={() => handleSetStatus(item, 'rejected')}
                            className="min-h-[34px] px-2.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 text-[11px] inline-flex items-center gap-1 cursor-pointer"
                            title="Refuser cette soumission"
                          >
                            <XCircle className="w-3.5 h-3.5" />
                            <span>Refuser</span>
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => handleDeleteItem(item.id)}
                          aria-label="Supprimer"
                          className="w-8 h-8 rounded-lg bg-white/[0.05] hover:bg-rose-500/20 text-neutral-400 hover:text-rose-300 flex items-center justify-center cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <div className="flex items-center justify-between text-[11px] text-neutral-400">
                        <button
                          type="button"
                          onClick={() => handleToggleItemFlag(item, 'downloadable')}
                          className={`inline-flex items-center gap-1 cursor-pointer ${
                            item.downloadable ? 'text-white' : 'text-neutral-500'
                          }`}
                        >
                          <Download className="w-3 h-3" />
                          <span>{item.downloadable ? 'Téléchargeable' : 'Protégé'}</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleToggleItemFlag(item, 'membersOnly')}
                          className={`inline-flex items-center gap-1 cursor-pointer ${
                            item.membersOnly ? 'text-white font-agrandir-semibold' : 'text-neutral-500'
                          }`}
                        >
                          <Lock className="w-3 h-3" />
                          <span>{item.membersOnly ? 'Black Card' : 'Public'}</span>
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ====================================================================
          ONGLET 2 : VISUELS PRINCIPAUX PAR CONCERT (CONTRÔLE MANUEL ADMIN)
         ==================================================================== */}
      {activeTab === 'visuals' && (
        <div className="space-y-6">
          <div className="rounded-2xl border border-white/[0.1] bg-[#0B0B0B] p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="font-agrandir-extrabold text-base text-white">
                Sélection contextuelle intelligente & contrôle manuel
              </h2>
              <p className="text-xs text-neutral-400 mt-0.5">
                LUMARÉEL adapte automatiquement le cadrage selon le contexte (Artiste, Concert, Éditorial). Vous pouvez forcer manuellement n’importe quel visuel ci-dessous.
              </p>
            </div>
            <select
              value={selectedVisualEvent?.id || ''}
              onChange={(e) => setSelectedVisualEventId(e.target.value)}
              className="min-h-[42px] px-3.5 rounded-xl bg-[#151515] border border-white/[0.16] text-xs font-agrandir-semibold text-white outline-none focus:border-white shrink-0"
            >
              {events.map((ev) => (
                <option key={ev.id} value={ev.id}>
                  {ev.artist} — {ev.title}
                </option>
              ))}
            </select>
          </div>

          {selectedVisualEvent ? (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
              {(
                [
                  {
                    context: 'artist' as const,
                    title: 'Contexte Artiste (Explorer)',
                    desc: 'Portrait cadré sur le visage (object-top) utilisé dans la découverte Artistes.',
                    aspect: 'aspect-[3/4]',
                  },
                  {
                    context: 'concert' as const,
                    title: 'Contexte Concert (Fiche dédiée)',
                    desc: 'Affiche officielle utilisée en tête de la page Concert et de la billetterie.',
                    aspect: 'aspect-[3/4]',
                  },
                  {
                    context: 'editorial' as const,
                    title: 'Contexte Éditorial (Panoramique)',
                    desc: 'Photo de scène ou bannière large utilisée dans les mises en avant.',
                    aspect: 'aspect-[16/10]',
                  },
                ] as const
              ).map((slot) => {
                const resolved = selectEventVisual(
                  selectedVisualEvent,
                  slot.context,
                  publishedMedia,
                  overrides
                );
                const hasManualOverride = Boolean(
                  overrides[selectedVisualEvent.id]?.[slot.context]
                );

                return (
                  <div
                    key={slot.context}
                    className="rounded-2xl border border-white/[0.1] bg-[#0B0B0B] p-4 flex flex-col justify-between gap-4"
                  >
                    <div className="space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h3 className="font-agrandir-extrabold text-sm text-white">
                            {slot.title}
                          </h3>
                          <p className="text-[11px] text-neutral-400 mt-0.5">{slot.desc}</p>
                        </div>
                        <span className="px-2 py-0.5 rounded-full bg-white/[0.08] text-[10px] text-neutral-200 shrink-0">
                          {sourceLabels[resolved.source] || resolved.source}
                        </span>
                      </div>

                      <div className={`${slot.aspect} w-full rounded-xl overflow-hidden bg-black`}>
                        <img
                          src={resolved.url}
                          alt={`${selectedVisualEvent.title} ${slot.context}`}
                          referrerPolicy="no-referrer"
                          className={`w-full h-full object-cover ${resolved.objectPositionClass}`}
                        />
                      </div>
                    </div>

                    <div className="space-y-2.5 pt-2 border-t border-white/[0.08]">
                      <label className="w-full min-h-[38px] px-3 rounded-xl bg-white hover:bg-neutral-200 text-black text-xs font-agrandir-extrabold flex items-center justify-center gap-1.5 cursor-pointer transition-colors">
                        <Upload className="w-3.5 h-3.5" />
                        <span>
                          {uploadingSlot === slot.context
                            ? 'Téléversement...'
                            : 'Importer un visuel prioritaire'}
                        </span>
                        <input
                          type="file"
                          accept="image/png,image/jpeg,image/webp"
                          className="hidden"
                          onChange={(e) => {
                            const f = e.target.files?.[0];
                            if (f) {
                              handleUploadOverrideSlot(
                                selectedVisualEvent.id,
                                slot.context,
                                f
                              );
                            }
                          }}
                        />
                      </label>

                      <div className="flex gap-1.5">
                        <input
                          type="url"
                          value={overrideUrlDraft[slot.context] || ''}
                          onChange={(e) =>
                            setOverrideUrlDraft((prev) => ({
                              ...prev,
                              [slot.context]: e.target.value,
                            }))
                          }
                          placeholder="ou URL https://..."
                          className="flex-1 min-h-[36px] px-3 rounded-lg bg-[#141414] border border-white/[0.12] text-[11px] text-white outline-none focus:border-white"
                        />
                        <button
                          type="button"
                          onClick={() =>
                            handleApplyUrlOverride(selectedVisualEvent.id, slot.context)
                          }
                          className="px-3 rounded-lg bg-white/[0.1] hover:bg-white/[0.2] text-white text-[11px] font-agrandir-semibold cursor-pointer"
                        >
                          OK
                        </button>
                      </div>

                      {hasManualOverride && (
                        <button
                          type="button"
                          onClick={() =>
                            handleResetOverride(selectedVisualEvent.id, slot.context)
                          }
                          className="w-full min-h-[34px] rounded-lg border border-white/[0.14] hover:border-white/35 text-[11px] text-neutral-300 hover:text-white inline-flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <RefreshCw className="w-3 h-3" />
                          <span>Rétablir la sélection automatique</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-xs text-neutral-400">Aucun concert disponible.</p>
          )}
        </div>
      )}

      {/* ====================================================================
          ONGLET 3 : PHOTOGRAPHES & COLLABORATEURS (ACCÈS RESTREINT ISOLÉ)
         ==================================================================== */}
      {activeTab === 'contributors' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Formulaire de création d'accès */}
          <form
            onSubmit={handleCreateInvite}
            className="lg:col-span-5 rounded-2xl border border-white/[0.1] bg-[#0B0B0B] p-5 sm:p-6 space-y-4"
          >
            <div className="flex items-center gap-2.5">
              <UserPlus className="w-4 h-4 text-white" />
              <h2 className="font-agrandir-extrabold text-base text-white">
                Créer un accès photographe / média
              </h2>
            </div>

            <div className="rounded-xl border border-white/[0.08] bg-black/50 p-3.5 text-[11px] text-neutral-300 flex items-start gap-2.5 leading-relaxed">
              <Shield className="w-4 h-4 text-white shrink-0 mt-0.5" />
              <span>
                Accès strictement isolé : dépôt de photos/vidéos en <strong>brouillon</strong> uniquement sur les concerts assignés. Aucun accès aux commandes, billets, paiements, utilisateurs ni paramètres.
              </span>
            </div>

            <div>
              <label className="block text-[11px] text-neutral-400 mb-1">Nom complet *</label>
              <input
                type="text"
                required
                value={contribName}
                onChange={(e) => setContribName(e.target.value)}
                placeholder="Ex: Marc Kouassi (Photographe)"
                className="w-full min-h-[42px] px-3.5 rounded-xl bg-[#141414] border border-white/[0.12] text-xs text-white focus:outline-none focus:border-white"
              />
            </div>

            <div>
              <label className="block text-[11px] text-neutral-400 mb-1">Adresse e-mail *</label>
              <input
                type="email"
                required
                value={contribEmail}
                onChange={(e) => setContribEmail(e.target.value)}
                placeholder="photographe@studio.com"
                className="w-full min-h-[42px] px-3.5 rounded-xl bg-[#141414] border border-white/[0.12] text-xs text-white focus:outline-none focus:border-white"
              />
            </div>

            <div>
              <label className="block text-[11px] text-neutral-400 mb-1">Rôle</label>
              <select
                value={contribRole}
                onChange={(e) => setContribRole(e.target.value as ContributorRole)}
                className="w-full min-h-[42px] px-3.5 rounded-xl bg-[#141414] border border-white/[0.12] text-xs text-white focus:outline-none focus:border-white"
              >
                <option value="photographer">Photographe officiel</option>
                <option value="media_collaborator">Collaborateur média</option>
                <option value="editorial">Équipe éditoriale</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] text-neutral-400 mb-2">
                Concerts autorisés pour ce collaborateur *
              </label>
              <div className="space-y-1.5 max-h-44 overflow-y-auto pr-1">
                {events.map((ev) => {
                  const checked = contribEventIds.includes(ev.id);
                  return (
                    <label
                      key={ev.id}
                      className={`flex items-center gap-2.5 p-2.5 rounded-xl border text-xs cursor-pointer transition-colors ${
                        checked
                          ? 'bg-white/[0.08] border-white/30 text-white'
                          : 'bg-[#121212] border-white/[0.08] text-neutral-400 hover:text-white'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleContribEvent(ev.id)}
                        className="accent-white"
                      />
                      <span className="truncate">
                        {ev.artist} — {ev.title}
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>

            <button
              type="submit"
              className="w-full min-h-[44px] rounded-xl bg-white hover:bg-neutral-200 text-black font-agrandir-extrabold text-xs transition-colors cursor-pointer"
            >
              Générer un code d’accès dédié
            </button>
          </form>

          {/* Liste des accès collaborateurs */}
          <div className="lg:col-span-7 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="font-agrandir-extrabold text-base text-white">
                Accès délivrés ({invites.length})
              </h2>
              <span className="text-[11px] text-neutral-500">
                Connexion depuis Profil → Studio Photographe
              </span>
            </div>

            {invites.length === 0 ? (
              <div className="rounded-2xl border border-white/[0.08] bg-[#0B0B0B] p-10 text-center">
                <Users className="w-6 h-6 text-neutral-500 mx-auto mb-2.5" />
                <p className="text-sm font-agrandir-extrabold text-white">
                  Aucun accès collaborateur actif
                </p>
                <p className="text-xs text-neutral-400 mt-1">
                  Générez un code pour permettre à vos photographes de déposer leurs clichés en brouillon sur les concerts qui leur sont assignés.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {invites.map((inv) => {
                  const isRevoked = inv.status === 'revoked';
                  const assignedTitles = events
                    .filter((e) => inv.assignedEventIds.includes(e.id))
                    .map((e) => `${e.artist} (${e.title})`);

                  return (
                    <div
                      key={inv.id}
                      className={`rounded-2xl border p-4 sm:p-5 space-y-3 ${
                        isRevoked
                          ? 'border-white/[0.06] bg-[#090909] opacity-60'
                          : 'border-white/[0.12] bg-[#0B0B0B]'
                      }`}
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <h3 className="font-agrandir-extrabold text-sm text-white truncate">
                              {inv.name}
                            </h3>
                            <span className="px-2 py-0.5 rounded-full bg-white/[0.08] text-[10px] text-neutral-200">
                              {roleLabels[inv.role]}
                            </span>
                            <span
                              className={`text-[10px] font-agrandir-semibold ${
                                isRevoked ? 'text-rose-400' : 'text-emerald-400'
                              }`}
                            >
                              {isRevoked ? 'Révoqué' : 'Actif'}
                            </span>
                          </div>
                          <p className="text-xs text-neutral-400 mt-0.5 truncate">{inv.email}</p>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleCopyInvite(inv)}
                            className="min-h-[32px] px-3 rounded-lg bg-white text-black hover:bg-neutral-200 text-[11px] font-agrandir-extrabold inline-flex items-center gap-1 cursor-pointer"
                          >
                            {copiedId === inv.id ? (
                              <Check className="w-3 h-3" />
                            ) : (
                              <Copy className="w-3 h-3" />
                            )}
                            <span>{copiedId === inv.id ? 'Copié' : inv.accessCode}</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleToggleInviteStatus(inv.id)}
                            className="min-h-[32px] px-2.5 rounded-lg border border-white/[0.14] hover:border-white/35 text-[11px] text-neutral-300 hover:text-white cursor-pointer"
                          >
                            {isRevoked ? 'Réactiver' : 'Révoquer'}
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDeleteInvite(inv.id)}
                            aria-label="Supprimer l'accès"
                            className="w-8 h-8 rounded-lg bg-white/[0.05] hover:bg-rose-500/20 text-neutral-400 hover:text-rose-300 flex items-center justify-center cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      <div className="text-[11px] text-neutral-400 pt-2 border-t border-white/[0.06] flex items-center gap-2 flex-wrap">
                        <Eye className="w-3.5 h-3.5 text-neutral-500 shrink-0" />
                        <span>
                          Concerts assignés :{' '}
                          <strong className="text-neutral-200">
                            {assignedTitles.length > 0
                              ? assignedTitles.join(', ')
                              : `${inv.assignedEventIds.length} concert(s)`}
                          </strong>
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
