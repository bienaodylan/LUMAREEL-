import React, { useState } from 'react';
import { TransactionalEmail } from '../../../types';
import { Mail, Search, CheckCircle2, Clock, Eye, AlertCircle } from 'lucide-react';

interface AdminEmailsViewProps {
  emails: TransactionalEmail[];
}

export const AdminEmailsView: React.FC<AdminEmailsViewProps> = ({ emails }) => {
  const [search, setSearch] = useState('');
  const [selectedEmail, setSelectedEmail] = useState<TransactionalEmail | null>(null);

  const filteredEmails = emails.filter((eml) => {
    const q = search.toLowerCase();
    return (
      q === '' ||
      eml.recipient.toLowerCase().includes(q) ||
      eml.subject.toLowerCase().includes(q) ||
      (eml.orderRef && eml.orderRef.toLowerCase().includes(q))
    );
  });

  return (
    <div className="space-y-6 select-none">
      
      {/* 1. Header Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="text-[10px] font-agrandir-semibold tracking-[0.25em] text-[#d4af37] uppercase mb-1">
            AUDIT TRANSACTIONNEL
          </div>
          <h1 className="font-agrandir-extrabold text-2xl sm:text-3xl text-white tracking-tight uppercase">
            JOURNAL DES EMAILS ({emails.length})
          </h1>
          <p className="text-xs text-[#888] mt-1">
            Historique des confirmations d'achats, billets électroniques et notifications envoyés aux clients.
          </p>
        </div>

        <div className="relative min-w-[280px]">
          <Search className="w-4 h-4 text-[#777] absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher par destinataire ou réf..."
            className="w-full bg-[#121212] border border-white/10 rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder-[#555] focus:outline-none focus:border-white font-agrandir-regular"
          />
        </div>
      </div>

      {/* 2. Table of Emails */}
      <div className="bg-[#0c0c0c] border border-white/10 rounded-3xl overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-agrandir-regular">
            <thead>
              <tr className="border-b border-white/10 bg-[#121212] text-[10px] text-[#777] uppercase tracking-wider">
                <th className="py-4 px-6">Destinataire</th>
                <th className="py-4 px-4">Objet de l'email</th>
                <th className="py-4 px-4">Type</th>
                <th className="py-4 px-4">Statut</th>
                <th className="py-4 px-4 text-right">Horodatage</th>
                <th className="py-4 px-6 text-right">Aperçu</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredEmails.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-16 text-center text-[#666]">
                    Aucun email transactionnel enregistré.
                  </td>
                </tr>
              ) : (
                filteredEmails.map((eml) => (
                  <tr key={eml.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="py-4 px-6 font-mono text-white">
                      {eml.recipient}
                    </td>
                    <td className="py-4 px-4 font-agrandir-bold text-white truncate max-w-sm">
                      {eml.subject}
                    </td>
                    <td className="py-4 px-4 text-[#d4af37] text-[11px] uppercase tracking-wider">
                      {eml.type}
                    </td>
                    <td className="py-4 px-4">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-agrandir-bold uppercase">
                        ✓ Envoyé
                      </span>
                    </td>
                    <td className="py-4 px-4 text-right text-[#777] font-mono text-[11px]">
                      {new Date(eml.timestamp).toLocaleDateString('fr-FR')} {new Date(eml.timestamp).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="py-4 px-6 text-right">
                      <button
                        onClick={() => setSelectedEmail(eml)}
                        className="px-3 py-1 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-[11px] text-white font-agrandir-semibold transition-colors cursor-pointer"
                      >
                        Consulter
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Aperçu Contenu Email */}
      {selectedEmail && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-[#101010] border border-white/20 rounded-3xl max-w-xl w-full p-6 sm:p-8 space-y-4 shadow-2xl">
            <div className="border-b border-white/10 pb-3 flex items-center justify-between">
              <div>
                <div className="text-[10px] text-[#888] uppercase">APERÇU EMAIL TRANSACTIONNEL</div>
                <h3 className="font-agrandir-bold text-lg text-white">{selectedEmail.subject}</h3>
              </div>
              <button
                onClick={() => setSelectedEmail(null)}
                className="text-neutral-400 hover:text-white text-xs font-bold px-2 py-1"
              >
                ✕
              </button>
            </div>

            <div className="text-xs space-y-2 text-[#aaa]">
              <div><strong>Destinataire :</strong> <span className="font-mono text-white">{selectedEmail.recipient}</span></div>
              <div><strong>Référence commande :</strong> <span className="font-mono text-[#d4af37]">{selectedEmail.orderRef || 'N/A'}</span></div>
              <div><strong>Date d'envoi :</strong> <span className="font-mono text-white">{selectedEmail.timestamp}</span></div>
            </div>

            <div className="p-4 rounded-2xl bg-[#090909] border border-white/10 text-xs text-neutral-300 leading-relaxed font-mono whitespace-pre-wrap">
              {selectedEmail.contentPreview}
            </div>

            <div className="text-right pt-2">
              <button
                onClick={() => setSelectedEmail(null)}
                className="px-5 py-2 rounded-xl bg-white text-black font-agrandir-extrabold text-xs uppercase"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
