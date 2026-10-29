import React, { useState } from 'react';
import { Shield, Key, DollarSign, Globe, Lock, Save, CheckCircle2 } from 'lucide-react';

interface AdminSettingsViewProps {
  showToast: (msg: string, type?: 'info' | 'success' | 'error') => void;
}

export const AdminSettingsView: React.FC<AdminSettingsViewProps> = ({ showToast }) => {
  const [platformName, setPlatformName] = useState('LUMARÉEL CO.');
  const [currency, setCurrency] = useState('XOF (FCFA)');
  const [infoline, setInfoline] = useState('+225 01 53 508 210');
  const [gateToken, setGateToken] = useState('VIGILE_AUTH_LMR_2026');

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    showToast('Paramètres de la plateforme enregistrés avec succès.', 'success');
  };

  return (
    <div className="space-y-6 select-none max-w-4xl">
      <div>
        <div className="text-[10px] font-agrandir-semibold tracking-[0.25em] text-[#d4af37] uppercase mb-1">
          CONFIGURATION DU SYSTÈME
        </div>
        <h1 className="font-agrandir-extrabold text-2xl sm:text-3xl text-white tracking-tight uppercase">
          PARAMÈTRES GÉNÉRAUX &amp; SÉCURITÉ
        </h1>
        <p className="text-xs text-[#888] mt-1">
          Gestion de l'entité de production, de la passerelle de paiement et des autorisations de contrôle.
        </p>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Section 1: Entité de Production */}
        <div className="bg-[#0c0c0c] border border-white/10 rounded-3xl p-6 sm:p-8 space-y-4 shadow-xl">
          <div className="flex items-center gap-2 text-xs font-agrandir-extrabold text-white uppercase border-b border-white/10 pb-3">
            <Globe className="w-4 h-4 text-[#d4af37]" />
            <span>IDENTITÉ DE LA PLATEFORME</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-agrandir-semibold uppercase text-[#888] mb-1">
                Nom Commercial
              </label>
              <input
                type="text"
                value={platformName}
                onChange={(e) => setPlatformName(e.target.value)}
                className="w-full bg-[#141414] border border-white/15 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-white font-agrandir-bold"
              />
            </div>

            <div>
              <label className="block text-[10px] font-agrandir-semibold uppercase text-[#888] mb-1">
                Devise Principale
              </label>
              <input
                type="text"
                disabled
                value={currency}
                className="w-full bg-[#141414] border border-white/10 rounded-xl px-4 py-2.5 text-xs text-[#aaa] font-mono cursor-not-allowed opacity-80"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-[10px] font-agrandir-semibold uppercase text-[#888] mb-1">
                Infoline Générale Billetterie
              </label>
              <input
                type="text"
                value={infoline}
                onChange={(e) => setInfoline(e.target.value)}
                className="w-full bg-[#141414] border border-white/15 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-white font-mono"
              />
            </div>
          </div>
        </div>

        {/* Section 2: Sécurité du Contrôle aux Portes */}
        <div className="bg-[#0c0c0c] border border-white/10 rounded-3xl p-6 sm:p-8 space-y-4 shadow-xl">
          <div className="flex items-center gap-2 text-xs font-agrandir-extrabold text-white uppercase border-b border-white/10 pb-3">
            <Shield className="w-4 h-4 text-[#d4af37]" />
            <span>CONTRÔLE D'ACCÈS &amp; JETON VIGILE</span>
          </div>

          <div>
            <label className="block text-[10px] font-agrandir-semibold uppercase text-[#888] mb-1">
              Jeton de Sécurité Vigile (?token=...)
            </label>
            <input
              type="text"
              value={gateToken}
              onChange={(e) => setGateToken(e.target.value)}
              className="w-full bg-[#141414] border border-white/15 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-white font-mono"
            />
            <p className="text-[11px] text-[#777] mt-1.5 leading-relaxed">
              Ce jeton autorise l'accès à la caméra pour le terminal mobile des agents de sécurité (`/gate_scanner?token={gateToken}`).
            </p>
          </div>
        </div>

        {/* Submit */}
        <div className="flex items-center justify-end">
          <button
            type="submit"
            className="px-6 py-3 rounded-xl bg-white hover:bg-neutral-200 text-black font-agrandir-extrabold text-xs uppercase tracking-wider transition-colors cursor-pointer shadow-lg flex items-center gap-2"
          >
            <Save className="w-3.5 h-3.5" />
            <span>Enregistrer les paramètres</span>
          </button>
        </div>
      </form>
    </div>
  );
};
