import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { Order, Ticket, TicketCategory } from '../types';
import { 
  X, ShieldCheck, Ticket as TicketIcon, CheckCircle2, Loader2, ArrowRight, 
  Printer, Mail, Clock, ArrowLeft, Tag, Smartphone, CreditCard, Lock, Sparkles, AlertTriangle,
  ChevronDown, ChevronUp, Package, TrendingUp, Check, Search
} from 'lucide-react';
import { generatePersonalizedTicketEmail } from '../utils/emailTemplate';
import { formatDateLong } from '../utils/dateUtils';

type CheckoutStep = 1 | 2 | 3 | 4;
type PaymentOption = 'wave' | 'orange_money' | 'mtn_momo' | 'moov_money' | 'djamo' | 'card';
type CountryOption = 'CI' | 'SN' | 'ML' | 'BF' | 'INT';

export interface CountryOptionItem {
  id: CountryOption;
  name: string;
  flag: string;
  dialCode: string;
}

export const COUNTRIES_CATALOG: CountryOptionItem[] = [
  { id: 'CI', name: 'Côte d’Ivoire', flag: '🇨🇮', dialCode: '+225' },
  { id: 'SN', name: 'Sénégal', flag: '🇸🇳', dialCode: '+221' },
  { id: 'ML', name: 'Mali', flag: '🇲🇱', dialCode: '+223' },
  { id: 'BF', name: 'Burkina Faso', flag: '🇧🇫', dialCode: '+226' },
  { id: 'INT', name: 'Bénin', flag: '🇧🇯', dialCode: '+229' },
  { id: 'INT', name: 'Togo', flag: '🇹🇬', dialCode: '+228' },
  { id: 'INT', name: 'Cameroun', flag: '🇨🇲', dialCode: '+237' },
  { id: 'INT', name: 'Guinée', flag: '🇬🇳', dialCode: '+224' },
  { id: 'INT', name: 'Gabon', flag: '🇬🇦', dialCode: '+241' },
  { id: 'INT', name: 'Congo', flag: '🇨🇬', dialCode: '+242' },
  { id: 'INT', name: 'RDC', flag: '🇨🇩', dialCode: '+243' },
  { id: 'INT', name: 'Niger', flag: '🇳🇪', dialCode: '+227' },
  { id: 'INT', name: 'France', flag: '🇫🇷', dialCode: '+33' },
  { id: 'INT', name: 'États-Unis / Canada', flag: '🇺🇸', dialCode: '+1' },
  { id: 'INT', name: 'Royaume-Uni', flag: '🇬🇧', dialCode: '+44' },
  { id: 'INT', name: 'Autre pays / International', flag: '🌍', dialCode: '+' },
];

export const isValidRealEmail = (emailStr: string): boolean => {
  const email = emailStr.trim().toLowerCase();
  if (!email || email.length < 5 || email.length > 254) return false;
  const regex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;
  if (!regex.test(email)) return false;
  const parts = email.split('@');
  if (parts.length !== 2) return false;
  const domainParts = parts[1].split('.');
  if (domainParts.length < 2) return false;
  const tld = domainParts[domainParts.length - 1];
  if (!tld || tld.length < 2) return false;
  if (['test@test.com', 'a@a.com', 'test@example.com', 'fake@fake.com', 'mail@mail.com'].includes(email)) return false;
  return true;
};

export const isValidPhoneNumber = (phoneStr: string): boolean => {
  const digits = phoneStr.replace(/[^0-9]/g, '');
  return digits.length >= 8 && digits.length <= 15;
};

export const COUNTRY_DIAL_CODES = COUNTRIES_CATALOG.map((c) => ({
  code: c.dialCode,
  label: `${c.flag} ${c.name} (${c.dialCode})`,
}));

export const CheckoutModal: React.FC = () => {
  const { 
    checkoutEvent, 
    setCheckoutEvent, 
    currentUser, 
    showToast, 
    refreshCustomerOrders, 
    refreshEvents, 
    setCurrentPage, 
    addLocalOrder, 
    setIsAuthModalOpen,
    language,
    t 
  } = useApp();

  const [step, setStep] = useState<CheckoutStep>(1);

  // Étape 1 : Sélection des billets
  // Toutes les catégories démarrent à 0 : aucun ticket n'est pré-sélectionné automatiquement
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [expandedDetails, setExpandedDetails] = useState<Record<string, boolean>>({});

  const toggleDetails = (catId: string) => {
    setExpandedDetails((prev) => ({ ...prev, [catId]: !prev[catId] }));
  };

  // Étape 2 : Récapitulatif & Compte à rebours de sécurité (20 min)
  const [lockSeconds, setLockSeconds] = useState<number>(20 * 60);
  const [customerName, setCustomerName] = useState<string>(currentUser?.name || '');
  const [customerEmail, setCustomerEmail] = useState<string>(currentUser?.email || '');
  const [customerDialCode, setCustomerDialCode] = useState<string>('+225');
  // Aucun numéro fictif par défaut : les utilisateurs saisissent eux-mêmes leur numéro
  const [customerPhoneNumber, setCustomerPhoneNumber] = useState<string>('');

  // Étape 3 : Paiement
  const [country, setCountry] = useState<CountryOption>('CI');
  const [paymentMethod, setPaymentMethod] = useState<PaymentOption>('wave');
  const [paymentDialCode, setPaymentDialCode] = useState<string>('+225');
  // Aucun numéro fictif par défaut
  const [paymentPhoneNumber, setPaymentPhoneNumber] = useState<string>('');
  const [cardNumber, setCardNumber] = useState<string>('');
  const [cardExp, setCardExp] = useState<string>('');
  const [cardCvv, setCardCvv] = useState<string>('');
  const [isIdentityDrawerOpen, setIsIdentityDrawerOpen] = useState<boolean>(false);

  // Tiroir des pays & indicatifs téléphoniques
  const [isCountryDrawerOpen, setIsCountryDrawerOpen] = useState<boolean>(false);
  const [countryDrawerTarget, setCountryDrawerTarget] = useState<'customer' | 'payment'>('customer');
  const [countrySearchQuery, setCountrySearchQuery] = useState<string>('');

  const filteredCountries = COUNTRIES_CATALOG.filter((c) => {
    const q = countrySearchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      c.name.toLowerCase().includes(q) ||
      c.dialCode.toLowerCase().includes(q) ||
      c.id.toLowerCase().includes(q)
    );
  });

  const handleSelectCountry = (c: CountryOptionItem) => {
    if (countryDrawerTarget === 'customer') {
      setCustomerDialCode(c.dialCode);
    } else {
      setPaymentDialCode(c.dialCode);
      setCountry(c.id);
    }
    setIsCountryDrawerOpen(false);
  };

  // Étape 4 : Simulation passerelle & Résultat
  const [isSimulatingGateway, setIsSimulatingGateway] = useState<boolean>(false);
  const [gatewayProcessing, setGatewayProcessing] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [createdOrder, setCreatedOrder] = useState<Order | null>(null);
  const [issuedTickets, setIssuedTickets] = useState<Ticket[]>([]);
  const [showEmailPreview, setShowEmailPreview] = useState<boolean>(false);

  // Initialisation : Tous les compteurs à 0 (l'utilisateur choisit lui-même avec le bouton +)
  useEffect(() => {
    if (checkoutEvent && checkoutEvent.categories.length > 0) {
      const initial: Record<string, number> = {};
      checkoutEvent.categories.forEach((c) => {
        initial[c.id] = 0;
      });
      setQuantities(initial);
      setStep(1);
      setLockSeconds(20 * 60);
    }
  }, [checkoutEvent?.id]);

  // Sync user info
  useEffect(() => {
    if (currentUser) {
      if (!customerName) setCustomerName(currentUser.name || '');
      if (!customerEmail) setCustomerEmail(currentUser.email || '');
    }
  }, [currentUser]);

  // Compte à rebours de sécurité (20 min)
  useEffect(() => {
    if (!checkoutEvent || step === 4) return;
    const interval = setInterval(() => {
      setLockSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [checkoutEvent, step]);

  if (!checkoutEvent) return null;

  // Calculs financiers (aucun code promotionnel)
  const categories = checkoutEvent.categories || [];
  
  const totalQuantity = Object.values(quantities).reduce((acc, q) => acc + (q || 0), 0);

  const rawTotalAmount = categories.reduce((sum, cat) => {
    const q = quantities[cat.id] || 0;
    return sum + (cat.price * q);
  }, 0);

  const finalTotalAmount = rawTotalAmount;

  const formatCountdown = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handleQuantityChange = (catId: string, delta: number) => {
    setQuantities((prev) => {
      const current = prev[catId] || 0;
      const updated = Math.max(0, current + delta);
      // Max 8 tickets total per order to comply with security anti-scalping
      const otherTotal = Object.entries(prev)
        .filter(([id]) => id !== catId)
        .reduce((sum, [, q]) => sum + q, 0);

      if (delta > 0 && otherTotal + updated > 8) {
        showToast(language === 'en' ? 'Maximum 8 tickets per transaction.' : 'Maximum 8 billets par commande.', 'error');
        return prev;
      }

      const cat = categories.find((c) => c.id === catId);
      if (cat && delta > 0) {
        const remaining = Math.max(0, cat.quota - cat.sold);
        if (updated > remaining) {
          showToast(language === 'en' ? 'Stock limit reached for this tier.' : 'Stock maximum atteint pour cette catégorie.', 'error');
          return prev;
        }
      }

      return { ...prev, [catId]: updated };
    });
  };

  const handleProceedToSummary = () => {
    if (totalQuantity === 0) {
      showToast(language === 'en' ? 'Please select at least 1 ticket.' : 'Veuillez sélectionner au moins 1 billet.', 'error');
      return;
    }
    setStep(2);
  };

  const handleProceedToPayment = () => {
    if (!customerName.trim()) {
      showToast('Veuillez renseigner votre nom complet.', 'error');
      return;
    }
    const cleanEmail = customerEmail.trim();
    if (!cleanEmail) {
      showToast('L\'adresse e-mail est obligatoire pour recevoir vos billets.', 'error');
      return;
    }
    if (!isValidRealEmail(cleanEmail)) {
      showToast('Veuillez saisir une adresse e-mail réelle et valide (ex : nom@domaine.com).', 'error');
      return;
    }
    const cleanPhone = customerPhoneNumber.trim();
    if (!cleanPhone) {
      showToast('Le numéro de téléphone est obligatoire.', 'error');
      return;
    }
    if (!isValidPhoneNumber(cleanPhone)) {
      showToast('Veuillez saisir un numéro de téléphone valide (au moins 8 chiffres).', 'error');
      return;
    }

    // Synchronisation automatique vers le champ de paiement s'il est vide
    if (!paymentPhoneNumber.trim()) {
      setPaymentPhoneNumber(cleanPhone);
      setPaymentDialCode(customerDialCode);
    }

    setStep(3);
  };

  const handleTriggerPayment = () => {
    if (paymentMethod !== 'card') {
      const pPhone = paymentPhoneNumber.trim();
      if (!pPhone) {
        showToast('Veuillez saisir votre numéro pour le paiement mobile money.', 'error');
        return;
      }
      if (!isValidPhoneNumber(pPhone)) {
        showToast('Veuillez saisir un numéro de téléphone valide pour le paiement.', 'error');
        return;
      }
    } else {
      const cleanCard = cardNumber.replace(/\s+/g, '');
      if (!cleanCard || cleanCard.length < 15) {
        showToast('Veuillez saisir un numéro de carte bancaire valide (au moins 15 chiffres).', 'error');
        return;
      }
      if (!cardExp.trim() || !cardExp.includes('/')) {
        showToast('Veuillez renseigner la date d\'expiration de votre carte (MM/AA).', 'error');
        return;
      }
      if (!cardCvv.trim() || cardCvv.length < 3) {
        showToast('Veuillez renseigner le code CVV à 3 chiffres.', 'error');
        return;
      }
    }

    // Étape 4 : simulation redirection vers passerelle tierce (Wave / Mobile Money)
    setIsSimulatingGateway(true);
    setStep(4);
  };

  const handleApproveGatewaySimulation = async () => {
    setGatewayProcessing(true);
    setIsSubmitting(true);

    try {
      let order: Order | null = null;
      let tickets: Ticket[] = [];
      const customerFullPhone = `${customerDialCode} ${customerPhoneNumber}`.trim();

      // Essai de confirmation API côté serveur
      try {
        const primaryCat = categories.find((c) => (quantities[c.id] || 0) > 0) || categories[0];
        const res = await fetch('/api/orders/checkout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            customerId: currentUser?.id || 'guest',
            customerName,
            customerEmail,
            customerPhone: customerFullPhone,
            eventId: checkoutEvent.id,
            categoryId: primaryCat.id,
            quantity: totalQuantity,
          }),
        });

        if (res.ok) {
          const data = await res.json();
          if (data.success && data.order) {
            order = data.order;
            const payRes = await fetch(`/api/orders/${data.order.id}/pay-sandbox`, { method: 'POST' });
            if (payRes.ok) {
              const payData = await payRes.json();
              if (payData.success && payData.tickets) {
                tickets = payData.tickets;
              }
            }
          }
        }
      } catch (err) {
        console.warn('Backend unavailable, generating client fallback order', err);
      }

      // Si le backend direct n'est pas actif (ex: déploiement statique), émettre les billets certifiés client-side
      if (!tickets || tickets.length === 0 || !order) {
        const orderId = `ord_${Date.now()}`;
        const orderRef = `LMR-${Math.floor(1000 + Math.random() * 9000)}`;
        const generatedTickets: Ticket[] = [];

        let tIndex = 1;
        for (const cat of categories) {
          const count = quantities[cat.id] || 0;
          for (let i = 0; i < count; i++) {
            generatedTickets.push({
              id: `tkt_${Date.now()}_${tIndex}`,
              orderId,
              orderRef,
              eventId: checkoutEvent.id,
              eventTitle: checkoutEvent.title,
              eventDate: checkoutEvent.date,
              eventTime: checkoutEvent.time,
              eventVenue: checkoutEvent.venue,
              categoryId: cat.id,
              categoryName: cat.name,
              serialNumber: `LR-2026-${checkoutEvent.artist.substring(0, 3).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`,
              token: `LUMAREEL:TKT:LR-2026-${Math.random().toString(36).substring(2, 9).toUpperCase()}`,
              holderName: `${customerName}${totalQuantity > 1 ? ` (${tIndex}/${totalQuantity})` : ''}`,
              holderEmail: customerEmail,
              status: 'valid',
              issuedAt: new Date().toISOString(),
            });
            tIndex++;
          }
        }

        tickets = generatedTickets;

        const primaryCat = categories.find((c) => (quantities[c.id] || 0) > 0) || categories[0];
        order = {
          id: orderId,
          reference: orderRef,
          customerId: currentUser?.id || 'guest',
          customerName,
          customerEmail,
          customerPhone: customerFullPhone,
          eventId: checkoutEvent.id,
          eventTitle: checkoutEvent.title,
          eventDate: checkoutEvent.date,
          eventVenue: checkoutEvent.venue,
          categoryId: primaryCat.id,
          categoryName: primaryCat.name,
          quantity: totalQuantity,
          unitPrice: primaryCat.price,
          totalAmount: finalTotalAmount,
          currency: 'FCFA',
          paymentStatus: 'completed',
          paymentProvider: paymentMethod,
          paymentRef: `${paymentMethod.toUpperCase()}_${Date.now()}`,
          createdAt: new Date().toISOString(),
          paidAt: new Date().toISOString(),
          tickets: generatedTickets,
        };
      }

      // Finalisation et enregistrement
      if (order) {
        setCreatedOrder(order);
        setIssuedTickets(tickets);
        addLocalOrder(order);
        setIsSimulatingGateway(false);
        showToast(language === 'en' ? 'Payment confirmed! Tickets successfully issued.' : 'Paiement confirmé avec succès ! Vos billets certifiés sont émis.', 'success');
        refreshEvents();
        refreshCustomerOrders();
      }
    } catch (err: any) {
      showToast(err.message || 'Une erreur inattendue est survenue.', 'error');
    } finally {
      setGatewayProcessing(false);
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setCheckoutEvent(null);
    setCreatedOrder(null);
    setIssuedTickets([]);
    setStep(1);
    setIsSimulatingGateway(false);
  };

  const handleStepBack = () => {
    if (step === 1) {
      handleClose();
    } else if (step === 2) {
      setStep(1);
    } else if (step === 3) {
      setStep(2);
    } else if (step === 4) {
      if (isSimulatingGateway) {
        setIsSimulatingGateway(false);
        setStep(3);
      } else {
        handleClose();
      }
    }
  };

  const handleGoToCustomerTickets = () => {
    handleClose();
    setCurrentPage('client_space');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4 bg-black/90 backdrop-blur-md overflow-hidden">
      <div className="relative w-full max-w-2xl bg-black border-0 sm:border border-white/15 sm:rounded-3xl shadow-2xl text-white h-[100dvh] sm:h-auto sm:max-h-[90vh] my-0 sm:my-6 flex flex-col font-agrandir-regular overflow-hidden">
        
        {/* ========================================================================= */}
        {/* TOP HEADER & STEPPER PROGRESS BAR */}
        {/* ========================================================================= */}
        <div className="shrink-0 p-4 sm:p-5 border-b border-white/10 bg-[#080808] sm:rounded-t-3xl z-20">
          <div className="flex items-center justify-between gap-4 mb-4">
            <button
              type="button"
              onClick={handleStepBack}
              className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 text-xs font-agrandir-bold tracking-wider text-white hover:border-white transition-all uppercase cursor-pointer backdrop-blur-md active:scale-95 shadow-md group"
              title={step === 1 ? 'Retourner au concert' : 'Étape précédente'}
            >
              <ArrowLeft className="w-4 h-4 text-[#d4af37] group-hover:-translate-x-0.5 transition-transform" />
              <span>RETOUR</span>
            </button>

            <div className="flex items-center gap-2.5">
              <img
                src="/assets/logo-lumareel.png"
                alt="LUMARÉEL CO."
                className="h-5 sm:h-6 w-auto object-contain"
              />
            </div>

            <button
              type="button"
              onClick={handleClose}
              className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 flex items-center justify-center text-neutral-300 hover:text-white hover:border-white transition-all cursor-pointer active:scale-95 shadow-md"
              aria-label="Fermer"
              title="Fermer la billetterie"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Stepper (4 Étapes) */}
          <div className="grid grid-cols-4 gap-2 text-center text-[10px] font-agrandir-semibold uppercase tracking-wider">
            {[
              { num: 1, label: t('checkout.step1') },
              { num: 2, label: t('checkout.step2') },
              { num: 3, label: t('checkout.step3') },
              { num: 4, label: t('checkout.step4') },
            ].map((s) => {
              const isActive = step === s.num;
              const isDone = step > s.num;
              return (
                <div key={s.num} className="space-y-1.5">
                  <div className="flex items-center gap-1.5 justify-center">
                    <span
                      className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold transition-all ${
                        isActive
                          ? 'bg-white text-black shadow-md shadow-white/20'
                          : isDone
                          ? 'bg-[#d4af37] text-black'
                          : 'bg-white/10 text-[#666]'
                      }`}
                    >
                      {isDone ? '✓' : s.num}
                    </span>
                    <span className={`hidden sm:inline ${isActive ? 'text-white' : isDone ? 'text-[#d4af37]' : 'text-[#666]'}`}>
                      {s.label}
                    </span>
                  </div>
                  <div
                    className={`h-1 w-full rounded-full transition-all ${
                      isActive ? 'bg-white' : isDone ? 'bg-[#d4af37]' : 'bg-white/10'
                    }`}
                  />
                </div>
              );
            })}
          </div>
        </div>

        {/* ========================================================================= */}
        {/* CORPS PRINCIPAL DU TUNNEL EN 4 ÉTAPES */}
        {/* ========================================================================= */}
        <div className="p-4 sm:p-6 flex-1 overflow-y-auto overscroll-contain min-h-0 focus:outline-none">

          {/* ===================================================================== */}
          {/* ÉTAPE 1 : SÉLECTION DES BILLETS */}
          {/* ===================================================================== */}
          {step === 1 && (
            <div className="space-y-6">
              {/* Bouton de retour vers la programmation */}
              <div className="flex items-center justify-between pb-3 border-b border-white/10">
                <button
                  type="button"
                  onClick={handleClose}
                  className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/5 hover:bg-white/15 border border-white/15 text-xs font-agrandir-bold tracking-wider text-neutral-200 hover:text-white transition-all uppercase cursor-pointer active:scale-95 group"
                >
                  <ArrowLeft className="w-3.5 h-3.5 text-[#d4af37] group-hover:-translate-x-1 transition-transform" />
                  <span>RETOUR AU CONCERT</span>
                </button>
                <span className="text-[11px] font-agrandir-semibold text-[#888] uppercase tracking-wider font-mono">
                  Étape 1 sur 4
                </span>
              </div>

              {/* Event Mini-Hero Card */}
              <div className="flex items-center gap-4 p-4 rounded-2xl bg-[#0c0c0c] border border-white/10">
                <img
                  src={checkoutEvent.artistPortrait || checkoutEvent.officialPoster || checkoutEvent.bannerImage}
                  alt={checkoutEvent.artist}
                  className="w-16 h-16 sm:w-20 sm:h-20 object-cover rounded-xl shrink-0 border border-white/10"
                />
                <div className="min-w-0 flex-1">
                  <div className="text-[10px] font-agrandir-bold tracking-widest text-[#d4af37] uppercase mb-0.5">
                    {checkoutEvent.artist}
                  </div>
                  <h2 className="font-agrandir-extrabold text-base sm:text-lg text-white truncate uppercase">
                    {checkoutEvent.title}
                  </h2>
                  <div className="text-xs text-[#888] mt-1 flex flex-wrap items-center gap-2 font-agrandir-regular">
                    <span>{formatDateLong(checkoutEvent.date, language)}</span>
                    <span>·</span>
                    <span>{checkoutEvent.time}</span>
                    <span>·</span>
                    <span className="text-[#aaa]">{checkoutEvent.venue}</span>
                  </div>
                </div>
              </div>

              {/* Catégories Tarifaires avec Gestion de Stock */}
              <div className="space-y-3">
                <div className="text-[11px] font-agrandir-bold tracking-wider text-[#aaa] uppercase">
                  {t('checkout.step1Title')}
                </div>

                {categories.map((cat: TicketCategory) => {
                  const remaining = Math.max(0, cat.quota - cat.sold);
                  const isSoldOut = remaining <= 0;
                  const currentQty = quantities[cat.id] || 0;
                  const isExpanded = !!expandedDetails[cat.id];
                  
                  // Ligne 3 : gérée depuis l'administration. Si vide, elle ne s'affiche pas
                  const hasDetails = Boolean(
                    (cat.description && cat.description.trim() !== '') || 
                    (cat.perks && cat.perks.length > 0)
                  );

                  // Calculs statistiques réels
                  const fillPercent = cat.quota > 0 ? Math.round((cat.sold / cat.quota) * 100) : 0;
                  const isExclusiveCapacity = cat.quota <= 50;

                  // Badges personnalisés LUMARÉEL basés sur les statistiques réelles
                  const renderStatBadge = () => {
                    if (isSoldOut) {
                      return (
                        <span className="px-3 py-1 rounded-full bg-[#181818] text-[#888] border border-white/10 text-[10px] font-agrandir-bold uppercase tracking-wider flex items-center gap-1.5 shadow-sm">
                          <span className="w-1.5 h-1.5 rounded-full bg-neutral-500" />
                          <span>Guichet fermé · Épuisé</span>
                        </span>
                      );
                    }

                    // Statistique 1 : Moins de 10 places ou moins de 10% du quota restant => Risque de rupture
                    if (remaining <= 10 || (cat.quota > 0 && remaining / cat.quota <= 0.1)) {
                      return (
                        <span className="px-3 py-1 rounded-full bg-rose-950/60 border border-rose-500/40 text-rose-300 text-[10px] font-agrandir-bold uppercase tracking-wider flex items-center gap-1.5 shadow-sm backdrop-blur-md">
                          <span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-ping" />
                          <span>Risque de rupture · {remaining} restant{remaining > 1 ? 's' : ''}</span>
                        </span>
                      );
                    }

                    // Statistique 2 : Taux de remplissage élevé (>= 60% vendus) => Forte demande
                    if (fillPercent >= 60) {
                      return (
                        <span className="px-3 py-1 rounded-full bg-amber-950/50 border border-amber-500/40 text-amber-300 text-[10px] font-agrandir-bold uppercase tracking-wider flex items-center gap-1.5 shadow-sm backdrop-blur-md">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                          <span>Forte demande · {fillPercent}% réservé</span>
                        </span>
                      );
                    }

                    // Statistique 3 : Jauge exclusive (<= 50 places totales allouées) => Places limitées
                    if (isExclusiveCapacity) {
                      return (
                        <span className="px-3 py-1 rounded-full bg-[#d4af37]/15 border border-[#d4af37]/40 text-[#d4af37] text-[10px] font-agrandir-bold uppercase tracking-wider flex items-center gap-1.5 shadow-sm backdrop-blur-md">
                          <Sparkles className="w-3 h-3 text-[#d4af37]" />
                          <span>Places limitées · Jauge {cat.quota}</span>
                        </span>
                      );
                    }

                    // Disponibilité standard
                    return (
                      <span className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-neutral-400 text-[10px] font-agrandir-semibold uppercase tracking-wider flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                        <span>Disponible</span>
                      </span>
                    );
                  };

                  return (
                    <div
                      key={cat.id}
                      className={`p-4 sm:p-5 rounded-2xl sm:rounded-3xl border transition-all duration-300 ${
                        currentQty > 0
                          ? 'bg-[#121212] border-white/40 ring-1 ring-white/20 shadow-xl'
                          : isSoldOut
                          ? 'bg-[#080808] border-white/5 opacity-50'
                          : 'bg-[#0d0d0d] border-white/10 hover:border-white/25 shadow-md'
                      }`}
                    >
                      {/* LIGNE 1 : NOM DU BILLET (Gauche) & BADGE STATISTIQUE (Droite) */}
                      <div className="flex items-center justify-between gap-3 mb-3">
                        <h3 className="font-agrandir-extrabold text-sm sm:text-base text-white tracking-wide uppercase truncate">
                          {cat.name}
                        </h3>
                        <div className="shrink-0">
                          {renderStatBadge()}
                        </div>
                      </div>

                      {/* LIGNE 2 : PRIX DU BILLET (Gauche) & SÉLECTEUR STEPPER PILULE (Droite) */}
                      <div className="flex items-center justify-between gap-4">
                        <div className="font-agrandir-extrabold text-base sm:text-xl text-white font-mono tracking-tight">
                          {cat.price.toLocaleString('fr-FR')} F CFA
                        </div>

                        {/* Stepper capsule pilule */}
                        <div className="flex items-center bg-[#171717] border border-white/15 rounded-full px-1.5 py-1 shadow-inner gap-2 sm:gap-3 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleQuantityChange(cat.id, -1)}
                            disabled={currentQty === 0 || isSoldOut}
                            className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-white/10 hover:bg-white/20 active:scale-90 text-white disabled:opacity-20 disabled:hover:bg-white/10 disabled:cursor-not-allowed flex items-center justify-center font-bold text-sm sm:text-base transition-all cursor-pointer"
                            aria-label={`Diminuer la quantité pour ${cat.name}`}
                          >
                            −
                          </button>
                          <span className="w-6 sm:w-7 text-center font-agrandir-extrabold font-mono text-sm sm:text-base text-white select-none">
                            {currentQty}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleQuantityChange(cat.id, 1)}
                            disabled={isSoldOut || (currentQty >= remaining)}
                            className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-white/10 hover:bg-white/20 active:scale-90 text-white disabled:opacity-20 disabled:hover:bg-white/10 disabled:cursor-not-allowed flex items-center justify-center font-bold text-sm sm:text-base transition-all cursor-pointer"
                            aria-label={`Augmenter la quantité pour ${cat.name}`}
                          >
                            +
                          </button>
                        </div>
                      </div>

                      {/* LIGNE 3 : CONDITIONNELLE - UNIQUEMENT SI GÉRÉE DANS L'ADMINISTRATION */}
                      {hasDetails && (
                        <div className="mt-3 pt-2.5 border-t border-white/5">
                          <button
                            type="button"
                            onClick={() => toggleDetails(cat.id)}
                            className="w-full flex items-center justify-between text-left text-xs font-agrandir-semibold text-[#d4af37] hover:text-white transition-colors cursor-pointer group"
                          >
                            <span className="flex items-center gap-1.5">
                              <span>Détails &amp; Avantages</span>
                              {isExpanded ? (
                                <ChevronUp className="w-3.5 h-3.5" />
                              ) : (
                                <ChevronDown className="w-3.5 h-3.5" />
                              )}
                            </span>
                            {cat.perks && cat.perks.length > 0 && (
                              <span className="text-[10px] text-[#888] font-normal">
                                {cat.perks.length} avantage{cat.perks.length > 1 ? 's' : ''} inclus
                              </span>
                            )}
                          </button>

                          {/* Panneau déroulant des détails et avantages */}
                          {isExpanded && (
                            <div className="mt-2.5 p-3.5 rounded-xl bg-black/60 border border-white/10 text-xs text-neutral-300 space-y-2 animate-fadeIn">
                              {cat.description && (
                                <p className="text-[#aaa] leading-relaxed font-agrandir-regular">
                                  {cat.description}
                                </p>
                              )}
                              {cat.perks && cat.perks.length > 0 && (
                                <div className="flex flex-wrap gap-2 pt-1">
                                  {cat.perks.map((perk, pIdx) => (
                                    <span
                                      key={pIdx}
                                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-[11px] text-[#ddd]"
                                    >
                                      <Check className="w-3 h-3 text-[#d4af37]" />
                                      <span>{perk}</span>
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ===================================================================== */}
          {/* ÉTAPE 2 : RÉCAPITULATIF & COMPTE À REBOURS DE SÉCURITÉ */}
          {/* ===================================================================== */}
          {step === 2 && (
            <div className="space-y-6">
              {/* Bouton de retour vers l'étape 1 */}
              <div className="flex items-center justify-between pb-3 border-b border-white/10">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/5 hover:bg-white/15 border border-white/15 text-xs font-agrandir-bold tracking-wider text-neutral-200 hover:text-white transition-all uppercase cursor-pointer active:scale-95 group"
                >
                  <ArrowLeft className="w-3.5 h-3.5 text-[#d4af37] group-hover:-translate-x-1 transition-transform" />
                  <span>RETOUR AU CHOIX DES BILLETS</span>
                </button>
                <span className="text-[11px] font-agrandir-semibold text-[#888] uppercase tracking-wider font-mono">
                  Étape 2 sur 4
                </span>
              </div>

              {/* Bannière Compte à Rebours de Sécurité (20 min) */}
              <div className="p-4 rounded-2xl bg-[#d4af37]/10 border border-[#d4af37]/30 flex items-center gap-3 text-xs text-[#d4af37] shadow-lg">
                <Clock className="w-5 h-5 shrink-0 animate-pulse" />
                <div className="flex-1 min-w-0">
                  <div className="font-agrandir-bold uppercase tracking-wider text-[11px]">
                    Places réservées pendant <span className="font-mono text-white text-sm font-bold">{formatCountdown(lockSeconds)}</span>
                  </div>
                  <div className="text-[11px] text-[#ccc]">
                    Vos billets sont temporairement verrouillés pour finaliser votre commande.
                  </div>
                </div>
              </div>

              {/* Carte de Résumé des Choix */}
              <div className="p-5 rounded-2xl bg-[#0c0c0c] border border-white/10 space-y-4">
                <div className="text-[10px] font-agrandir-bold tracking-widest text-[#888] uppercase border-b border-white/10 pb-2">
                  Détail de votre réservation
                </div>

                <div className="space-y-2 text-xs">
                  <div className="flex justify-between items-center text-white">
                    <span className="text-[#888]">Événement :</span>
                    <strong className="font-agrandir-bold">{checkoutEvent.artist} — {checkoutEvent.title}</strong>
                  </div>
                  <div className="flex justify-between items-center text-white">
                    <span className="text-[#888]">Date &amp; Lieu :</span>
                    <span>{formatDateLong(checkoutEvent.date, language)} ({checkoutEvent.venue})</span>
                  </div>

                  <div className="border-t border-white/5 pt-2 space-y-1.5">
                    {categories
                      .filter((c) => (quantities[c.id] || 0) > 0)
                      .map((cat) => {
                        const q = quantities[cat.id];
                        const sub = cat.price * q;
                        return (
                          <div key={cat.id} className="flex justify-between items-center text-[#ddd]">
                            <span>{cat.name} <span className="text-[#888]">× {q}</span></span>
                            <span className="font-mono">{sub.toLocaleString('fr-FR')} FCFA</span>
                          </div>
                        );
                      })}
                  </div>

                  <div className="flex justify-between items-center text-white pt-2 border-t border-white/10 text-sm">
                    <strong className="font-agrandir-extrabold uppercase">Total</strong>
                    <strong className="font-mono text-[#d4af37] text-base">{finalTotalAmount.toLocaleString('fr-FR')} FCFA</strong>
                  </div>
                </div>
              </div>

              {/* Formulaire Coordonnées de l'Acheteur */}
              <div className="p-5 rounded-2xl bg-[#0c0c0c] border border-white/10 space-y-4">
                <div className="text-[10px] font-agrandir-bold tracking-widest text-[#888] uppercase">
                  {t('checkout.customerDetails')} (Billetterie nominative)
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="block text-[10px] uppercase text-[#888] mb-1 font-agrandir-semibold">
                      {t('checkout.fullName')} *
                    </label>
                    <input
                      type="text"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      placeholder="Ex : Dylan Bienao"
                      required
                      className="w-full bg-[#141414] border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white placeholder-[#555] focus:outline-none focus:border-white font-agrandir-regular"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] uppercase text-[#888] mb-1 font-agrandir-semibold">
                        {t('checkout.email')} *
                      </label>
                      <input
                        type="email"
                        value={customerEmail}
                        onChange={(e) => setCustomerEmail(e.target.value)}
                        placeholder="nom@exemple.com"
                        required
                        className="w-full bg-[#141414] border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white placeholder-[#555] focus:outline-none focus:border-white font-agrandir-regular"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] uppercase text-[#888] mb-1 font-agrandir-semibold">
                        {t('checkout.phone')} *
                      </label>
                      <div className="flex gap-2">
                        {/* Case indicatif : UNIQUEMENT l'indicatif sans le nom du pays, clic ouvre le tiroir */}
                        <button
                          type="button"
                          onClick={() => {
                            setCountryDrawerTarget('customer');
                            setCountrySearchQuery('');
                            setIsCountryDrawerOpen(true);
                          }}
                          className="bg-[#141414] hover:bg-[#1a1a1a] active:scale-95 border border-white/10 hover:border-white/30 rounded-xl px-3 py-2.5 text-xs text-white font-mono flex items-center gap-1.5 cursor-pointer transition-all shrink-0 shadow-sm"
                          title="Sélectionner le pays / indicatif"
                        >
                          <span className="font-mono font-bold text-white text-xs">{customerDialCode}</span>
                          <ChevronDown className="w-3.5 h-3.5 text-[#888]" />
                        </button>
                        <input
                          type="tel"
                          value={customerPhoneNumber}
                          onChange={(e) => setCustomerPhoneNumber(e.target.value)}
                          placeholder="07 00 00 00 00"
                          required
                          className="flex-1 min-w-0 bg-[#141414] border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white placeholder-[#555] focus:outline-none focus:border-white font-mono"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ===================================================================== */}
          {/* ÉTAPE 3 : PAIEMENT (2 SECTIONS DISTINCTES SUR LA MÊME PAGE) */}
          {/* ===================================================================== */}
          {step === 3 && (
            <div className="space-y-6">
              {/* Bouton de retour vers le récapitulatif */}
              <div className="flex items-center justify-between pb-3 border-b border-white/10">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/5 hover:bg-white/15 border border-white/15 text-xs font-agrandir-bold tracking-wider text-neutral-200 hover:text-white transition-all uppercase cursor-pointer active:scale-95 group"
                >
                  <ArrowLeft className="w-3.5 h-3.5 text-[#d4af37] group-hover:-translate-x-1 transition-transform" />
                  <span>RETOUR AU RÉCAPITULATIF</span>
                </button>
                <span className="text-[11px] font-agrandir-semibold text-[#888] uppercase tracking-wider font-mono">
                  Étape 3 sur 4
                </span>
              </div>

              {/* ----------------------------------------------------------------- */}
              {/* SECTION 1 : MOYEN DE PAIEMENT */}
              {/* ----------------------------------------------------------------- */}
              <div className="p-5 sm:p-6 rounded-3xl bg-[#0c0c0c] border border-white/10 space-y-4 shadow-xl">
                <div className="flex items-center justify-between border-b border-white/10 pb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-xl bg-white/10 border border-white/15 flex items-center justify-center text-sm shadow-inner">
                      💳
                    </div>
                    <div>
                      <h4 className="text-xs font-agrandir-extrabold text-white uppercase tracking-wider">
                        1. Moyen de paiement
                      </h4>
                      <p className="text-[11px] text-[#777] font-agrandir-regular">
                        Choisissez votre opérateur mobile money ou carte bancaire
                      </p>
                    </div>
                  </div>
                  <span className="text-[10px] text-[#d4af37] font-agrandir-semibold uppercase tracking-wider bg-[#d4af37]/10 px-2.5 py-1 rounded-full border border-[#d4af37]/30">
                    Sécurisé
                  </span>
                </div>

                {/* Grille de sélection des moyens de paiement */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  {[
                    { id: 'wave', label: 'Wave', desc: 'Sénégal & Côte d’Ivoire', icon: '🌊', color: 'border-[#1DC3F2]/40 bg-[#1b263b]/30 hover:border-[#1DC3F2]' },
                    { id: 'orange_money', label: 'Orange Money', desc: 'Afrique de l’Ouest', icon: '🟠', color: 'border-[#FF7900]/40 bg-[#2a1b12]/30 hover:border-[#FF7900]' },
                    { id: 'mtn_momo', label: 'MTN MoMo', desc: 'CI, Bénin, Cameroun...', icon: '🟡', color: 'border-[#FFCC00]/40 bg-[#2a2812]/30 hover:border-[#FFCC00]' },
                    { id: 'djamo', label: 'Djamo', desc: 'Visa & Portefeuille', icon: '🟣', color: 'border-[#6366F1]/40 bg-[#1e1b38]/30 hover:border-[#6366F1]' },
                    { id: 'moov_money', label: 'Moov Money', desc: 'Flooz & Moov', icon: '🔵', color: 'border-[#004F9F]/40 bg-[#1b2238]/30 hover:border-[#004F9F]' },
                    { id: 'card', label: 'Carte Bancaire', desc: 'Visa / Mastercard', icon: '💳', color: 'border-white/40 bg-white/10 hover:border-white' },
                  ].map((op) => {
                    const isSelected = paymentMethod === op.id;
                    return (
                      <button
                        key={op.id}
                        type="button"
                        onClick={() => setPaymentMethod(op.id as PaymentOption)}
                        className={`p-3 sm:p-3.5 rounded-2xl border text-left transition-all cursor-pointer relative ${
                          isSelected 
                            ? 'border-[#d4af37] ring-1 ring-[#d4af37]/50 shadow-[0_0_20px_rgba(212,175,55,0.2)] bg-[#181818]' 
                            : 'bg-[#121212] border-white/10 hover:border-white/25 text-[#999]'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xl">{op.icon}</span>
                          {isSelected && <Check className="w-4 h-4 text-[#d4af37]" />}
                        </div>
                        <div className={`font-agrandir-bold text-xs uppercase ${isSelected ? 'text-white' : 'text-neutral-300'}`}>
                          {op.label}
                        </div>
                        <div className="text-[10px] text-[#777] font-agrandir-regular truncate mt-0.5">
                          {op.desc}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* ----------------------------------------------------------------- */}
              {/* SECTION 2 : SÉLECTEUR D'IDENTIFICATION & NUMÉRO */}
              {/* ----------------------------------------------------------------- */}
              <div className="p-5 sm:p-6 rounded-3xl bg-[#0c0c0c] border border-white/10 space-y-4 shadow-xl">
                <div className="flex items-center justify-between border-b border-white/10 pb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-xl bg-white/10 border border-white/15 flex items-center justify-center text-sm shadow-inner">
                      🌍
                    </div>
                    <div>
                      <h4 className="text-xs font-agrandir-extrabold text-white uppercase tracking-wider">
                        2. Sélecteur d'identification
                      </h4>
                      <p className="text-[11px] text-[#777] font-agrandir-regular">
                        Identifiez votre pays et saisissez votre numéro personnel
                      </p>
                    </div>
                  </div>
                </div>

                {/* Le Sélecteur d'identification en menu déroulant */}
                <div>
                  <label className="block text-[10px] uppercase text-[#888] mb-1.5 font-agrandir-semibold">
                    Pays d'identification (Menu déroulant)
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setCountryDrawerTarget('payment');
                      setCountrySearchQuery('');
                      setIsCountryDrawerOpen(true);
                    }}
                    className="w-full p-3.5 bg-[#141414] hover:bg-[#1a1a1a] active:scale-[0.99] border border-white/15 hover:border-white/30 rounded-2xl flex items-center justify-between transition-all cursor-pointer text-left shadow-md group"
                    title="Ouvrir la liste complète des pays"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="text-2xl shrink-0">
                        {COUNTRIES_CATALOG.find((c) => c.dialCode === paymentDialCode)?.flag || '🇨🇮'}
                      </span>
                      <div className="min-w-0">
                        <div className="font-agrandir-bold text-xs text-white uppercase truncate group-hover:text-[#d4af37] transition-colors">
                          {COUNTRIES_CATALOG.find((c) => c.dialCode === paymentDialCode)?.name || 'Côte d’Ivoire'}
                        </div>
                        <div className="text-[10px] text-[#888] font-mono mt-0.5">
                          Indicatif téléphonique : <strong className="text-[#d4af37] font-bold">{paymentDialCode}</strong>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-neutral-400 shrink-0 ml-2">
                      <span className="text-[10px] font-agrandir-semibold uppercase text-[#d4af37] bg-white/5 px-2.5 py-1 rounded-lg border border-white/10">
                        Choisir le pays
                      </span>
                      <ChevronDown className="w-4 h-4 text-[#d4af37] group-hover:translate-y-0.5 transition-transform" />
                    </div>
                  </button>
                </div>

                {/* Saisie du numéro d'identification juste en dessous */}
                {paymentMethod !== 'card' ? (
                  <div>
                    <label className="block text-[10px] uppercase text-[#888] mb-1.5 font-agrandir-semibold">
                      Numéro de téléphone ({paymentMethod === 'wave' ? 'Wave' : paymentMethod === 'orange_money' ? 'Orange Money' : paymentMethod === 'mtn_momo' ? 'MTN MoMo' : paymentMethod === 'djamo' ? 'Djamo' : 'Mobile Money'}) *
                    </label>
                    <div className="flex gap-2">
                      {/* Case indicatif : UNIQUEMENT l'indicatif sans le nom du pays */}
                      <button
                        type="button"
                        onClick={() => {
                          setCountryDrawerTarget('payment');
                          setCountrySearchQuery('');
                          setIsCountryDrawerOpen(true);
                        }}
                        className="bg-[#141414] hover:bg-[#1a1a1a] active:scale-95 border border-white/15 hover:border-white/30 rounded-2xl px-3.5 py-3 text-xs sm:text-sm text-white font-mono flex items-center gap-1.5 cursor-pointer transition-all shrink-0 shadow-sm"
                        title="Sélectionner le pays / indicatif"
                      >
                        <span className="font-mono font-bold text-white text-xs sm:text-sm">{paymentDialCode}</span>
                        <ChevronDown className="w-3.5 h-3.5 text-[#888]" />
                      </button>
                      <div className="relative flex-1 min-w-0">
                        <Smartphone className="w-4 h-4 text-[#888] absolute left-3.5 top-1/2 -translate-y-1/2" />
                        <input
                          type="tel"
                          value={paymentPhoneNumber}
                          onChange={(e) => setPaymentPhoneNumber(e.target.value)}
                          placeholder="Ex : 07 00 00 00 00"
                          required
                          className="w-full bg-[#141414] border border-white/15 rounded-2xl pl-10 pr-4 py-3 text-sm text-white font-mono placeholder-[#555] focus:outline-none focus:border-white"
                        />
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div>
                      <label className="block text-[10px] uppercase text-[#888] mb-1.5 font-agrandir-semibold">
                        Numéro de carte bancaire *
                      </label>
                      <input
                        type="text"
                        value={cardNumber}
                        onChange={(e) => setCardNumber(e.target.value)}
                        placeholder="Ex : 4000 1234 5678 9010"
                        className="w-full bg-[#141414] border border-white/15 rounded-2xl px-4 py-3 text-sm text-white font-mono placeholder-[#555] focus:outline-none focus:border-white"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] uppercase text-[#888] mb-1 font-agrandir-semibold">
                          Expiration (MM/AA) *
                        </label>
                        <input
                          type="text"
                          value={cardExp}
                          onChange={(e) => setCardExp(e.target.value)}
                          placeholder="MM/AA"
                          maxLength={5}
                          className="w-full bg-[#141414] border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white font-mono placeholder-[#555] focus:outline-none focus:border-white"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] uppercase text-[#888] mb-1 font-agrandir-semibold">
                          CVV (3 chiffres) *
                        </label>
                        <input
                          type="password"
                          value={cardCvv}
                          onChange={(e) => setCardCvv(e.target.value)}
                          maxLength={4}
                          placeholder="•••"
                          className="w-full bg-[#141414] border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white font-mono placeholder-[#555] focus:outline-none focus:border-white"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ===================================================================== */}
          {/* ÉTAPE 4 : CONFIRMATION DU PAIEMENT */}
          {/* ===================================================================== */}
          {step === 4 && (
            <div>
              {/* INTERFACE DE CONFIRMATION DU PAIEMENT (WAVE / MOBILE MONEY) */}
              {isSimulatingGateway && (
                <div className="py-4 space-y-6 text-center animate-fadeIn">
                  <div className="p-6 rounded-3xl bg-[#0f172a] border border-[#1DC3F2]/40 text-white max-w-md mx-auto shadow-2xl relative overflow-hidden">
                    <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-[#1DC3F2] via-[#FF7900] to-[#FFCC00]" />

                    <div className="w-16 h-16 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center mx-auto mb-4 text-2xl shadow-inner">
                      {paymentMethod === 'wave' ? '🌊' : paymentMethod === 'orange_money' ? '🟠' : paymentMethod === 'mtn_momo' ? '🟡' : '💳'}
                    </div>

                    <div className="text-[10px] uppercase tracking-widest text-[#1DC3F2] font-agrandir-bold mb-1">
                      PAIEMENT SÉCURISÉ · {paymentMethod.toUpperCase()}
                    </div>

                    <h3 className="font-agrandir-extrabold text-xl uppercase tracking-tight text-white mb-2">
                      Confirmation du paiement
                    </h3>

                    <div className="bg-black/50 p-4 rounded-2xl border border-white/10 my-4 text-xs space-y-2 text-left">
                      <div className="flex justify-between">
                        <span className="text-[#888]">{t('checkout.merchant')}</span>
                        <strong className="text-white">{t('checkout.merchantName')}</strong>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[#888]">Montant à confirmer :</span>
                        <strong className="text-[#d4af37] font-mono text-sm">{finalTotalAmount.toLocaleString('fr-FR')} FCFA</strong>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[#888]">Référence commande :</span>
                        <span className="text-white font-mono">LMR-{Math.floor(1000 + Math.random() * 9000)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[#888]">Compte débité :</span>
                        <span className="text-white font-mono">{paymentDialCode} {paymentPhoneNumber}</span>
                      </div>
                    </div>

                    <p className="text-xs text-[#aaa] leading-relaxed mb-6">
                      {t('checkout.simulationInstruction')}
                    </p>

                    <button
                      type="button"
                      onClick={handleApproveGatewaySimulation}
                      disabled={gatewayProcessing}
                      className="w-full py-4 rounded-full bg-[#1DC3F2] hover:bg-[#1bb2dc] text-black font-agrandir-extrabold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg disabled:opacity-50"
                    >
                      {gatewayProcessing ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Validation du débit en cours...</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="w-4 h-4" />
                          <span>{t('checkout.simulateApproval')}</span>
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setIsSimulatingGateway(false);
                        setStep(3);
                      }}
                      className="w-full mt-3 py-3 rounded-full border border-white/20 hover:border-white text-xs font-agrandir-semibold uppercase tracking-wider text-[#aaa] hover:text-white transition-colors cursor-pointer flex items-center justify-center gap-2 active:scale-95"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" />
                      <span>Retour au choix de paiement</span>
                    </button>
                  </div>
                </div>
              )}

              {/* CAS B : PAIEMENT CONFIRMÉ & BILLETS ÉMIS AVEC QR CODES */}
              {!isSimulatingGateway && createdOrder && (
                <div className="text-center py-4 space-y-5 animate-fadeIn">
                  <div className="w-14 h-14 rounded-full bg-[#d4af37]/10 border border-[#d4af37]/40 flex items-center justify-center mx-auto text-[#d4af37]">
                    <CheckCircle2 className="w-8 h-8" />
                  </div>

                  <div>
                    <div className="text-[10px] font-agrandir-bold tracking-[0.25em] text-[#d4af37] uppercase mb-1">
                      {t('checkout.orderSuccess')}
                    </div>
                    <h2 className="font-agrandir-extrabold text-2xl text-white uppercase tracking-tight">
                      {t('checkout.ticketsReady')}
                    </h2>
                    <p className="text-xs text-[#aaa] max-w-md mx-auto mt-1">
                      Commande <span className="text-white font-agrandir-semibold font-mono">{createdOrder.reference}</span> validée. Les billets d’accès certifiés ont été envoyés à <span className="text-white">{createdOrder.customerEmail}</span>.
                    </p>
                  </div>

                  {/* Bouton d'aperçu de l'email de confirmation personnalisé */}
                  <div className="flex justify-center">
                    <button
                      type="button"
                      onClick={() => setShowEmailPreview(true)}
                      className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#d4af37]/10 hover:bg-[#d4af37]/20 border border-[#d4af37]/40 text-[#d4af37] text-xs font-agrandir-semibold transition-all cursor-pointer shadow-sm"
                    >
                      <Mail className="w-3.5 h-3.5" />
                      <span>{t('checkout.viewEmail')}</span>
                    </button>
                  </div>

                  {/* Liste des Billets Nominatifs Émis */}
                  <div className="space-y-3 my-4 text-left">
                    {issuedTickets.map((tkt, idx) => (
                      <div
                        key={tkt.id}
                        className="p-4 sm:p-5 bg-[#0c0c0c] border border-white/15 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 font-agrandir-regular text-xs shadow-md"
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 text-white font-agrandir-semibold text-sm">
                            <TicketIcon className="w-4 h-4 text-[#d4af37]" />
                            <span className="font-mono">{tkt.serialNumber}</span>
                            <span className="text-[9px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full uppercase font-bold">
                              CERTIFIÉ
                            </span>
                          </div>
                          <div className="text-[#888] text-[11px] mt-1">
                            {tkt.categoryName} · {tkt.holderName}
                          </div>
                        </div>

                        <a
                          href={`/api/customer/tickets/${tkt.id}/print`}
                          target="_blank"
                          rel="noreferrer"
                          className="px-4 py-2 border border-white/20 hover:border-white rounded-full bg-white/5 text-[#ccc] hover:text-white transition-all flex items-center gap-1.5 text-[11px] uppercase tracking-wider font-agrandir-semibold shrink-0 cursor-pointer"
                        >
                          <Printer className="w-3.5 h-3.5" />
                          <span>{t('checkout.printPdf')}</span>
                        </a>
                      </div>
                    ))}
                  </div>

                  {/* Boutons d'action finale */}
                  <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-4 border-t border-white/10">
                    <button
                      onClick={handleGoToCustomerTickets}
                      className="w-full sm:w-auto px-6 py-3.5 bg-white text-black text-xs font-agrandir-extrabold tracking-widest uppercase hover:bg-[#eaeaea] rounded-full transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-lg"
                    >
                      <span>{t('checkout.accessClientSpace')}</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>

                    <button
                      onClick={handleClose}
                      className="w-full sm:w-auto px-6 py-3.5 border border-white/20 hover:border-white text-[#aaa] hover:text-white rounded-full transition-colors text-xs font-agrandir-bold uppercase tracking-widest cursor-pointer flex items-center justify-center gap-2 active:scale-95"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" />
                      <span>RETOUR À L'ACCUEIL</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

        </div>

        {/* ========================================================================= */}
        {/* BARRE DYNAMIQUE DE RÉSUMÉ & NAVIGATION ENTRE LES ÉTAPES */}
        {/* ========================================================================= */}
        {/* ========================================================================= */}
        {/* BARRE DYNAMIQUE DE RÉSUMÉ & NAVIGATION (FIXE EN BAS DE L'ÉCRAN) */}
        {/* ========================================================================= */}
        {step < 4 && (
          <div className="shrink-0 z-30 border-t border-white/15 bg-[#0a0a0a]/98 backdrop-blur-xl p-4 sm:p-5 sm:rounded-b-3xl shadow-[0_-12px_30px_rgba(0,0,0,0.85)] pb-[max(1rem,env(safe-area-inset-bottom))]">
            {/* LIGNE 1 : TOTAL & NOMBRE DE BILLETS SÉLECTIONNÉS */}
            <div className="flex items-center justify-between gap-3 mb-3">
              <div className="flex items-baseline gap-2">
                <span className="text-xs sm:text-sm font-agrandir-bold tracking-wider uppercase text-[#d4af37]">
                  Total :
                </span>
                <span className="font-agrandir-extrabold text-lg sm:text-2xl text-white font-mono tracking-tight">
                  {finalTotalAmount.toLocaleString('fr-FR')} F CFA
                </span>
              </div>

              <div className="flex items-center gap-2">
                <span className={`px-3 py-1 rounded-full text-xs font-mono font-bold tracking-wide transition-all ${
                  totalQuantity > 0
                    ? 'bg-white/15 text-white border border-white/20'
                    : 'bg-white/5 text-[#777] border border-white/5'
                }`}>
                  {String(totalQuantity).padStart(2, '0')} billet{totalQuantity > 1 ? 's' : ''}
                </span>

                {step === 1 && totalQuantity > 0 && (
                  <button
                    type="button"
                    onClick={() => setQuantities({})}
                    className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 text-[#aaa] hover:text-white flex items-center justify-center transition-colors cursor-pointer active:scale-90"
                    title="Effacer la sélection de billets"
                    aria-label="Effacer la sélection"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* LIGNE 2 : BOUTONS D'ACTION SUIVANT / RETOUR */}
            <div className="flex items-center gap-2.5 sm:gap-3 w-full">
              {step === 1 && (
                <>
                  <button
                    type="button"
                    onClick={handleClose}
                    className="px-4 sm:px-5 py-3.5 rounded-full border border-white/20 hover:border-white text-xs font-agrandir-bold uppercase tracking-wider text-[#ccc] hover:text-white transition-all cursor-pointer flex items-center justify-center gap-1.5 active:scale-95 shrink-0"
                    title="Retourner à la page du concert"
                  >
                    <ArrowLeft className="w-4 h-4 text-[#d4af37]" />
                    <span className="hidden sm:inline">Retour</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleProceedToSummary}
                    disabled={totalQuantity === 0}
                    className="flex-1 py-3.5 sm:py-4 px-6 rounded-full bg-white hover:bg-neutral-200 text-black font-agrandir-extrabold text-xs sm:text-sm uppercase tracking-widest transition-all flex items-center justify-center gap-2 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer shadow-xl active:scale-[0.98]"
                  >
                    <span>Continuer</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </>
              )}

              {step === 2 && (
                <>
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="px-4 sm:px-5 py-3.5 rounded-full border border-white/20 hover:border-white text-xs font-agrandir-bold uppercase tracking-wider text-[#ccc] hover:text-white transition-all cursor-pointer flex items-center justify-center gap-1.5 active:scale-95 shrink-0"
                    title="Modifier les billets"
                  >
                    <ArrowLeft className="w-4 h-4 text-[#d4af37]" />
                    <span className="hidden sm:inline">{t('checkout.back')}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleProceedToPayment}
                    className="flex-1 py-3.5 sm:py-4 px-6 rounded-full bg-white hover:bg-neutral-200 text-black font-agrandir-extrabold text-xs sm:text-sm uppercase tracking-widest transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xl active:scale-[0.98]"
                  >
                    <span>{t('checkout.proceedToPayment')}</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </>
              )}

              {step === 3 && (
                <>
                  <button
                    type="button"
                    onClick={() => setStep(2)}
                    className="px-4 sm:px-5 py-3.5 rounded-full border border-white/20 hover:border-white text-xs font-agrandir-bold uppercase tracking-wider text-[#ccc] hover:text-white transition-all cursor-pointer flex items-center justify-center gap-1.5 active:scale-95 shrink-0"
                    title="Modifier mes coordonnées"
                  >
                    <ArrowLeft className="w-4 h-4 text-[#d4af37]" />
                    <span className="hidden sm:inline">{t('checkout.back')}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleTriggerPayment}
                    className="flex-1 py-3.5 sm:py-4 px-6 rounded-full bg-[#d4af37] hover:bg-[#c49f27] text-black font-agrandir-extrabold text-xs sm:text-sm uppercase tracking-widest transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xl shadow-[#d4af37]/25 active:scale-[0.98]"
                  >
                    <Lock className="w-4 h-4" />
                    <span>Payer {finalTotalAmount.toLocaleString('fr-FR')} FCFA</span>
                  </button>
                </>
              )}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* SUBMODAL : APERÇU EMAIL DE CONFIRMATION PERSONNALISÉ */}
        {/* ========================================================================= */}
        {showEmailPreview && createdOrder && (
          <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4">
            <div className="bg-[#0f0f0f] border border-white/20 rounded-3xl max-w-2xl w-full p-6 space-y-4 shadow-2xl text-left">
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-[#d4af37]" />
                  <h3 className="font-agrandir-bold text-sm text-white uppercase">
                    E-MAIL DE CONFIRMATION ENVOYÉ À {createdOrder.customerEmail}
                  </h3>
                </div>
                <button
                  onClick={() => setShowEmailPreview(false)}
                  className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center text-white text-xs hover:bg-white/20 cursor-pointer"
                >
                  ✕
                </button>
              </div>

              <div className="rounded-2xl border border-white/10 overflow-hidden bg-black h-96">
                <iframe
                  title="Confirmation Email"
                  srcDoc={
                    generatePersonalizedTicketEmail(
                      createdOrder,
                      {
                        title: checkoutEvent.title,
                        artist: checkoutEvent.artist,
                        date: checkoutEvent.date,
                        time: checkoutEvent.time,
                        doorsOpen: checkoutEvent.doorsOpen,
                        venue: checkoutEvent.venue,
                        city: checkoutEvent.city,
                        officialPoster: checkoutEvent.officialPoster,
                        bannerImage: checkoutEvent.bannerImage,
                        infoline: checkoutEvent.infoline,
                      },
                      issuedTickets
                    ).htmlContent
                  }
                  className="w-full h-full border-0"
                  sandbox="allow-same-origin"
                />
              </div>

              <div className="text-right pt-2">
                <button
                  onClick={() => setShowEmailPreview(false)}
                  className="px-5 py-2 rounded-full bg-white text-black font-agrandir-extrabold text-xs uppercase cursor-pointer"
                >
                  Fermer l'aperçu
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TIROIR DÉROULANT DES PAYS ET INDICATIFS TÉLÉPHONIQUES */}
        {/* ========================================================================= */}
        {isCountryDrawerOpen && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fadeIn">
            {/* Arrière-plan sombre avec fermeture au clic */}
            <div 
              className="fixed inset-0 bg-black/80 backdrop-blur-sm transition-opacity" 
              onClick={() => setIsCountryDrawerOpen(false)}
            />

            {/* Corps du tiroir (bottom sheet sur mobile, modal luxueux sur desktop) */}
            <div className="relative z-10 w-full max-w-lg bg-[#0e0e0e] border border-white/15 rounded-t-[32px] sm:rounded-3xl shadow-[0_-10px_40px_rgba(0,0,0,0.9)] max-h-[88vh] flex flex-col overflow-hidden animate-slideUp text-left">
              
              {/* Poignée tactile mobile */}
              <div className="pt-3 pb-1 flex justify-center sm:hidden">
                <div className="w-12 h-1 rounded-full bg-white/20" />
              </div>

              {/* En-tête du tiroir */}
              <div className="p-5 sm:p-6 border-b border-white/10 flex items-center justify-between">
                <div>
                  <h3 className="font-agrandir-extrabold text-base sm:text-lg text-white uppercase tracking-wide flex items-center gap-2">
                    <span className="text-[#d4af37]">Sélecteur</span>
                    <span>de Pays &amp; Indicatif</span>
                  </h3>
                  <p className="text-[11px] text-[#888] mt-0.5">
                    Sélectionnez un pays dans la liste. Seul son indicatif apparaîtra dans votre case.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsCountryDrawerOpen(false)}
                  className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/15 border border-white/10 text-white flex items-center justify-center transition-colors cursor-pointer"
                  aria-label="Fermer le tiroir"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Barre de recherche dans le tiroir */}
              <div className="p-4 border-b border-white/10 bg-[#0a0a0a]">
                <div className="relative">
                  <Search className="w-4 h-4 text-[#888] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    value={countrySearchQuery}
                    onChange={(e) => setCountrySearchQuery(e.target.value)}
                    placeholder="Rechercher un pays ou indicatif (Sénégal, +221, Côte d'Ivoire...)..."
                    className="w-full bg-[#161616] border border-white/15 rounded-xl pl-10 pr-9 py-2.5 text-xs text-white placeholder-[#666] focus:outline-none focus:border-[#d4af37] font-agrandir-regular"
                    autoFocus
                  />
                  {countrySearchQuery && (
                    <button
                      type="button"
                      onClick={() => setCountrySearchQuery('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[#777] hover:text-white"
                      aria-label="Effacer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Liste défilante des pays dans le tiroir (longue page confortable) */}
              <div className="flex-1 overflow-y-auto p-4 space-y-2 max-h-[60vh] scrollbar-thin">
                {filteredCountries.map((c) => {
                  const currentDial = countryDrawerTarget === 'customer' ? customerDialCode : paymentDialCode;
                  const isSelected = currentDial === c.dialCode;

                  return (
                    <button
                      key={c.name + c.dialCode}
                      type="button"
                      onClick={() => handleSelectCountry(c)}
                      className={`w-full p-3.5 rounded-2xl border flex items-center justify-between transition-all cursor-pointer text-left ${
                        isSelected
                          ? 'bg-[#d4af37]/15 border-[#d4af37] text-white shadow-md'
                          : 'bg-[#141414] border-white/5 hover:border-white/20 hover:bg-[#1a1a1a] text-[#ddd]'
                      }`}
                    >
                      <div className="flex items-center gap-3.5 min-w-0">
                        <span className="text-2xl shrink-0">{c.flag}</span>
                        <div className="min-w-0">
                          <div className={`font-agrandir-bold text-xs uppercase truncate ${isSelected ? 'text-[#d4af37]' : 'text-white'}`}>
                            {c.name}
                          </div>
                          <div className="text-[10px] text-[#777] font-mono mt-0.5">
                            Indicatif international
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2.5 shrink-0 ml-3">
                        <span className={`font-mono text-xs font-bold px-2.5 py-1 rounded-lg border ${
                          isSelected 
                            ? 'bg-[#d4af37] text-black border-[#d4af37]' 
                            : 'bg-white/5 text-[#d4af37] border-white/10'
                        }`}>
                          {c.dialCode}
                        </span>
                        {isSelected && <Check className="w-4 h-4 text-[#d4af37]" />}
                      </div>
                    </button>
                  );
                })}

                {filteredCountries.length === 0 && (
                  <div className="py-8 text-center text-xs text-[#777]">
                    Aucun pays trouvé pour « {countrySearchQuery} »
                  </div>
                )}
              </div>

              {/* Pied du tiroir */}
              <div className="p-4 border-t border-white/10 bg-[#080808] flex items-center justify-between text-[11px] text-[#888]">
                <span>Appuyez sur un pays pour insérer son indicatif</span>
                <button
                  type="button"
                  onClick={() => setIsCountryDrawerOpen(false)}
                  className="text-white hover:text-[#d4af37] font-agrandir-semibold uppercase text-[10px] tracking-wider cursor-pointer"
                >
                  Fermer
                </button>
              </div>

            </div>
          </div>
        )}

      </div>
    </div>
  );
};
