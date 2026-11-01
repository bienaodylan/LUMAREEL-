import React, { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Check, ChevronLeft, Clock, Loader2, Minus, Plus, ShieldCheck } from 'lucide-react';
import {
  FlowCategory,
  FlowEvent,
  PAYMENT_COUNTRIES,
  PaymentMethod,
  Selection,
  computeTotals,
  formatAmount,
  formatCountdown,
  getStock,
  isValidEmail,
  isValidMobile,
  lookupPromo,
  maxQuantity,
  methodsForCountry,
} from '../utils/purchaseFlow';

export interface PurchaseOrder {
  eventId: string;
  lines: Array<{ categoryId: string; categoryName: string; quantity: number; unitPrice: number }>;
  promoCode?: string;
  subtotal: number;
  discount: number;
  total: number;
  currency: string;
  buyerName: string;
  buyerEmail: string;
  country: string;
  paymentMethod: string;
  phone?: string;
}

export interface TicketPurchaseFlowProps {
  event: FlowEvent;
  /** Codes promo : { LION10: 10 } = 10 % de réduction. */
  promoCodes?: Record<string, number>;
  /** Validation serveur d'un code promo (prioritaire sur promoCodes). Renvoie le % ou null. */
  validatePromo?: (code: string) => Promise<number | null>;
  /** Durée de réservation des billets pendant la commande. */
  lockMinutes?: number;
  maxPerCategory?: number;
  /**
   * Appelée quand le client confirme sur l'écran du prestataire. Branchez ici le vrai paiement
   * (création de la commande + paiement). Sans cette fonction, le paiement est simulé.
   */
  onConfirmPayment?: (order: PurchaseOrder) => Promise<{ reference?: string } | void>;
  onDone?: () => void;
  onClose?: () => void;
}

type Step = 1 | 2 | 3 | 4;
type Stage = 'redirecting' | 'confirm' | 'processing' | 'success' | 'failed';

const GOLD = '#d4af37';
const focusRing =
  'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#d4af37]';

const STEP_TITLES: Record<Step, string> = {
  1: 'Choix des billets',
  2: 'Récapitulatif',
  3: 'Paiement',
  4: 'Confirmation',
};

function formatEventDate(date: string, time?: string): string {
  const parsed = new Date(`${date}T12:00:00`);
  if (Number.isNaN(parsed.getTime())) return date;
  const day = parsed.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  return time ? `${day} à ${time.replace(':', 'h')}` : day;
}

export const TicketPurchaseFlow: React.FC<TicketPurchaseFlowProps> = ({
  event,
  promoCodes,
  validatePromo,
  lockMinutes = 20,
  maxPerCategory = 8,
  onConfirmPayment,
  onDone,
  onClose,
}) => {
  const [step, setStep] = useState<Step>(1);
  const [selection, setSelection] = useState<Selection>({});
  const [promoInput, setPromoInput] = useState('');
  const [promo, setPromo] = useState<{ code: string; percent: number } | null>(null);
  const [promoMessage, setPromoMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [isCheckingPromo, setIsCheckingPromo] = useState(false);
  const [buyerName, setBuyerName] = useState('');
  const [buyerEmail, setBuyerEmail] = useState('');
  const [countryCode, setCountryCode] = useState('CI');
  const [methodId, setMethodId] = useState('');
  const [phone, setPhone] = useState('');
  const [showErrors, setShowErrors] = useState(false);
  const [lockEndsAt, setLockEndsAt] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [stage, setStage] = useState<Stage>('redirecting');
  const [reference, setReference] = useState('');
  const [notice, setNotice] = useState('');

  const totals = useMemo(
    () => computeTotals(event.categories, selection, promo?.percent || 0),
    [event.categories, selection, promo]
  );
  const country = PAYMENT_COUNTRIES.find((c) => c.code === countryCode) || PAYMENT_COUNTRIES[0];
  const methods = useMemo(() => methodsForCountry(countryCode), [countryCode]);
  const method: PaymentMethod | undefined = methods.find((m) => m.id === methodId);

  const remainingMs = lockEndsAt === null ? null : lockEndsAt - now;
  const isExpired = remainingMs !== null && remainingMs <= 0 && stage !== 'success';
  const lockTotalMs = lockMinutes * 60000;

  // Horloge du compte à rebours.
  useEffect(() => {
    if (lockEndsAt === null || stage === 'success') return;
    setNow(Date.now());
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [lockEndsAt, stage]);

  // Redirection simulée vers le prestataire de paiement.
  useEffect(() => {
    if (step !== 4 || stage !== 'redirecting') return;
    const id = window.setTimeout(() => setStage('confirm'), 1800);
    return () => window.clearTimeout(id);
  }, [step, stage]);

  const currency = totals.currency;
  const money = (value: number) => `${formatAmount(value)} ${currency}`;

  /* ----------------------------- Actions ----------------------------- */

  const changeQuantity = (category: FlowCategory, delta: number) => {
    setSelection((previous) => {
      const next = Math.min(maxQuantity(category, maxPerCategory), Math.max(0, (previous[category.id] || 0) + delta));
      return { ...previous, [category.id]: next };
    });
  };

  const applyPromo = async () => {
    const code = promoInput.trim();
    if (!code) return;
    setIsCheckingPromo(true);
    try {
      const percent = validatePromo ? await validatePromo(code) : lookupPromo(code, promoCodes);
      if (percent && percent > 0) {
        setPromo({ code: code.toUpperCase(), percent });
        setPromoMessage({ ok: true, text: `Code ${code.toUpperCase()} appliqué : −${percent} %.` });
      } else {
        setPromo(null);
        setPromoMessage({ ok: false, text: 'Ce code est invalide ou expiré. Vérifiez la saisie.' });
      }
    } catch {
      setPromo(null);
      setPromoMessage({ ok: false, text: 'Impossible de vérifier le code pour le moment. Réessayez.' });
    } finally {
      setIsCheckingPromo(false);
    }
  };

  const removePromo = () => {
    setPromo(null);
    setPromoInput('');
    setPromoMessage(null);
  };

  const goToRecap = () => {
    if (totals.count === 0) return;
    setLockEndsAt(Date.now() + lockTotalMs);
    setNow(Date.now());
    setNotice('');
    setStep(2);
  };

  const backToTickets = () => {
    setLockEndsAt(null);
    setShowErrors(false);
    setStep(1);
  };

  const contactErrors = {
    name: buyerName.trim().length < 2 ? 'Indiquez votre nom complet.' : '',
    email: isValidEmail(buyerEmail) ? '' : 'Indiquez une adresse e-mail valide pour recevoir vos billets.',
  };

  const goToPayment = () => {
    if (contactErrors.name || contactErrors.email) {
      setShowErrors(true);
      return;
    }
    setShowErrors(false);
    setStep(3);
  };

  const needsPhone = method?.kind === 'mobile';
  const paymentErrors = {
    method: method ? '' : 'Choisissez un moyen de paiement.',
    phone: needsPhone && !isValidMobile(phone) ? 'Indiquez le numéro à débiter (8 à 10 chiffres).' : '',
  };

  const goToProvider = () => {
    if (paymentErrors.method || paymentErrors.phone) {
      setShowErrors(true);
      return;
    }
    setShowErrors(false);
    setNotice('');
    setStage('redirecting');
    setStep(4);
  };

  const cancelAtProvider = () => {
    setNotice('Paiement annulé. Vos billets restent réservés, vous pouvez choisir un autre moyen de paiement.');
    setStep(3);
  };

  const confirmPayment = async () => {
    if (!method) return;
    setStage('processing');
    const order: PurchaseOrder = {
      eventId: event.id,
      lines: totals.lines.map((line) => ({
        categoryId: line.category.id,
        categoryName: line.category.name,
        quantity: line.quantity,
        unitPrice: line.category.price,
      })),
      promoCode: promo?.code,
      subtotal: totals.subtotal,
      discount: totals.discount,
      total: totals.total,
      currency,
      buyerName: buyerName.trim(),
      buyerEmail: buyerEmail.trim().toLowerCase(),
      country: country.code,
      paymentMethod: method.id,
      phone: needsPhone ? `${country.dialCode} ${phone.trim()}`.trim() : undefined,
    };
    try {
      if (onConfirmPayment) {
        const result = await onConfirmPayment(order);
        setReference((result && result.reference) || '');
      } else {
        await new Promise((resolve) => window.setTimeout(resolve, 1400));
        setReference(`SIM-${Date.now().toString(36).toUpperCase()}`);
      }
      setStage('success');
    } catch (error) {
      setNotice(
        error instanceof Error && error.message
          ? error.message
          : 'Le paiement n’a pas abouti. Aucun montant n’a été débité. Réessayez.'
      );
      setStage('failed');
    }
  };

  const restart = () => {
    setSelection({});
    setPromo(null);
    setPromoInput('');
    setPromoMessage(null);
    setLockEndsAt(null);
    setMethodId('');
    setPhone('');
    setNotice('');
    setShowErrors(false);
    setStage('redirecting');
    setStep(1);
  };

  /* ------------------------------ Vues ------------------------------- */

  const countdownStrip =
    remainingMs !== null && step >= 2 && stage !== 'success' ? (
      <div className="mb-5" role="timer" aria-label="Temps restant pour finaliser la commande">
        <div className="flex items-center justify-between text-xs text-neutral-300">
          <span className="flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5" style={{ color: GOLD }} aria-hidden="true" />
            Vos billets sont réservés
          </span>
          <span className="font-agrandir-bold tabular-nums text-white text-sm">{formatCountdown(remainingMs)}</span>
        </div>
        <div className="mt-2 h-[3px] w-full bg-white/10 overflow-hidden rounded-full">
          <div
            className="h-full motion-safe:transition-[width] motion-safe:duration-1000 ease-linear"
            style={{
              width: `${Math.max(0, Math.min(100, (remainingMs / lockTotalMs) * 100))}%`,
              background: remainingMs < 120000 ? '#ef4444' : GOLD,
            }}
          />
        </div>
      </div>
    ) : null;

  const expiredView = (
    <div className="py-10 text-center space-y-4">
      <AlertTriangle className="w-10 h-10 mx-auto text-red-400" aria-hidden="true" />
      <h2 className="font-agrandir-extrabold text-xl">Votre réservation a expiré</h2>
      <p className="text-sm text-neutral-400 max-w-xs mx-auto leading-relaxed">
        Le délai de {lockMinutes} minutes est écoulé et vos billets ont été remis en vente. Recommencez pour vérifier la
        disponibilité.
      </p>
      <button
        type="button"
        onClick={restart}
        className={`mt-2 w-full min-h-12 rounded-xl bg-[#d4af37] text-black font-agrandir-extrabold text-sm ${focusRing}`}
      >
        Recommencer ma commande
      </button>
    </div>
  );

  const step1 = (
    <div>
      <div className="mb-6">
        <h1 className="font-agrandir-extrabold text-2xl leading-tight">{event.title}</h1>
        <p className="mt-2 text-sm text-neutral-300 first-letter:uppercase">{formatEventDate(event.date, event.time)}</p>
        <p className="text-sm text-neutral-400">
          {event.venue}
          {event.city ? `, ${event.city}` : ''}
        </p>
      </div>

      <h2 className="font-agrandir-bold text-base mb-1">Choisissez vos billets</h2>
      <p className="text-xs text-neutral-500 mb-3">Maximum {maxPerCategory} billets par catégorie.</p>

      <ul className="divide-y divide-white/10 border-y border-white/10">
        {event.categories.map((category) => {
          const stock = getStock(category);
          const quantity = selection[category.id] || 0;
          const max = maxQuantity(category, maxPerCategory);
          const soldOut = stock.level === 'soldout';
          return (
            <li
              key={category.id}
              className={`py-4 pl-3 border-l-2 ${quantity > 0 ? 'border-[#d4af37]' : 'border-transparent'} ${soldOut ? 'opacity-60' : ''}`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-agrandir-extrabold text-base">{category.name}</p>
                  <p className="text-sm text-neutral-300 mt-0.5">{money(category.price)}</p>
                  {category.description && (
                    <p className="text-xs text-neutral-500 mt-1 leading-relaxed">{category.description}</p>
                  )}
                  {stock.level === 'low' && (
                    <p className="mt-2 inline-flex items-center gap-1.5 text-xs text-amber-400">
                      <AlertTriangle className="w-3.5 h-3.5" aria-hidden="true" />
                      Risque de rupture : il reste {stock.remaining} billet{stock.remaining > 1 ? 's' : ''}
                    </p>
                  )}
                  {soldOut && (
                    <p className="mt-2 inline-block text-xs font-agrandir-bold text-red-400 border border-red-400/40 rounded px-2 py-0.5">
                      Épuisé
                    </p>
                  )}
                </div>

                {!soldOut && (
                  <div className="flex items-center gap-1 shrink-0" role="group" aria-label={`Quantité ${category.name}`}>
                    <button
                      type="button"
                      onClick={() => changeQuantity(category, -1)}
                      disabled={quantity === 0}
                      aria-label={`Retirer un billet ${category.name}`}
                      className={`w-11 h-11 rounded-full border border-white/20 flex items-center justify-center disabled:opacity-30 ${focusRing}`}
                    >
                      <Minus className="w-4 h-4" aria-hidden="true" />
                    </button>
                    <span className="w-8 text-center font-agrandir-bold tabular-nums" aria-live="polite">
                      {quantity}
                    </span>
                    <button
                      type="button"
                      onClick={() => changeQuantity(category, 1)}
                      disabled={quantity >= max}
                      aria-label={`Ajouter un billet ${category.name}`}
                      className={`w-11 h-11 rounded-full border border-white/20 flex items-center justify-center disabled:opacity-30 ${focusRing}`}
                    >
                      <Plus className="w-4 h-4" aria-hidden="true" />
                    </button>
                  </div>
                )}
              </div>
            </li>
          );
        })}
      </ul>

      <div className="mt-6">
        <label htmlFor="promo-code" className="block text-sm font-agrandir-bold mb-2">
          Code promo
        </label>
        {promo ? (
          <div className="flex items-center justify-between rounded-xl border border-[#d4af37]/40 px-4 min-h-12">
            <span className="text-sm">
              <span className="font-agrandir-bold">{promo.code}</span> : −{promo.percent} %
            </span>
            <button type="button" onClick={removePromo} className={`text-xs text-neutral-400 underline min-h-11 px-2 ${focusRing}`}>
              Retirer
            </button>
          </div>
        ) : (
          <div className="flex gap-2">
            <input
              id="promo-code"
              value={promoInput}
              onChange={(e) => setPromoInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  void applyPromo();
                }
              }}
              autoCapitalize="characters"
              autoComplete="off"
              placeholder="Saisissez votre code"
              className={`flex-1 min-w-0 min-h-12 rounded-xl bg-transparent border border-white/20 px-4 text-sm placeholder:text-neutral-600 ${focusRing}`}
            />
            <button
              type="button"
              onClick={() => void applyPromo()}
              disabled={isCheckingPromo || !promoInput.trim()}
              className={`px-5 min-h-12 rounded-xl border border-white/30 text-sm font-agrandir-bold disabled:opacity-40 ${focusRing}`}
            >
              {isCheckingPromo ? <Loader2 className="w-4 h-4 animate-spin" aria-label="Vérification" /> : 'Appliquer'}
            </button>
          </div>
        )}
        {promoMessage && (
          <p className={`mt-2 text-xs ${promoMessage.ok ? 'text-emerald-400' : 'text-red-400'}`} role="status">
            {promoMessage.text}
          </p>
        )}
      </div>
    </div>
  );

  const field = (
    id: string,
    label: string,
    value: string,
    onChange: (v: string) => void,
    error: string,
    props: React.InputHTMLAttributes<HTMLInputElement> = {}
  ) => (
    <div>
      <label htmlFor={id} className="block text-sm font-agrandir-bold mb-2">
        {label}
      </label>
      <input
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={showErrors && !!error}
        aria-describedby={showErrors && error ? `${id}-error` : undefined}
        className={`w-full min-h-12 rounded-xl bg-transparent border px-4 text-sm placeholder:text-neutral-600 ${
          showErrors && error ? 'border-red-400' : 'border-white/20'
        } ${focusRing}`}
        {...props}
      />
      {showErrors && error && (
        <p id={`${id}-error`} className="mt-1.5 text-xs text-red-400">
          {error}
        </p>
      )}
    </div>
  );

  const step2 = (
    <div className="space-y-6">
      <section aria-labelledby="recap-title">
        <h2 id="recap-title" className="font-agrandir-bold text-base mb-1">
          {event.title}
        </h2>
        <p className="text-xs text-neutral-400">{formatEventDate(event.date, event.time)}</p>
        <p className="text-xs text-neutral-400 mb-4">{event.venue}</p>

        <ul className="divide-y divide-white/10 border-y border-white/10">
          {totals.lines.map((line) => (
            <li key={line.category.id} className="py-3 flex items-center justify-between gap-3 text-sm">
              <span>
                <span className="tabular-nums">{line.quantity}</span> × {line.category.name}
              </span>
              <span className="tabular-nums text-neutral-200">{money(line.amount)}</span>
            </li>
          ))}
        </ul>

        <dl className="mt-3 space-y-1.5 text-sm">
          {totals.discount > 0 && (
            <>
              <div className="flex justify-between text-neutral-400">
                <dt>Sous-total</dt>
                <dd className="tabular-nums">{money(totals.subtotal)}</dd>
              </div>
              <div className="flex justify-between text-emerald-400">
                <dt>Code {promo?.code}</dt>
                <dd className="tabular-nums">−{money(totals.discount)}</dd>
              </div>
            </>
          )}
          <div className="flex justify-between font-agrandir-extrabold text-lg pt-1">
            <dt>Total</dt>
            <dd className="tabular-nums">{money(totals.total)}</dd>
          </div>
        </dl>
      </section>

      <section aria-labelledby="contact-title" className="space-y-4">
        <h2 id="contact-title" className="font-agrandir-bold text-base">
          Vos coordonnées
        </h2>
        {field('buyer-name', 'Nom complet', buyerName, setBuyerName, contactErrors.name, {
          autoComplete: 'name',
          placeholder: 'Ex : Kouassi Awa',
        })}
        {field('buyer-email', 'Adresse e-mail', buyerEmail, setBuyerEmail, contactErrors.email, {
          type: 'email',
          inputMode: 'email',
          autoComplete: 'email',
          placeholder: 'vous@exemple.com',
        })}
        <p className="text-xs text-neutral-500 leading-relaxed">
          Vos billets avec QR code sont rattachés à cette adresse. Chaque billet est individuel et ne peut être validé
          qu’une seule fois à l’entrée.
        </p>
      </section>
    </div>
  );

  const step3 = (
    <div className="space-y-6">
      {notice && (
        <p className="text-sm text-amber-300 border border-amber-400/30 rounded-xl px-4 py-3" role="status">
          {notice}
        </p>
      )}

      <div>
        <label htmlFor="country" className="block text-sm font-agrandir-bold mb-2">
          Votre pays
        </label>
        <select
          id="country"
          value={countryCode}
          onChange={(e) => {
            setCountryCode(e.target.value);
            setMethodId('');
            setShowErrors(false);
          }}
          className={`w-full min-h-12 rounded-xl bg-black border border-white/20 px-4 text-sm ${focusRing}`}
        >
          {PAYMENT_COUNTRIES.map((c) => (
            <option key={c.code} value={c.code}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      <fieldset>
        <legend className="block text-sm font-agrandir-bold mb-2">Moyen de paiement</legend>
        <div className="space-y-2">
          {methods.map((m) => {
            const selected = m.id === methodId;
            return (
              <label
                key={m.id}
                className={`flex items-center gap-3 rounded-xl border px-4 min-h-16 cursor-pointer motion-safe:transition-colors ${
                  selected ? 'border-[#d4af37] bg-[#d4af37]/[0.07]' : 'border-white/15 hover:border-white/40'
                } focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-[#d4af37]`}
              >
                <input
                  type="radio"
                  name="payment-method"
                  value={m.id}
                  checked={selected}
                  onChange={() => {
                    setMethodId(m.id);
                    setShowErrors(false);
                  }}
                  className="sr-only"
                />
                <span
                  className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-agrandir-extrabold text-black shrink-0"
                  style={{ background: m.accent }}
                  aria-hidden="true"
                >
                  {m.name.charAt(0)}
                </span>
                <span className="flex-1 min-w-0">
                  <span className="block text-sm font-agrandir-bold">{m.name}</span>
                  <span className="block text-xs text-neutral-400">{m.hint}</span>
                </span>
                <span
                  className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 ${
                    selected ? 'border-[#d4af37] bg-[#d4af37]' : 'border-white/30'
                  }`}
                  aria-hidden="true"
                >
                  {selected && <Check className="w-3 h-3 text-black" />}
                </span>
              </label>
            );
          })}
        </div>
        {showErrors && paymentErrors.method && <p className="mt-2 text-xs text-red-400">{paymentErrors.method}</p>}
      </fieldset>

      {needsPhone && (
        <div>
          <label htmlFor="pay-phone" className="block text-sm font-agrandir-bold mb-2">
            Numéro {method?.name}
          </label>
          <div className="flex gap-2">
            {country.dialCode && (
              <span className="min-h-12 px-3 rounded-xl border border-white/20 flex items-center text-sm text-neutral-300">
                {country.dialCode}
              </span>
            )}
            <input
              id="pay-phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              inputMode="tel"
              autoComplete="tel-national"
              placeholder="07 00 00 00 00"
              aria-invalid={showErrors && !!paymentErrors.phone}
              className={`flex-1 min-w-0 min-h-12 rounded-xl bg-transparent border px-4 text-sm placeholder:text-neutral-600 ${
                showErrors && paymentErrors.phone ? 'border-red-400' : 'border-white/20'
              } ${focusRing}`}
            />
          </div>
          {showErrors && paymentErrors.phone && <p className="mt-1.5 text-xs text-red-400">{paymentErrors.phone}</p>}
        </div>
      )}

      <p className="flex items-start gap-2 text-xs text-neutral-500 leading-relaxed">
        <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
        Vous confirmerez le paiement sur l’interface sécurisée de votre prestataire. LUMARÉEL ne conserve aucun code
        secret.
      </p>
    </div>
  );

  const step4 = (() => {
    if (!method) return null;

    if (stage === 'redirecting') {
      return (
        <div className="py-16 text-center space-y-4" role="status">
          <Loader2 className="w-8 h-8 mx-auto animate-spin" style={{ color: GOLD }} aria-hidden="true" />
          <p className="font-agrandir-bold">Redirection vers {method.name}…</p>
          <p className="text-xs text-neutral-500">Ne fermez pas cette page.</p>
        </div>
      );
    }

    if (stage === 'success') {
      return (
        <div className="py-10 text-center space-y-4">
          <div className="w-14 h-14 rounded-full mx-auto flex items-center justify-center bg-emerald-500/15 border border-emerald-500/40">
            <Check className="w-7 h-7 text-emerald-400" aria-hidden="true" />
          </div>
          <h2 className="font-agrandir-extrabold text-xl">Paiement confirmé</h2>
          <p className="text-sm text-neutral-300 leading-relaxed max-w-xs mx-auto">
            Vos {totals.count} billet{totals.count > 1 ? 's' : ''} pour {event.title} sont enregistrés. Un e-mail de
            confirmation part vers {buyerEmail.trim()}.
          </p>
          {reference && (
            <p className="text-xs text-neutral-500">
              Référence : <span className="font-agrandir-bold text-neutral-300">{reference}</span>
            </p>
          )}
          <button
            type="button"
            onClick={onDone || onClose || restart}
            className={`mt-2 w-full min-h-12 rounded-xl bg-[#d4af37] text-black font-agrandir-extrabold text-sm ${focusRing}`}
          >
            Voir mes billets
          </button>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        <p className="text-xs text-neutral-500 text-center">
          Simulation : l’écran ci-dessous reproduit celui du prestataire. Aucun paiement réel n’est effectué.
        </p>

        <div className="rounded-2xl overflow-hidden bg-white text-neutral-900">
          <div className="px-5 py-4 flex items-center gap-3" style={{ background: method.accent }}>
            <span className="w-9 h-9 rounded-full bg-white/90 flex items-center justify-center font-agrandir-extrabold">
              {method.name.charAt(0)}
            </span>
            <span className="font-agrandir-extrabold text-neutral-900">{method.name}</span>
          </div>

          <dl className="px-5 py-5 space-y-4 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-neutral-500">Marchand</dt>
              <dd className="font-agrandir-bold text-right">LUMARÉEL CO.</dd>
            </div>
            {needsPhone && (
              <div className="flex justify-between gap-4">
                <dt className="text-neutral-500">Compte à débiter</dt>
                <dd className="font-agrandir-bold text-right">
                  {country.dialCode} {phone.trim()}
                </dd>
              </div>
            )}
            <div className="border-t border-neutral-200 pt-4 flex justify-between items-baseline gap-4">
              <dt className="text-neutral-500">Montant à confirmer</dt>
              <dd className="font-agrandir-extrabold text-2xl tabular-nums">{money(totals.total)}</dd>
            </div>
          </dl>

          <div className="px-5 pb-5 space-y-2">
            {stage === 'failed' && notice && (
              <p className="text-sm text-red-600 pb-1" role="alert">
                {notice}
              </p>
            )}
            <button
              type="button"
              onClick={() => void confirmPayment()}
              disabled={stage === 'processing'}
              className="w-full min-h-12 rounded-xl text-neutral-900 font-agrandir-extrabold text-sm disabled:opacity-70 flex items-center justify-center gap-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-900"
              style={{ background: method.accent }}
            >
              {stage === 'processing' ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" /> Confirmation en cours…
                </>
              ) : stage === 'failed' ? (
                'Réessayer le paiement'
              ) : (
                'Confirmer le paiement'
              )}
            </button>
            <button
              type="button"
              onClick={cancelAtProvider}
              disabled={stage === 'processing'}
              className="w-full min-h-12 rounded-xl text-neutral-600 text-sm disabled:opacity-40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-900"
            >
              Annuler
            </button>
          </div>
        </div>
      </div>
    );
  })();

  /* --------------------------- Barre d'action ------------------------- */

  const showBar = !isExpired && ((step === 1) || step === 2 || step === 3);
  const barLabel =
    step === 1 ? 'Continuer' : step === 2 ? 'Procéder au paiement' : method ? `Payer avec ${method.name}` : 'Choisir un moyen de paiement';
  const barAction = step === 1 ? goToRecap : step === 2 ? goToPayment : goToProvider;
  const barDisabled = step === 1 && totals.count === 0;

  const canGoBack = (step === 2 || step === 3) && !isExpired;
  const goBack = () => {
    setShowErrors(false);
    setNotice('');
    if (step === 2) backToTickets();
    else if (step === 3) setStep(2);
  };

  return (
    <div className="relative mx-auto w-full max-w-lg min-h-[100dvh] flex flex-col bg-black text-white font-agrandir-regular">
      <header className="px-4 pt-4 pb-3">
        <div className="flex items-center justify-between min-h-11">
          {canGoBack ? (
            <button
              type="button"
              onClick={goBack}
              className={`flex items-center gap-1 -ml-2 px-2 min-h-11 text-sm text-neutral-300 ${focusRing}`}
            >
              <ChevronLeft className="w-4 h-4" aria-hidden="true" />
              Retour
            </button>
          ) : (
            <span />
          )}
          {onClose && stage !== 'success' && (
            <button type="button" onClick={onClose} className={`px-2 min-h-11 text-sm text-neutral-400 ${focusRing}`}>
              Fermer
            </button>
          )}
        </div>

        <div className="mt-1" role="group" aria-label={`Étape ${step} sur 4 : ${STEP_TITLES[step]}`}>
          <div className="flex gap-1.5">
            {([1, 2, 3, 4] as Step[]).map((n) => (
              <span
                key={n}
                className="h-[3px] flex-1 rounded-full motion-safe:transition-colors"
                style={{ background: n <= step ? GOLD : 'rgba(255,255,255,0.15)' }}
              />
            ))}
          </div>
          <p className="mt-2 text-xs text-neutral-400">
            Étape {step} sur 4 · {STEP_TITLES[step]}
          </p>
        </div>
      </header>

      <main className="flex-1 px-4 pt-3 pb-6">
        {isExpired ? (
          expiredView
        ) : (
          <>
            {countdownStrip}
            {step === 1 && step1}
            {step === 2 && step2}
            {step === 3 && step3}
            {step === 4 && step4}
          </>
        )}
      </main>

      {showBar && (
        <div className="sticky bottom-0 z-10 border-t border-white/10 bg-black/95 backdrop-blur px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              <p className="text-xs text-neutral-400">
                {totals.count === 0
                  ? 'Aucun billet sélectionné'
                  : `${totals.count} billet${totals.count > 1 ? 's' : ''}`}
              </p>
              <p className="font-agrandir-extrabold text-lg tabular-nums leading-tight">{money(totals.total)}</p>
            </div>
            <button
              type="button"
              onClick={barAction}
              disabled={barDisabled}
              className={`min-h-12 px-6 rounded-xl bg-[#d4af37] text-black font-agrandir-extrabold text-sm disabled:opacity-30 disabled:cursor-not-allowed ${focusRing}`}
            >
              {barLabel}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default TicketPurchaseFlow;
