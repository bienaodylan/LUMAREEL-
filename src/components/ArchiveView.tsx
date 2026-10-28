import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { ArchiveProduction } from '../types';

export const ArchiveView: React.FC = () => {
  const { setCurrentPage } = useApp();
  const [archives, setArchives] = useState<ArchiveProduction[]>([]);

  useEffect(() => {
    fetch('/api/archives')
      .then((r) => r.json())
      .then((d) => {
        if (d.success) setArchives(d.archives);
      });
  }, []);

  return (
    <div className="relative min-h-screen bg-[#060606] text-[#efefef] flex flex-col justify-between overflow-hidden">
      
      {/* Downward spotlight beam in background (as seen in screenshot 3) */}
      <div className="absolute inset-0 pointer-events-none flex justify-center overflow-hidden" aria-hidden="true">
        <div className="spotlight-beam absolute -top-10 w-[90vw] sm:w-[70vw] md:w-[55vw] h-[100vh] opacity-80" />
        <div className="absolute inset-0 bg-grain opacity-25 mix-blend-screen" />
      </div>

      {/* Main content container */}
      <div className="relative z-10 max-w-6xl mx-auto w-full px-6 sm:px-10 pt-28 sm:pt-32 pb-20 flex-1">
        
        {/* Section kicker */}
        <div className="text-[11px] font-agrandir-regular tracking-[0.25em] text-[#888] uppercase mb-4">
          ARCHIVE
        </div>

        {/* Hero headline matching exact typography from screenshot 3:
            "Les scènes" in bold white sans + "qu'on a fait vibrer." in italic serif! */}
        <div className="mb-4">
          <h1 className="font-agrandir-extrabold text-5xl sm:text-7xl md:text-8xl tracking-tight text-white leading-[0.95] text-balance">
            Les scènes
          </h1>
          <h2 className="font-editorial-italic font-normal text-5xl sm:text-7xl md:text-8xl text-[#F2F2F2] tracking-tight leading-[1.05] mt-1 text-balance">
            qu’on a fait vibrer.
          </h2>
        </div>

        <p className="text-sm sm:text-base text-[#999] font-agrandir-regular font-light max-w-xl mb-16">
          Des artistes, des publics, des instants uniques.
        </p>

        {/* Rounded Cards for Archive Concerts */}
        <div className="space-y-6">
          {archives.map((item) => (
            <div
              key={item.id}
              className="p-6 sm:p-8 rounded-3xl bg-[#0c0c0c]/85 border border-white/10 hover:border-white/25 transition-all shadow-xl grid grid-cols-1 md:grid-cols-12 gap-4 md:gap-8 items-start group"
            >
              {/* Left col: Concert name */}
              <div className="md:col-span-5">
                <span className="inline-block px-3 py-1 rounded-full bg-white/5 border border-white/10 text-[10px] font-agrandir-semibold tracking-widest text-[#aaa] uppercase mb-3">
                  CONCERT ARCHIVÉ
                </span>
                <h3 className="font-agrandir-extrabold text-2xl sm:text-3xl md:text-4xl text-white tracking-tight uppercase group-hover:text-white transition-colors">
                  {item.title}
                </h3>
              </div>

              {/* Right col: Description, venue & media count */}
              <div className="md:col-span-7 flex flex-col justify-between space-y-3 font-agrandir-regular">
                <p className="text-xs sm:text-sm text-[#bbb] font-light leading-relaxed">
                  {item.description}
                </p>

                <div className="text-[11px] font-agrandir-regular tracking-[0.18em] text-[#888] uppercase pt-2 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#d4af37]" />
                  <span>
                    {item.year === '2026' ? (
                      item.id === 'arc_trk'
                        ? '18 JUILLET 2026 · 13 MÉDIAS HD'
                        : '25 JUILLET 2026 · 13 MÉDIAS HD'
                    ) : (
                      '29 JUILLET 2023 · 3 MÉDIAS HD'
                    )}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>

      </div>

      {/* Footer matching screenshot 3 */}
      <footer className="relative z-10 w-full px-6 sm:px-10 py-6 border-t border-[#181818] flex flex-col sm:flex-row items-center justify-between gap-3 text-[10px] sm:text-[11px] font-agrandir-regular tracking-[0.2em] text-[#666] uppercase">
        <div>
          © 2026 ARÉEL GROUPE / LUMAREEL CO.
        </div>
        <div className="flex items-center gap-4 text-[#777]">
          <a href="#instagram" className="hover:text-white transition-colors">INSTAGRAM</a>
          <span>·</span>
          <a href="#tiktok" className="hover:text-white transition-colors">TIKTOK</a>
          <span>·</span>
          <a href="#snapchat" className="hover:text-white transition-colors">SNAPCHAT</a>
        </div>
      </footer>

    </div>
  );
};
