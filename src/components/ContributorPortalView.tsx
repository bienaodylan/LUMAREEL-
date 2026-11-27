import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  ContributorAccessInvite,
  MediaHubItem,
  MediaPlacement,
  isSafeMediaUrl,
  loadMediaHubItems,
  subscribeMediaHub,
  upsertMediaHubItem,
  verifyContributorAccess,
} from '../utils/mediaHubStorage';
import { uploadAdminImage } from '../utils/uploadAdminImage';
import { convertToYouTubeEmbed } from '../utils/mediaUtils';
import { PageHeader } from './ui/EditorialPrimitives';
import {
  Camera,
  CheckCircle2,
  Clock,
  Film,
  Lock,
  LogOut,
  Shield,
  Upload,
  XCircle,
} from 'lucide-react';

/**
 * Studio Photographe & Collaborateur Média (Accès restreint et isolé).
 * - Vérification par e-mail + code d'accès délivré par l'administration.
 * - Affiche strictement les concerts assignés au collaborateur.
 * - Tout média soumis est enregistré en BROUILLON (status: 'draft'),
 *   jamais visible publiquement avant validation par un administrateur.
 * - Zéro accès aux commandes, billets, paiements, paramètres ou comptes clients.
 */
export const ContributorPortalView: React.FC = () => {
  const { events, goBack, showToast, language } = useApp();
  const isEn = language === 'en';

  const [emailInput, setEmailInput] = useState('');
  const [codeInput, setCodeInput] = useState('');
  const [activeInvite, setActiveInvite] = useState<ContributorAccessInvite | null>(null);
  const [allMedia, setAllMedia] = useState<MediaHubItem[]>(() => loadMediaHubItems());

  // Formulaire de dépôt média (toujours soumis en brouillon)
  const [selectedEventId, setSelectedEventId] = useState<string>('');
  const [placement, setPlacement] = useState<MediaPlacement>('memories');
  const [mediaType, setMediaType] = useState<'photo' | 'video'>('photo');
  const [title, setTitle] = useState('');
  const [albumTitle, setAlbumTitle] = useState('');
  const [description, setDescription] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [previewUrl, setPreviewUrl] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    return subscribeMediaHub(() => setAllMedia(loadMediaHubItems()));
  }, []);

  const assignedEvents = useMemo(() => {
    if (!activeInvite) return [];
    if (activeInvite.assignedEventIds.length === 0) return events;
    return events.filter((ev) => activeInvite.assignedEventIds.includes(ev.id));
  }, [activeInvite, events]);

  useEffect(() => {
    if (assignedEvents.length > 0 && !selectedEventId) {
      setSelectedEventId(assignedEvents[0].id);
    }
  }, [assignedEvents, selectedEventId]);

  const mySubmissions = useMemo(() => {
    if (!activeInvite) return [];
    return allMedia.filter(
      (item) =>
        item.submittedByName.toLowerCase() === activeInvite.name.toLowerCase() &&
        item.submittedByRole === activeInvite.role
    );
  }, [allMedia, activeInvite]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const matched = verifyContributorAccess(emailInput, codeInput);
    if (!matched) {
      showToast(
        isEn
          ? 'Invalid or revoked contributor credentials. Contact LUMARÉEL administration.'
          : 'Identifiants collaborateur invalides ou révoqués. Contactez l’administration LUMARÉEL.',
        'error'
      );
      return;
    }
    setActiveInvite(matched);
    showToast(
      isEn ? `Welcome, ${matched.name}.` : `Bienvenue dans votre studio, ${matched.name}.`,
      'success'
    );
  };

  const handlePhotoFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) {
      showToast(
        isEn ? 'Accepted formats: PNG, JPG or WebP.' : 'Formats acceptés : PNG, JPG ou WebP.',
        'error'
      );
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      showToast(
        isEn ? 'File exceeds 10 MB limit.' : 'Fichier trop volumineux (limite 10 Mo).',
        'error'
      );
      return;
    }

    setIsUploading(true);
    try {
      const publicUrl = await uploadAdminImage(file, `contributors/${selectedEventId || 'general'}`);
      setPreviewUrl(publicUrl);
      showToast(isEn ? 'Image uploaded cleanly.' : 'Image importée avec succès.', 'success');
    } catch {
      // Fallback sécurisé local DataURL lorsque Supabase Storage n'est pas connecté en aperçu
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          setPreviewUrl(reader.result);
        }
      };
      reader.readAsDataURL(file);
    } finally {
      setIsUploading(false);
    }
  };

  const handleSubmitMedia = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeInvite) return;
    if (!title.trim()) {
      showToast(isEn ? 'Please enter a title.' : 'Veuillez saisir un titre.', 'error');
      return;
    }

    let finalUrl = previewUrl;
    let finalEmbed: string | undefined;

    if (mediaType === 'video') {
      if (!videoUrl.trim() || !isSafeMediaUrl(videoUrl)) {
        showToast(
          isEn ? 'Enter a valid HTTPS video link.' : 'Saisissez un lien vidéo HTTPS valide.',
          'error'
        );
        return;
      }
      finalEmbed = convertToYouTubeEmbed(videoUrl.trim()) || videoUrl.trim();
      const targetEv = assignedEvents.find((ev) => ev.id === selectedEventId);
      finalUrl =
        previewUrl || targetEv?.bannerImage || targetEv?.officialPoster || '';
      if (!finalUrl) {
        showToast(
          isEn ? 'Please add a thumbnail image for this video.' : 'Ajoutez une miniature pour cette vidéo.',
          'error'
        );
        return;
      }
    } else if (!finalUrl) {
      showToast(
        isEn ? 'Select a photograph to upload.' : 'Sélectionnez une photographie à déposer.',
        'error'
      );
      return;
    }

    const targetEvent = assignedEvents.find((ev) => ev.id === selectedEventId);

    // Sécurité stricte : toute soumission collaborateur est BROUILLON par défaut
    const newItem: MediaHubItem = {
      id: `contrib_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      title: title.trim(),
      description:
        description.trim() ||
        (targetEvent
          ? `${targetEvent.title} — ${targetEvent.venue}`
          : 'Soumission média collaborateur'),
      mediaType,
      url: finalUrl,
      thumbnailUrl: finalUrl,
      embedUrl: finalEmbed,
      placement,
      albumTitle: albumTitle.trim() || targetEvent?.title || undefined,
      eventId: targetEvent?.id,
      artistName: targetEvent?.artist,
      date: new Date().toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' }),
      status: 'draft',
      downloadable: false,
      membersOnly: false,
      visualContextRole: 'none',
      submittedByName: activeInvite.name,
      submittedByRole: activeInvite.role,
      createdAt: new Date().toISOString(),
    };

    upsertMediaHubItem(newItem);
    setTitle('');
    setDescription('');
    setVideoUrl('');
    setPreviewUrl('');
    if (fileInputRef.current) fileInputRef.current.value = '';

    showToast(
      isEn
        ? 'Submitted as draft. Visible publicly only after admin approval.'
        : 'Déposé en brouillon. Publication publique uniquement après validation admin.',
      'success'
    );
  };

  const roleLabel = (role: ContributorAccessInvite['role']) => {
    if (role === 'photographer') return isEn ? 'Accredited Photographer' : 'Photographe accrédité';
    if (role === 'editorial') return isEn ? 'Editorial Team' : 'Équipe éditoriale';
    return isEn ? 'Media Collaborator' : 'Collaborateur média';
  };

  return (
    <div className="min-h-screen w-full max-w-5xl mx-auto px-4 sm:px-8 pt-5 sm:pt-10 pb-20 text-white font-agrandir-regular">
      <PageHeader
        eyebrow={isEn ? 'Restricted Contributor Portal' : 'Accès limité collaborateurs'}
        title={isEn ? 'Photographer & Media Studio' : 'Studio Photographes & Médias'}
        subtitle={
          isEn
            ? 'Upload photos and videos for your assigned concerts. All submissions remain private drafts until validated by LUMARÉEL administration.'
            : 'Déposez vos photos et vidéos pour les concerts qui vous sont associés. Vos contenus restent en brouillon jusqu’à validation par l’administration LUMARÉEL.'
        }
        onBack={goBack}
        backLabel={isEn ? 'Back' : 'Retour'}
        action={
          activeInvite && (
            <button
              type="button"
              onClick={() => setActiveInvite(null)}
              className="min-h-[40px] px-4 rounded-full border border-white/[0.14] hover:border-white text-xs font-agrandir-semibold text-neutral-300 hover:text-white inline-flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>{isEn ? 'Sign out' : 'Quitter le studio'}</span>
            </button>
          )
        }
      />

      {!activeInvite ? (
        <form
          onSubmit={handleLogin}
          className="max-w-md border-t border-white/[0.08] pt-8 space-y-5"
        >
          <div className="flex items-start gap-3 text-xs text-neutral-400 leading-relaxed">
            <Shield className="w-4 h-4 text-white shrink-0 mt-0.5" />
            <p>
              {isEn
                ? 'Enter the email and personal accreditation code provided by LUMARÉEL administration. This space does not grant access to ticketing, orders or user data.'
                : 'Saisissez l’adresse e-mail et le code d’accréditation fournis par l’administration LUMARÉEL. Cet espace est isolé de la billetterie, des paiements et des données clients.'}
            </p>
          </div>

          <div>
            <label className="block text-xs text-neutral-400 mb-1.5">
              {isEn ? 'Accredited email' : 'Adresse e-mail accréditée'}
            </label>
            <input
              type="email"
              value={emailInput}
              onChange={(e) => setEmailInput(e.target.value)}
              placeholder="photographe@studio.com"
              required
              className="w-full min-h-[44px] px-4 rounded-xl bg-[#0D0D0D] border border-white/[0.12] focus:border-white text-sm text-white outline-none"
            />
          </div>

          <div>
            <label className="block text-xs text-neutral-400 mb-1.5">
              {isEn ? 'Contributor access code' : 'Code d’accès collaborateur'}
            </label>
            <input
              type="text"
              value={codeInput}
              onChange={(e) => setCodeInput(e.target.value.toUpperCase())}
              placeholder="LMR-PHOTO-XXXXXX"
              required
              className="w-full min-h-[44px] px-4 rounded-xl bg-[#0D0D0D] border border-white/[0.12] focus:border-white text-sm font-mono text-white outline-none"
            />
          </div>

          <button
            type="submit"
            className="w-full min-h-[46px] rounded-full bg-white text-black hover:bg-neutral-200 font-agrandir-extrabold text-xs transition-colors cursor-pointer inline-flex items-center justify-center gap-2"
          >
            <Lock className="w-3.5 h-3.5" />
            <span>{isEn ? 'Access my studio' : 'Accéder à mon espace dépôt'}</span>
          </button>
        </form>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          {/* Colonne gauche : Formulaire de dépôt brouillon */}
          <form onSubmit={handleSubmitMedia} className="lg:col-span-6 space-y-5">
            <div className="pb-4 border-b border-white/[0.08]">
              <p className="text-xs text-neutral-400">{roleLabel(activeInvite.role)}</p>
              <h2 className="font-agrandir-extrabold text-lg text-white mt-0.5">
                {activeInvite.name}
              </h2>
            </div>

            <div>
              <label className="block text-xs text-neutral-400 mb-1.5">
                {isEn ? 'Assigned concert' : 'Concert associé'}
              </label>
              <select
                value={selectedEventId}
                onChange={(e) => setSelectedEventId(e.target.value)}
                className="w-full min-h-[44px] px-3.5 rounded-xl bg-[#0D0D0D] border border-white/[0.12] focus:border-white text-sm text-white outline-none"
              >
                {assignedEvents.map((ev) => (
                  <option key={ev.id} value={ev.id}>
                    {ev.title} — {ev.artist} ({ev.city})
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-neutral-400 mb-1.5">
                  {isEn ? 'Media type' : 'Format'}
                </label>
                <div className="grid grid-cols-2 gap-1 p-1 rounded-xl bg-[#0D0D0D] border border-white/[0.1]">
                  <button
                    type="button"
                    onClick={() => setMediaType('photo')}
                    className={`min-h-[36px] rounded-lg text-xs font-agrandir-semibold cursor-pointer ${
                      mediaType === 'photo' ? 'bg-white text-black' : 'text-neutral-400'
                    }`}
                  >
                    Photo
                  </button>
                  <button
                    type="button"
                    onClick={() => setMediaType('video')}
                    className={`min-h-[36px] rounded-lg text-xs font-agrandir-semibold cursor-pointer ${
                      mediaType === 'video' ? 'bg-white text-black' : 'text-neutral-400'
                    }`}
                  >
                    {isEn ? 'Video' : 'Vidéo'}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs text-neutral-400 mb-1.5">
                  {isEn ? 'Destination' : 'Univers cible'}
                </label>
                <div className="grid grid-cols-2 gap-1 p-1 rounded-xl bg-[#0D0D0D] border border-white/[0.1]">
                  <button
                    type="button"
                    onClick={() => setPlacement('memories')}
                    className={`min-h-[36px] rounded-lg text-xs font-agrandir-semibold cursor-pointer ${
                      placement === 'memories' ? 'bg-white text-black' : 'text-neutral-400'
                    }`}
                  >
                    Memories
                  </button>
                  <button
                    type="button"
                    onClick={() => setPlacement('backstage')}
                    className={`min-h-[36px] rounded-lg text-xs font-agrandir-semibold cursor-pointer ${
                      placement === 'backstage' ? 'bg-white text-black' : 'text-neutral-400'
                    }`}
                  >
                    Backstage
                  </button>
                </div>
              </div>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              onChange={handlePhotoFileChange}
              className="hidden"
            />

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="w-full min-h-[130px] rounded-2xl border border-dashed border-white/20 hover:border-white bg-[#0B0B0B] flex flex-col items-center justify-center gap-2 p-4 text-center transition-colors cursor-pointer"
            >
              {previewUrl ? (
                <img
                  src={previewUrl}
                  alt="Preview"
                  className="max-h-36 rounded-xl object-contain"
                />
              ) : (
                <>
                  <Upload className="w-5 h-5 text-white" />
                  <span className="text-xs font-agrandir-semibold text-white">
                    {isUploading
                      ? isEn
                        ? 'Uploading…'
                        : 'Téléversement…'
                      : mediaType === 'video'
                      ? isEn
                        ? 'Upload video cover thumbnail (optional)'
                        : 'Importer la miniature vidéo (optionnel)'
                      : isEn
                      ? 'Choose a high-res photograph (JPG, PNG, WebP)'
                      : 'Choisir une photographie (JPG, PNG, WebP)'}
                  </span>
                </>
              )}
            </button>

            {mediaType === 'video' && (
              <div>
                <label className="block text-xs text-neutral-400 mb-1.5">
                  {isEn ? 'Video URL (YouTube / HTTPS)' : 'Lien vidéo (YouTube / HTTPS)'}
                </label>
                <input
                  type="url"
                  value={videoUrl}
                  onChange={(e) => setVideoUrl(e.target.value)}
                  placeholder="https://www.youtube.com/watch?v=..."
                  className="w-full min-h-[44px] px-4 rounded-xl bg-[#0D0D0D] border border-white/[0.12] focus:border-white text-sm text-white outline-none"
                />
              </div>
            )}

            <div>
              <label className="block text-xs text-neutral-400 mb-1.5">
                {isEn ? 'Title' : 'Titre du média'}
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={isEn ? 'Main stage portrait — Encore' : 'Entrée en scène — Rappel final'}
                required
                className="w-full min-h-[44px] px-4 rounded-xl bg-[#0D0D0D] border border-white/[0.12] focus:border-white text-sm text-white outline-none"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-neutral-400 mb-1.5">
                  {isEn ? 'Album name' : 'Nom de l’album'}
                </label>
                <input
                  type="text"
                  value={albumTitle}
                  onChange={(e) => setAlbumTitle(e.target.value)}
                  placeholder={isEn ? 'Official Night 1' : 'Sélection Officielle'}
                  className="w-full min-h-[44px] px-4 rounded-xl bg-[#0D0D0D] border border-white/[0.12] focus:border-white text-sm text-white outline-none"
                />
              </div>
              <div>
                <label className="block text-xs text-neutral-400 mb-1.5">
                  {isEn ? 'Short note' : 'Légende courte'}
                </label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder={isEn ? 'Shot from pit / backstage' : 'Prise scène / coulisses'}
                  className="w-full min-h-[44px] px-4 rounded-xl bg-[#0D0D0D] border border-white/[0.12] focus:border-white text-sm text-white outline-none"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isUploading}
              className="w-full min-h-[46px] rounded-full bg-white text-black hover:bg-neutral-200 font-agrandir-extrabold text-xs transition-colors cursor-pointer disabled:opacity-50"
            >
              {isEn ? 'Submit for admin validation' : 'Soumettre en brouillon pour validation'}
            </button>
          </form>

          {/* Colonne droite : Statut des contenus soumis */}
          <div className="lg:col-span-6 space-y-4">
            <div className="flex items-baseline justify-between pb-4 border-b border-white/[0.08]">
              <h2 className="font-agrandir-extrabold text-lg text-white">
                {isEn ? 'My submissions' : 'Mes dépôts récents'}
              </h2>
              <span className="text-xs text-neutral-500 tabular-nums">{mySubmissions.length}</span>
            </div>

            {mySubmissions.length === 0 ? (
              <p className="text-xs sm:text-sm text-neutral-500 py-8">
                {isEn
                  ? 'Your uploaded photos and videos will appear here with their live review status.'
                  : 'Vos photos et vidéos déposées apparaîtront ici avec leur statut de validation en direct.'}
              </p>
            ) : (
              <div className="divide-y divide-white/[0.08]">
                {mySubmissions.map((sub) => (
                  <div key={sub.id} className="py-4 flex items-center gap-4">
                    <div className="w-16 h-12 rounded-xl overflow-hidden bg-[#111] shrink-0">
                      <img
                        src={sub.thumbnailUrl || sub.url}
                        alt={sub.title}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-agrandir-semibold text-white truncate">
                        {sub.title}
                      </p>
                      <p className="text-[11px] text-neutral-500 truncate">
                        {sub.placement === 'backstage' ? 'Backstage' : 'Memories'}
                        {sub.albumTitle ? ` · ${sub.albumTitle}` : ''}
                      </p>
                    </div>
                    <div className="shrink-0 text-xs font-agrandir-semibold inline-flex items-center gap-1.5">
                      {sub.status === 'published' ? (
                        <span className="text-white inline-flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>{isEn ? 'Published' : 'Publié'}</span>
                        </span>
                      ) : sub.status === 'rejected' ? (
                        <span className="text-rose-400 inline-flex items-center gap-1">
                          <XCircle className="w-3.5 h-3.5" />
                          <span>{isEn ? 'Declined' : 'Refusé'}</span>
                        </span>
                      ) : (
                        <span className="text-neutral-400 inline-flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" />
                          <span>{isEn ? 'Draft' : 'En attente'}</span>
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
