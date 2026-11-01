import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { ArrowLeft, Calendar, User, Clock, ArrowRight, X } from 'lucide-react';
import { formatDateLongFrench } from '../utils/dateUtils';

export const NewsView: React.FC = () => {
  const { news, setCurrentPage } = useApp();
  const [selectedArticle, setSelectedArticle] = useState<any | null>(null);

  return (
    <div className="max-w-7xl mx-auto px-6 pt-24 sm:pt-28 pb-6 sm:pb-8">
      
      {/* Header */}
      <div className="mb-12 pb-6 border-b border-[#1c1c1c]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="font-agrandir-extrabold text-2xl sm:text-4xl md:text-5xl text-white tracking-tight uppercase whitespace-nowrap">
              ACTUALITÉS
            </h1>
          </div>

          <button
            onClick={() => setCurrentPage('home')}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-white/15 bg-white/5 hover:bg-white/10 text-xs font-agrandir-semibold text-neutral-300 hover:text-white uppercase tracking-wider transition-colors cursor-pointer shrink-0 self-start sm:self-center"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>RETOUR SUR TOUTES LES ACTUALITÉS</span>
          </button>
        </div>
      </div>

      {/* Grid of articles */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {news.map((article: any) => (
          <article
            key={article.id}
            onClick={() => setSelectedArticle(article)}
            className="bg-[#0b0b0b] border border-[#1e1e1e] hover:border-[#383838] transition-all cursor-pointer flex flex-col justify-between group"
          >
            <div>
              {/* Image banner */}
              <div className="aspect-video w-full bg-[#141414] overflow-hidden">
                <img
                  src={article.imageUrl}
                  alt={article.title}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
              </div>

              <div className="p-6">
                <div className="flex items-center justify-between text-[10px] font-agrandir-regular text-[#777] uppercase tracking-wider mb-2">
                  <span className="text-[#d4af37] font-agrandir-semibold">{article.category}</span>
                  <strong className="font-agrandir-bold text-white">{formatDateLongFrench(article.date)}</strong>
                </div>

                <h3 className="font-agrandir-extrabold text-xl text-white uppercase tracking-tight group-hover:text-white transition-colors mb-3 leading-snug">
                  {article.title}
                </h3>

                <p className="font-agrandir-regular text-xs text-[#888] leading-relaxed line-clamp-3">
                  {article.summary}
                </p>
              </div>
            </div>

            <div className="p-6 pt-0 flex items-center justify-between text-[11px] font-agrandir-semibold text-white uppercase tracking-wider border-t border-[#161616] mt-4">
              <span className="group-hover:translate-x-1 transition-transform inline-flex items-center gap-1.5">
                <span>Lire la note</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </span>
              <span className="text-[#666] font-agrandir-regular">{article.readTime}</span>
            </div>
          </article>
        ))}
      </div>

      {/* Article Detail Modal */}
      {selectedArticle && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
          <div className="bg-[#0c0c0c] border border-[#2a2a2a] max-w-3xl w-full p-6 sm:p-10 relative animate-fadeIn">
            
            <button
              onClick={() => setSelectedArticle(null)}
              className="absolute top-6 right-6 p-2 text-[#777] hover:text-white transition-colors cursor-pointer"
              aria-label="Fermer"
            >
              <X className="w-6 h-6" />
            </button>

            <div className="text-[10px] font-agrandir-semibold text-[#d4af37] uppercase tracking-widest mb-2">
              {selectedArticle.category} · <strong className="text-white">{formatDateLongFrench(selectedArticle.date)}</strong>
            </div>

            <h2 className="font-agrandir-extrabold text-2xl sm:text-4xl text-white uppercase tracking-tight mb-4 text-balance">
              {selectedArticle.title}
            </h2>

            <div className="aspect-video w-full bg-[#141414] overflow-hidden my-6 border border-[#222]">
              <img
                src={selectedArticle.imageUrl}
                alt={selectedArticle.title}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover"
              />
            </div>

            <p className="font-agrandir-semibold text-sm text-[#ccc] uppercase tracking-wide leading-relaxed mb-6">
              {selectedArticle.summary}
            </p>

            <div className="space-y-4 font-agrandir-regular text-xs sm:text-sm text-[#999] leading-relaxed border-t border-[#1c1c1c] pt-6">
              <p>{selectedArticle.content}</p>
            </div>

            <div className="mt-8 pt-6 border-t border-[#1c1c1c] flex items-center justify-between text-xs font-agrandir-regular text-[#666]">
              <span>Rédigé par {selectedArticle.author}</span>
              <button
                onClick={() => setSelectedArticle(null)}
                className="text-white hover:underline uppercase font-agrandir-semibold cursor-pointer"
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
