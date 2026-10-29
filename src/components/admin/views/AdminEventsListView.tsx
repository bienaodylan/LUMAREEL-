import React, { useState } from 'react';
import { ConcertEvent } from '../../../types';
import { 
  Search, 
  Plus, 
  ExternalLink, 
  ChevronRight, 
  Calendar, 
  MapPin, 
  Ticket, 
  Eye, 
  TrendingUp, 
  Filter 
} from 'lucide-react';

interface AdminEventsListViewProps {
  events: ConcertEvent[];
  onSelectEvent: (eventId: string) => void;
  onCreateEvent: () => void;
  onPreviewPublic: (slug: string) => void;
}

export const AdminEventsListView: React.FC<AdminEventsListViewProps> = ({
  events,
  onSelectEvent,
  onCreateEvent,
  onPreviewPublic,
}) => {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'published' | 'draft' | 'archived'>('all');

  const filteredEvents = events.filter((evt) => {
    const matchesSearch =
      search === '' ||
      evt.title.toLowerCase().includes(search.toLowerCase()) ||
      evt.artist.toLowerCase().includes(search.toLowerCase()) ||
      evt.venue.toLowerCase().includes(search.toLowerCase());

    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'published' && evt.status === 'published') ||
      (statusFilter === 'draft' && evt.status === 'draft') ||
      (statusFilter === 'archived' && (evt.status === 'cancelled' || evt.status === 'completed'));

    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: ConcertEvent['status']) => {
    switch (status) {
      case 'published':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-agrandir-bold uppercase tracking-wider">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>Publié</span>
          </span>
        );
      case 'draft':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[10px] font-agrandir-bold uppercase tracking-wider">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
            <span>Brouillon</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-neutral-500/10 text-neutral-400 border border-neutral-500/20 text-[10px] font-agrandir-bold uppercase tracking-wider">
            <span className="w-1.5 h-1.5 rounded-full bg-neutral-400" />
            <span>Clôturé</span>
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 select-none">
      
      {/* 1. Header Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="text-[10px] font-agrandir-semibold tracking-[0.25em] text-[#d4af37] uppercase mb-1">
            CATALOGUE DE GESTION DES PRODUITS
          </div>
          <h1 className="font-agrandir-extrabold text-2xl sm:text-3xl text-white tracking-tight uppercase">
            CONCERTS &amp; ÉVÉNEMENTS ({events.length})
          </h1>
        </div>

        <button
          onClick={onCreateEvent}
          className="self-start sm:self-auto px-5 py-2.5 rounded-xl bg-white hover:bg-neutral-200 text-black font-agrandir-extrabold text-xs uppercase tracking-wider transition-colors cursor-pointer flex items-center gap-2 shadow-lg"
        >
          <Plus className="w-4 h-4" />
          <span>Créer un concert</span>
        </button>
      </div>

      {/* 2. Filtres & Recherche inspirés de Shopify */}
      <div className="bg-[#0c0c0c] border border-white/10 rounded-2xl p-3 sm:p-4 shadow-xl space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          
          {/* Status Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-agrandir-semibold transition-all cursor-pointer whitespace-nowrap ${
                statusFilter === 'all'
                  ? 'bg-white text-black font-agrandir-extrabold'
                  : 'text-[#888] hover:text-white hover:bg-white/5'
              }`}
            >
              Tous ({events.length})
            </button>
            <button
              onClick={() => setStatusFilter('published')}
              className={`px-3 py-1.5 rounded-lg text-xs font-agrandir-semibold transition-all cursor-pointer whitespace-nowrap ${
                statusFilter === 'published'
                  ? 'bg-white text-black font-agrandir-extrabold'
                  : 'text-[#888] hover:text-white hover:bg-white/5'
              }`}
            >
              Publiés ({events.filter(e => e.status === 'published').length})
            </button>
            <button
              onClick={() => setStatusFilter('draft')}
              className={`px-3 py-1.5 rounded-lg text-xs font-agrandir-semibold transition-all cursor-pointer whitespace-nowrap ${
                statusFilter === 'draft'
                  ? 'bg-white text-black font-agrandir-extrabold'
                  : 'text-[#888] hover:text-white hover:bg-white/5'
              }`}
            >
              Brouillons ({events.filter(e => e.status === 'draft').length})
            </button>
            <button
              onClick={() => setStatusFilter('archived')}
              className={`px-3 py-1.5 rounded-lg text-xs font-agrandir-semibold transition-all cursor-pointer whitespace-nowrap ${
                statusFilter === 'archived'
                  ? 'bg-white text-black font-agrandir-extrabold'
                  : 'text-[#888] hover:text-white hover:bg-white/5'
              }`}
            >
              Clôturés ({events.filter(e => e.status === 'cancelled' || e.status === 'completed').length})
            </button>
          </div>

          {/* Search Box */}
          <div className="relative min-w-[260px]">
            <Search className="w-4 h-4 text-[#777] absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher par titre, artiste, ville..."
              className="w-full bg-[#161616] border border-white/10 rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder-[#555] focus:outline-none focus:border-white font-agrandir-regular"
            />
          </div>

        </div>
      </div>

      {/* 3. Table des Concerts (Style Produit Shopify) */}
      <div className="bg-[#0c0c0c] border border-white/10 rounded-3xl overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-agrandir-regular">
            <thead>
              <tr className="border-b border-white/10 bg-[#121212] text-[10px] text-[#777] uppercase tracking-wider">
                <th className="py-4 px-6">Événement / Artiste</th>
                <th className="py-4 px-4">Date &amp; Lieu</th>
                <th className="py-4 px-4">Statut</th>
                <th className="py-4 px-4">Ventes / Jauge</th>
                <th className="py-4 px-4 text-right">CA Réel</th>
                <th className="py-4 px-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredEvents.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-[#666]">
                    Aucun concert ne correspond à vos critères de recherche.
                  </td>
                </tr>
              ) : (
                filteredEvents.map((evt) => {
                  const totalSold = evt.categories.reduce((acc, c) => acc + c.sold, 0);
                  const totalQuota = evt.categories.reduce((acc, c) => acc + c.quota, 0);
                  const fillRate = totalQuota > 0 ? Math.round((totalSold / totalQuota) * 100) : 0;
                  const revenue = evt.categories.reduce((acc, c) => acc + c.sold * c.price, 0);

                  return (
                    <tr
                      key={evt.id}
                      onClick={() => onSelectEvent(evt.id)}
                      className="hover:bg-white/[0.03] transition-colors cursor-pointer group"
                    >
                      {/* Colonne 1 : Visuel & Titre */}
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-3.5">
                          <img
                            src={evt.officialPoster || evt.artistPortrait}
                            alt={evt.artist}
                            className="w-12 h-12 rounded-xl object-cover border border-white/10 shrink-0 group-hover:border-white/30 transition-colors"
                          />
                          <div className="truncate max-w-xs">
                            <div className="font-agrandir-extrabold text-sm text-white uppercase group-hover:text-[#d4af37] transition-colors truncate">
                              {evt.artist}
                            </div>
                            <div className="text-xs text-[#888] truncate">
                              {evt.title}
                            </div>
                            <div className="text-[10px] text-[#555] uppercase tracking-widest mt-0.5">
                              {evt.genre}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Colonne 2 : Date & Salle */}
                      <td className="py-4 px-4">
                        <div className="text-white font-mono">{evt.date}</div>
                        <div className="text-[#888] text-[11px] truncate">{evt.venue}</div>
                        <div className="text-[#666] text-[10px]">{evt.city}</div>
                      </td>

                      {/* Colonne 3 : Statut */}
                      <td className="py-4 px-4">
                        {getStatusBadge(evt.status)}
                      </td>

                      {/* Colonne 4 : Ventes & Jauge */}
                      <td className="py-4 px-4 min-w-[160px]">
                        <div className="flex items-center justify-between text-[11px] mb-1">
                          <span className="text-white font-mono font-agrandir-bold">{totalSold.toLocaleString()}</span>
                          <span className="text-[#888]">/ {totalQuota.toLocaleString()} ({fillRate}%)</span>
                        </div>
                        <div className="w-full bg-black/60 h-1.5 rounded-full overflow-hidden border border-white/5">
                          <div
                            className="bg-gradient-to-r from-[#d4af37] to-white h-full rounded-full"
                            style={{ width: `${Math.min(100, fillRate)}%` }}
                          />
                        </div>
                      </td>

                      {/* Colonne 5 : CA Réel */}
                      <td className="py-4 px-4 text-right">
                        <div className="font-agrandir-extrabold text-white text-sm">
                          {revenue.toLocaleString()}
                        </div>
                        <div className="text-[10px] text-[#d4af37]">FCFA</div>
                      </td>

                      {/* Colonne 6 : Actions */}
                      <td className="py-4 px-6 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onPreviewPublic(evt.slug);
                            }}
                            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-[#888] hover:text-white border border-white/10 transition-colors"
                            title="Aperçu public"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={() => onSelectEvent(evt.id)}
                            className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/15 text-white font-agrandir-semibold text-xs border border-white/10 flex items-center gap-1.5 transition-colors"
                          >
                            <span>Gérer</span>
                            <ChevronRight className="w-3.5 h-3.5 text-[#d4af37]" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};
