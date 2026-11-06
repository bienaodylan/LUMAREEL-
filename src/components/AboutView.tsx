import React from 'react';
import { useApp } from '../context/AppContext';

export const AboutView: React.FC = () => {
  const { setCurrentPage } = useApp();

  return (
    <div className="max-w-4xl mx-auto px-6 pt-28 sm:pt-32 pb-16">
      
      <div className="mb-14 border-b border-[#1c1c1c] pb-8">
        <div className="text-xs font-agrandir-regular tracking-[0.25em] text-[#888] uppercase mb-2">
          MANIFESTE &amp; IDENTITÉ
        </div>
        <h1 className="font-agrandir-extrabold text-3xl sm:text-5xl text-white tracking-tight uppercase">
          À PROPOS DE LUMARÉEL CO.
        </h1>
      </div>

      <div className="space-y-12 text-[#b0b0b0] leading-relaxed">
        
        {/* Curatorial statement with drop cap */}
        <p className="text-lg sm:text-xl text-white font-agrandir-regular font-light leading-relaxed first-letter:text-5xl first-letter:font-agrandir-extrabold first-letter:float-left first-letter:mr-4 first-letter:mt-1 first-letter:text-white">
          LUMARÉEL CO. est une maison de production de concerts, de scénographies d’ombre et d’expériences musicales fondée sur le refus du divertissement générique. Nous concevons chaque concert non pas comme une prestation scénique standardisée, mais comme une œuvre architecturale vivante où l’acoustique, l’espace et l’obscurité entrent en tension.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6 border-t border-white/10">
          <div className="p-6 sm:p-7 bg-[#0e0e0e] border border-white/10 rounded-3xl shadow-lg">
            <h3 className="font-agrandir-extrabold text-lg text-white mb-2 uppercase tracking-wide">
              01. ACOUSTIQUE SPATIALISÉE
            </h3>
            <p className="text-xs font-agrandir-regular text-[#888] leading-relaxed">
              Nous sélectionnons des acoustiques brutes — cathédrales de béton, entrepôts industriels, nefs éphémères — pour calibrer des systèmes sonores immersifs jusqu’à 36 canaux indépendants.
            </p>
          </div>

          <div className="p-6 sm:p-7 bg-[#0e0e0e] border border-white/10 rounded-3xl shadow-lg">
            <h3 className="font-agrandir-extrabold text-lg text-white mb-2 uppercase tracking-wide">
              02. RADICALITÉ VISUELLE
            </h3>
            <p className="text-xs font-agrandir-regular text-[#888] leading-relaxed">
              Inspirés par la rigueur des marques de mode d’avant-garde et des galeries artistiques contemporaines, nous sculptons l’ombre pour révéler la présence physique de l’artiste.
            </p>
          </div>

          <div className="p-6 sm:p-7 bg-[#0e0e0e] border border-white/10 rounded-3xl shadow-lg">
            <h3 className="font-agrandir-extrabold text-lg text-white mb-2 uppercase tracking-wide">
              03. BILLETTERIE INVIOLABLE
            </h3>
            <p className="text-xs font-agrandir-regular text-[#888] leading-relaxed">
              Chaque billet émis est unique, chiffré, nominatif et vérifié en temps réel aux portes afin d’éliminer tout risque de marché noir ou de falsification.
            </p>
          </div>

          <div className="p-6 sm:p-7 bg-[#0e0e0e] border border-white/10 rounded-3xl shadow-lg">
            <h3 className="font-agrandir-extrabold text-lg text-white mb-2 uppercase tracking-wide">
              04. RAYONNEMENT CULTUREL
            </h3>
            <p className="text-xs font-agrandir-regular text-[#888] leading-relaxed">
              De Paris à Abidjan, de Dakar à Berlin, nous tissons des ponts entre les scènes contemporaines les plus exigeantes d’Afrique et d’Europe.
            </p>
          </div>
        </div>

        <div className="p-8 bg-[#0c0c0c] border border-white/15 rounded-3xl flex flex-col sm:flex-row items-center justify-between gap-6 font-agrandir-regular text-xs shadow-2xl">
          <div>
            <div className="text-white font-agrandir-extrabold text-sm mb-1 uppercase">VOUS ÊTES UN ARTISTE OU UNE INSTITUTION ?</div>
            <div className="text-[#888]">Déposez une proposition de coproduction ou de partenariat.</div>
          </div>
          <button
            onClick={() => setCurrentPage('contact')}
            className="px-6 py-3.5 bg-white text-black font-agrandir-semibold uppercase tracking-widest hover:bg-[#eaeaea] rounded-full transition-colors whitespace-nowrap shrink-0 cursor-pointer shadow-lg"
          >
            NOUS CONTACTER →
          </button>
        </div>

      </div>

    </div>
  );
};
