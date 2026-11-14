import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Mail, Send, CheckCircle2, Loader2 } from 'lucide-react';

export const ContactView: React.FC = () => {
  const { showToast } = useApp();

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    organization: '',
    subject: 'Demande de collaboration ou coproduction',
    message: '',
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.email || !formData.message) {
      showToast('Veuillez remplir tous les champs obligatoires.', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      if (data.success) {
        setIsSuccess(true);
        showToast(data.message, 'success');
      } else {
        showToast(data.error || 'Erreur lors de l’envoi.', 'error');
      }
    } catch (err: any) {
      showToast(err.message || 'Erreur réseau', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-6 pt-28 sm:pt-32 pb-16">
      
      <div className="mb-14 border-b border-[#1c1c1c] pb-8">
        <div className="text-xs font-agrandir-regular tracking-[0.25em] text-[#888] uppercase mb-2">
          RELATIONS ARTISTIQUES &amp; PRODUCTION
        </div>
        <h1 className="font-agrandir-extrabold text-3xl sm:text-5xl text-white tracking-tight uppercase">
          CONTACT &amp; COLLABORATIONS
        </h1>
        <p className="mt-3 text-sm font-agrandir-regular text-[#888] max-w-xl font-light">
          Pour les propositions de concerts, scénographies, partenariats de diffusion ou demandes de presse spécialisée.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-12">
        
        {/* Info Column (5 cols) */}
        <div className="md:col-span-5 font-agrandir-regular text-xs space-y-6">
          <div className="p-6 sm:p-7 bg-[#0e0e0e] border border-white/10 rounded-3xl shadow-lg">
            <div className="text-[10px] text-[#777] uppercase tracking-wider mb-2 font-agrandir-semibold">BUREAUX &amp; STUDIOS</div>
            <div className="text-white font-agrandir-extrabold text-sm mb-1 uppercase">PARIS / ABIDJAN</div>
            <div className="text-[#888] leading-relaxed">
              LUMARÉEL CO. Production<br />
              Pavillon de Création Contemporaine<br />
              Plateau &amp; Canal Saint-Martin
            </div>
          </div>

          <div className="p-6 sm:p-7 bg-[#0e0e0e] border border-white/10 rounded-3xl shadow-lg">
            <div className="text-[10px] text-[#777] uppercase tracking-wider mb-2 font-agrandir-semibold">CORRESPONDANCE DIRECTE</div>
            <div className="text-white font-agrandir-semibold mb-1">contact@lumareel.co</div>
            <div className="text-white font-agrandir-semibold mb-1">billetterie@lumareel.co</div>
            <div className="text-[#777] text-[11px] mt-2">Délai moyen de réponse : 48 heures ouvrées</div>
          </div>
        </div>

        {/* Form Column (7 cols) */}
        <div className="md:col-span-7">
          {isSuccess ? (
            <div className="p-8 bg-[#0f0f0f] border border-emerald-900/50 rounded-3xl text-center font-agrandir-regular shadow-2xl">
              <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto mb-4" />
              <h2 className="font-agrandir-extrabold text-xl text-white uppercase mb-2">MESSAGE ENVOYÉ</h2>
              <p className="text-xs text-[#aaa] max-w-md mx-auto mb-6">
                Votre demande a été transmise avec succès à l’équipe de direction de LUMARÉEL CO.
              </p>
              <button
                onClick={() => {
                  setIsSuccess(false);
                  setFormData({ name: '', email: '', organization: '', subject: 'Demande de collaboration', message: '' });
                }}
                className="px-6 py-3 border border-white/20 text-xs text-white uppercase tracking-wider hover:border-white font-agrandir-semibold rounded-full cursor-pointer bg-white/5"
              >
                Envoyer un autre message
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4 font-agrandir-regular text-xs bg-[#0c0c0c] border border-white/10 rounded-3xl p-6 sm:p-8 shadow-xl">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] text-[#777] uppercase mb-1 font-agrandir-semibold">NOM COMPLET *</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full bg-[#141414] border border-white/15 rounded-2xl px-4 py-2.5 text-white focus:outline-none focus:border-white"
                    placeholder="Votre nom"
                  />
                </div>

                <div>
                  <label className="block text-[10px] text-[#777] uppercase mb-1 font-agrandir-semibold">ADRESSE E-MAIL *</label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full bg-[#141414] border border-white/15 rounded-2xl px-4 py-2.5 text-white focus:outline-none focus:border-white"
                    placeholder="adresse@domaine.com"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] text-[#777] uppercase mb-1 font-agrandir-semibold">ORGANISATION / ARTISTE / LABEL</label>
                <input
                  type="text"
                  value={formData.organization}
                  onChange={(e) => setFormData({ ...formData, organization: e.target.value })}
                  className="w-full bg-[#141414] border border-white/15 rounded-2xl px-4 py-2.5 text-white focus:outline-none focus:border-white"
                  placeholder="Nom du collectif ou de la structure"
                />
              </div>

              <div>
                <label className="block text-[10px] text-[#777] uppercase mb-1 font-agrandir-semibold">OBJET</label>
                <select
                  value={formData.subject}
                  onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                  className="w-full bg-[#141414] border border-white/15 rounded-2xl px-4 py-2.5 text-white focus:outline-none focus:border-white"
                >
                  <option value="Demande de coproduction">Demande de coproduction de concert</option>
                  <option value="Direction artistique & scénographie">Direction artistique &amp; scénographie</option>
                  <option value="Partenariat institutionnel / Galerie">Partenariat institutionnel / Galerie</option>
                  <option value="Question billetterie officielle">Question billetterie officielle</option>
                  <option value="Presse & Médias">Presse &amp; Médias</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] text-[#777] uppercase mb-1 font-agrandir-semibold">VOTRE MESSAGE *</label>
                <textarea
                  rows={5}
                  required
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  className="w-full bg-[#141414] border border-white/15 rounded-2xl p-4 text-white focus:outline-none focus:border-white"
                  placeholder="Présentez brièvement la vision, les dates pressenties et les coordonnées techniques..."
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-4 bg-white text-black font-agrandir-semibold uppercase tracking-widest text-xs hover:bg-[#eaeaea] rounded-full transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 shadow-lg"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>ENVOI DU MESSAGE...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>TRANSMETTRE LA DEMANDE</span>
                  </>
                )}
              </button>
            </form>
          )}
        </div>

      </div>

    </div>
  );
};
