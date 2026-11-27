import React, { useState } from 'react';
import { TransactionalEmail } from '../../../types';
import { Mail, Search, CheckCircle2, Eye, Send, Code, Sparkles } from 'lucide-react';
import { useApp } from '../../../context/AppContext';

interface AdminEmailsViewProps {
  emails: TransactionalEmail[];
}

export const AdminEmailsView: React.FC<AdminEmailsViewProps> = ({ emails }) => {
  const { showToast } = useApp();
  const [search, setSearch] = useState('');
  const [selectedEmail, setSelectedEmail] = useState<TransactionalEmail | null>(null);
  const [previewMode, setPreviewMode] = useState<'html' | 'text'>('html');
  const [isResending, setIsResending] = useState(false);

  const filteredEmails = emails.filter((eml) => {
    const q = search.toLowerCase();
    return (
      q === '' ||
      eml.recipient.toLowerCase().includes(q) ||
      eml.subject.toLowerCase().includes(q) ||
      (eml.orderRef && eml.orderRef.toLowerCase().includes(q)) ||
      (eml.customerName && eml.customerName.toLowerCase().includes(q))
    );
  });

  const handleResend = (eml: TransactionalEmail) => {
    setIsResending(true);
    setTimeout(() => {
      setIsResending(false);
      showToast(`Email de confirmation réexpédié avec succès à ${eml.recipient}.`, 'success');
    }, 600);
  };

  return (
    <div className="space-y-6 select-none font-agrandir-regular">
      
      {/* 1. Header Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="text-[10px] font-agrandir-semibold tracking-[0.25em] text-[#d4af37] uppercase mb-1">
            NOTIFICATIONS CLIENTS &amp; AUDIT TRANSACTIONNEL
          </div>
          <h1 className="font-agrandir-extrabold text-2xl sm:text-3xl text-white tracking-tight uppercase">
            JOURNAL DES EMAILS ({emails.length})
          </h1>
          <p className="text-xs text-[#888] mt-1">
            Confirmations de billetterie nominatives et notifications personnalisées expédiées aux acheteurs.
          </p>
        </div>

        <div className="relative min-w-[280px]">
          <Search className="w-4 h-4 text-[#777] absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher par destinataire, nom, réf..."
            className="w-full bg-[#121212] border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-[#555] focus:outline-none focus:border-white font-agrandir-regular"
          />
        </div>
      </div>

      {/* 2. Table of Emails */}
      <div className="bg-[#0c0c0c] border border-white/10 rounded-3xl overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-agrandir-regular">
            <thead>
              <tr className="border-b border-white/10 bg-[#121212] text-[10px] text-[#777] uppercase tracking-wider">
                <th className="py-4 px-6">Destinataire &amp; Client</th>
                <th className="py-4 px-4">Objet &amp; Événement</th>
                <th className="py-4 px-4">Type</th>
                <th className="py-4 px-4">Statut</th>
                <th className="py-4 px-4 text-right">Horodatage</th>
                <th className="py-4 px-6 text-right">Action</th>
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
                    <td className="py-4 px-6">
                      <div className="font-mono text-white text-xs">{eml.recipient}</div>
                      {eml.customerName && (
                        <div className="text-[11px] text-[#aaa]">{eml.customerName}</div>
                      )}
                    </td>
                    <td className="py-4 px-4 max-w-sm">
                      <div className="font-agrandir-bold text-white truncate">{eml.subject}</div>
                      {eml.orderRef && (
                        <div className="text-[10px] font-mono text-[#d4af37]">Réf : {eml.orderRef}</div>
                      )}
                    </td>
                    <td className="py-4 px-4">
                      <span className="text-[#d4af37] text-[10px] uppercase tracking-wider font-agrandir-bold px-2 py-0.5 rounded-full bg-[#d4af37]/10 border border-[#d4af37]/20">
                        {eml.type === 'ticket_confirmation' ? 'Confirmation Billet' : eml.type}
                      </span>
                    </td>
                    <td className="py-4 px-4">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-agrandir-bold uppercase">
                        <CheckCircle2 className="w-3 h-3" />
                        <span>Envoyé</span>
                      </span>
                    </td>
                    <td className="py-4 px-4 text-right text-[#777] font-mono text-[11px]">
                      {new Date(eml.timestamp).toLocaleDateString('fr-FR')} {new Date(eml.timestamp).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="py-4 px-6 text-right">
                      <button
                        onClick={() => {
                          setSelectedEmail(eml);
                          setPreviewMode(eml.htmlContent ? 'html' : 'text');
                        }}
                        className="px-3.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-[11px] text-white font-agrandir-semibold transition-colors cursor-pointer inline-flex items-center gap-1.5"
                      >
                        <Eye className="w-3 h-3 text-[#d4af37]" />
                        <span>Consulter</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Aperçu Contenu Email Personnalisé */}
      {selectedEmail && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-[#0f0f0f] border border-white/20 rounded-3xl max-w-2xl w-full p-6 sm:p-8 space-y-5 shadow-2xl text-white my-8">
            
            {/* Modal Header */}
            <div className="border-b border-white/10 pb-4 flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Sparkles className="w-3.5 h-3.5 text-[#d4af37]" />
                  <span className="text-[10px] font-agrandir-bold tracking-widest text-[#d4af37] uppercase">
                    APERÇU EMAIL TRANSACTIONNEL PERSONNALISÉ
                  </span>
                </div>
                <h3 className="font-agrandir-bold text-lg text-white leading-tight">
                  {selectedEmail.subject}
                </h3>
              </div>
              <button
                onClick={() => setSelectedEmail(null)}
                className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-neutral-400 hover:text-white text-xs font-bold shrink-0 cursor-pointer transition-colors"
              >
                ✕
              </button>
            </div>

            {/* Meta tags bar */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-[#151515] p-3.5 rounded-2xl border border-white/5 text-xs">
              <div>
                <span className="text-[#666] block text-[10px] uppercase">Destinataire</span>
                <span className="font-mono text-white text-xs">{selectedEmail.recipient}</span>
              </div>
              <div>
                <span className="text-[#666] block text-[10px] uppercase">Référence</span>
                <span className="font-mono text-[#d4af37] font-bold">{selectedEmail.orderRef || 'N/A'}</span>
              </div>
              <div>
                <span className="text-[#666] block text-[10px] uppercase">Horodatage d'envoi</span>
                <span className="text-[#aaa] text-[11px]">
                  {new Date(selectedEmail.timestamp).toLocaleString('fr-FR')}
                </span>
              </div>
            </div>

            {/* Mode switch (HTML vs Plain Text) */}
            {selectedEmail.htmlContent && (
              <div className="flex items-center justify-between border-b border-white/10 pb-2">
                <span className="text-[11px] text-[#888]">Format de rendu :</span>
                <div className="inline-flex rounded-full bg-white/5 p-1 border border-white/10">
                  <button
                    onClick={() => setPreviewMode('html')}
                    className={`px-3 py-1 rounded-full text-[11px] font-agrandir-bold uppercase transition-colors cursor-pointer ${
                      previewMode === 'html' ? 'bg-white text-black' : 'text-[#888] hover:text-white'
                    }`}
                  >
                    Aperçu Visuel (HTML)
                  </button>
                  <button
                    onClick={() => setPreviewMode('text')}
                    className={`px-3 py-1 rounded-full text-[11px] font-agrandir-bold uppercase transition-colors cursor-pointer ${
                      previewMode === 'text' ? 'bg-white text-black' : 'text-[#888] hover:text-white'
                    }`}
                  >
                    Texte Brut
                  </button>
                </div>
              </div>
            )}

            {/* Email Body View */}
            {previewMode === 'html' && selectedEmail.htmlContent ? (
              <div className="rounded-2xl border border-white/10 overflow-hidden bg-black h-96">
                <iframe
                  title="Aperçu Email"
                  srcDoc={selectedEmail.htmlContent}
                  className="w-full h-full border-0"
                  sandbox="allow-same-origin"
                />
              </div>
            ) : (
              <div className="p-4 rounded-2xl bg-[#090909] border border-white/10 text-xs text-neutral-300 leading-relaxed font-mono whitespace-pre-wrap max-h-96 overflow-y-auto">
                {selectedEmail.contentPreview}
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 border-t border-white/10">
              <button
                type="button"
                onClick={() => handleResend(selectedEmail)}
                disabled={isResending}
                className="w-full sm:w-auto px-5 py-2.5 rounded-full bg-[#d4af37]/10 hover:bg-[#d4af37]/20 border border-[#d4af37]/40 text-[#d4af37] font-agrandir-semibold text-xs transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{isResending ? 'Envoi en cours...' : 'Renvoyer l’email au client'}</span>
              </button>

              <button
                onClick={() => setSelectedEmail(null)}
                className="w-full sm:w-auto px-6 py-2.5 rounded-full bg-white text-black font-agrandir-extrabold text-xs uppercase tracking-wider hover:bg-neutral-200 transition-colors cursor-pointer"
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
