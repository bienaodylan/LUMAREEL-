<button onClick={onClose} className="p-2 rounded-full bg-white/5 border border-white/10 hover:bg-white/15 text-neutral-400 hover:text-white transition-colors" aria-label="Fermer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {!isReadyToPrint ? (
          <form onSubmit={handleGenerateBatch} className="space-y-6">
            {initialEventId && selectedEvent ? (
              <div className="p-4 bg-[#141414] border border-[#d4af37]/30 rounded-2xl flex items-center gap-3.5">
                <img src={selectedEvent.officialPoster || selectedEvent.artistPortrait} alt={selectedEvent.artist} className="w-14 h-14 rounded-xl object-cover border border-white/15 shrink-0" />
                <div>
                  <div className="text-[9px] text-[#d4af37] font-agrandir-bold tracking-[0.2em] uppercase">Événement sélectionné</div>
                  <div className="text-white font-agrandir-extrabold text-base uppercase">{selectedEvent.artist} EN CONCERT</div>
                  <div className="text-xs text-neutral-300 mt-0.5">{selectedEvent.venue} · {formatDateLongFrench(selectedEvent.date)}</div>
                </div>
              </div>
            ) : (
              <div>
                <label className="block text-[11px] uppercase font-agrandir-bold text-[#888] mb-1.5">1. Événement</label>
                <select value={selectedEventId} onChange={(event) => setSelectedEventId(event.target.value)} className="w-full bg-[#161616] border border-white/15 rounded-2xl px-4 py-3 text-xs text-white outline-none focus:border-[#d4af37]" required disabled={isGenerating}>
                  {events.map((event) => <option key={event.id} value={event.id}>{event.artist} EN CONCERT — {event.venue} ({formatDateLongFrench(event.date)})</option>)}
                </select>
              </div>
            )}

            {selectedEvent && (
              <div className="space-y-2">
                <label className="block text-[11px] uppercase font-agrandir-bold text-[#888]">2. Catégorie et design du billet</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {selectedEvent.categories.map((category) => {
                    const active = selectedCategoryId === category.id;
                    return (
                      <button type="button" key={category.id} onClick={() => setSelectedCategoryId(category.id)} className={`p-4 rounded-2xl border text-left transition-all ${active ? 'bg-[#181818] border-[#d4af37] ring-1 ring-[#d4af37]/40' : 'bg-[#111] border-white/10 hover:border-white/30'}`}>
                        <div className="flex items-center justify-between gap-2 mb-1.5">
                          <span className="font-agrandir-extrabold text-sm text-white uppercase">{category.name}</span>
                          <span className="text-xs font-agrandir-bold text-[#d4af37]">{category.price.toLocaleString('fr-FR')} {category.currency || 'FCFA'}</span>
                        </div>
                        <div className="flex items-center justify-between text-[10px] text-neutral-400">
                          <span>{category.quota.toLocaleString('fr-FR')} places prévues</span>
                          <span className={category.ticketImageUrl ? 'text-emerald-400' : 'text-neutral-400'}>{category.ticketImageUrl ? 'Design spécifique' : 'Visuel par défaut'}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {currentCategory && (
              <div className="p-4 bg-[#141414] border border-white/10 rounded-2xl space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="text-[10px] font-agrandir-bold text-[#d4af37] uppercase tracking-wider">Visuel recto : {currentCategory.name}</div>
                  <label className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-white text-[10px] font-agrandir-semibold uppercase flex items-center gap-1.5 cursor-pointer">
                    <Upload className="w-3 h-3 text-[#d4af37]" />
                    <span>{isUploadingDesign ? 'Import...' : 'Changer le visuel'}</span>
                    <input type="file" accept="image/png,image/jpeg,image/webp" disabled={isUploadingDesign || isGenerating} onChange={(event) => { const file = event.target.files?.[0]; if (file) void handleUploadCategoryDesign(file); event.currentTarget.value = ''; }} className="hidden" />
                  </label>
                </div>
                <div className="flex flex-col sm:flex-row items-center gap-4">
                  <div className="w-full sm:w-60 aspect-[1536/548] overflow-hidden rounded-xl bg-black border border-white/20 shrink-0">
                    {categoryDesignUrl ? <img src={categoryDesignUrl} alt={currentCategory.name} className="w-full h-full object-contain" /> : <div className="h-full flex items-center justify-center text-xs text-neutral-500">Aucun visuel</div>}
                  </div>
                  <p className="text-[11px] text-neutral-400 leading-relaxed">Format physique fixe : 153,6 × 54,8 mm. Le visuel est ajusté sans déformation. Le verso comporte le QR code et les informations de contrôle.</p>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] uppercase font-agrandir-bold text-[#888] mb-1.5">3. Format du papier</label>
                <select value={selectedPaperKey} onChange={(event) => setSelectedPaperKey(event.target.value)} className="w-full bg-[#161616] border border-white/15 rounded-2xl px-4 py-2.5 text-xs text-white outline-none focus:border-[#d4af37]">
                  {Object.entries(SYSTEM_PAPER_FORMATS).map(([key, paper]) => <option key={key} value={key}>{paper.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[11px] uppercase font-agrandir-bold text-[#888] mb-1.5">4. Quantité de billets</label>
                <input type="number" min="1" max="10000" step="1" value={quantity} onChange={(event) => setQuantity(Math.min(10000, Math.max(1, Number.parseInt(event.target.value, 10) || 1)))} className="w-full bg-[#161616] border border-white/15 rounded-2xl px-4 py-2.5 text-xs text-white outline-none focus:border-[#d4af37]" required disabled={isGenerating} />
              </div>
            </div>

            {layout && (
              <div className="p-4 rounded-2xl border border-[#d4af37]/25 bg-[#d4af37]/[0.06] space-y-2">
                <div className="flex items-center gap-2 text-[#d4af37] text-[10px] font-agrandir-bold uppercase tracking-wider"><FileText className="w-4 h-4" /> Estimation de production</div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div><div className="text-xl font-agrandir-extrabold text-white">{layout.ticketsPerPage}</div><div className="text-[9px] text-neutral-400 uppercase">Billets / feuille</div></div>
                  <div><div className="text-xl font-agrandir-extrabold text-white">{layout.totalPages}</div><div className="text-[9px] text-neutral-400 uppercase">Feuilles nécessaires</div></div>
                  <div><div className="text-xl font-agrandir-extrabold text-white">{layout.columns} × {layout.rows}</div><div className="text-[9px] text-neutral-400 uppercase">Colonnes × rangées</div></div>
                  <div><div className="flex items-center gap-1 text-xl font-agrandir-extrabold text-white">{layout.rotated ? <><RotateCw className="w-4 h-4" /> 90°</> : '0°'}</div><div className="text-[9px] text-neutral-400 uppercase">Orientation du billet</div></div>
                </div>
                <p className="text-[10px] text-neutral-400">Calcul avec marge de sécurité de 5 mm et espacement de 2 mm. Le résultat réel dépend des marges non imprimables de l'imprimante.</p>
              </div>
            )}

            <button type="submit" disabled={isGenerating || isUploadingDesign || !categoryDesignUrl || !layout} className="w-full py-4 rounded-2xl bg-white hover:bg-neutral-200 text-black font-agrandir-extrabold text-xs uppercase tracking-wider transition-colors shadow-xl flex items-center justify-center gap-2 disabled:opacity-50 relative overflow-hidden">
              {isGenerating ? <><div className="absolute inset-y-0 left-0 bg-[#d4af37]/25" style={{ width: `${generationProgress}%`, transition: 'width 0.2s' }} /><Loader2 className="w-4 h-4 animate-spin relative z-10" /><span className="relative z-10">Préparation du lot... {generationProgress}%</span></> : <><Printer className="w-4 h-4" /><span>Préparer {quantity.toLocaleString('fr-FR')} billets</span></>}
            </button>
          </form>
        ) : (
          <div className="py-10 flex flex-col items-center justify-center space-y-6 text-center">
            <div className="w-16 h-16 bg-emerald-500/10 rounded-full flex items-center justify-center border border-emerald-500/30"><CheckCircle2 className="w-8 h-8 text-emerald-400" /></div>
            <div>
              <h3 className="text-2xl font-agrandir-extrabold uppercase text-white mb-2">Lot prêt pour la production</h3>
              <p className="text-[#888] text-xs max-w-md mx-auto leading-relaxed"><strong className="text-white">{ticketsRef.current.length.toLocaleString('fr-FR')} billets</strong> · papier <strong className="text-white">{selectedPaper?.name}</strong> · <strong className="text-white">{layout?.ticketsPerPage}</strong> billets par feuille · <strong className="text-white">{layout?.totalPages}</strong> feuille(s).</p>
              <p className="text-[10px] text-neutral-500 mt-2">Deux fichiers distincts seront générés : RECTO et VERSO. Ils partageront exactement le même plan de placement.</p>
            </div>
            <div className="flex flex-col sm:flex-row items-center gap-3 mt-6">
              <button type="button" onClick={() => setIsReadyToPrint(false)} disabled={isDownloading} className="px-6 py-3 rounded-2xl bg-white/5 hover:bg-white/10 text-neutral-300 text-xs font-agrandir-bold uppercase">Modifier</button>
              <button type="button" onClick={() => void handleDownloadPDFs()} disabled={isDownloading} className="px-8 py-3.5 rounded-2xl bg-[#d4af37] hover:bg-[#e6c158] text-black font-agrandir-extrabold text-sm uppercase flex items-center gap-2 shadow-[0_0_25px_rgba(212,175,55,0.25)] disabled:opacity-60">
                {isDownloading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Download className="w-5 h-5" />}
                <span>{isDownloading ? 'Génération...' : 'Télécharger les PDF recto / verso'}</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};