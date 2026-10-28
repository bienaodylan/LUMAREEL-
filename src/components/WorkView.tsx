import React, { useState, useEffect } from 'react';
import { WorkProduction } from '../types';
import { Layers } from 'lucide-react';

export const WorkView: React.FC = () => {
  const [works, setWorks] = useState<WorkProduction[]>([]);

  useEffect(() => {
    fetch('/api/works')
      .then((r) => r.json())
      .then((d) => {
        if (d.success) setWorks(d.works);
      });
  }, []);

  return (
    <div className="max-w-7xl mx-auto px-6 pt-28 sm:pt-32 pb-16">
      
      <div className="mb-14 border-b border-[#1c1c1c] pb-8">
        <div className="text-xs font-agrandir-regular tracking-[0.25em] text-[#888] uppercase mb-2">
          INGÉNIERIE SCÉNIQUE &amp; SCÉNOGRAPHIES IMMERSIVES
        </div>
        <h1 className="font-agrandir-extrabold text-3xl sm:text-5xl text-white tracking-tight uppercase">
          WORK &amp; PRODUCTIONS
        </h1>
        <p className="mt-3 text-sm font-agrandir-regular text-[#888] max-w-xl font-light">
          Architecture sonore spatiale, régie générale de tournées et scénographies lumineuses contemporaines créées pour les artistes majeurs et les institutions artistiques.
        </p>
      </div>

      <div className="space-y-16">
        {works.map((work, idx) => (
          <article
            key={work.id}
            className="border border-[#222] bg-[#0c0c0c] p-8 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center"
          >
            <div className="lg:col-span-6 aspect-video bg-[#141414] border border-[#2a2a2a] overflow-hidden">
              <img
                src={work.imageUrl}
                alt={work.title}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover filter contrast-125 grayscale"
              />
            </div>

            <div className="lg:col-span-6 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-3 text-xs font-agrandir-regular tracking-widest text-[#777] uppercase mb-2">
                  <span>PROJET #{idx + 1}</span>
                  <span aria-hidden="true">·</span>
                  <span>{work.year}</span>
                </div>

                <h2 className="font-agrandir-extrabold text-2xl sm:text-3xl text-white tracking-tight mb-2 uppercase">
                  {work.title}
                </h2>

                <div className="text-xs font-agrandir-regular text-[#aaa] uppercase tracking-wider mb-4">
                  Commanditaire : {work.client}
                </div>

                <p className="text-sm font-agrandir-regular text-[#888] leading-relaxed mb-6">
                  {work.description}
                </p>

                <div className="p-4 bg-[#111] border border-[#1f1f1f] text-xs font-agrandir-regular text-[#999]">
                  <div className="text-[10px] text-[#666] uppercase tracking-wider mb-1">PÉRIMÈTRE D’INTERVENTION</div>
                  <div className="text-white font-agrandir-semibold">{work.scope}</div>
                </div>
              </div>
            </div>
          </article>
        ))}
      </div>

    </div>
  );
};
