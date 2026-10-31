import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { ConcertEvent, TicketCategory } from '../types';
import {
  ShieldCheck,
  Cpu,
  Flame,
  CheckCircle2,
  ArrowRight,
  Plus,
  BarChart3,
  Calendar,
  Users,
  QrCode,
  DollarSign,
  Percent,
  Clock,
  Sparkles,
} from 'lucide-react';

export const OrganizersView: React.FC = () => {
  const { events, refreshEvents, showToast, setCurrentPage, setSelectedEventSlug } = useApp();

  // Tab: 'overview' | 'register' | 'portal'
  const [activeTab, setActiveTab] = useState<'overview' | 'register' | 'portal'>('overview');

  // Registration form state
  const [regForm, setRegForm] = useState({
    companyName: '',
    contactName: '',
    email: '',
    phone: '',
    city: 'Abidjan',
    country: 'Côte d’Ivoire',
    experienceYears: '3 ans et plus',
    pastEvents: '',
  });
  const [registrationSubmitted, setRegistrationSubmitted] = useState(false);

  // New Event creation form state (for verified partner demo)
  const [isCreatingEvent, setIsCreatingEvent] = useState(false);
  const [newEvent, setNewEvent] = useState({
    title: '',
    artist: '',
    date: '2026-12-30',
    time: '20:00',
    doorsOpen: '18:30',
    venue: '',
    city: 'Abidjan',
    country: 'Côte d’Ivoire',
    genre: 'Rap Français / Trap',
    description: '',
    categoryName: 'ENTRÉE GÉNÉRALE',
    categoryPrice: 15000,
    categoryQuota: 500,
    platformCommissionPercent: 5.0, // Configurable platform fee
  });

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regForm.companyName || !regForm.contactName || !regForm.email) {
      showToast('Veuillez compléter les informations obligatoires.', 'error');
      return;
    }

    try {
      const res = await fetch('/api/organizers/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(regForm),
      });
      const data = await res.json();
      if (data.success) {
        setRegistrationSubmitted(true);
        showToast(data.message, 'success');
      } else {
        showToast(data.error || 'Erreur lors de l’inscription.', 'error');
      }
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const handleCreateEventSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEvent.title || !newEvent.artist || !newEvent.venue) {
      showToast('Veuillez remplir le titre, l’artiste et le lieu.', 'error');
      return;
    }

    const payload: Partial<ConcertEvent> & { title: string } = {
      title: newEvent.title,
      artist: newEvent.artist,
      date: newEvent.date,
      time: newEvent.time,
      doorsOpen: newEvent.doorsOpen,
      venue: newEvent.venue,
      city: newEvent.city,
      country: newEvent.country,
      genre: newEvent.genre,
      description: newEvent.description,
      organizerType: 'partner',
      organizerName: regForm.companyName || 'Dope Music Hub (Partenaire)',
      organizerId: 'org_dope_music',
      platformFeePercent: newEvent.platformCommissionPercent,
      status: 'published',
      categories: [
        {
          id: `cat_gen_${Date.now()}`,
          name: newEvent.categoryName,
          price: Number(newEvent.categoryPrice),
          currency: 'FCFA',
          quota: Number(newEvent.categoryQuota),
          sold: 0,
          description: 'Billet officiel émis via la marketplace LUMARÉEL',
          perks: ['Entrée garantie', 'QR Code infalsifiable'],
        },
      ],
    };

    try {
      const res = await fetch('/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.success) {
        showToast('Événement créé et mis en ligne avec succès sur la marketplace !', 'success');
        setIsCreatingEvent(false);
        await refreshEvents();
      } else {
        showToast(data.error || 'Erreur lors de la création.', 'error');
      }
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  // Partner events list
  const partnerEvents = events.filter((e) => e.organizerType === 'partner');
  const totalPartnerSold = partnerEvents.reduce(
    (acc, e) => acc + e.categories.reduce((cAcc, c) => cAcc + c.sold, 0),
    0
  );
  const totalPartnerRevenue = partnerEvents.reduce(
    (acc, e) => acc + e.categories.reduce((cAcc, c) => cAcc + c.sold * c.price, 0),
    0
  );

  return (
    <div className="max-w-7xl mx-auto px-6 pt-24 sm:pt-28 pb-20">
      
      {/* Top Section */}
      <div className="mb-10 pb-6 border-b border-[#1c1c1c] flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div>
          <div className="text-xs font-agrandir-regular tracking-[0.25em] text-[#d4af37] uppercase mb-2">
            PLATEFORME PROFESSIONNELLE &amp; MARKETPLACE
          </div>
          <h1 className="font-agrandir-extrabold text-3xl sm:text-5xl text-white tracking-tight uppercase">
            ESPACE ORGANISATEURS
          </h1>
          <p className="mt-2 text-xs sm:text-sm font-agrandir-regular text-[#888] max-w-2xl font-light leading-relaxed">
            Diffusez vos événements, gérez vos quotas en temps réel et protégez vos entrées avec la billetterie inviolable de LUMARÉEL CO.
          </p>
        </div>

        {/* Tab switcher */}
        <div className="flex items-center gap-1 bg-[#111] p-1 border border-[#222]">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-4 py-2 text-xs font-agrandir-semibold uppercase tracking-wider transition-colors cursor-pointer ${
              activeTab === 'overview' ? 'bg-white text-black' : 'text-[#888] hover:text-white'
            }`}
          >
            Solutions
          </button>
          <button
            onClick={() => setActiveTab('portal')}
            className={`px-4 py-2 text-xs font-agrandir-semibold uppercase tracking-wider transition-colors cursor-pointer ${
              activeTab === 'portal' ? 'bg-white text-black' : 'text-[#888] hover:text-white'
            }`}
          >
            Tableau de Bord Pro
          </button>
          <button
            onClick={() => setActiveTab('register')}
            className={`px-4 py-2 text-xs font-agrandir-semibold uppercase tracking-wider transition-colors cursor-pointer ${
              activeTab === 'register' ? 'bg-white text-black' : 'text-[#888] hover:text-white'
            }`}
          >
            Postuler
          </button>
        </div>
      </div>

      {/* =========================================================================
          TAB 1: OVERVIEW / SOLUTIONS PRO
         ========================================================================= */}
      {activeTab === 'overview' && (
        <div className="space-y-16">
          
          {/* Key Advantages Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-8 bg-[#0c0c0c] border border-[#1f1f1f] space-y-4">
              <ShieldCheck className="w-8 h-8 text-[#d4af37]" />
              <h3 className="font-agrandir-extrabold text-lg text-white uppercase tracking-tight">
                PROTOCOLE ANTI-DOUBLE SCAN
              </h3>
              <p className="font-agrandir-regular text-xs text-[#888] leading-relaxed">
                Chaque billet vendu est généré avec un jeton cryptographique serveur unique. Impossible de dupliquer ou de revendre le même QR code : le scan est atomique et verrouillé instantanément.
              </p>
            </div>

            <div className="p-8 bg-[#0c0c0c] border border-[#1f1f1f] space-y-4">
              <BarChart3 className="w-8 h-8 text-white" />
              <h3 className="font-agrandir-extrabold text-lg text-white uppercase tracking-tight">
                QUOTAS CONCURRENTS &amp; PAIEMENTS
              </h3>
              <p className="font-agrandir-regular text-xs text-[#888] leading-relaxed">
                Fixez vos prix par zone (Fosse, Balcon, Carré Or, VIP). Encaissez en Francs CFA (Mobile Money Orange, Wave, MTN) et en Euros (Cartes bancaires internationales) avec versement transparent.
              </p>
            </div>

            <div className="p-8 bg-[#0c0c0c] border border-[#1f1f1f] space-y-4">
              <Percent className="w-8 h-8 text-[#d4af37]" />
              <h3 className="font-agrandir-extrabold text-lg text-white uppercase tracking-tight">
                COMMISSION TRANSPARENTE
              </h3>
              <p className="font-agrandir-regular text-xs text-[#888] leading-relaxed">
                Modèle économique modulable et convenu contractuellement (taux standard à 5% incluant hébergement, sécurisation, routage des e-mails et accès aux terminaux de contrôle).
              </p>
            </div>
          </div>

          {/* Workflow Steps */}
          <div className="p-8 sm:p-10 bg-[#0c0c0c] border border-[#222]">
            <div className="text-[10px] font-agrandir-regular tracking-[0.25em] text-[#777] uppercase mb-2">
              COMMENT ÇA FONCTIONNE
            </div>
            <h2 className="font-agrandir-extrabold text-2xl text-white uppercase tracking-tight mb-8">
              LE PARCOURS ORGANISATEUR EN 4 ÉTAPES
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="border-t border-[#333] pt-4">
                <span className="font-agrandir-extrabold text-2xl text-[#d4af37]">01</span>
                <h4 className="font-agrandir-semibold text-sm text-white uppercase mt-2 mb-1">Candidature</h4>
                <p className="font-agrandir-regular text-xs text-[#777]">
                  Soumettez les informations de votre structure et vos références événementielles.
                </p>
              </div>

              <div className="border-t border-[#333] pt-4">
                <span className="font-agrandir-extrabold text-2xl text-white">02</span>
                <h4 className="font-agrandir-semibold text-sm text-white uppercase mt-2 mb-1">Validation</h4>
                <p className="font-agrandir-regular text-xs text-[#777]">
                  L'équipe LUMARÉEL valide la conformité et active vos accès créateur d'événements.
                </p>
              </div>

              <div className="border-t border-[#333] pt-4">
                <span className="font-agrandir-extrabold text-2xl text-[#d4af37]">03</span>
                <h4 className="font-agrandir-semibold text-sm text-white uppercase mt-2 mb-1">Mise en vente</h4>
                <p className="font-agrandir-regular text-xs text-[#777]">
                  Configurez vos jauges, visuels et catégories. Vos ventes s'ouvrent sur notre catalogue.
                </p>
              </div>

              <div className="border-t border-[#333] pt-4">
                <span className="font-agrandir-extrabold text-2xl text-white">04</span>
                <h4 className="font-agrandir-semibold text-sm text-white uppercase mt-2 mb-1">Contrôle aux portes</h4>
                <p className="font-agrandir-regular text-xs text-[#777]">
                  Vos agents scannent directement avec notre terminal intégré smartphone le jour J.
                </p>
              </div>
            </div>

            <div className="mt-10 pt-6 border-t border-[#1a1a1a] flex flex-col sm:flex-row items-center justify-between gap-4">
              <span className="text-xs font-agrandir-regular text-[#888]">
                Prêt à diffuser votre concert sur LUMARÉEL ?
              </span>
              <button
                onClick={() => setActiveTab('register')}
                className="px-6 py-3 bg-white text-black font-agrandir-semibold text-xs uppercase tracking-widest hover:bg-[#eaeaea] transition-all cursor-pointer"
              >
                POSTULER COMME ORGANISATEUR PARTENAIRE →
              </button>
            </div>
          </div>

        </div>
      )}

      {/* =========================================================================
          TAB 2: TABLEAU DE BORD ORGANISATEUR (GESTION & ANALYTICS RÉELLES)
         ========================================================================= */}
      {activeTab === 'portal' && (
        <div className="space-y-10">
          
          {/* Top KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div className="p-6 bg-[#0c0c0c] border border-[#1f1f1f]">
              <div className="text-[10px] font-agrandir-regular text-[#777] uppercase tracking-wider mb-1">
                ÉVÉNEMENTS PARTENAIRES ACTIFS
              </div>
              <div className="text-3xl font-agrandir-extrabold text-white">
                {partnerEvents.length}
              </div>
              <div className="text-[11px] text-[#555] font-agrandir-regular mt-1">
                Certifiés &amp; en vente sur le catalogue
              </div>
            </div>

            <div className="p-6 bg-[#0c0c0c] border border-[#1f1f1f]">
              <div className="text-[10px] font-agrandir-regular text-[#777] uppercase tracking-wider mb-1">
                BILLETS PARTENAIRES VENDUS
              </div>
              <div className="text-3xl font-agrandir-extrabold text-[#d4af37]">
                {totalPartnerSold.toLocaleString()}
              </div>
              <div className="text-[11px] text-[#555] font-agrandir-regular mt-1">
                Quotas contrôlés en temps réel
              </div>
            </div>

            <div className="p-6 bg-[#0c0c0c] border border-[#1f1f1f]">
              <div className="text-[10px] font-agrandir-regular text-[#777] uppercase tracking-wider mb-1">
                VOLUME D'AFFAIRES PARTENAIRES
              </div>
              <div className="text-3xl font-agrandir-extrabold text-white">
                {totalPartnerRevenue.toLocaleString()} FCFA
              </div>
            </div>
          </div>

          {/* Action strip: Create Event Button */}
          <div className="flex items-center justify-between pb-4 border-b border-[#181818]">
            <h3 className="font-agrandir-extrabold text-xl text-white uppercase tracking-tight">
              VOS CONCERTS &amp; PRODUCTIONS
            </h3>

            <div className="flex items-center gap-3">
              <button
                onClick={() => setCurrentPage('gate_scanner')}
                className="px-4 py-2 border border-[#333] hover:border-white text-xs font-agrandir-semibold uppercase tracking-wider text-[#aaa] hover:text-white transition-colors cursor-pointer flex items-center gap-2"
              >
                <QrCode className="w-3.5 h-3.5" />
                <span>TERMINAL SCANNER</span>
              </button>

              <button
                onClick={() => setIsCreatingEvent(!isCreatingEvent)}
                className="px-5 py-2 bg-white text-black text-xs font-agrandir-semibold uppercase tracking-wider hover:bg-[#eaeaea] transition-colors cursor-pointer flex items-center gap-2 shadow-xl"
              >
                <Plus className="w-4 h-4" />
                <span>CRÉER UN ÉVÉNEMENT</span>
              </button>
            </div>
          </div>

          {/* Creation Form Modal / Collapsible */}
          {isCreatingEvent && (
            <div className="p-8 bg-[#0e0e0e] border border-[#2a2a2a] animate-fadeIn">
              <div className="mb-6 pb-4 border-b border-[#222]">
                <h4 className="font-agrandir-extrabold text-lg text-white uppercase">
                  NOUVEL ÉVÉNEMENT PARTENAIRE
                </h4>
                <p className="text-xs font-agrandir-regular text-[#888] mt-1">
                  Les événements créés sont automatiquement enregistrés et visibles sur le catalogue Découvrir.
                </p>
              </div>

              <form onSubmit={handleCreateEventSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] text-[#777] uppercase mb-1 font-agrandir-regular">
                      TITRE DU CONCERT *
                    </label>
                    <input
                      type="text"
                      required
                      value={newEvent.title}
                      onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })}
                      placeholder="Ex: NUIT DRILL &amp; BASS"
                      className="w-full bg-[#161616] border border-[#333] px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-white font-agrandir-regular"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] text-[#777] uppercase mb-1 font-agrandir-regular">
                      ARTISTE OU COLLECTIF *
                    </label>
                    <input
                      type="text"
                      required
                      value={newEvent.artist}
                      onChange={(e) => setNewEvent({ ...newEvent, artist: e.target.value })}
                      placeholder="Ex: COLLECTIF AFROWAVE"
                      className="w-full bg-[#161616] border border-[#333] px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-white font-agrandir-regular"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-[10px] text-[#777] uppercase mb-1 font-agrandir-regular">
                      DATE (YYYY-MM-DD) *
                    </label>
                    <input
                      type="date"
                      required
                      value={newEvent.date}
                      onChange={(e) => setNewEvent({ ...newEvent, date: e.target.value })}
                      className="w-full bg-[#161616] border border-[#333] px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-white font-agrandir-regular"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] text-[#777] uppercase mb-1 font-agrandir-regular">
                      HEURE DÉBUT *
                    </label>
                    <input
                      type="text"
                      required
                      value={newEvent.time}
                      onChange={(e) => setNewEvent({ ...newEvent, time: e.target.value })}
                      placeholder="20:30"
                      className="w-full bg-[#161616] border border-[#333] px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-white font-agrandir-regular"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] text-[#777] uppercase mb-1 font-agrandir-regular">
                      GENRE MUSICAL *
                    </label>
                    <select
                      value={newEvent.genre}
                      onChange={(e) => setNewEvent({ ...newEvent, genre: e.target.value })}
                      className="w-full bg-[#161616] border border-[#333] px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-white font-agrandir-regular uppercase"
                    >
                      <option value="Rap / Hip-Hop">Rap / Hip-Hop</option>
                      <option value="Rap Français / Trap">Rap Français / Trap</option>
                      <option value="Électro & Expérimental">Électro &amp; Expérimental</option>
                      <option value="Électro-Afro / Club">Électro-Afro / Club</option>
                      <option value="Afro-Rap / Live Band">Afro-Rap / Live Band</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] text-[#777] uppercase mb-1 font-agrandir-regular">
                      LIEU OU SALLE *
                    </label>
                    <input
                      type="text"
                      required
                      value={newEvent.venue}
                      onChange={(e) => setNewEvent({ ...newEvent, venue: e.target.value })}
                      placeholder="Ex: Palais de la Culture, Salle Kodjo Ebouclé"
                      className="w-full bg-[#161616] border border-[#333] px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-white font-agrandir-regular"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] text-[#777] uppercase mb-1 font-agrandir-regular">
                      VILLE *
                    </label>
                    <input
                      type="text"
                      required
                      value={newEvent.city}
                      onChange={(e) => setNewEvent({ ...newEvent, city: e.target.value })}
                      className="w-full bg-[#161616] border border-[#333] px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-white font-agrandir-regular"
                    />
                  </div>
                </div>

                {/* Ticket category configuration */}
                <div className="p-4 bg-[#141414] border border-[#2a2a2a] space-y-3">
                  <div className="text-[10px] text-[#d4af37] uppercase font-agrandir-semibold tracking-wider">
                    PARAMÉTRAGE DE LA BILLETTERIE &amp; COMMISSION
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-[10px] text-[#777] uppercase mb-1 font-agrandir-regular">
                        NOM DE CATÉGORIE
                      </label>
                      <input
                        type="text"
                        value={newEvent.categoryName}
                        onChange={(e) => setNewEvent({ ...newEvent, categoryName: e.target.value })}
                        className="w-full bg-[#1c1c1c] border border-[#333] px-3 py-2 text-xs text-white font-agrandir-regular"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-[#777] uppercase mb-1 font-agrandir-regular">
                        PRIX DU BILLET (FCFA)
                      </label>
                      <input
                        type="number"
                        value={newEvent.categoryPrice}
                        onChange={(e) => setNewEvent({ ...newEvent, categoryPrice: Number(e.target.value) })}
                        className="w-full bg-[#1c1c1c] border border-[#333] px-3 py-2 text-xs text-white font-agrandir-regular"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-[#777] uppercase mb-1 font-agrandir-regular">
                        JAUGE / QUOTA MAXIMAL
                      </label>
                      <input
                        type="number"
                        value={newEvent.categoryQuota}
                        onChange={(e) => setNewEvent({ ...newEvent, categoryQuota: Number(e.target.value) })}
                        className="w-full bg-[#1c1c1c] border border-[#333] px-3 py-2 text-xs text-white font-agrandir-regular"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 pt-3">
                  <button
                    type="button"
                    onClick={() => setIsCreatingEvent(false)}
                    className="px-4 py-2.5 border border-[#333] text-xs font-agrandir-regular text-[#888] hover:text-white uppercase"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2.5 bg-white text-black text-xs font-agrandir-semibold uppercase tracking-wider hover:bg-[#eaeaea] cursor-pointer"
                  >
                    Publier l'événement
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* List of Partner Events */}
          <div className="divide-y divide-[#1c1c1c] border-t border-b border-[#1c1c1c]">
            {partnerEvents.map((evt) => {
              const totalQuota = evt.categories.reduce((a, c) => a + c.quota, 0);
              const totalSold = evt.categories.reduce((a, c) => a + c.sold, 0);
              const revenue = evt.categories.reduce((a, c) => a + c.sold * c.price, 0);

              return (
                <div
                  key={evt.id}
                  className="py-5 grid grid-cols-1 md:grid-cols-12 gap-4 items-center hover:bg-white/[0.01] px-2"
                >
                  <div className="md:col-span-5">
                    <div className="text-[10px] font-agrandir-regular text-[#d4af37] uppercase tracking-wider">
                      {evt.organizerName}
                    </div>
                    <div className="font-agrandir-extrabold text-lg text-white uppercase">
                      {evt.artist}
                    </div>
                    <div className="text-xs font-agrandir-regular text-[#888]">
                      {evt.title} — {evt.venue} ({evt.city})
                    </div>
                  </div>

                  <div className="md:col-span-3 text-xs font-agrandir-regular text-[#aaa]">
                    <div>{evt.date} · {evt.time}</div>
                    <div className="text-[#666] text-[11px]">{evt.genre}</div>
                  </div>

                  <div className="md:col-span-2 text-xs font-agrandir-regular">
                    <div className="font-agrandir-semibold text-white">
                      {totalSold} / {totalQuota} vendus
                    </div>
                    <div className="text-[#777] text-[11px]">
                      {revenue.toLocaleString()} FCFA
                    </div>
                  </div>

                  <div className="md:col-span-2 flex items-center justify-end gap-2">
                    <button
                      onClick={() => {
                        setSelectedEventSlug(evt.slug);
                        setCurrentPage('concert_detail');
                      }}
                      className="px-3 py-1.5 border border-[#333] hover:border-white text-[10px] font-agrandir-semibold uppercase tracking-wider text-white transition-colors"
                    >
                      Aperçu Fiche
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

        </div>
      )}

      {/* =========================================================================
          TAB 3: FORMULAIRE DE CANDIDATURE ORGANISATEUR PARTENAIRE
         ========================================================================= */}
      {activeTab === 'register' && (
        <div className="max-w-2xl mx-auto p-8 sm:p-10 bg-[#0c0c0c] border border-[#222]">
          
          <div className="mb-6">
            <h2 className="font-agrandir-extrabold text-2xl text-white uppercase tracking-tight">
              POSTULER POUR REJOINDRE LA MARKETPLACE
            </h2>
            <p className="font-agrandir-regular text-xs text-[#777] mt-1 leading-relaxed">
              Pour préserver l'exigence culturelle et technique de la plateforme, chaque organisateur fait l'objet d'un examen préalable.
            </p>
          </div>

          {registrationSubmitted ? (
            <div className="p-8 bg-[#111] border border-emerald-900/40 text-center">
              <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto mb-3" />
              <div className="font-agrandir-extrabold text-lg text-white uppercase mb-2">
                DOSSIER TRANSMIS À LA DIRECTION
              </div>
              <p className="font-agrandir-regular text-xs text-[#aaa] max-w-md mx-auto mb-6 leading-relaxed">
                Votre candidature pour {regForm.companyName} a bien été enregistrée. Notre équipe examinera vos références et vous contactera sous 24 à 48 heures.
              </p>
              <button
                onClick={() => {
                  setRegistrationSubmitted(false);
                  setActiveTab('portal');
                }}
                className="px-6 py-2.5 bg-white text-black font-agrandir-semibold text-xs uppercase tracking-wider cursor-pointer"
              >
                Accéder à l'espace de démonstration
              </button>
            </div>
          ) : (
            <form onSubmit={handleRegisterSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-agrandir-regular text-[#777] uppercase mb-1">
                    NOM DE LA STRUCTURE / LABEL *
                  </label>
                  <input
                    type="text"
                    required
                    value={regForm.companyName}
                    onChange={(e) => setRegForm({ ...regForm, companyName: e.target.value })}
                    placeholder="Ex: AfroWave Entertainment"
                    className="w-full bg-[#141414] border border-[#2a2a2a] px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-white font-agrandir-regular"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-agrandir-regular text-[#777] uppercase mb-1">
                    NOM DU RESPONSABLE *
                  </label>
                  <input
                    type="text"
                    required
                    value={regForm.contactName}
                    onChange={(e) => setRegForm({ ...regForm, contactName: e.target.value })}
                    placeholder="Prénom et Nom"
                    className="w-full bg-[#141414] border border-[#2a2a2a] px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-white font-agrandir-regular"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-agrandir-regular text-[#777] uppercase mb-1">
                    E-MAIL PROFESSIONNEL *
                  </label>
                  <input
                    type="email"
                    required
                    value={regForm.email}
                    onChange={(e) => setRegForm({ ...regForm, email: e.target.value })}
                    placeholder="contact@structure.com"
                    className="w-full bg-[#141414] border border-[#2a2a2a] px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-white font-agrandir-regular"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-agrandir-regular text-[#777] uppercase mb-1">
                    TÉLÉPHONE / WHATSAPP
                  </label>
                  <input
                    type="tel"
                    value={regForm.phone}
                    onChange={(e) => setRegForm({ ...regForm, phone: e.target.value })}
                    placeholder="+225 07 00 00 00 00"
                    className="w-full bg-[#141414] border border-[#2a2a2a] px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-white font-agrandir-regular"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-agrandir-regular text-[#777] uppercase mb-1">
                    VILLE D'IMPLANTATION
                  </label>
                  <input
                    type="text"
                    value={regForm.city}
                    onChange={(e) => setRegForm({ ...regForm, city: e.target.value })}
                    className="w-full bg-[#141414] border border-[#2a2a2a] px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-white font-agrandir-regular"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-agrandir-regular text-[#777] uppercase mb-1">
                    EXPÉRIENCE EN PRODUCTION
                  </label>
                  <select
                    value={regForm.experienceYears}
                    onChange={(e) => setRegForm({ ...regForm, experienceYears: e.target.value })}
                    className="w-full bg-[#141414] border border-[#2a2a2a] px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-white font-agrandir-regular uppercase"
                  >
                    <option value="Moins de 2 ans">1 à 2 ans</option>
                    <option value="3 ans et plus">3 à 5 ans</option>
                    <option value="Plus de 5 ans">Plus de 5 ans (Tourneur / Salle)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-agrandir-regular text-[#777] uppercase mb-1">
                  ÉVÉNEMENTS RÉALISÉS OU PROCHAIN PROJET PRÉVU
                </label>
                <textarea
                  rows={3}
                  value={regForm.pastEvents}
                  onChange={(e) => setRegForm({ ...regForm, pastEvents: e.target.value })}
                  placeholder="Artistes programmés, salles envisagées, jauges estimées..."
                  className="w-full bg-[#141414] border border-[#2a2a2a] p-3 text-xs text-white focus:outline-none focus:border-white font-agrandir-regular"
                />
              </div>

              <button
                type="submit"
                className="w-full py-4 bg-white text-black font-agrandir-semibold text-xs uppercase tracking-widest hover:bg-[#eaeaea] transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xl"
              >
                <span>TRANSMETTRE LA CANDIDATURE ORGANISATEUR</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          )}

        </div>
      )}

    </div>
  );
};
