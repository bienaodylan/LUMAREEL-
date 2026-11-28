import React, { useEffect, useState } from 'react';
import { Save, Image as ImageIcon, CreditCard, Home, Loader2, CheckCircle2 } from 'lucide-react';
import { apiFetchJson } from '../../../lib/apiClient';
import { MediaPickerModal } from '../MediaPickerModal';

interface HomepageCmsConfig {
  searchPlaceholderFr: string;
  searchPlaceholderEn: string;
  announcementBanner: string;
  announcementActive: boolean;
  featuredHeroEyebrowFr: string;
  featuredHeroEyebrowEn: string;
}

interface BlackCardBenefitCms {
  id: string;
  titleFr: string;
  descFr: string;
  titleEn: string;
  descEn: string;
}

interface BlackCardCmsConfig {
  available: boolean;
  frontImageUrl: string;
  backImageUrl: string;
  priceAmount: number;
  currency: string;
  validityLabelFr: string;
  validityLabelEn: string;
  heroTitleFr: string;
  heroSubFr: string;
  heroTitleEn: string;
  heroSubEn: string;
  ctaOrderFr: string;
  ctaOrderEn: string;
  climaxTitleFr: string;
  climaxSubFr: string;
  climaxTitleEn: string;
  climaxSubEn: string;
  benefits: BlackCardBenefitCms[];
}

interface AdminCmsViewProps {
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export const AdminCmsView: React.FC<AdminCmsViewProps> = ({ showToast }) => {
  const [tab, setTab] = useState<'homepage' | 'black_card'>('black_card');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [homepage, setHomepage] = useState<HomepageCmsConfig | null>(null);
  const [blackCard, setBlackCard] = useState<BlackCardCmsConfig | null>(null);

  const [pickerTarget, setPickerTarget] = useState<'frontImageUrl' | 'backImageUrl' | null>(null);

  useEffect(() => {
    const loadCms = async () => {
      setLoading(true);
      try {
        const data = await apiFetchJson<{
          success: boolean;
          homepage: HomepageCmsConfig;
          blackCard: BlackCardCmsConfig;
        }>('/api/cms/public');
        setHomepage(data.homepage);
        setBlackCard(data.blackCard);
      } catch (err: any) {
        showToast(err.message || 'Impossible de charger les réglages CMS.', 'error');
      } finally {
        setLoading(false);
      }
    };
    loadCms();
  }, []);

  const saveHomepage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!homepage) return;
    setSaving(true);
    try {
      const data = await apiFetchJson<{ success: boolean; homepage: HomepageCmsConfig }>('/api/admin/cms/homepage', {
        method: 'PUT',
        body: JSON.stringify(homepage),
      });
      setHomepage(data.homepage);
      showToast('Page d’accueil mise à jour en temps réel.', 'success');
    } catch (err: any) {
      showToast(err.message || 'Échec de l’enregistrement.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const saveBlackCard = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!blackCard) return;
    setSaving(true);
    try {
      const data = await apiFetchJson<{ success: boolean; blackCard: BlackCardCmsConfig }>('/api/admin/cms/black-card', {
        method: 'PUT',
        body: JSON.stringify(blackCard),
      });
      setBlackCard(data.blackCard);
      showToast('Expérience LUMARÉEL Black Card publiée en direct.', 'success');
    } catch (err: any) {
      showToast(err.message || 'Échec de l’enregistrement.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const updateBenefit = (index: number, field: keyof BlackCardBenefitCms, value: string) => {
    if (!blackCard) return;
    const next = blackCard.benefits.map((b, i) => (i === index ? { ...b, [field]: value } : b));
    setBlackCard({ ...blackCard, benefits: next });
  };

  if (loading) {
    return (
      <div className="py-24 flex flex-col items-center justify-center gap-3 text-neutral-400 text-xs">
        <Loader2 className="w-5 h-5 animate-spin" />
        <span>Chargement du CMS...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <p className="text-[10px] font-agrandir-semibold uppercase tracking-[0.2em] text-neutral-400">
            Publication en temps réel
          </p>
          <h1 className="text-2xl font-agrandir-extrabold text-white mt-1">CMS · Vitrine & LUMARÉEL Black Card</h1>
        </div>

        <div className="flex items-center gap-1.5 bg-[#111] border border-white/10 p-1 rounded-2xl w-fit">
          <button
            type="button"
            onClick={() => setTab('black_card')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-agrandir-bold transition-colors cursor-pointer ${
              tab === 'black_card' ? 'bg-white text-black' : 'text-neutral-400 hover:text-white'
            }`}
          >
            <CreditCard className="w-3.5 h-3.5" />
            <span>LUMARÉEL Black Card</span>
          </button>
          <button
            type="button"
            onClick={() => setTab('homepage')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-agrandir-bold transition-colors cursor-pointer ${
              tab === 'homepage' ? 'bg-white text-black' : 'text-neutral-400 hover:text-white'
            }`}
          >
            <Home className="w-3.5 h-3.5" />
            <span>Page d’accueil</span>
          </button>
        </div>
      </div>

      {/* TAB: HOMEPAGE */}
      {tab === 'homepage' && homepage && (
        <form onSubmit={saveHomepage} className="bg-[#0e0e0e] border border-white/10 rounded-3xl p-6 space-y-5">
          <div className="flex items-center justify-between border-b border-white/10 pb-4">
            <div>
              <h2 className="text-sm font-agrandir-extrabold text-white">Réglages de la page d’accueil</h2>
              <p className="text-[11px] text-neutral-400 mt-0.5">
                Textes de recherche et bandeau d’annonce optionnel en tête du flux.
              </p>
            </div>
            <label className="flex items-center gap-2.5 text-xs font-agrandir-bold text-white cursor-pointer">
              <input
                type="checkbox"
                checked={homepage.announcementActive}
                onChange={(e) => setHomepage({ ...homepage, announcementActive: e.target.checked })}
                className="w-4 h-4 accent-white rounded"
              />
              <span>Activer le bandeau d’annonce</span>
            </label>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] uppercase tracking-wider text-neutral-400 mb-1.5">
                Texte de recherche (FR)
              </label>
              <input
                type="text"
                value={homepage.searchPlaceholderFr}
                onChange={(e) => setHomepage({ ...homepage, searchPlaceholderFr: e.target.value })}
                className="w-full bg-[#161616] border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-white/40"
              />
            </div>
            <div>
              <label className="block text-[10px] uppercase tracking-wider text-neutral-400 mb-1.5">
                Texte de recherche (EN)
              </label>
              <input
                type="text"
                value={homepage.searchPlaceholderEn}
                onChange={(e) => setHomepage({ ...homepage, searchPlaceholderEn: e.target.value })}
                className="w-full bg-[#161616] border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-white/40"
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] uppercase tracking-wider text-neutral-400 mb-1.5">
              Message du bandeau d’annonce (si activé)
            </label>
            <input
              type="text"
              value={homepage.announcementBanner}
              onChange={(e) => setHomepage({ ...homepage, announcementBanner: e.target.value })}
              placeholder="Ex: Billetterie ouverte pour le prochain grand concert à Abidjan"
              className="w-full bg-[#161616] border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-white/40"
            />
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-white hover:bg-neutral-200 text-black text-xs font-agrandir-extrabold transition-colors cursor-pointer disabled:opacity-50"
            >
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              <span>Publier l’accueil</span>
            </button>
          </div>
        </form>
      )}

      {/* TAB: BLACK CARD */}
      {tab === 'black_card' && blackCard && (
        <form onSubmit={saveBlackCard} className="space-y-6">
          {/* Card Assets + Pricing + Availability */}
          <div className="bg-[#0e0e0e] border border-white/10 rounded-3xl p-6 space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-4">
              <div>
                <h2 className="text-sm font-agrandir-extrabold text-white">Visuels officiels & Commercialisation</h2>
                <p className="text-[11px] text-neutral-400 mt-0.5">
                  Synchronisé immédiatement avec la page LUMARÉEL Black Card.
                </p>
              </div>
              <label className="flex items-center gap-2.5 px-3.5 py-2 rounded-xl bg-white/5 border border-white/10 text-xs font-agrandir-bold text-white cursor-pointer">
                <input
                  type="checkbox"
                  checked={blackCard.available}
                  onChange={(e) => setBlackCard({ ...blackCard, available: e.target.checked })}
                  className="w-4 h-4 accent-emerald-400"
                />
                <span>{blackCard.available ? 'Commandes ouvertes' : 'Temporairement fermée'}</span>
              </label>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Front visual */}
              <div className="bg-[#141414] border border-white/10 rounded-2xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-agrandir-bold text-white">Face avant (Recto)</span>
                  <button
                    type="button"
                    onClick={() => setPickerTarget('frontImageUrl')}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-[11px] font-agrandir-bold text-white cursor-pointer"
                  >
                    <ImageIcon className="w-3.5 h-3.5" /> Médiathèque
                  </button>
                </div>
                <div className="aspect-[1.586/1] rounded-xl bg-black border border-white/10 overflow-hidden flex items-center justify-center p-2">
                  <img
                    src={blackCard.frontImageUrl}
                    alt="Recto LUMARÉEL Black Card"
                    className="w-full h-full object-contain"
                  />
                </div>
                <input
                  type="text"
                  value={blackCard.frontImageUrl}
                  onChange={(e) => setBlackCard({ ...blackCard, frontImageUrl: e.target.value })}
                  className="w-full bg-black border border-white/10 rounded-lg px-3 py-1.5 text-[11px] font-mono text-neutral-300"
                />
              </div>

              {/* Back visual */}
              <div className="bg-[#141414] border border-white/10 rounded-2xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-agrandir-bold text-white">Face arrière (Verso)</span>
                  <button
                    type="button"
                    onClick={() => setPickerTarget('backImageUrl')}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-[11px] font-agrandir-bold text-white cursor-pointer"
                  >
                    <ImageIcon className="w-3.5 h-3.5" /> Médiathèque
                  </button>
                </div>
                <div className="aspect-[1.586/1] rounded-xl bg-black border border-white/10 overflow-hidden flex items-center justify-center p-2">
                  <img
                    src={blackCard.backImageUrl}
                    alt="Verso LUMARÉEL Black Card"
                    className="w-full h-full object-contain"
                  />
                </div>
                <input
                  type="text"
                  value={blackCard.backImageUrl}
                  onChange={(e) => setBlackCard({ ...blackCard, backImageUrl: e.target.value })}
                  className="w-full bg-black border border-white/10 rounded-lg px-3 py-1.5 text-[11px] font-mono text-neutral-300"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-[10px] uppercase tracking-wider text-neutral-400 mb-1.5">
                  Prix de la carte
                </label>
                <input
                  type="number"
                  min={1000}
                  step={500}
                  value={blackCard.priceAmount}
                  onChange={(e) => setBlackCard({ ...blackCard, priceAmount: Number(e.target.value) })}
                  className="w-full bg-[#161616] border border-white/10 rounded-xl px-4 py-2.5 text-xs font-agrandir-bold text-white"
                />
              </div>
              <div>
                <label className="block text-[10px] uppercase tracking-wider text-neutral-400 mb-1.5">
                  Devise
                </label>
                <input
                  type="text"
                  value={blackCard.currency}
                  onChange={(e) => setBlackCard({ ...blackCard, currency: e.target.value })}
                  className="w-full bg-[#161616] border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white"
                />
              </div>
              <div>
                <label className="block text-[10px] uppercase tracking-wider text-neutral-400 mb-1.5">
                  Validité (FR)
                </label>
                <input
                  type="text"
                  value={blackCard.validityLabelFr}
                  onChange={(e) => setBlackCard({ ...blackCard, validityLabelFr: e.target.value })}
                  className="w-full bg-[#161616] border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] uppercase tracking-wider text-neutral-400 mb-1.5">
                  Accroche Hero (FR)
                </label>
                <input
                  type="text"
                  value={blackCard.heroTitleFr}
                  onChange={(e) => setBlackCard({ ...blackCard, heroTitleFr: e.target.value })}
                  className="w-full bg-[#161616] border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white"
                />
              </div>
              <div>
                <label className="block text-[10px] uppercase tracking-wider text-neutral-400 mb-1.5">
                  Sous-titre Hero (FR)
                </label>
                <input
                  type="text"
                  value={blackCard.heroSubFr}
                  onChange={(e) => setBlackCard({ ...blackCard, heroSubFr: e.target.value })}
                  className="w-full bg-[#161616] border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white"
                />
              </div>
              <div>
                <label className="block text-[10px] uppercase tracking-wider text-neutral-400 mb-1.5">
                  Titre Finale / Climax (FR)
                </label>
                <input
                  type="text"
                  value={blackCard.climaxTitleFr}
                  onChange={(e) => setBlackCard({ ...blackCard, climaxTitleFr: e.target.value })}
                  className="w-full bg-[#161616] border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white"
                />
              </div>
              <div>
                <label className="block text-[10px] uppercase tracking-wider text-neutral-400 mb-1.5">
                  Bouton CTA principal (FR)
                </label>
                <input
                  type="text"
                  value={blackCard.ctaOrderFr}
                  onChange={(e) => setBlackCard({ ...blackCard, ctaOrderFr: e.target.value })}
                  className="w-full bg-[#161616] border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white"
                />
              </div>
            </div>
          </div>

          {/* 7 Real Benefits */}
          <div className="bg-[#0e0e0e] border border-white/10 rounded-3xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div>
                <h2 className="text-sm font-agrandir-extrabold text-white">Les 7 avantages officiels</h2>
                <p className="text-[11px] text-neutral-400 mt-0.5">
                  Affichés dans le récit de la LUMARÉEL Black Card et l’espace carte membre.
                </p>
              </div>
              <span className="flex items-center gap-1 text-[11px] text-emerald-400 font-agrandir-bold">
                <CheckCircle2 className="w-3.5 h-3.5" /> {blackCard.benefits.length} avantages actifs
              </span>
            </div>

            <div className="space-y-3">
              {blackCard.benefits.map((b, idx) => (
                <div key={b.id} className="p-4 rounded-2xl bg-[#141414] border border-white/10 grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] uppercase text-neutral-500 mb-1">
                      Avantage {idx + 1} — Titre (FR)
                    </label>
                    <input
                      type="text"
                      value={b.titleFr}
                      onChange={(e) => updateBenefit(idx, 'titleFr', e.target.value)}
                      className="w-full bg-black border border-white/10 rounded-lg px-3 py-2 text-xs font-agrandir-bold text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase text-neutral-500 mb-1">
                      Description (FR)
                    </label>
                    <input
                      type="text"
                      value={b.descFr}
                      onChange={(e) => updateBenefit(idx, 'descFr', e.target.value)}
                      className="w-full bg-black border border-white/10 rounded-lg px-3 py-2 text-xs text-neutral-200"
                    />
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-end pt-3 border-t border-white/10">
              <button
                type="submit"
                disabled={saving}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-white hover:bg-neutral-200 text-black text-xs font-agrandir-extrabold transition-colors cursor-pointer disabled:opacity-50"
              >
                {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                <span>Enregistrer la LUMARÉEL Black Card</span>
              </button>
            </div>
          </div>
        </form>
      )}

      <MediaPickerModal
        isOpen={pickerTarget !== null}
        onClose={() => setPickerTarget(null)}
        defaultFolder="black_card"
        title={pickerTarget === 'frontImageUrl' ? 'Choisir le recto de la LUMARÉEL Black Card' : 'Choisir le verso de la LUMARÉEL Black Card'}
        onSelect={(url) => {
          if (!blackCard || !pickerTarget) return;
          setBlackCard({ ...blackCard, [pickerTarget]: url });
        }}
      />
    </div>
  );
};
