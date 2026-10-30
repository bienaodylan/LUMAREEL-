import React, { useState } from 'react';
import { useApp } from '../../../context/AppContext';
import { 
  Shield, 
  Globe, 
  Save, 
  Upload, 
  Image as ImageIcon, 
  GitBranch, 
  ExternalLink, 
  Copy, 
  CheckCircle2, 
  Download, 
  RefreshCw, 
  Terminal, 
  AlertCircle,
  Sparkles
} from 'lucide-react';
import { readFileAsDataURL } from '../../../utils/mediaUtils';

interface AdminSettingsViewProps {
  showToast: (msg: string, type?: 'info' | 'success' | 'error') => void;
}

export const AdminSettingsView: React.FC<AdminSettingsViewProps> = ({ showToast }) => {
  const { platformSettings, updatePlatformSettings, events, archives } = useApp();

  const [formData, setFormData] = useState({
    platformName: platformSettings.platformName || 'LUMARÉEL',
    tagline: platformSettings.tagline || 'CO.',
    logoMonogram: platformSettings.logoMonogram || 'LR',
    logoUrl: platformSettings.logoUrl || '',
    currency: platformSettings.currency || 'XOF (FCFA)',
    infoline: platformSettings.infoline || '+225 01 53 508 210',
    gateToken: platformSettings.gateToken || 'VIGILE_AUTH_LMR_2026',
    githubRepoUrl: platformSettings.githubRepoUrl || '',
  });

  const [githubToken, setGithubToken] = useState('');
  const [commitMessage, setCommitMessage] = useState('Mise à jour LUMARÉEL CO. depuis la console administrateur');
  const [isSaving, setIsSaving] = useState(false);
  const [isSyncingGit, setIsSyncingGit] = useState(false);
  const [gitOutput, setGitOutput] = useState<{ success: boolean; message: string; stdout?: string; stderr?: string } | null>(null);
  const [copiedCmd, setCopiedCmd] = useState(false);

  // Logo file upload handler
  const handleLogoUpload = async (file: File) => {
    try {
      let fileUrl = '';
      try {
        const uploadForm = new FormData();
        uploadForm.append('file', file);
        const res = await fetch('/api/upload', { method: 'POST', body: uploadForm });
        if (res.ok) {
          const data = await res.json();
          if (data.success && data.url) fileUrl = data.url;
        }
      } catch (err) {
        console.warn('Fallback data URL for logo upload', err);
      }

      if (!fileUrl) {
        fileUrl = await readFileAsDataURL(file);
      }

      const updated = { ...formData, logoUrl: fileUrl };
      setFormData(updated);
      await updatePlatformSettings(updated);
      showToast('Nouveau logo téléversé et appliqué sur tout le site !', 'success');
    } catch {
      showToast("Erreur lors de l'import du logo.", 'error');
    }
  };

  const handleSaveAll = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSaving(true);
      await updatePlatformSettings(formData);
      showToast('Paramètres et identité de la plateforme enregistrés avec succès.', 'success');
    } catch {
      showToast('Erreur lors de la sauvegarde.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  // Automated Git Push & Vercel Trigger
  const handleGitSync = async () => {
    try {
      setIsSyncingGit(true);
      setGitOutput(null);

      const res = await fetch('/api/admin/git-sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          remoteUrl: formData.githubRepoUrl.trim(),
          token: githubToken.trim(),
          commitMessage: commitMessage.trim(),
        }),
      });

      const data = await res.json();
      setGitOutput(data);
      if (data.success) {
        showToast('Modifications poussées avec succès ! Vercel redéploie le site.', 'success');
      } else {
        showToast(data.error || 'Erreur lors de la synchronisation Git.', 'error');
      }
    } catch (err: any) {
      setGitOutput({
        success: false,
        message: err.message || 'Impossible de contacter le serveur pour Git.',
      });
      showToast('Erreur réseau lors de la synchronisation Git.', 'error');
    } finally {
      setIsSyncingGit(false);
    }
  };

  // Export full JSON snapshot of database
  const handleExportDatabaseSnapshot = () => {
    const snapshot = {
      exportedAt: new Date().toISOString(),
      platformSettings: formData,
      events,
      archives,
    };
    const blob = new Blob([JSON.stringify(snapshot, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `lumareel_backup_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Sauvegarde de la base de données exportée en fichier JSON.', 'info');
  };

  const manualGitCommands = `git add -A\ngit commit -m "${commitMessage}"\ngit push origin main`;

  const copyManualCommands = () => {
    navigator.clipboard.writeText(manualGitCommands);
    setCopiedCmd(true);
    showToast('Commandes Git copiées dans le presse-papier !', 'success');
    setTimeout(() => setCopiedCmd(false), 2500);
  };

  return (
    <div className="space-y-8 select-none max-w-4xl pb-16">
      <div>
        <div className="text-[10px] font-agrandir-semibold tracking-[0.25em] text-[#d4af37] uppercase mb-1">
          CONFIGURATION DU SYSTÈME &amp; DÉPLOIEMENT
        </div>
        <h1 className="font-agrandir-extrabold text-2xl sm:text-3xl text-white tracking-tight uppercase">
          PARAMÈTRES GÉNÉRAUX &amp; LOGO
        </h1>
        <p className="text-xs text-[#888] mt-1">
          Personnalisez le logo et l'identité de marque LUMARÉEL, et synchronisez vos publications vers GitHub et Vercel.
        </p>
      </div>

      <form onSubmit={handleSaveAll} className="space-y-8">
        
        {/* ========================================================================= */}
        {/* SECTION 1 : MODIFICATION DU LOGO & IDENTITÉ DE MARQUE */}
        {/* ========================================================================= */}
        <div className="bg-[#0c0c0c] border border-white/10 rounded-3xl p-6 sm:p-8 space-y-6 shadow-xl">
          <div className="flex items-center justify-between border-b border-white/10 pb-4">
            <div className="flex items-center gap-2.5 text-xs font-agrandir-extrabold text-white uppercase">
              <ImageIcon className="w-4 h-4 text-[#d4af37]" />
              <span>LOGO ET IDENTITÉ VISUELLE LUMARÉEL</span>
            </div>
            <span className="text-[10px] font-agrandir-semibold text-[#d4af37] px-2.5 py-1 rounded-full bg-[#d4af37]/10 border border-[#d4af37]/30 uppercase">
              En direct
            </span>
          </div>

          {/* Aperçu en direct du logo */}
          <div className="p-5 rounded-2xl bg-[#141414] border border-white/10 flex flex-col sm:flex-row items-center justify-between gap-5">
            <div className="flex items-center gap-4">
              <div className="relative">
                {formData.logoUrl ? (
                  <img
                    src={formData.logoUrl}
                    alt={formData.platformName}
                    className="w-14 h-14 rounded-full object-cover border-2 border-white/30 shadow-[0_0_20px_rgba(255,255,255,0.25)] bg-black"
                  />
                ) : (
                  <div className="w-14 h-14 rounded-full border-2 border-white flex items-center justify-center font-agrandir-extrabold text-base tracking-tighter text-white bg-white/5 backdrop-blur-sm shadow-[0_0_20px_rgba(255,255,255,0.25)]">
                    {formData.logoMonogram || 'LR'}
                  </div>
                )}
                <span className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-[#d4af37] border-2 border-black flex items-center justify-center text-[8px] font-bold text-black">
                  ✓
                </span>
              </div>

              <div>
                <div className="text-[9px] font-agrandir-semibold tracking-widest text-[#888] uppercase">
                  Aperçu de la marque
                </div>
                <div className="flex items-baseline gap-1.5 mt-0.5">
                  <span className="font-agrandir-extrabold text-lg sm:text-xl text-white tracking-tight uppercase">
                    {formData.platformName || 'LUMARÉEL'}
                  </span>
                  <span className="text-[10px] font-agrandir-semibold tracking-[0.25em] text-[#aaa] uppercase">
                    {formData.tagline || 'CO.'}
                  </span>
                </div>
                <p className="text-[10px] text-[#666] mt-0.5 font-light">
                  Ce logo s'affiche dans l'en-tête public, le panneau d'administration, les billets et le pied de page.
                </p>
              </div>
            </div>

            {formData.logoUrl && (
              <button
                type="button"
                onClick={() => setFormData((prev) => ({ ...prev, logoUrl: '' }))}
                className="text-xs text-rose-400 hover:text-rose-300 font-agrandir-semibold underline cursor-pointer"
              >
                Réinitialiser le logo officiel (Monogramme)
              </button>
            )}
          </div>

          {/* Formulaire de personnalisation */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label className="block text-[10px] font-agrandir-semibold uppercase text-[#888] mb-1.5">
                Importer une image de logo (Fichier PNG, SVG, JPG, WebP)
              </label>
              <label className="w-full py-3 px-4 rounded-xl bg-white/10 hover:bg-white/15 border border-white/20 text-white font-agrandir-semibold text-xs uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer transition-colors shadow-sm">
                <Upload className="w-4 h-4 text-[#d4af37]" />
                <span>Téléverser un logo depuis mon appareil</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleLogoUpload(file);
                  }}
                  className="hidden"
                />
              </label>
            </div>

            <div>
              <label className="block text-[10px] font-agrandir-semibold uppercase text-[#888] mb-1.5">
                Ou coller l'URL d'un logo hébergé
              </label>
              <input
                type="text"
                value={formData.logoUrl}
                onChange={(e) => setFormData((prev) => ({ ...prev, logoUrl: e.target.value }))}
                placeholder="https://... ou /assets/..."
                className="w-full bg-[#141414] border border-white/15 rounded-xl px-4 py-2.5 text-xs text-white placeholder-[#555] focus:outline-none focus:border-white font-mono"
              />
            </div>

            <div>
              <label className="block text-[10px] font-agrandir-semibold uppercase text-[#888] mb-1.5">
                Nom de la marque
              </label>
              <input
                type="text"
                value={formData.platformName}
                onChange={(e) => setFormData((prev) => ({ ...prev, platformName: e.target.value }))}
                className="w-full bg-[#141414] border border-white/15 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-white font-agrandir-extrabold uppercase tracking-wide"
              />
            </div>

            <div>
              <label className="block text-[10px] font-agrandir-semibold uppercase text-[#888] mb-1.5">
                Suffixe / Slogan (ex: CO.)
              </label>
              <input
                type="text"
                value={formData.tagline}
                onChange={(e) => setFormData((prev) => ({ ...prev, tagline: e.target.value }))}
                className="w-full bg-[#141414] border border-white/15 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-white font-agrandir-bold tracking-widest uppercase"
              />
            </div>

            <div>
              <label className="block text-[10px] font-agrandir-semibold uppercase text-[#888] mb-1.5">
                Initiales / Monogramme (si aucune image n'est fournie)
              </label>
              <input
                type="text"
                maxLength={4}
                value={formData.logoMonogram}
                onChange={(e) => setFormData((prev) => ({ ...prev, logoMonogram: e.target.value.toUpperCase() }))}
                className="w-full bg-[#141414] border border-white/15 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-white font-agrandir-extrabold uppercase font-mono tracking-wider"
              />
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* SECTION 2 : SYNCHRONISATION GITHUB & DÉPLOIEMENT VERCEL */}
        {/* ========================================================================= */}
        <div className="bg-[#0c0c0c] border border-[#d4af37]/30 rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl relative overflow-hidden">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-4">
            <div className="flex items-center gap-2.5 text-xs font-agrandir-extrabold text-white uppercase">
              <GitBranch className="w-4 h-4 text-[#d4af37]" />
              <span>DÉPLOIEMENT GITHUB &amp; LIEN VERCEL</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-[10px] font-mono text-[#aaa]">Vercel Auto-Deploy Ready</span>
            </div>
          </div>

          {/* Guide explicatif indispensable pour le client */}
          <div className="p-4 rounded-2xl bg-white/5 border border-white/10 text-xs text-neutral-300 space-y-2 leading-relaxed">
            <div className="font-agrandir-bold text-white flex items-center gap-2 text-sm">
              <Sparkles className="w-4 h-4 text-[#d4af37]" />
              <span>Comment fonctionne le déploiement sur votre lien Vercel ?</span>
            </div>
            <p className="text-[11px] text-neutral-400">
              Google AI Studio est un bac à sable cloud sécurisé. Votre site Vercel est quant à lui relié à votre <strong>dépôt GitHub</strong>. Dès qu'un commit est publié sur GitHub, Vercel compile automatiquement le code et met votre lien public à jour en quelques secondes.
            </p>
          </div>

          {/* Formulaire de Push Automatisé */}
          <div className="space-y-4 pt-1">
            <div>
              <label className="block text-[10px] font-agrandir-semibold uppercase text-[#888] mb-1">
                URL de votre dépôt GitHub (ex: https://github.com/votre-nom/lumareel.git)
              </label>
              <input
                type="text"
                value={formData.githubRepoUrl}
                onChange={(e) => setFormData((prev) => ({ ...prev, githubRepoUrl: e.target.value }))}
                placeholder="https://github.com/votre-nom/lumareel.git"
                className="w-full bg-[#141414] border border-white/15 rounded-xl px-4 py-2.5 text-xs text-white placeholder-[#555] focus:outline-none focus:border-white font-mono"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-agrandir-semibold uppercase text-[#888] mb-1">
                  GitHub Personal Access Token (PAT)
                </label>
                <input
                  type="password"
                  value={githubToken}
                  onChange={(e) => setGithubToken(e.target.value)}
                  placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
                  className="w-full bg-[#141414] border border-white/15 rounded-xl px-4 py-2.5 text-xs text-white placeholder-[#555] focus:outline-none focus:border-white font-mono"
                />
                <span className="text-[9px] text-[#666]">Nécessite le droit `repo` sur GitHub pour le push direct.</span>
              </div>

              <div>
                <label className="block text-[10px] font-agrandir-semibold uppercase text-[#888] mb-1">
                  Message du Commit
                </label>
                <input
                  type="text"
                  value={commitMessage}
                  onChange={(e) => setCommitMessage(e.target.value)}
                  className="w-full bg-[#141414] border border-white/15 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-white font-agrandir-regular"
                />
              </div>
            </div>

            {/* Boutons d'action pour le déploiement */}
            <div className="flex flex-wrap items-center gap-3 pt-2">
              <button
                type="button"
                onClick={handleGitSync}
                disabled={isSyncingGit}
                className="px-6 py-2.5 rounded-xl bg-[#d4af37] hover:bg-[#e6c158] text-black font-agrandir-extrabold text-xs uppercase tracking-wider flex items-center gap-2 cursor-pointer shadow-lg transition-transform active:scale-95 disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isSyncingGit ? 'animate-spin' : ''}`} />
                <span>{isSyncingGit ? 'Publication en cours...' : 'Publier sur GitHub & Déclencher Vercel'}</span>
              </button>

              <button
                type="button"
                onClick={handleExportDatabaseSnapshot}
                className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/15 text-xs font-agrandir-semibold text-white flex items-center gap-2 cursor-pointer transition-colors"
                title="Exporter une sauvegarde complète de la base de données (JSON)"
              >
                <Download className="w-3.5 h-3.5 text-[#d4af37]" />
                <span>Télécharger la sauvegarde (JSON)</span>
              </button>
            </div>

            {/* Résultat de la synchronisation Git si déclenchée */}
            {gitOutput && (
              <div
                className={`p-4 rounded-xl border text-xs font-mono mt-3 ${
                  gitOutput.success
                    ? 'bg-emerald-950/20 border-emerald-500/30 text-emerald-300'
                    : 'bg-rose-950/20 border-rose-500/30 text-rose-300'
                }`}
              >
                <div className="font-bold flex items-center gap-2">
                  <span>{gitOutput.success ? '✓ Succès :' : '⚠ Erreur :'}</span>
                  <span>{gitOutput.message}</span>
                </div>
                {gitOutput.stdout && <pre className="mt-2 text-[10px] text-neutral-400 whitespace-pre-wrap">{gitOutput.stdout}</pre>}
                {gitOutput.stderr && <pre className="mt-2 text-[10px] text-rose-400 whitespace-pre-wrap">{gitOutput.stderr}</pre>}
              </div>
            )}

            {/* Option B : Commandes manuelles pour terminal local */}
            <div className="pt-4 border-t border-white/10 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-agrandir-bold text-white uppercase flex items-center gap-1.5">
                  <Terminal className="w-3.5 h-3.5 text-[#d4af37]" />
                  <span>Alternative : Déploiement manuel via votre terminal</span>
                </span>

                <button
                  type="button"
                  onClick={copyManualCommands}
                  className="flex items-center gap-1 text-[11px] text-[#d4af37] hover:underline cursor-pointer font-mono"
                >
                  <Copy className="w-3 h-3" />
                  <span>{copiedCmd ? 'Copié !' : 'Copier les commandes'}</span>
                </button>
              </div>

              <pre className="p-3.5 rounded-xl bg-black border border-white/10 text-xs font-mono text-neutral-300 overflow-x-auto">
                {manualGitCommands}
              </pre>
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* SECTION 3 : CONTRÔLE D'ACCÈS & CONFIGURATION GÉNÉRALE */}
        {/* ========================================================================= */}
        <div className="bg-[#0c0c0c] border border-white/10 rounded-3xl p-6 sm:p-8 space-y-5 shadow-xl">
          <div className="flex items-center gap-2.5 text-xs font-agrandir-extrabold text-white uppercase border-b border-white/10 pb-3">
            <Shield className="w-4 h-4 text-[#d4af37]" />
            <span>SÉCURITÉ &amp; PARAMÈTRES GÉNÉRAUX</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label className="block text-[10px] font-agrandir-semibold uppercase text-[#888] mb-1">
                Devise officielle
              </label>
              <input
                type="text"
                disabled
                value={formData.currency}
                className="w-full bg-[#141414] border border-white/10 rounded-xl px-4 py-2.5 text-xs text-[#aaa] font-mono cursor-not-allowed opacity-80"
              />
            </div>

            <div>
              <label className="block text-[10px] font-agrandir-semibold uppercase text-[#888] mb-1">
                Infoline officielle de la billetterie
              </label>
              <input
                type="text"
                value={formData.infoline}
                onChange={(e) => setFormData((prev) => ({ ...prev, infoline: e.target.value }))}
                className="w-full bg-[#141414] border border-white/15 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-white font-mono"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-[10px] font-agrandir-semibold uppercase text-[#888] mb-1">
                Jeton de secours vigiles scanner (?token=...)
              </label>
              <input
                type="text"
                value={formData.gateToken}
                onChange={(e) => setFormData((prev) => ({ ...prev, gateToken: e.target.value }))}
                className="w-full bg-[#141414] border border-white/15 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-white font-mono"
              />
              <p className="text-[11px] text-[#777] mt-1.5 leading-relaxed">
                Ce jeton fixe sert d'accès direct de secours pour l'équipe de sécurité au cas où un lien magique n'a pas été généré au préalable.
              </p>
            </div>
          </div>
        </div>

        {/* Submit Bar */}
        <div className="sticky bottom-6 z-20 flex items-center justify-between bg-black/85 backdrop-blur-xl border border-white/15 rounded-2xl p-4 shadow-2xl">
          <div className="text-xs text-[#aaa] font-agrandir-regular">
            Modifications sauvegardées sur le serveur et le stockage local instantanément.
          </div>

          <button
            type="submit"
            disabled={isSaving}
            className="px-6 py-2.5 rounded-xl bg-white hover:bg-neutral-200 text-black font-agrandir-extrabold text-xs uppercase tracking-wider transition-colors cursor-pointer shadow-lg flex items-center gap-2 disabled:opacity-50"
          >
            <Save className="w-3.5 h-3.5" />
            <span>{isSaving ? 'Enregistrement...' : 'Enregistrer les paramètres'}</span>
          </button>
        </div>

      </form>
    </div>
  );
};
