import React from 'react';
import { useApp } from '../context/AppContext';

export const PartnersView: React.FC = () => {
  const { setCurrentPage } = useApp();

  const partnerTiers = [
    {
      category: 'DIFFUSION CULTURELLE & MÉDIAS',
      items: [
        { name: 'BOOSKA-P CULTURE', role: 'Couverture médiatique et captures éditoriales exclusives' },
        { name: 'INSTITUT FRANÇAIS ABIDJAN', role: 'Coproduction et programmation croisée des résidences' },
        { name: 'KONBINI MUSIQUE', role: 'Capsules documentaires et immersions scéniques' },
      ],
    },
    {
      category: 'INGÉNIERIE ACOUSTIQUE & SCÉNOGRAPHIE',
      items: [
        { name: 'L-ACOUSTICS SOUNDLAB', role: 'Calibrage spatialisé et nefs acoustiques haute résolution' },
        { name: 'ROBE LIGHTING PARIS', role: 'Projecteurs d’ombre et scénographies lumineuses architecturales' },
        { name: 'ARÉEL ENGINEERING', role: 'Déploiement des infrastructures modulaires' },
      ],
    },
    {
      category: 'INFRASTRUCTURE & TÉLÉCOM',
      items: [
        { name: 'GENIUSPAY CI', role: 'Passerelle de paiement sécurisée et mobile money régional' },
        { name: 'ORANGE CÔTE D’IVOIRE', role: 'Connectivité haut débit dédiée aux terminaux de contrôle' },
        { name: 'SOFITEL HÔTEL IVOIRE', role: 'Palais des Congrès — Scène de prestige Abidjan' },
      ],
    },
  ];

  return (
    <div className="max-w-5xl mx-auto px-6 pt-28 sm:pt-32 pb-20">
      
      {/* Header */}
      <div className="mb-14 border-b border-[#1c1c1c] pb-8">
        <div className="text-xs font-agrandir-regular tracking-[0.25em] text-[#888] uppercase mb-2">
          RÉSEAU INSTITUTIONNEL &amp; CRÉATIF
        </div>
        <h1 className="font-agrandir-extrabold text-3xl sm:text-5xl text-white tracking-tight uppercase">
          PARTENAIRES
        </h1>
        <p className="mt-3 text-sm font-agrandir-regular text-[#888] max-w-xl font-light">
          LUMARÉEL CO. s’associe à des institutions culturelles, des laboratoires d’ingénierie acoustique et des acteurs majeurs de la scène internationale.
        </p>
      </div>

      {/* Grid of Partners */}
      <div className="space-y-12">
        {partnerTiers.map((tier, idx) => (
          <div key={idx} className="border-t border-[#1c1c1c] pt-6">
            <h2 className="text-xs font-agrandir-semibold tracking-[0.22em] text-[#666] uppercase mb-6">
              {tier.category}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {tier.items.map((partner, pIdx) => (
                <div
                  key={pIdx}
                  className="p-6 sm:p-7 bg-[#0c0c0c] border border-white/10 hover:border-white/25 rounded-3xl transition-all shadow-lg"
                >
                  <h3 className="font-agrandir-extrabold text-base text-white uppercase tracking-tight mb-2">
                    {partner.name}
                  </h3>
                  <p className="font-agrandir-regular text-xs text-[#888] leading-relaxed">
                    {partner.role}
                  </p>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* CTA Box with rounded-3xl */}
      <div className="mt-16 p-8 bg-[#0c0c0c] border border-white/15 rounded-3xl flex flex-col sm:flex-row items-center justify-between gap-6 shadow-2xl">
        <div>
          <div className="font-agrandir-extrabold text-white text-base mb-1 uppercase tracking-tight">
            DEVENIR PARTENAIRE OFFICIEL
          </div>
          <div className="font-agrandir-regular text-xs text-[#888]">
            Collaborations artistiques, mécénat culturel et sponsoring d’expériences immersives.
          </div>
        </div>
        <button
          onClick={() => setCurrentPage('contact')}
          className="px-6 py-3.5 bg-white text-black font-agrandir-semibold text-xs uppercase tracking-widest hover:bg-[#eaeaea] rounded-full transition-colors whitespace-nowrap cursor-pointer shrink-0 shadow-lg"
        >
          CONTACTER LA PRODUCTION →
        </button>
      </div>

    </div>
  );
};
