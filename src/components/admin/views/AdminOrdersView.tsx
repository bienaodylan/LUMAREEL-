import React, { useState } from 'react';
import { Order } from '../../../types';
import { Search, ShoppingBag, Download, Eye, CheckCircle2, Clock, XCircle } from 'lucide-react';

interface AdminOrdersViewProps {
  orders: Order[];
}

export const AdminOrdersView: React.FC<AdminOrdersViewProps> = ({ orders }) => {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'completed' | 'pending' | 'refunded'>('all');

  const filteredOrders = orders.filter((ord) => {
    const q = search.toLowerCase();
    const matchesSearch =
      q === '' ||
      ord.reference.toLowerCase().includes(q) ||
      ord.customerName.toLowerCase().includes(q) ||
      ord.customerEmail.toLowerCase().includes(q) ||
      ord.eventTitle.toLowerCase().includes(q);

    const matchesStatus =
      statusFilter === 'all' || ord.paymentStatus === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const totalVolume = orders
    .filter((o) => o.paymentStatus === 'completed')
    .reduce((acc, o) => acc + o.totalAmount, 0);

  return (
    <div className="space-y-6 select-none">
      
      {/* 1. Header & Quick Stat */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="text-[10px] font-agrandir-semibold tracking-[0.25em] text-[#d4af37] uppercase mb-1">
            REGISTRE DES TRANSACTIONS
          </div>
          <h1 className="font-agrandir-extrabold text-2xl sm:text-3xl text-white tracking-tight uppercase">
            COMMANDES &amp; VENTES ({orders.length})
          </h1>
        </div>

        <div className="bg-[#0c0c0c] border border-white/10 rounded-2xl px-5 py-3 text-right">
          <div className="text-[10px] text-[#888] uppercase font-agrandir-semibold">Volume Total Encaissé</div>
          <div className="font-agrandir-extrabold text-xl text-white">
            {totalVolume.toLocaleString()} <span className="text-xs text-[#d4af37]">FCFA</span>
          </div>
        </div>
      </div>

      {/* 2. Filtres & Recherche */}
      <div className="bg-[#0c0c0c] border border-white/10 rounded-2xl p-4 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-agrandir-semibold transition-all cursor-pointer whitespace-nowrap ${
              statusFilter === 'all'
                ? 'bg-white text-black font-agrandir-extrabold'
                : 'text-[#888] hover:text-white hover:bg-white/5'
            }`}
          >
            Toutes ({orders.length})
          </button>
          <button
            onClick={() => setStatusFilter('completed')}
            className={`px-3 py-1.5 rounded-lg text-xs font-agrandir-semibold transition-all cursor-pointer whitespace-nowrap ${
              statusFilter === 'completed'
                ? 'bg-white text-black font-agrandir-extrabold'
                : 'text-[#888] hover:text-white hover:bg-white/5'
            }`}
          >
            Confirmées ({orders.filter(o => o.paymentStatus === 'completed').length})
          </button>
          <button
            onClick={() => setStatusFilter('pending')}
            className={`px-3 py-1.5 rounded-lg text-xs font-agrandir-semibold transition-all cursor-pointer whitespace-nowrap ${
              statusFilter === 'pending'
                ? 'bg-white text-black font-agrandir-extrabold'
                : 'text-[#888] hover:text-white hover:bg-white/5'
            }`}
          >
            En attente ({orders.filter(o => o.paymentStatus === 'pending').length})
          </button>
        </div>

        <div className="relative min-w-[280px]">
          <Search className="w-4 h-4 text-[#777] absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher réf, client, concert..."
            className="w-full bg-[#161616] border border-white/10 rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder-[#555] focus:outline-none focus:border-white font-agrandir-regular"
          />
        </div>
      </div>

      {/* 3. Table des Commandes */}
      <div className="bg-[#0c0c0c] border border-white/10 rounded-3xl overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-agrandir-regular">
            <thead>
              <tr className="border-b border-white/10 bg-[#121212] text-[10px] text-[#777] uppercase tracking-wider">
                <th className="py-4 px-6">Référence</th>
                <th className="py-4 px-4">Client / Contact</th>
                <th className="py-4 px-4">Concert / Catégorie</th>
                <th className="py-4 px-4">Places</th>
                <th className="py-4 px-4 text-right">Montant</th>
                <th className="py-4 px-4">Paiement</th>
                <th className="py-4 px-6 text-right">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-16 text-center text-[#666]">
                    Aucune commande trouvée.
                  </td>
                </tr>
              ) : (
                filteredOrders.map((ord) => (
                  <tr key={ord.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="py-4 px-6 font-mono font-bold text-white">
                      {ord.reference}
                    </td>

                    <td className="py-4 px-4">
                      <div className="text-white font-agrandir-bold">{ord.customerName}</div>
                      <div className="text-[11px] text-[#888]">{ord.customerEmail}</div>
                      {ord.customerPhone && (
                        <div className="text-[10px] text-[#666] font-mono">{ord.customerPhone}</div>
                      )}
                    </td>

                    <td className="py-4 px-4">
                      <div className="text-white font-agrandir-bold truncate max-w-xs">{ord.eventTitle}</div>
                      <div className="text-[11px] text-[#d4af37]">{ord.categoryName}</div>
                    </td>

                    <td className="py-4 px-4 font-mono text-white font-bold">
                      {ord.quantity} billet(s)
                    </td>

                    <td className="py-4 px-4 text-right font-agrandir-extrabold text-white text-sm">
                      {ord.totalAmount.toLocaleString()} <span className="text-[10px] text-[#d4af37]">FCFA</span>
                    </td>

                    <td className="py-4 px-4">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-agrandir-bold uppercase ${
                        ord.paymentStatus === 'completed'
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                      }`}>
                        {ord.paymentStatus === 'completed' ? 'Payé' : 'En attente'}
                      </span>
                    </td>

                    <td className="py-4 px-6 text-right text-[#777] text-[11px] font-mono">
                      {new Date(ord.createdAt).toLocaleDateString('fr-FR')} {new Date(ord.createdAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};
