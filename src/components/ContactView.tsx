import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Mail, Send, CheckCircle2, Loader2 } from 'lucide-react';
import { PageHeader } from './ui/EditorialPrimitives';

export const ContactView: React.FC = () => {
  const { showToast, goBack, language } = useApp();
  const isEn = language === 'en';

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
      showToast(
        isEn ? 'Please fill in all required fields.' : 'Veuillez remplir tous les champs obligatoires.',
        'error'
      );
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
        showToast(data.error || (isEn ? 'Error sending message.' : 'Erreur lors de l’envoi.'), 'error');
      }
    } catch (err: any) {
      showToast(err.message || (isEn ? 'Network error' : 'Erreur réseau'), 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-8 pt-5 sm:pt-10 pb-16">
      <PageHeader
        eyebrow={isEn ? 'Support & Relations' : 'Assistance & Relations'}
        title={isEn ? 'Contact & Support' : 'Contact & Assistance'}
        subtitle={
          isEn
            ? 'For ticketing support, concert co-productions, artistic direction, partnerships or press inquiries.'
            : 'Pour toute question billetterie, proposition de concert, scénographie, partenariat ou demande presse.'
        }
        onBack={goBack}
        backLabel={isEn ? 'Back' : 'Retour'}
      />

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 sm:gap-8">
        <div className="md:col-span-5 text-xs space-y-4">
          <div className="p-6 bg-[#0B0B0B] border border-white/[0.08] rounded-2xl">
            <p className="text-[10px] text-neutral-500 uppercase tracking-[0.2em] mb-2 font-agrandir-semibold">
              {isEn ? 'Studios & Offices' : 'Bureaux & Studios'}
            </p>
            <p className="text-white font-agrandir-extrabold text-sm mb-1.5">PARIS / ABIDJAN</p>
            <p className="text-neutral-400 leading-relaxed">
              LUMARÉEL CO. Production
              <br />
              Pavillon de Création Contemporaine
              <br />
              Plateau &amp; Canal Saint-Martin
            </p>
          </div>

          <div className="p-6 bg-[#0B0B0B] border border-white/[0.08] rounded-2xl space-y-2">
            <p className="text-[10px] text-neutral-500 uppercase tracking-[0.2em] font-agrandir-semibold flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5 text-neutral-300" />
              <span>{isEn ? 'Direct Desk' : 'Correspondance directe'}</span>
            </p>
            <p className="text-white font-agrandir-semibold">contact@lumareel.co</p>
            <p className="text-white font-agrandir-semibold">billetterie@lumareel.co</p>
            <p className="text-neutral-500 text-[11px] pt-1">
              {isEn ? 'Average response time: 48 business hours' : 'Délai moyen de réponse : 48 heures ouvrées'}
            </p>
          </div>
        </div>

        <div className="md:col-span-7">
          {isSuccess ? (
            <div className="p-8 bg-[#0B0B0B] border border-emerald-500/30 rounded-2xl text-center space-y-4">
              <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto" />
              <h2 className="font-agrandir-extrabold text-lg text-white">
                {isEn ? 'Message sent' : 'Message envoyé'}
              </h2>
              <p className="text-xs sm:text-sm text-neutral-400 max-w-md mx-auto">
                {isEn
                  ? 'Your inquiry has been routed to the LUMARÉEL team.'
                  : 'Votre demande a bien été transmise à l’équipe LUMARÉEL CO.'}
              </p>
              <button
                type="button"
                onClick={() => {
                  setIsSuccess(false);
                  setFormData({
                    name: '',
                    email: '',
                    organization: '',
                    subject: 'Demande de collaboration',
                    message: '',
                  });
                }}
                className="min-h-[42px] px-5 border border-white/[0.15] text-xs text-white hover:border-white/35 font-agrandir-semibold rounded-xl cursor-pointer transition-colors"
              >
                {isEn ? 'Send another message' : 'Envoyer un autre message'}
              </button>
            </div>
          ) : (
            <form
              onSubmit={handleSubmit}
              className="space-y-4 text-xs bg-[#0B0B0B] border border-white/[0.08] rounded-2xl p-6 sm:p-7"
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-neutral-300 font-agrandir-semibold mb-1.5">
                    {isEn ? 'Full name *' : 'Nom complet *'}
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full min-h-[44px] bg-[#121212] border border-white/[0.12] rounded-xl px-3.5 text-sm text-white focus:outline-none focus:border-white"
                    placeholder={isEn ? 'Your name' : 'Votre nom'}
                  />
                </div>

                <div>
                  <label className="block text-xs text-neutral-300 font-agrandir-semibold mb-1.5">
                    {isEn ? 'Email address *' : 'Adresse e-mail *'}
                  </label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full min-h-[44px] bg-[#121212] border border-white/[0.12] rounded-xl px-3.5 text-sm text-white focus:outline-none focus:border-white"
                    placeholder="adresse@domaine.com"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs text-neutral-300 font-agrandir-semibold mb-1.5">
                  {isEn ? 'Organization / Artist / Label' : 'Organisation / Artiste / Label'}
                </label>
                <input
                  type="text"
                  value={formData.organization}
                  onChange={(e) => setFormData({ ...formData, organization: e.target.value })}
                  className="w-full min-h-[44px] bg-[#121212] border border-white/[0.12] rounded-xl px-3.5 text-sm text-white focus:outline-none focus:border-white"
                  placeholder={isEn ? 'Optional' : 'Facultatif'}
                />
              </div>

              <div>
                <label className="block text-xs text-neutral-300 font-agrandir-semibold mb-1.5">
                  {isEn ? 'Subject' : 'Objet'}
                </label>
                <select
                  value={formData.subject}
                  onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                  className="w-full min-h-[44px] bg-[#121212] border border-white/[0.12] rounded-xl px-3.5 text-sm text-white focus:outline-none focus:border-white"
                >
                  <option value="Question billetterie officielle">Question billetterie officielle</option>
                  <option value="Demande de coproduction">Demande de coproduction de concert</option>
                  <option value="Direction artistique & scénographie">Direction artistique &amp; scénographie</option>
                  <option value="Partenariat institutionnel / Galerie">Partenariat institutionnel / Galerie</option>
                  <option value="Presse & Médias">Presse &amp; Médias</option>
                </select>
              </div>

              <div>
                <label className="block text-xs text-neutral-300 font-agrandir-semibold mb-1.5">
                  {isEn ? 'Message *' : 'Votre message *'}
                </label>
                <textarea
                  rows={5}
                  required
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  className="w-full bg-[#121212] border border-white/[0.12] rounded-xl p-3.5 text-sm text-white focus:outline-none focus:border-white resize-none"
                  placeholder={
                    isEn
                      ? 'Describe your request, ticket reference, or project details…'
                      : 'Décrivez votre demande, référence de billet ou projet…'
                  }
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full min-h-[46px] bg-white text-black font-agrandir-extrabold text-xs sm:text-sm hover:bg-neutral-200 rounded-xl transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>{isEn ? 'Sending…' : 'Envoi en cours…'}</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>{isEn ? 'Send inquiry' : 'Envoyer la demande'}</span>
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
