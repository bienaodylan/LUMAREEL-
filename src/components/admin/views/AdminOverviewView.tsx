import React from 'react';
import { ConcertEvent, Order, AdminStats } from '../../../types';
import { 
  TrendingUp, 
  Ticket, 
  DollarSign, 
  Users, 
  AlertTriangle, 
  ArrowRight, 
  ChevronRight, 
  Calendar, 
  CheckCircle2, 
  Clock, 
  Plus, 
  Sparkles 
} from 'lucide-react';

interface AdminOverviewViewProps {
  events: ConcertEvent[];
  orders: Order[];
  stats: AdminStats | null;
  onSelectEvent: (eventId: string) => void;
  onNavigateSection: (section: 'events' | 'orders' | 'archives') => void;
  onCreateEvent: () => void;
}

export const AdminOverviewView: React.FC<AdminOverviewViewProps> = ({
  events,
  orders,
  stats,
  onSelectEvent,
  onNavigateSection,
  onCreateEvent,
}) => {
  // Calculations based strictly on actual data
  const totalRevenue = events.reduce((acc, evt) => {
    return acc + evt.categories.reduce((catAcc, cat) => catAcc + (cat.sold * cat.price), 0);
  }, 0);

  const totalTicketsSold = events.reduce((acc, evt) => {
    return acc + evt.categories.reduce((catAcc, cat) => catAcc + cat.sold, 0);
  }, 0);

  const totalQuota = events.reduce((acc, evt) => {
    return acc + evt.categories.reduce((catAcc, cat) => catAcc + cat.quota, 0);
  }, 0);

  const globalFillRate = totalQuota > 0 ? Math.round((totalTicketsSold / totalQuota) * 100) : 0;
  const completedOrders = orders.filter(o => o.paymentStatus === 'completed');
  const averageBasket = completedOrders.length > 0 ? Math.round(totalRevenue / completedOrders.length) : 0;

  // Alerts: Categories with > 80% fill rate or < 100 remaining
  const quotaAlerts: Array<{ event: ConcertEvent; categoryName: string; remaining: number; fillPercent: number }> = [];
  events.forEach((evt) => {
    evt.categories.forEach((cat) => {
      const remaining = Math.max(0, cat.quota - cat.sold);
      const fill = cat.quota > 0 ? Math.round((cat.sold / cat.quota) * 100) : 0;
      if (fill >= 80 || remaining < 150) {
        quotaAlerts.push({
          event: evt,
          categoryName: cat.name,
          remaining,
          fillPercent: fill,
        });
      }
    });
  });

  return (
    <div className="space-y-8 select-none">
      
      {/* 1. Top Welcome Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 sm:p-8 rounded-3xl bg-[#0c0c0c] border border-white/10 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-[#d4af37]/5 rounded-full filter blur-3xl pointer-events-none" />
        
        <div>
          <div className="flex items-center gap-2 text-[10px] font-agrandir-semibold tracking-[0.25em] text-[#d4af37] uppercase mb-1">
            <Sparkles className="w-3 h-3 text-[#d4af37]" />
            <span>CENTRE DE CONTRÔLE GÉNÉRAL</span>
          </div>
          <h1 className="font-agrandir-extrabold text-2xl sm:text-3xl text-white tracking-tight uppercase">
            VUE D'ENSEMBLE LUMARÉEL CO.
          </h1>
          <p className="text-xs text-[#888] font-agrandir-regular mt-1 max-w-xl">
            Surveillance en temps réel des ventes, de la jauge scénique et des performances des 4 productions en billetterie ouverte.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={onCreateEvent}
            className="px-4 py-2.5 rounded-xl bg-white hover:bg-neutral-200 text-black font-agrandir-extrabold text-xs uppercase tracking-wider transition-colors cursor-pointer flex items-center gap-2 shadow-lg"
          >
            <Plus className="w-4 h-4" />
            <span>Nouveau concert</span>
          </button>
        </div>
      </div>

      {/* 2. 4 KPIs Majeurs Réels */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* CA Encaissé */}
        <div className="bg-[#0f0f0f] border border-white/10 rounded-2xl p-5 shadow-lg space-y-2">
          <div className="flex items-center justify-between text-[#888]">
            <span className="text-[10px] font-agrandir-semibold uppercase tracking-wider">
              CHIFFRE D'AFFAIRES RÉEL
            </span>
            <DollarSign className="w-4 h-4 text-[#d4af37]" />
          </div>
          <div className="font-agrandir-extrabold text-2xl text-white tracking-tight">
            {totalRevenue.toLocaleString()} <span className="text-xs text-[#d4af37]">FCFA</span>
          </div>
          <div className="text-[11px] text-[#777] font-agrandir-regular">
            Cumul des catégories vendues
          </div>
        </div>

        {/* Billets Émis / Vendus */}
        <div className="bg-[#0f0f0f] border border-white/10 rounded-2xl p-5 shadow-lg space-y-2">
          <div className="flex items-center justify-between text-[#888]">
            <span className="text-[10px] font-agrandir-semibold uppercase tracking-wider">
              BILLETS VENDUS
            </span>
            <Ticket className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="font-agrandir-extrabold text-2xl text-white tracking-tight">
            {totalTicketsSold.toLocaleString()} <span className="text-xs text-[#888]">/ {totalQuota.toLocaleString()}</span>
          </div>
          <div className="text-[11px] text-[#777] font-agrandir-regular">
            Sur l'ensemble du catalogue
          </div>
        </div>

        {/* Taux de Remplissage */}
        <div className="bg-[#0f0f0f] border border-white/10 rounded-2xl p-5 shadow-lg space-y-2">
          <div className="flex items-center justify-between text-[#888]">
            <span className="text-[10px] font-agrandir-semibold uppercase tracking-wider">
              TAUX DE REMPLISSAGE
            </span>
            <TrendingUp className="w-4 h-4 text-[#d4af37]" />
          </div>
          <div className="font-agrandir-extrabold text-2xl text-white tracking-tight">
            {globalFillRate} %
          </div>
          <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden mt-2">
            <div
              className="bg-gradient-to-r from-[#d4af37] to-white h-full rounded-full transition-all duration-500"
              style={{ width: `${Math.min(100, globalFillRate)}%` }}
            />
          </div>
        </div>

        {/* Commandes Validées */}
        <div className="bg-[#0f0f0f] border border-white/10 rounded-2xl p-5 shadow-lg space-y-2">
          <div className="flex items-center justify-between text-[#888]">
            <span className="text-[10px] font-agrandir-semibold uppercase tracking-wider">
              COMMANDES CLIENTS
            </span>
            <Users className="w-4 h-4 text-purple-400" />
          </div>
          <div className="font-agrandir-extrabold text-2xl text-white tracking-tight">
            {orders.length}
          </div>
          <div className="text-[11px] text-[#777] font-agrandir-regular">
            Panier moyen : {averageBasket.toLocaleString()} FCFA
          </div>
        </div>

      </div>

      {/* 3. Section Comparatif de Performance des Concerts (Graphique / Barres de Comparaison) */}
      <div className="bg-[#0c0c0c] border border-white/10 rounded-3xl p-6 sm:p-8 shadow-xl space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-4">
          <div>
            <div className="text-[10px] font-agrandir-semibold tracking-[0.2em] text-[#888] uppercase mb-1">
              ANALYSE COMPARATIVE
            </div>
            <h2 className="font-agrandir-extrabold text-lg text-white uppercase tracking-tight">
              PERFORMANCE RELATIVE DES PRODUCTIONS
            </h2>
          </div>

          <button
            onClick={() => onNavigateSection('events')}
            className="text-xs font-agrandir-semibold text-[#d4af37] hover:text-white transition-colors flex items-center gap-1 self-start sm:self-auto cursor-pointer"
          >
            <span>Voir tous les événements ({events.length})</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="space-y-5">
          {events.map((evt) => {
            const evtRevenue = evt.categories.reduce((acc, c) => acc + c.sold * c.price, 0);
            const evtSold = evt.categories.reduce((acc, c) => acc + c.sold, 0);
            const evtQuota = evt.categories.reduce((acc, c) => acc + c.quota, 0);
            const evtRate = evtQuota > 0 ? Math.round((evtSold / evtQuota) * 100) : 0;
            const revenueShare = totalRevenue > 0 ? Math.round((evtRevenue / totalRevenue) * 100) : 0;

            return (
              <div
                key={evt.id}
                onClick={() => onSelectEvent(evt.id)}
                className="group p-4 rounded-2xl bg-[#121212] hover:bg-[#161616] border border-white/10 hover:border-white/20 transition-all cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                {/* Visual & Artist Title */}
                <div className="flex items-center gap-4 min-w-[260px]">
                  <img
                    src={evt.officialPoster || evt.artistPortrait}
                    alt={evt.artist}
                    className="w-14 h-14 rounded-xl object-cover border border-white/10 shrink-0"
                  />
                  <div className="truncate">
                    <div className="font-agrandir-extrabold text-sm text-white uppercase group-hover:text-[#d4af37] transition-colors truncate">
                      {evt.artist}
                    </div>
                    <div className="text-xs text-[#888] truncate">{evt.venue}</div>
                    <div className="text-[10px] text-[#666] font-mono mt-0.5">{evt.date}</div>
                  </div>
                </div>

                {/* Progress Bar of Fill Rate */}
                <div className="flex-1 max-w-md space-y-1.5">
                  <div className="flex items-center justify-between text-xs font-agrandir-semibold">
                    <span className="text-[#888]">Remplissage Jauge</span>
                    <span className="text-white font-mono">{evtRate}% ({evtSold}/{evtQuota})</span>
                  </div>
                  <div className="w-full bg-black/60 h-2 rounded-full overflow-hidden border border-white/5">
                    <div
                      className="bg-gradient-to-r from-[#d4af37] to-white h-full rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(100, evtRate)}%` }}
                    />
                  </div>
                </div>

                {/* Revenue & Share */}
                <div className="text-right shrink-0 min-w-[140px]">
                  <div className="font-agrandir-extrabold text-base text-white">
                    {evtRevenue.toLocaleString()} <span className="text-[10px] text-[#d4af37]">FCFA</span>
                  </div>
                  <div className="text-[10px] text-[#777]">
                    {revenueShare}% du CA global
                  </div>
                </div>

                <div className="shrink-0 hidden md:block">
                  <ChevronRight className="w-4 h-4 text-[#666] group-hover:text-white transition-colors" />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 4. Alertes Quotas & Dernières Transactions */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Colonne Gauche (5 cols) : Alertes Quotas & Interventions */}
        <div className="lg:col-span-5 bg-[#0c0c0c] border border-white/10 rounded-3xl p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <div className="flex items-center gap-2 text-xs font-agrandir-extrabold text-white uppercase">
              <AlertTriangle className="w-4 h-4 text-amber-400" />
              <span>ALERTES &amp; JANGES CRITIQUES</span>
            </div>
            <span className="text-[10px] text-[#888]">{quotaAlerts.length} alerte(s)</span>
          </div>

          {quotaAlerts.length === 0 ? (
            <div className="text-center py-8 text-xs text-[#666]">
              Toutes les jauges sont équilibrées. Aucune rupture imminente.
            </div>
          ) : (
            <div className="space-y-3">
              {quotaAlerts.slice(0, 4).map((alt, idx) => (
                <div
                  key={idx}
                  onClick={() => onSelectEvent(alt.event.id)}
                  className="p-3.5 rounded-xl bg-amber-500/5 border border-amber-500/20 hover:border-amber-500/40 transition-colors cursor-pointer space-y-1.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-agrandir-bold text-xs text-white">
                      {alt.event.artist} — {alt.categoryName}
                    </span>
                    <span className="text-[10px] font-agrandir-extrabold text-amber-400">
                      {alt.fillPercent}% COMPLET
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-[#888]">
                    <span>Places restantes : <strong>{alt.remaining}</strong></span>
                    <span className="text-[#d4af37] underline text-[10px]">Ajuster quota &rarr;</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Colonne Droite (7 cols) : Dernières Commandes Récentes */}
        <div className="lg:col-span-7 bg-[#0c0c0c] border border-white/10 rounded-3xl p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <div className="text-xs font-agrandir-extrabold text-white uppercase">
              DERNIÈRES COMMANDES VALIDÉES
            </div>
            <button
              onClick={() => onNavigateSection('orders')}
              className="text-xs font-agrandir-semibold text-[#d4af37] hover:text-white transition-colors cursor-pointer"
            >
              Voir tout &rarr;
            </button>
          </div>

          {orders.length === 0 ? (
            <div className="text-center py-8 text-xs text-[#666]">
              Aucune commande enregistrée pour le moment.
            </div>
          ) : (
            <div className="space-y-2">
              {orders.slice(0, 5).map((ord) => (
                <div
                  key={ord.id}
                  className="flex items-center justify-between p-3 rounded-xl bg-[#121212] border border-white/5 text-xs"
                >
                  <div className="flex items-center gap-3 truncate">
                    <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center font-bold text-xs shrink-0">
                      ✓
                    </div>
                    <div className="truncate">
                      <div className="font-agrandir-bold text-white truncate">{ord.customerName}</div>
                      <div className="text-[10px] text-[#888] truncate">{ord.eventTitle} · {ord.categoryName}</div>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <div className="font-agrandir-extrabold text-white">
                      {ord.totalAmount.toLocaleString()} FCFA
                    </div>
                    <div className="text-[9px] text-[#666] font-mono">
                      {ord.reference}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>

    </div>
  );
};
