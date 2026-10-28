import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { AdminStats, Order, ConcertEvent, TransactionalEmail } from '../types';
import { Shield, Plus, Edit3, Eye, Search, DollarSign, Ticket, Calendar, Mail, CheckCircle2 } from 'lucide-react';

export const AdminDashboard: React.FC = () => {
  const { events, refreshEvents, showToast } = useApp();

  const [activeTab, setActiveTab] = useState<'overview' | 'events' | 'orders' | 'emails'>('overview');
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [emails, setEmails] = useState<TransactionalEmail[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [editingEvent, setEditingEvent] = useState<Partial<ConcertEvent> | null>(null);

  const fetchAdminData = async () => {
    try {
      const [resStats, resOrders, resEmails] = await Promise.all([
        fetch('/api/admin/overview'),
        fetch('/api/admin/orders'),
        fetch('/api/admin/emails'),
      ]);

      const [dataStats, dataOrders, dataEmails] = await Promise.all([
        resStats.json(),
        resOrders.json(),
        resEmails.json(),
      ]);

      if (dataStats.success) setStats(dataStats.stats);
      if (dataOrders.success) setOrders(dataOrders.orders);
      if (dataEmails.success) setEmails(dataEmails.emails);
    } catch (err) {
      console.error('Error fetching admin data', err);
    }
  };

  useEffect(() => {
    fetchAdminData();
  }, [events]);

  const handleSaveEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingEvent?.title) {
      showToast('Le titre du concert est obligatoire.', 'error');
      return;
    }

    try {
      const res = await fetch('/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingEvent),
      });
      const data = await res.json();
      if (data.success) {
        showToast('Concert enregistré avec succès.', 'success');
        setEditingEvent(null);
        await refreshEvents();
        await fetchAdminData();
      } else {
        showToast(data.error || 'Erreur lors de la sauvegarde.', 'error');
      }
    } catch (err: any) {
      showToast(err.message || 'Erreur réseau', 'error');
    }
  };

  const filteredOrders = orders.filter((o) => {
    const q = searchQuery.toLowerCase();
    return (
      o.reference.toLowerCase().includes(q) ||
      o.customerName.toLowerCase().includes(q) ||
      o.customerEmail.toLowerCase().includes(q) ||
      o.eventTitle.toLowerCase().includes(q)
    );
  });

  return (
    <div className="max-w-7xl mx-auto px-6 pt-28 sm:pt-32 pb-16">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10 border-b border-[#1c1c1c] pb-8">
        <div>
          <div className="text-[10px] font-agrandir-regular tracking-[0.25em] text-[#888] uppercase mb-1">
            CONSOLE D’ADMINISTRATION CENTRALE
          </div>
          <h1 className="font-agrandir-extrabold text-3xl sm:text-4xl text-white tracking-tight uppercase flex items-center gap-3">
            <Shield className="w-6 h-6 text-white" />
            <span>GESTION PRODUCTION &amp; BILLETTERIE</span>
          </h1>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-1 p-1 bg-[#121212] border border-[#222]">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-4 py-2 text-xs font-agrandir-regular uppercase tracking-wider transition-colors ${
              activeTab === 'overview' ? 'bg-[#222] text-white font-agrandir-semibold' : 'text-[#888] hover:text-white'
            }`}
          >
            Vue d’ensemble
          </button>
          <button
            onClick={() => setActiveTab('events')}
            className={`px-4 py-2 text-xs font-agrandir-regular uppercase tracking-wider transition-colors ${
              activeTab === 'events' ? 'bg-[#222] text-white font-agrandir-semibold' : 'text-[#888] hover:text-white'
            }`}
          >
            Concerts ({events.length})
          </button>
          <button
            onClick={() => setActiveTab('orders')}
            className={`px-4 py-2 text-xs font-mono uppercase tracking-wider transition-colors ${
              activeTab === 'orders' ? 'bg-[#222] text-white font-semibold' : 'text-[#888] hover:text-white'
            }`}
          >
            Commandes ({orders.length})
          </button>
          <button
            onClick={() => setActiveTab('emails')}
            className={`px-4 py-2 text-xs font-mono uppercase tracking-wider transition-colors ${
              activeTab === 'emails' ? 'bg-[#222] text-white font-semibold' : 'text-[#888] hover:text-white'
            }`}
          >
            Journal E-mails
          </button>
        </div>
      </div>

      {/* --- TAB 1: OVERVIEW METRICS (ISSUES DE DONNÉES RÉELLES, ZÉRO CHIFFRE FICTIF) --- */}
      {activeTab === 'overview' && (
        <div className="space-y-10">
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 font-mono">
            <div className="p-6 bg-[#0e0e0e] border border-[#222]">
              <div className="text-[10px] text-[#777] uppercase tracking-widest mb-1">
                CHIFFRE D’AFFAIRES CONFIRMÉ
              </div>
              <div className="text-2xl sm:text-3xl font-bold text-white font-mono-tabular">
                {(stats?.confirmedRevenueXof || 0).toLocaleString()} XOF
              </div>
              <div className="text-[11px] text-[#888] mt-1">
                ~{Math.round((stats?.confirmedRevenueXof || 0) / 655.957).toLocaleString()} EUR
              </div>
            </div>

            <div className="p-6 bg-[#0e0e0e] border border-[#222]">
              <div className="text-[10px] text-[#777] uppercase tracking-widest mb-1">
                BILLETS VENDUS / QUOTA
              </div>
              <div className="text-2xl sm:text-3xl font-bold text-white font-mono-tabular">
                {stats?.ticketsSold || 0} / {stats?.totalQuota || 0}
              </div>
              <div className="text-[11px] text-[#888] mt-1">
                Taux de remplissage : {stats?.totalQuota ? Math.round(((stats.ticketsSold || 0) / stats.totalQuota) * 100) : 0}%
              </div>
            </div>

            <div className="p-6 bg-[#0e0e0e] border border-[#222]">
              <div className="text-[10px] text-[#777] uppercase tracking-widest mb-1">
                COMMANDES PAYÉES
              </div>
              <div className="text-2xl sm:text-3xl font-bold text-white font-mono-tabular">
                {stats?.paidOrdersCount || 0}
              </div>
              <div className="text-[11px] text-[#888] mt-1">
                {stats?.pendingOrdersCount || 0} commande(s) en attente
              </div>
            </div>

            <div className="p-6 bg-[#0e0e0e] border border-[#222]">
              <div className="text-[10px] text-[#777] uppercase tracking-widest mb-1">
                BILLETS SCANNÉS AUX PORTES
              </div>
              <div className="text-2xl sm:text-3xl font-bold text-emerald-400 font-mono-tabular">
                {stats?.checkedInTickets || 0}
              </div>
              <div className="text-[11px] text-[#888] mt-1">
                Accès validés en temps réel
              </div>
            </div>
          </div>

          {/* Recent Orders Overview */}
          <div className="bg-[#0e0e0e] border border-[#222] p-6 font-mono text-xs">
            <div className="flex items-center justify-between pb-4 border-b border-[#222] mb-4">
              <span className="font-bold text-white uppercase tracking-wider">
                DERNIÈRES COMMANDES CONFIRMÉES
              </span>
              <button
                onClick={() => setActiveTab('orders')}
                className="text-[11px] text-[#888] hover:text-white underline"
              >
                Voir tout ({orders.length}) →
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="text-[10px] text-[#666] uppercase border-b border-[#1c1c1c]">
                    <th className="py-2">RÉFÉRENCE</th>
                    <th className="py-2">CLIENT</th>
                    <th className="py-2">CONCERT</th>
                    <th className="py-2">QUANTITÉ</th>
                    <th className="py-2 text-right">MONTANT</th>
                    <th className="py-2 text-right">STATUT</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1c1c1c]">
                  {orders.slice(0, 5).map((o) => (
                    <tr key={o.id} className="hover:bg-[#141414] transition-colors">
                      <td className="py-3 text-white font-bold">{o.reference}</td>
                      <td className="py-3 text-[#ccc]">{o.customerName}</td>
                      <td className="py-3 text-[#aaa]">{o.eventTitle}</td>
                      <td className="py-3 text-[#aaa]">{o.quantity}x {o.categoryName}</td>
                      <td className="py-3 text-right text-white font-mono-tabular">
                        {o.totalAmount.toLocaleString()} {o.currency}
                      </td>
                      <td className="py-3 text-right">
                        <span className="text-[10px] px-2 py-0.5 border border-emerald-900/60 text-emerald-400">
                          {o.paymentStatus.toUpperCase()}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

      {/* --- TAB 2: GESTION DES CONCERTS --- */}
      {activeTab === 'events' && (
        <div className="space-y-8">
          
          <div className="flex items-center justify-between">
            <div className="text-xs font-mono text-[#888] uppercase tracking-wider">
              CATALOGUE OFFICIEL DES CONCERTS LUMARÉEL CO.
            </div>
            <button
              onClick={() =>
                setEditingEvent({
                  title: '',
                  subtitle: '',
                  artist: '',
                  date: '2026-12-05',
                  time: '20:30',
                  venue: 'Pavillon Baltard',
                  city: 'Paris',
                  country: 'France',
                  status: 'published',
                  isFeatured: false,
                })
              }
              className="px-4 py-2 bg-white text-black text-xs font-mono uppercase tracking-widest font-bold hover:bg-[#eaeaea] transition-colors flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              <span>AJOUTER UN CONCERT</span>
            </button>
          </div>

          {/* Edit / Create Form Modal */}
          {editingEvent && (
            <div className="p-6 bg-[#111111] border border-white/20 font-mono text-xs space-y-4">
              <div className="flex items-center justify-between border-b border-[#222] pb-3 text-sm font-bold text-white uppercase">
                <span>{editingEvent.id ? 'MODIFIER LE CONCERT' : 'CRÉER UN NOUVEAU CONCERT'}</span>
                <button
                  onClick={() => setEditingEvent(null)}
                  className="text-[#777] hover:text-white"
                >
                  ANNULER [X]
                </button>
              </div>

              <form onSubmit={handleSaveEvent} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] text-[#777] uppercase mb-1">TITRE DU CONCERT</label>
                    <input
                      type="text"
                      required
                      value={editingEvent.title || ''}
                      onChange={(e) => setEditingEvent({ ...editingEvent, title: e.target.value })}
                      className="w-full bg-[#181818] border border-[#333] px-3 py-2 text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-[#777] uppercase mb-1">ARTISTE / COLLECTIF</label>
                    <input
                      type="text"
                      required
                      value={editingEvent.artist || ''}
                      onChange={(e) => setEditingEvent({ ...editingEvent, artist: e.target.value })}
                      className="w-full bg-[#181818] border border-[#333] px-3 py-2 text-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-[10px] text-[#777] uppercase mb-1">DATE (YYYY-MM-DD)</label>
                    <input
                      type="date"
                      value={editingEvent.date || ''}
                      onChange={(e) => setEditingEvent({ ...editingEvent, date: e.target.value })}
                      className="w-full bg-[#181818] border border-[#333] px-3 py-2 text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-[#777] uppercase mb-1">HORAIRE</label>
                    <input
                      type="text"
                      value={editingEvent.time || ''}
                      onChange={(e) => setEditingEvent({ ...editingEvent, time: e.target.value })}
                      className="w-full bg-[#181818] border border-[#333] px-3 py-2 text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-[#777] uppercase mb-1">STATUT COMMERCIAL</label>
                    <select
                      value={editingEvent.status || 'published'}
                      onChange={(e) => setEditingEvent({ ...editingEvent, status: e.target.value as any })}
                      className="w-full bg-[#181818] border border-[#333] px-3 py-2 text-white"
                    >
                      <option value="published">Publié (Ouvert à la vente)</option>
                      <option value="draft">Brouillon (Non accessible)</option>
                      <option value="sold_out">Complet</option>
                      <option value="completed">Terminé / Archivé</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] text-[#777] uppercase mb-1">LIEU / SALLE</label>
                    <input
                      type="text"
                      value={editingEvent.venue || ''}
                      onChange={(e) => setEditingEvent({ ...editingEvent, venue: e.target.value })}
                      className="w-full bg-[#181818] border border-[#333] px-3 py-2 text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-[#777] uppercase mb-1">VILLE &amp; PAYS</label>
                    <input
                      type="text"
                      value={editingEvent.city || ''}
                      onChange={(e) => setEditingEvent({ ...editingEvent, city: e.target.value })}
                      className="w-full bg-[#181818] border border-[#333] px-3 py-2 text-white"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <input
                    type="checkbox"
                    id="isFeatured"
                    checked={!!editingEvent.isFeatured}
                    onChange={(e) => setEditingEvent({ ...editingEvent, isFeatured: e.target.checked })}
                    className="w-4 h-4 bg-[#181818] border-[#333]"
                  />
                  <label htmlFor="isFeatured" className="text-white cursor-pointer">
                    Mettre en avant sur la Splash Page d’accueil (avec compte à rebours &amp; portrait)
                  </label>
                </div>

                <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#222]">
                  <button
                    type="button"
                    onClick={() => setEditingEvent(null)}
                    className="px-4 py-2 border border-[#333] text-[#aaa] hover:text-white"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2 bg-white text-black font-bold uppercase tracking-wider"
                  >
                    Enregistrer le concert
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Events Table */}
          <div className="space-y-4">
            {events.map((evt) => {
              const totalQuota = evt.categories.reduce((acc, c) => acc + c.quota, 0);
              const totalSold = evt.categories.reduce((acc, c) => acc + c.sold, 0);

              return (
                <div
                  key={evt.id}
                  className="p-6 bg-[#0e0e0e] border border-[#222] flex flex-col md:flex-row md:items-center justify-between gap-6 font-mono text-xs"
                >
                  <div>
                    <div className="flex items-center gap-3 mb-1">
                      <span className="font-bold text-white text-base">{evt.title}</span>
                      {evt.isFeatured && (
                        <span className="text-[10px] px-2 py-0.5 bg-white text-black font-bold">
                          SPLASH HERO
                        </span>
                      )}
                      <span className="text-[10px] px-2 py-0.5 border border-[#444] text-[#aaa] uppercase">
                        {evt.status}
                      </span>
                    </div>

                    <div className="text-[#ccc] text-sm mt-1">{evt.artist}</div>
                    <div className="text-[#777] text-xs mt-1">
                      {evt.date} à {evt.time} · {evt.venue} ({evt.city})
                    </div>
                    <div className="text-[#888] text-[11px] mt-2">
                      Ventes : <strong className="text-white">{totalSold}</strong> / {totalQuota} billets ({totalQuota - totalSold} restants)
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setEditingEvent(evt)}
                      className="px-4 py-2 border border-[#333] hover:border-white text-white flex items-center gap-1.5 transition-colors"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>Modifier</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

        </div>
      )}

      {/* --- TAB 3: COMMANDES --- */}
      {activeTab === 'orders' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-[#666] absolute left-3 top-3" />
              <input
                type="text"
                placeholder="Rechercher par référence (ex: LMR-CMD-8832), client, email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-[#121212] border border-[#2a2a2a] pl-9 pr-4 py-2.5 text-xs font-mono text-white focus:outline-none focus:border-white"
              />
            </div>
            <div className="text-xs font-mono text-[#888]">
              {filteredOrders.length} commande(s) trouvée(s)
            </div>
          </div>

          <div className="space-y-3 font-mono text-xs">
            {filteredOrders.map((ord) => (
              <div
                key={ord.id}
                className="p-5 bg-[#0e0e0e] border border-[#222] flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div>
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-white text-sm">{ord.reference}</span>
                    <span className="text-[10px] px-2 py-0.5 border border-emerald-900/60 text-emerald-400">
                      {ord.paymentStatus.toUpperCase()}
                    </span>
                    <span className="text-[#666] text-[10px]">
                      {new Date(ord.createdAt).toLocaleString('fr-FR')}
                    </span>
                  </div>

                  <div className="text-white mt-1">
                    {ord.customerName} &lt;{ord.customerEmail}&gt; {ord.customerPhone && `· ${ord.customerPhone}`}
                  </div>

                  <div className="text-[#888] text-[11px] mt-0.5">
                    {ord.eventTitle} — {ord.quantity}x {ord.categoryName}
                  </div>

                  {ord.tickets && ord.tickets.length > 0 && (
                    <div className="mt-2 text-[11px] text-[#aaa]">
                      Billets émis : {ord.tickets.map((t) => t.serialNumber).join(', ')}
                    </div>
                  )}
                </div>

                <div className="text-right">
                  <div className="text-base font-bold text-white font-mono-tabular">
                    {ord.totalAmount.toLocaleString()} {ord.currency}
                  </div>
                  <div className="text-[10px] text-[#666] mt-1">
                    Passerelle : {ord.paymentProvider.toUpperCase()} ({ord.paymentRef})
                  </div>
                </div>
              </div>
            ))}
          </div>

        </div>
      )}

      {/* --- TAB 4: JOURNAL DES EMAILS TRANSACTIONNELS --- */}
      {activeTab === 'emails' && (
        <div className="space-y-4 font-mono text-xs">
          <div className="text-xs text-[#888] uppercase tracking-wider mb-2">
            HISTORIQUE D’ENVOI DES BILLETS ET AVIS CLIENTS (IDEMPOTENT)
          </div>

          {emails.map((eml) => (
            <div key={eml.id} className="p-4 bg-[#0e0e0e] border border-[#222] space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-white font-bold">{eml.subject}</span>
                <span className="text-emerald-400 text-[10px]">{eml.status.toUpperCase()}</span>
              </div>
              <div className="text-[#888] text-[11px]">
                Destinataire : <strong className="text-[#ccc]">{eml.recipient}</strong> · {new Date(eml.timestamp).toLocaleString('fr-FR')}
              </div>
              <div className="text-[#666] text-[11px] pt-1 border-t border-[#1a1a1a]">
                Aperçu : {eml.contentPreview}
              </div>
            </div>
          ))}
        </div>
      )}

    </div>
  );
};
