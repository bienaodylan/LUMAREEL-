import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { Order, Ticket, TicketCategory } from '../types';
import {
  X,
  ShieldCheck,
  Ticket as TicketIcon,
  CheckCircle2,
  Loader2,
  ArrowRight,
  Printer,
  Mail,
  Clock,
  ArrowLeft,
  Smartphone,
  CreditCard,
  Lock,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Check,
  Search,
} from 'lucide-react';
import { generatePersonalizedTicketEmail } from '../utils/emailTemplate';
import { formatDateLong } from '../utils/dateUtils';

type CheckoutStep = 1 | 2 | 3 | 4;
type PaymentOption = 'wave' | 'orange_money' | 'mtn_momo' | 'moov_money' | 'card';
type CountryOption = 'CI' | 'SN' | 'ML' | 'BF' | 'INT';

export interface CountryOptionItem {
  id: CountryOption;
  name: string;
  flag: string;
  dialCode: string;
}

export const COUNTRIES_CATALOG: CountryOptionItem[] = [
  { id: 'CI', name: "Côte d'Ivoire", flag: '🇨🇮', dialCode: '+225' },
  { id: 'INT', name: 'Guinée', flag: '🇬🇳', dialCode: '+224' },
  { id: 'ML', name: 'Mali', flag: '🇲🇱', dialCode: '+223' },
  { id: 'INT', name: 'Bénin', flag: '🇧🇯', dialCode: '+229' },
  { id: 'INT', name: 'Togo', flag: '🇹🇬', dialCode: '+228' },
  { id: 'SN', name: 'Sénégal', flag: '🇸🇳', dialCode: '+221' },
  { id: 'BF', name: 'Burkina Faso', flag: '🇧🇫', dialCode: '+226' },
  { id: 'INT', name: 'Cameroun', flag: '🇨🇲', dialCode: '+237' },
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
  const regex =
    /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;
  if (!regex.test(email)) return false;
  const parts = email.split('@');
  if (parts.length !== 2) return false;
  const domainParts = parts[1].split('.');
  if (domainParts.length < 2) return false;
  const tld = domainParts[domainParts.length - 1];
  if (!tld || tld.length < 2) return false;
  if (
    ['test@test.com', 'a@a.com', 'test@example.com', 'fake@fake.com', 'mail@mail.com'].includes(
      email
    )
  ) {
    return false;
  }
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

const PAYMENT_OPERATORS: Array<{
  id: PaymentOption;
  labelFr: string;
  labelEn: string;
  sub: string;
  logo: string | null;
}> = [
  {
    id: 'wave',
    labelFr: 'Wave',
    labelEn: 'Wave',
    sub: 'Mobile Money',
    logo: 'https://arcencielconsultingpro.com/gallery/upscalemedia-transformed%202.jpg',
  },
  {
    id: 'orange_money',
    labelFr: 'Orange Money',
    labelEn: 'Orange Money',
    sub: 'Mobile Money',
    logo: 'https://cdn.simpleicons.org/orange/FF7900',
  },
  {
    id: 'mtn_momo',
    labelFr: 'MTN MoMo',
    labelEn: 'MTN MoMo',
    sub: 'Mobile Money',
    logo: 'https://cdn.simpleicons.org/mtn/FFCC00',
  },
  {
    id: 'moov_money',
    labelFr: 'Moov Money',
    labelEn: 'Moov Money',
    sub: 'Mobile Money',
    logo: 'https://cdn.simpleicons.org/moov/0065B3',
  },
  {
    id: 'card',
    labelFr: 'Carte bancaire',
    labelEn: 'Bank Card',
    sub: 'Visa · Mastercard',
    logo: null,
  },
];

export const CheckoutModal: React.FC = () => {
  const {
    checkoutEvent,
    setCheckoutEvent,
    currentUser,
    showToast,
    refreshCustomerOrders,
    refreshEvents,
    setCurrentPage,
    goBack,
    addLocalOrder,
    setIsAuthModalOpen,
    language,
    t,
  } = useApp();

  const isEn = language === 'en';
  const [step, setStep] = useState<CheckoutStep>(1);

  // Étape 1 : Sélection des billets (toutes les catégories démarrent à 0)
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
  const [customerPhoneNumber, setCustomerPhoneNumber] = useState<string>('');

  // Étape 3 : Paiement
  const [, setCountry] = useState<CountryOption>('CI');
  const [paymentMethod, setPaymentMethod] = useState<PaymentOption>('wave');
  const [paymentDialCode, setPaymentDialCode] = useState<string>('+225');
  const [paymentPhoneNumber, setPaymentPhoneNumber] = useState<string>('');
  const [isPaymentCountryDropdownOpen, setIsPaymentCountryDropdownOpen] = useState<boolean>(false);

  // Tiroir des pays & indicatifs téléphoniques
  const [isCountryDrawerOpen, setIsCountryDrawerOpen] = useState<boolean>(false);
  const [countryDrawerTarget] = useState<'customer' | 'payment'>('customer');
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

  // Étape 4 : Passerelle PayMeTrust & Résultat
  const [paymetrustTx, setPaymetrustTx] = useState<{
    id: string;
    reference: string;
    status: string;
    amount: number;
    currency: string;
    channel: string;
    paymentUrl?: string;
    mode: 'live' | 'awaiting_keys';
    environment: string;
  } | null>(null);
  const [pendingOrderRef, setPendingOrderRef] = useState<string>('');
  const [gatewayProcessing, setGatewayProcessing] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [createdOrder, setCreatedOrder] = useState<Order | null>(null);
  const [issuedTickets, setIssuedTickets] = useState<Ticket[]>([]);
  const [showEmailPreview, setShowEmailPreview] = useState<boolean>(false);

  useEffect(() => {
    if (checkoutEvent && checkoutEvent.categories.length > 0) {
      const initial: Record<string, number> = {};
      checkoutEvent.categories.forEach((c) => {
        initial[c.id] = 0;
      });
      setQuantities(initial);
      setStep(1);
      setLockSeconds(20 * 60);
      setPaymetrustTx(null);
      setPendingOrderRef('');
      setIsPaymentCountryDropdownOpen(false);
    }
  }, [checkoutEvent?.id]);

  useEffect(() => {
    if (currentUser) {
      if (!customerName) setCustomerName(currentUser.name || '');
      if (!customerEmail) setCustomerEmail(currentUser.email || '');
    }
  }, [currentUser]);

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

  useEffect(() => {
    if (!checkoutEvent) {
      goBack();
    }
  }, [checkoutEvent, goBack]);

  if (!checkoutEvent) return null;

  const categories = checkoutEvent.categories || [];
  const totalQuantity = Object.values(quantities).reduce((acc, q) => acc + (q || 0), 0);
  const finalTotalAmount = categories.reduce((sum, cat) => {
    const q = quantities[cat.id] || 0;
    return sum + cat.price * q;
  }, 0);

  const formatCountdown = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handleQuantityChange = (catId: string, delta: number) => {
    setQuantities((prev) => {
      const current = prev[catId] || 0;
      const updated = Math.max(0, current + delta);
      const otherTotal = Object.entries(prev)
        .filter(([id]) => id !== catId)
        .reduce((sum, [, q]) => sum + q, 0);

      if (delta > 0 && otherTotal + updated > 8) {
        showToast(
          isEn ? 'Maximum 8 tickets per transaction.' : 'Maximum 8 billets par commande.',
          'error'
        );
        return prev;
      }

      const cat = categories.find((c) => c.id === catId);
      if (cat && delta > 0) {
        const remaining = Math.max(0, cat.quota - cat.sold);
        if (updated > remaining) {
          showToast(
            isEn
              ? 'Stock limit reached for this tier.'
              : 'Stock maximum atteint pour cette catégorie.',
            'error'
          );
          return prev;
        }
      }

      return { ...prev, [catId]: updated };
    });
  };

  const handleProceedToSummary = () => {
    if (totalQuantity === 0) {
      showToast(
        isEn ? 'Please select at least 1 ticket.' : 'Veuillez sélectionner au moins 1 billet.',
        'error'
      );
      return;
    }
    setStep(2);
  };

  const handleProceedToPayment = () => {
    if (!customerName.trim()) {
      showToast(t('checkout.errName'), 'error');
      return;
    }
    const cleanEmail = customerEmail.trim();
    if (!cleanEmail) {
      showToast(t('checkout.errEmailReq'), 'error');
      return;
    }
    if (!isValidRealEmail(cleanEmail)) {
      showToast(t('checkout.errEmailInvalid'), 'error');
      return;
    }
    setStep(3);
  };

  const handleTriggerPayment = async () => {
    if (!currentUser || !currentUser.emailVerified) {
      setIsAuthModalOpen(true);
      showToast(
        isEn
          ? 'Sign in with a verified email to purchase tickets.'
          : 'Connectez-vous avec un e-mail vérifié pour acheter des billets.',
        'error'
      );
      return;
    }
    if (paymentMethod !== 'card') {
      const pPhone = paymentPhoneNumber.trim();
      if (!pPhone) {
        showToast(t('checkout.errPhoneReq'), 'error');
        return;
      }
      if (!isValidPhoneNumber(pPhone)) {
        showToast(t('checkout.errPhoneInvalid'), 'error');
        return;
      }
    }

    const selectedItems = categories
      .filter((c) => (quantities[c.id] || 0) > 0)
      .map((c) => ({ categoryId: c.id, quantity: quantities[c.id] }));

    if (selectedItems.length === 0) {
      showToast(
        isEn ? 'Please select at least 1 ticket.' : 'Veuillez sélectionner au moins 1 billet.',
        'error'
      );
      return;
    }

    const customerFullPhone = paymentPhoneNumber
      ? `${paymentDialCode} ${paymentPhoneNumber}`.trim()
      : customerPhoneNumber
      ? `${customerDialCode} ${customerPhoneNumber}`.trim()
      : '';

    setIsSubmitting(true);
    try {
      const orderRes = await fetch('/api/orders/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId: currentUser.id,
          customerName: customerName.trim(),
          customerEmail: customerEmail.trim(),
          customerPhone: customerFullPhone,
          eventId: checkoutEvent.id,
          categoryId: selectedItems[0].categoryId,
          quantity: totalQuantity,
          items: selectedItems,
          paymentProvider: paymentMethod,
        }),
      });
      const orderData = await orderRes.json();
      if (!orderRes.ok || !orderData?.success || !orderData?.order) {
        throw new Error(
          orderData?.error ||
            (isEn ? 'Unable to create order.' : 'Impossible de créer la commande.')
        );
      }

      const pendingOrder: Order = orderData.order;
      setPendingOrderRef(pendingOrder.reference);

      const initRes = await fetch('/api/payments/paymetrust/initiate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          kind: 'ticket_order',
          orderId: pendingOrder.id,
          channel: paymentMethod,
          customerName: customerName.trim(),
          customerEmail: customerEmail.trim(),
          customerPhone: customerFullPhone,
        }),
      });
      const initData = await initRes.json();
      if (!initRes.ok || !initData?.success || !initData?.transaction) {
        throw new Error(
          initData?.error ||
            (isEn
              ? 'Unable to start PayMeTrust payment.'
              : 'Impossible de démarrer le paiement PayMeTrust.')
        );
      }

      setPaymetrustTx(initData.transaction);
      setStep(4);
    } catch (err: any) {
      showToast(err?.message || t('checkout.errUnexpected'), 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const applyConfirmedOrder = (order: Order, tickets: Ticket[]) => {
    setCreatedOrder(order);
    setIssuedTickets(tickets);
    addLocalOrder(order);
    setPaymetrustTx(null);
    showToast(
      isEn
        ? 'Payment confirmed! Certified tickets issued.'
        : 'Paiement confirmé ! Vos billets certifiés sont émis.',
      'success'
    );
    refreshEvents();
    refreshCustomerOrders();
  };

  const handleConfirmPayMeTrustPreview = async () => {
    if (!paymetrustTx) return;
    setGatewayProcessing(true);
    try {
      const res = await fetch('/api/payments/paymetrust/confirm-preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reference: paymetrustTx.reference }),
      });
      const data = await res.json();
      if (!res.ok || !data?.success || !data?.fulfillment?.order) {
        throw new Error(
          data?.error ||
            (isEn ? 'Unable to validate payment.' : 'Impossible de valider le paiement.')
        );
      }
      applyConfirmedOrder(
        data.fulfillment.order,
        data.fulfillment.tickets || data.fulfillment.order.tickets || []
      );
    } catch (err: any) {
      showToast(err?.message || t('checkout.errUnexpected'), 'error');
    } finally {
      setGatewayProcessing(false);
    }
  };

  const handleVerifyPayMeTrustStatus = async () => {
    if (!paymetrustTx) return;
    setGatewayProcessing(true);
    try {
      const res = await fetch(
        `/api/payments/paymetrust/verify/${encodeURIComponent(paymetrustTx.reference)}`
      );
      const data = await res.json();
      if (!res.ok || !data?.success) {
        throw new Error(
          data?.error || (isEn ? 'Verification failed.' : 'Vérification impossible.')
        );
      }
      if (data.transaction?.status === 'SUCCESS' && data.fulfillment?.order) {
        applyConfirmedOrder(
          data.fulfillment.order,
          data.fulfillment.tickets || data.fulfillment.order.tickets || []
        );
      } else if (
        data.transaction?.status === 'FAILED' ||
        data.transaction?.status === 'EXPIRED' ||
        data.transaction?.status === 'CANCELLED'
      ) {
        showToast(
          isEn
            ? 'Payment was declined or expired. Please try again.'
            : 'Le paiement a été refusé ou a expiré. Veuillez réessayer.',
          'error'
        );
      } else {
        showToast(
          isEn
            ? 'Payment still pending on PayMeTrust. Confirm on your phone then retry.'
            : 'Paiement en attente sur PayMeTrust. Validez sur votre téléphone puis réessayez.',
          'info'
        );
      }
    } catch (err: any) {
      showToast(err?.message || t('checkout.errUnexpected'), 'error');
    } finally {
      setGatewayProcessing(false);
    }
  };

  const resetCheckoutState = () => {
    setCheckoutEvent(null);
    setCreatedOrder(null);
    setIssuedTickets([]);
    setStep(1);
    setPaymetrustTx(null);
    setPendingOrderRef('');
  };

  const handleClose = () => {
    resetCheckoutState();
    goBack();
  };

  const handleStepBack = () => {
    if (step === 1) {
      handleClose();
    } else if (step === 2) {
      setStep(1);
    } else if (step === 3) {
      setStep(2);
    } else if (step === 4) {
      if (paymetrustTx && !createdOrder) {
        setPaymetrustTx(null);
        setStep(3);
      } else {
        handleClose();
      }
    }
  };

  const handleGoToCustomerTickets = () => {
    resetCheckoutState();
    setCurrentPage('client_space');
  };

  const selectedOperator =
    PAYMENT_OPERATORS.find((op) => op.id === paymentMethod) || PAYMENT_OPERATORS[0];
  const selectedCountryItem =
    COUNTRIES_CATALOG.find((c) => c.dialCode === paymentDialCode) || COUNTRIES_CATALOG[0];

  return (
    <div className="min-h-screen w-full bg-black text-white flex flex-col font-agrandir-regular">
      {/* ========================================================================= */}
      {/* EN-TÊTE PLEINE PAGE AVEC BOUTON RETOUR & RAIL D'ÉTAPES                    */}
      {/* ========================================================================= */}
      <header
        className="sticky top-0 z-30 border-b border-white/[0.1] bg-black/95 backdrop-blur-xl"
        style={{ paddingTop: 'max(0.75rem, env(safe-area-inset-top, 0px))' }}
      >
        <div className="w-full max-w-2xl mx-auto px-4 sm:px-6 pb-4">
          <div className="flex items-center justify-between gap-3 mb-4">
            <button
              type="button"
              onClick={handleStepBack}
              aria-label={t('checkout.back')}
              className="inline-flex items-center gap-2 min-h-[38px] px-3 -ml-1 rounded-full bg-white/[0.06] hover:bg-white/[0.12] border border-white/[0.12] text-xs font-agrandir-semibold text-white transition-colors cursor-pointer shrink-0"
            >
              <ArrowLeft className="w-4 h-4 shrink-0" strokeWidth={1.7} />
              <span>{isEn ? 'Back' : 'Retour'}</span>
            </button>

            <div className="flex flex-col items-center justify-center text-center min-w-0">
              {step === 2 || step === 3 ? (
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#121212] border border-white/[0.12]">
                  <Clock className="w-3.5 h-3.5 text-[#D4AF6A]" strokeWidth={1.7} />
                  <span className="font-mono text-xs font-bold text-white tabular-nums">
                    {formatCountdown(lockSeconds)}
                  </span>
                </div>
              ) : (
                <img
                  src="/assets/logo-lumareel.png"
                  alt="LUMARÉEL"
                  className="h-5 w-auto object-contain"
                />
              )}
            </div>

            <div className="min-w-[74px] flex justify-end shrink-0">
              <span className="text-[11px] font-mono text-[#9A9A9A] tabular-nums">
                0{step} / 04
              </span>
            </div>
          </div>

          {/* Rail 4 étapes sobre et éditorial */}
          <div className="grid grid-cols-4 gap-2">
            {[
              { num: 1, label: isEn ? 'Tickets' : 'Billets' },
              { num: 2, label: isEn ? 'Details' : 'Infos' },
              { num: 3, label: isEn ? 'Payment' : 'Paiement' },
              { num: 4, label: isEn ? 'Ready' : 'Confirmé' },
            ].map((s) => {
              const isActive = step === s.num;
              const isDone = step > s.num;
              return (
                <div key={s.num} className="space-y-1.5">
                  <div className="flex items-center justify-between text-[10px] font-agrandir-semibold uppercase tracking-[0.12em]">
                    <span
                      className={`font-mono ${
                        isActive ? 'text-[#D4AF6A]' : isDone ? 'text-white' : 'text-[#666]'
                      }`}
                    >
                      0{s.num}
                    </span>
                    <span
                      className={`hidden sm:inline truncate ${
                        isActive ? 'text-white' : isDone ? 'text-[#C8C8C8]' : 'text-[#666]'
                      }`}
                    >
                      {s.label}
                    </span>
                  </div>
                  <div
                    className={`h-[2px] w-full rounded-full transition-colors duration-300 ${
                      isActive ? 'bg-[#D4AF6A]' : isDone ? 'bg-white' : 'bg-white/[0.12]'
                    }`}
                  />
                </div>
              );
            })}
          </div>
        </div>
      </header>

      {/* ========================================================================= */}
      {/* CORPS DE LA PAGE DE RÉSERVATION                                           */}
      {/* ========================================================================= */}
      <div className="w-full max-w-2xl mx-auto px-4 sm:px-6 py-6 flex-1 min-h-0">
          {/* ===================================================================== */}
          {/* ÉTAPE 1 : SÉLECTION DES BILLETS                                       */}
          {/* ===================================================================== */}
          {step === 1 && (
            <div className="space-y-5">
              {/* Mini-carte concert */}
              <div className="flex items-center gap-3.5 p-3.5 rounded-[10px] bg-[#0E0E0E] border border-white/[0.12]">
                <img
                  src={
                    checkoutEvent.artistPortrait ||
                    checkoutEvent.officialPoster ||
                    checkoutEvent.bannerImage
                  }
                  alt={checkoutEvent.artist}
                  className="w-16 h-20 object-cover rounded-[8px] shrink-0 border border-white/[0.1]"
                />
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-agrandir-semibold tracking-[0.2em] text-[#D4AF6A] uppercase truncate">
                    {checkoutEvent.artist}
                  </p>
                  <h2 className="font-agrandir-extrabold text-base sm:text-lg text-white truncate uppercase mt-0.5 leading-tight">
                    {checkoutEvent.title}
                  </h2>
                  <p className="text-xs text-[#9A9A9A] mt-1 truncate">
                    {formatDateLong(checkoutEvent.date, language)} · {checkoutEvent.time} ·{' '}
                    {checkoutEvent.venue}
                  </p>
                </div>
              </div>

              {/* Catégories tarifaires */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-agrandir-semibold tracking-[0.2em] text-[#9A9A9A] uppercase">
                    {t('checkout.step1Title')}
                  </span>
                  <span className="text-[10px] font-mono text-[#777]">MAX 8 / CMD</span>
                </div>

                {categories.map((cat: TicketCategory) => {
                  const remaining = Math.max(0, cat.quota - cat.sold);
                  const isSoldOut = remaining <= 0;
                  const currentQty = quantities[cat.id] || 0;
                  const isExpanded = !!expandedDetails[cat.id];
                  const hasDetails = Boolean(
                    (cat.description && cat.description.trim() !== '') ||
                      (cat.perks && cat.perks.length > 0)
                  );
                  const fillPercent = cat.quota > 0 ? Math.round((cat.sold / cat.quota) * 100) : 0;
                  const isExclusiveCapacity = cat.quota <= 50;

                  const renderStatBadge = () => {
                    if (isSoldOut) {
                      return (
                        <span className="px-2.5 py-0.5 rounded-full bg-white/[0.04] text-[#777] border border-white/[0.08] text-[10px] font-agrandir-semibold uppercase tracking-wider">
                          {t('checkout.soldOut')}
                        </span>
                      );
                    }
                    if (remaining <= 10 || (cat.quota > 0 && remaining / cat.quota <= 0.1)) {
                      return (
                        <span className="px-2.5 py-0.5 rounded-full bg-rose-950/50 border border-rose-500/35 text-rose-300 text-[10px] font-agrandir-semibold uppercase tracking-wider inline-flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
                          <span>
                            {remaining} {t('checkout.left')}
                            {language === 'fr' && remaining > 1 ? 's' : ''}
                          </span>
                        </span>
                      );
                    }
                    if (fillPercent >= 60) {
                      return (
                        <span className="px-2.5 py-0.5 rounded-full bg-[#D4AF6A]/10 border border-[#D4AF6A]/35 text-[#D4AF6A] text-[10px] font-agrandir-semibold uppercase tracking-wider">
                          {fillPercent}% {t('checkout.booked')}
                        </span>
                      );
                    }
                    if (isExclusiveCapacity) {
                      return (
                        <span className="px-2.5 py-0.5 rounded-full bg-white/[0.08] border border-white/20 text-white text-[10px] font-agrandir-semibold uppercase tracking-wider">
                          {t('checkout.limitedSeats')}
                        </span>
                      );
                    }
                    return (
                      <span className="px-2.5 py-0.5 rounded-full bg-white/[0.04] border border-white/[0.1] text-[#9A9A9A] text-[10px] font-agrandir-semibold uppercase tracking-wider inline-flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#7FE0A6]" />
                        <span>{t('checkout.available')}</span>
                      </span>
                    );
                  };

                  return (
                    <div
                      key={cat.id}
                      className={`p-4 rounded-[10px] border transition-colors ${
                        currentQty > 0
                          ? 'bg-[#141310] border-[#D4AF6A]/70'
                          : isSoldOut
                          ? 'bg-[#0B0B0B] border-white/[0.06] opacity-50'
                          : 'bg-[#0E0E0E] border-white/[0.12] hover:border-white/25'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-3 mb-3">
                        <h3 className="font-agrandir-extrabold text-sm sm:text-base text-white uppercase tracking-tight truncate">
                          {cat.name}
                        </h3>
                        <div className="shrink-0">{renderStatBadge()}</div>
                      </div>

                      <div className="flex items-center justify-between gap-4">
                        <div className="font-mono font-bold text-base sm:text-lg text-white tabular-nums">
                          {cat.price.toLocaleString('fr-FR')}{' '}
                          <span className="text-xs text-[#9A9A9A] font-normal">F CFA</span>
                        </div>

                        {/* Stepper */}
                        <div className="flex items-center bg-black border border-white/[0.14] rounded-full p-1 gap-2 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleQuantityChange(cat.id, -1)}
                            disabled={currentQty === 0 || isSoldOut}
                            className="w-8 h-8 rounded-full bg-white/[0.08] hover:bg-white/[0.16] text-white disabled:opacity-25 disabled:cursor-not-allowed flex items-center justify-center font-bold text-sm transition-colors cursor-pointer"
                            aria-label={`Diminuer ${cat.name}`}
                          >
                            −
                          </button>
                          <span className="w-6 text-center font-mono font-bold text-sm text-white tabular-nums select-none">
                            {currentQty}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleQuantityChange(cat.id, 1)}
                            disabled={isSoldOut || currentQty >= remaining}
                            className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm transition-colors cursor-pointer disabled:opacity-25 disabled:cursor-not-allowed ${
                              currentQty > 0
                                ? 'bg-[#D4AF6A] hover:bg-[#DFBE7D] text-black'
                                : 'bg-white hover:bg-neutral-200 text-black'
                            }`}
                            aria-label={`Augmenter ${cat.name}`}
                          >
                            +
                          </button>
                        </div>
                      </div>

                      {hasDetails && (
                        <div className="mt-3 pt-2.5 border-t border-white/[0.08]">
                          <button
                            type="button"
                            onClick={() => toggleDetails(cat.id)}
                            className="w-full flex items-center justify-between text-left text-xs text-[#C8C8C8] hover:text-white transition-colors cursor-pointer"
                          >
                            <span className="inline-flex items-center gap-1.5 font-agrandir-semibold">
                              <span>{t('checkout.detailsPerks')}</span>
                              {isExpanded ? (
                                <ChevronUp className="w-3.5 h-3.5" />
                              ) : (
                                <ChevronDown className="w-3.5 h-3.5" />
                              )}
                            </span>
                            {cat.perks && cat.perks.length > 0 && (
                              <span className="text-[10px] text-[#9A9A9A]">
                                {cat.perks.length}{' '}
                                {cat.perks.length > 1
                                  ? t('checkout.perksIncluded')
                                  : t('checkout.perkIncluded')}
                              </span>
                            )}
                          </button>

                          {isExpanded && (
                            <div className="mt-2.5 p-3 rounded-[8px] bg-black/70 border border-white/[0.08] text-xs text-[#C8C8C8] space-y-2">
                              {cat.description && (
                                <p className="text-[#9A9A9A] leading-relaxed">{cat.description}</p>
                              )}
                              {cat.perks && cat.perks.length > 0 && (
                                <div className="flex flex-wrap gap-1.5">
                                  {cat.perks.map((perk, pIdx) => (
                                    <span
                                      key={pIdx}
                                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/[0.05] border border-white/[0.1] text-[11px] text-white"
                                    >
                                      <Check className="w-3 h-3 text-[#D4AF6A]" />
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
          {/* ÉTAPE 2 : RÉCAPITULATIF & TITULAIRE NOMINATIF                         */}
          {/* ===================================================================== */}
          {step === 2 && (
            <div className="space-y-5">
              {/* Récapitulatif style reçu billetterie */}
              <div className="p-4 sm:p-5 rounded-[10px] bg-[#0E0E0E] border border-white/[0.12] space-y-3.5">
                <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-white/[0.08]">
                  <span className="text-[10px] font-agrandir-semibold uppercase tracking-[0.2em] text-[#9A9A9A]">
                    {t('checkout.orderDetails')}
                  </span>
                  <span className="text-[11px] text-[#C8C8C8] truncate">
                    {checkoutEvent.artist}
                  </span>
                </div>

                <div className="space-y-2 text-xs">
                  {categories
                    .filter((c) => (quantities[c.id] || 0) > 0)
                    .map((cat) => {
                      const q = quantities[cat.id];
                      const sub = cat.price * q;
                      return (
                        <div key={cat.id} className="flex justify-between items-center gap-3">
                          <span className="text-white font-agrandir-semibold">
                            {cat.name}{' '}
                            <span className="text-[#9A9A9A] font-normal">× {q}</span>
                          </span>
                          <span className="font-mono text-white tabular-nums">
                            {sub.toLocaleString('fr-FR')} F CFA
                          </span>
                        </div>
                      );
                    })}
                </div>

                <div className="pt-3 border-t border-dashed border-white/[0.16] flex justify-between items-baseline">
                  <span className="text-xs font-agrandir-extrabold uppercase tracking-wider text-white">
                    {t('checkout.total')}
                  </span>
                  <span className="font-mono font-bold text-lg text-[#D4AF6A] tabular-nums">
                    {finalTotalAmount.toLocaleString('fr-FR')} F CFA
                  </span>
                </div>
              </div>

              {/* Coordonnées nominatives */}
              <div className="p-4 sm:p-5 rounded-[10px] bg-[#0E0E0E] border border-white/[0.12] space-y-4">
                <div>
                  <h3 className="font-agrandir-extrabold text-sm text-white uppercase">
                    {t('checkout.customerDetails')}
                  </h3>
                  <p className="text-[11px] text-[#9A9A9A] mt-0.5">
                    {isEn
                      ? 'Your nominative QR tickets will be delivered to this email.'
                      : 'Vos billets nominatifs avec QR code seront envoyés à cette adresse.'}
                  </p>
                </div>

                <div className="space-y-3.5">
                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-mono uppercase tracking-wider text-[#C8C8C8]">
                      {t('checkout.fullName')} *
                    </label>
                    <input
                      type="text"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      placeholder={isEn ? 'Full name' : 'Nom et prénom'}
                      required
                      className="w-full min-h-[46px] bg-black border border-white/[0.16] focus:border-[#D4AF6A] rounded-[8px] px-3.5 text-sm text-white placeholder-[#555] focus:outline-none transition-colors"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-mono uppercase tracking-wider text-[#C8C8C8]">
                      {t('checkout.email')} *
                    </label>
                    <input
                      type="email"
                      value={customerEmail}
                      onChange={(e) => setCustomerEmail(e.target.value)}
                      placeholder="nom@exemple.com"
                      required
                      className="w-full min-h-[46px] bg-black border border-white/[0.16] focus:border-[#D4AF6A] rounded-[8px] px-3.5 text-sm text-white placeholder-[#555] focus:outline-none transition-colors"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ===================================================================== */}
          {/* ÉTAPE 3 : RÈGLEMENT PAYMETRUST                                        */}
          {/* ===================================================================== */}
          {step === 3 && (
            <div className="space-y-5">
              {/* Bandeau montant net */}
              <div className="p-4 rounded-[10px] bg-[#0E0E0E] border border-white/[0.12] flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[10px] font-mono uppercase tracking-widest text-[#9A9A9A]">
                    {checkoutEvent.artist} · {totalQuantity}{' '}
                    {totalQuantity > 1 ? t('checkout.ticketPlural') : t('checkout.ticketSingle')}
                  </p>
                  <p className="text-xs text-[#C8C8C8] truncate mt-0.5">{customerName}</p>
                </div>
                <div className="text-right shrink-0">
                  <span className="font-mono font-bold text-lg text-[#D4AF6A] tabular-nums">
                    {finalTotalAmount.toLocaleString('fr-FR')} F CFA
                  </span>
                </div>
              </div>

              {/* Grille des opérateurs */}
              <div className="space-y-2">
                <label className="block text-[10px] font-mono uppercase tracking-wider text-[#C8C8C8]">
                  {t('checkout.paymentMethod')} *
                </label>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  {PAYMENT_OPERATORS.map((op) => {
                    const isSelected = paymentMethod === op.id;
                    return (
                      <button
                        key={op.id}
                        type="button"
                        onClick={() => setPaymentMethod(op.id)}
                        className={`relative p-3 rounded-[10px] border text-left transition-colors cursor-pointer ${
                          isSelected
                            ? 'bg-[#15130E] border-[#D4AF6A] text-white'
                            : 'bg-[#0E0E0E] border-white/[0.12] text-[#9A9A9A] hover:border-white/25 hover:text-white'
                        }`}
                      >
                        {isSelected && (
                          <span className="absolute top-2.5 right-2.5 w-4 h-4 rounded-full bg-[#D4AF6A] text-black flex items-center justify-center">
                            <Check className="w-2.5 h-2.5" strokeWidth={2.5} />
                          </span>
                        )}
                        <div className="h-7 mb-2 flex items-center justify-start gap-1.5">
                          {op.logo ? (
                            <img
                              src={op.logo}
                              alt={op.labelFr}
                              className="h-6 w-auto max-w-[78px] object-contain rounded-[4px]"
                              loading="eager"
                              decoding="async"
                              onError={(e) => {
                                e.currentTarget.style.display = 'none';
                              }}
                            />
                          ) : (
                            <>
                              <img
                                src="https://cdn.simpleicons.org/visa/1A1F71"
                                alt="Visa"
                                className="h-5 w-auto max-w-[44px] object-contain"
                                loading="eager"
                                onError={(e) => {
                                  e.currentTarget.style.display = 'none';
                                }}
                              />
                              <img
                                src="https://cdn.simpleicons.org/mastercard/EB001B"
                                alt="Mastercard"
                                className="h-5 w-auto max-w-[34px] object-contain"
                                loading="eager"
                                onError={(e) => {
                                  e.currentTarget.style.display = 'none';
                                }}
                              />
                            </>
                          )}
                        </div>
                        <div className="font-agrandir-extrabold text-xs text-white truncate">
                          {isEn ? op.labelEn : op.labelFr}
                        </div>
                        <div className="text-[10px] text-[#9A9A9A] truncate">{op.sub}</div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Pays + Numéro Mobile Money OU Notice Carte */}
              {paymentMethod !== 'card' ? (
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-mono uppercase tracking-wider text-[#C8C8C8]">
                      {t('checkout.country')} & {t('checkout.phone')} ({selectedOperator.labelFr}) *
                    </label>

                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setIsPaymentCountryDropdownOpen((prev) => !prev)}
                        className="min-h-[48px] px-3.5 rounded-[8px] bg-[#0E0E0E] hover:bg-[#151515] border border-white/[0.16] text-xs sm:text-sm text-white font-mono font-bold flex items-center gap-1.5 cursor-pointer shrink-0 transition-colors"
                      >
                        <span className="text-base leading-none">{selectedCountryItem.flag}</span>
                        <span>{paymentDialCode}</span>
                        <ChevronDown
                          className={`w-3.5 h-3.5 text-[#9A9A9A] transition-transform ${
                            isPaymentCountryDropdownOpen ? 'rotate-180' : ''
                          }`}
                        />
                      </button>
                      <input
                        type="tel"
                        value={paymentPhoneNumber}
                        onChange={(e) => setPaymentPhoneNumber(e.target.value)}
                        placeholder="07 00 00 00 00"
                        className="flex-1 min-h-[48px] bg-black border border-white/[0.16] focus:border-[#D4AF6A] rounded-[8px] px-3.5 text-sm text-white font-mono placeholder-[#555] focus:outline-none transition-colors"
                      />
                    </div>
                  </div>

                  {isPaymentCountryDropdownOpen && (
                    <div className="p-3 rounded-[10px] bg-[#0E0E0E] border border-white/[0.14] space-y-2">
                      <div className="relative">
                        <Search className="w-4 h-4 text-[#777] absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          value={countrySearchQuery}
                          onChange={(e) => setCountrySearchQuery(e.target.value)}
                          placeholder={t('checkout.searchCountry')}
                          className="w-full bg-black border border-white/[0.14] rounded-[8px] pl-9 pr-3 py-2 text-xs text-white placeholder-[#666] focus:outline-none focus:border-[#D4AF6A]"
                        />
                      </div>
                      <div className="max-h-44 overflow-y-auto divide-y divide-white/[0.06]">
                        {filteredCountries.map((c) => {
                          const isCurrent = c.dialCode === paymentDialCode;
                          return (
                            <button
                              key={`${c.name}-${c.dialCode}`}
                              type="button"
                              onClick={() => {
                                setPaymentDialCode(c.dialCode);
                                setCountry(c.id);
                                setIsPaymentCountryDropdownOpen(false);
                              }}
                              className={`w-full py-2 px-2.5 rounded-[6px] flex items-center justify-between text-left transition-colors cursor-pointer ${
                                isCurrent
                                  ? 'bg-white/10 text-white font-agrandir-bold'
                                  : 'hover:bg-white/[0.05] text-[#C8C8C8]'
                              }`}
                            >
                              <div className="flex items-center gap-2.5 min-w-0">
                                <span className="text-base">{c.flag}</span>
                                <span className="text-xs truncate">{c.name}</span>
                              </div>
                              <span className="font-mono text-[11px] text-[#9A9A9A] shrink-0">
                                {c.dialCode}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-4 rounded-[10px] bg-[#0E0E0E] border border-white/[0.12] flex items-start gap-3">
                  <Lock className="w-4 h-4 text-[#D4AF6A] shrink-0 mt-0.5" strokeWidth={1.7} />
                  <div className="space-y-1 text-xs">
                    <p className="font-agrandir-extrabold text-white">
                      {isEn
                        ? 'Encrypted card checkout via PayMeTrust'
                        : 'Paiement par carte chiffré via PayMeTrust'}
                    </p>
                    <p className="text-[#9A9A9A] leading-relaxed">
                      {isEn
                        ? 'Your card details are entered directly on PayMeTrust. LUMARÉEL never stores your card number.'
                        : 'Vos informations bancaires sont saisies directement sur PayMeTrust. LUMARÉEL ne stocke jamais votre carte.'}
                    </p>
                  </div>
                </div>
              )}

              {/* Sécurité PayMeTrust + CTA */}
              <div className="pt-2 space-y-3">
                <div className="flex items-center justify-between text-[11px] text-[#9A9A9A]">
                  <span className="inline-flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-[#D4AF6A]" strokeWidth={1.7} />
                    <span>
                      {isEn ? 'Secured by PayMeTrust' : 'Transaction sécurisée par PayMeTrust'}
                    </span>
                  </span>
                  <span className="font-mono text-white">SSL · 256-bit</span>
                </div>

                <button
                  type="button"
                  onClick={handleTriggerPayment}
                  disabled={isSubmitting}
                  className="w-full min-h-[52px] rounded-[8px] bg-[#D4AF6A] hover:bg-[#DFBE7D] active:scale-[0.99] text-black font-agrandir-extrabold text-sm uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>
                        {isEn ? 'Connecting to PayMeTrust...' : 'Connexion à PayMeTrust...'}
                      </span>
                    </>
                  ) : (
                    <>
                      <span>
                        {t('checkout.payBtn')} {finalTotalAmount.toLocaleString('fr-FR')} F CFA
                      </span>
                      <ArrowRight className="w-4 h-4" strokeWidth={1.8} />
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* ===================================================================== */}
          {/* ÉTAPE 4 : CONFIRMATION PAYMETRUST & BILLETS CERTIFIÉS                 */}
          {/* ===================================================================== */}
          {step === 4 && (
            <div>
              {/* CAS A : PASSERELLE PAYMETRUST ACTIVE */}
              {paymetrustTx && !createdOrder && (
                <div className="py-2 space-y-5 text-center">
                  <div className="p-5 sm:p-6 rounded-[12px] bg-[#0E0E0E] border border-white/[0.14] max-w-md mx-auto relative overflow-hidden">
                    <div className="absolute top-0 inset-x-0 h-[2px] bg-[#D4AF6A]" />

                    <div className="w-12 h-12 rounded-[10px] bg-black border border-white/[0.14] flex items-center justify-center mx-auto mb-4 text-white">
                      {paymentMethod === 'card' ? (
                        <CreditCard className="w-5 h-5 text-[#D4AF6A]" strokeWidth={1.6} />
                      ) : (
                        <Smartphone className="w-5 h-5 text-[#D4AF6A]" strokeWidth={1.6} />
                      )}
                    </div>

                    <p className="text-[10px] uppercase tracking-[0.22em] text-[#D4AF6A] font-mono font-bold mb-1">
                      PAYMETRUST · {paymetrustTx.channel.replace('_', ' ').toUpperCase()}
                    </p>

                    <h3 className="font-agrandir-extrabold text-xl uppercase tracking-tight text-white mb-4">
                      {paymetrustTx.mode === 'live'
                        ? isEn
                          ? 'Finalize on PayMeTrust'
                          : 'Finalisez sur PayMeTrust'
                        : isEn
                        ? 'PayMeTrust Checkout Ready'
                        : 'Validation du règlement'}
                    </h3>

                    <div className="bg-black p-4 rounded-[8px] border border-white/[0.1] mb-5 text-xs space-y-2 text-left">
                      <div className="flex justify-between gap-2">
                        <span className="text-[#9A9A9A]">{t('checkout.merchant')}</span>
                        <strong className="text-white">LUMARÉEL CO.</strong>
                      </div>
                      <div className="flex justify-between gap-2">
                        <span className="text-[#9A9A9A]">{t('checkout.amountToConfirm')}</span>
                        <strong className="text-[#D4AF6A] font-mono tabular-nums">
                          {paymetrustTx.amount.toLocaleString('fr-FR')} F CFA
                        </strong>
                      </div>
                      <div className="flex justify-between gap-2">
                        <span className="text-[#9A9A9A]">{t('checkout.orderRef')}</span>
                        <span className="text-white font-mono">
                          {pendingOrderRef || paymetrustTx.reference}
                        </span>
                      </div>
                      {paymentMethod !== 'card' && paymentPhoneNumber && (
                        <div className="flex justify-between gap-2">
                          <span className="text-[#9A9A9A]">{t('checkout.debitedAccount')}</span>
                          <span className="text-white font-mono">
                            {paymentDialCode} {paymentPhoneNumber}
                          </span>
                        </div>
                      )}
                    </div>

                    {paymetrustTx.mode === 'live' && paymetrustTx.paymentUrl ? (
                      <div className="space-y-2.5">
                        <button
                          type="button"
                          onClick={() => {
                            window.location.href = paymetrustTx.paymentUrl!;
                          }}
                          className="w-full min-h-[48px] rounded-[8px] bg-[#D4AF6A] hover:bg-[#DFBE7D] text-black font-agrandir-extrabold text-xs uppercase tracking-wider transition-colors flex items-center justify-center gap-2 cursor-pointer"
                        >
                          <Lock className="w-4 h-4" />
                          <span>
                            {isEn ? 'Open PayMeTrust Payment' : 'Payer sur PayMeTrust'}
                          </span>
                        </button>
                        <button
                          type="button"
                          onClick={handleVerifyPayMeTrustStatus}
                          disabled={gatewayProcessing}
                          className="w-full min-h-[44px] rounded-[8px] border border-white/25 hover:border-white text-white font-agrandir-bold text-xs uppercase tracking-wider transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                        >
                          {gatewayProcessing ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <CheckCircle2 className="w-4 h-4" />
                          )}
                          <span>
                            {isEn ? 'I already paid — Check status' : 'J’ai déjà payé — Vérifier'}
                          </span>
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <p className="text-[11px] text-[#9A9A9A] leading-relaxed">
                          {isEn
                            ? 'Preview environment active: confirm below to issue your certified QR tickets.'
                            : 'Mode prévisualisation actif : confirmez ci-dessous pour émettre vos billets QR certifiés.'}
                        </p>
                        <button
                          type="button"
                          onClick={handleConfirmPayMeTrustPreview}
                          disabled={gatewayProcessing}
                          className="w-full min-h-[48px] rounded-[8px] bg-[#D4AF6A] hover:bg-[#DFBE7D] text-black font-agrandir-extrabold text-xs uppercase tracking-wider transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                        >
                          {gatewayProcessing ? (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin" />
                              <span>{t('checkout.validatingDebit')}</span>
                            </>
                          ) : (
                            <>
                              <CheckCircle2 className="w-4 h-4" />
                              <span>
                                {isEn
                                  ? 'Confirm & issue tickets'
                                  : 'Confirmer et émettre les billets'}
                              </span>
                            </>
                          )}
                        </button>
                      </div>
                    )}

                    <button
                      type="button"
                      onClick={() => {
                        setPaymetrustTx(null);
                        setStep(3);
                      }}
                      className="w-full mt-2.5 min-h-[42px] rounded-[8px] border border-white/[0.12] hover:border-white/30 text-xs font-agrandir-semibold text-[#9A9A9A] hover:text-white transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" />
                      <span>{t('checkout.backToPayment')}</span>
                    </button>
                  </div>
                </div>
              )}

              {/* CAS B : BILLETS ÉMIS */}
              {!paymetrustTx && createdOrder && (
                <div className="text-center py-2 space-y-5">
                  <div className="w-12 h-12 rounded-full bg-[#0F2A1A] border border-[#7FE0A6]/40 flex items-center justify-center mx-auto text-[#7FE0A6]">
                    <CheckCircle2 className="w-6 h-6" strokeWidth={1.7} />
                  </div>

                  <div>
                    <p className="text-[10px] font-mono tracking-[0.24em] text-[#D4AF6A] uppercase mb-1">
                      {t('checkout.orderSuccess')}
                    </p>
                    <h2 className="font-agrandir-extrabold text-2xl text-white uppercase tracking-tight">
                      {t('checkout.ticketsReady')}
                    </h2>
                    <p className="text-xs text-[#9A9A9A] max-w-md mx-auto mt-1">
                      {isEn ? 'Order' : 'Commande'}{' '}
                      <span className="text-white font-mono">{createdOrder.reference}</span> ·{' '}
                      <span className="text-white">{createdOrder.customerEmail}</span>
                    </p>
                  </div>

                  <div className="flex justify-center">
                    <button
                      type="button"
                      onClick={() => setShowEmailPreview(true)}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#0E0E0E] hover:bg-[#161616] border border-white/[0.16] text-white text-xs font-agrandir-semibold transition-colors cursor-pointer"
                    >
                      <Mail className="w-3.5 h-3.5 text-[#D4AF6A]" />
                      <span>{t('checkout.viewEmail')}</span>
                    </button>
                  </div>

                  <div className="space-y-2.5 text-left">
                    {issuedTickets.map((tkt) => (
                      <div
                        key={tkt.id}
                        className="p-4 bg-[#0E0E0E] border border-white/[0.12] rounded-[10px] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs"
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 text-white font-agrandir-semibold text-sm">
                            <TicketIcon className="w-4 h-4 text-[#D4AF6A] shrink-0" />
                            <span className="font-mono">{tkt.serialNumber}</span>
                            <span className="text-[9px] bg-[#0F2A1A] text-[#7FE0A6] border border-[#7FE0A6]/25 px-2 py-0.5 rounded-full uppercase font-bold">
                              {t('checkout.certified')}
                            </span>
                          </div>
                          <div className="text-[#9A9A9A] text-[11px] mt-1">
                            {tkt.categoryName} · {tkt.holderName}
                          </div>
                        </div>

                        <a
                          href={`/api/customer/tickets/${tkt.id}/print`}
                          target="_blank"
                          rel="noreferrer"
                          className="px-3.5 py-2 border border-white/[0.16] hover:border-white rounded-[8px] bg-black text-white transition-colors flex items-center gap-1.5 text-[11px] font-agrandir-semibold shrink-0 cursor-pointer"
                        >
                          <Printer className="w-3.5 h-3.5" />
                          <span>{t('checkout.printPdf')}</span>
                        </a>
                      </div>
                    ))}
                  </div>

                  <div className="flex flex-col sm:flex-row items-center justify-center gap-2.5 pt-3 border-t border-white/[0.1]">
                    <button
                      type="button"
                      onClick={handleGoToCustomerTickets}
                      className="w-full sm:w-auto min-h-[48px] px-6 rounded-[8px] bg-[#D4AF6A] hover:bg-[#DFBE7D] text-black text-xs font-agrandir-extrabold tracking-wider uppercase transition-colors flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <span>{t('checkout.accessClientSpace')}</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>

                    <button
                      type="button"
                      onClick={handleClose}
                      className="w-full sm:w-auto min-h-[48px] px-6 rounded-[8px] border border-white/[0.16] hover:border-white text-[#C8C8C8] hover:text-white transition-colors text-xs font-agrandir-semibold uppercase tracking-wider cursor-pointer"
                    >
                      {t('nav.close')}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

      {/* ========================================================================= */}
      {/* BARRE FIXE BASSE (ÉTAPES 1 & 2)                                           */}
      {/* ========================================================================= */}
      {step < 3 && (
        <footer className="sticky bottom-0 z-30 border-t border-white/[0.12] bg-black/95 backdrop-blur-xl py-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <div className="w-full max-w-2xl mx-auto px-4 sm:px-6">
            <div className="flex items-center justify-between gap-3 mb-3">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-widest text-[#9A9A9A] block">
                  {t('checkout.total')}
                </span>
                <span className="font-mono font-bold text-lg sm:text-xl text-white tabular-nums">
                  {finalTotalAmount.toLocaleString('fr-FR')}{' '}
                  <span className="text-xs text-[#D4AF6A]">F CFA</span>
                </span>
              </div>

              <div className="flex items-center gap-2">
                <span
                  className={`px-3 py-1 rounded-full text-xs font-mono font-bold tabular-nums ${
                    totalQuantity > 0
                      ? 'bg-white text-black'
                      : 'bg-white/[0.06] text-[#777] border border-white/[0.08]'
                  }`}
                >
                  {String(totalQuantity).padStart(2, '0')}{' '}
                  {totalQuantity > 1 ? t('checkout.ticketPlural') : t('checkout.ticketSingle')}
                </span>

                {step === 1 && totalQuantity > 0 && (
                  <button
                    type="button"
                    onClick={() => setQuantities({})}
                    className="w-7 h-7 rounded-full bg-white/[0.08] hover:bg-white/[0.16] text-[#C8C8C8] hover:text-white flex items-center justify-center transition-colors cursor-pointer"
                    aria-label={t('checkout.clearSelection')}
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {step === 1 && (
              <button
                type="button"
                onClick={handleProceedToSummary}
                disabled={totalQuantity === 0}
                className="w-full min-h-[50px] px-6 rounded-[8px] bg-white hover:bg-neutral-200 text-black font-agrandir-extrabold text-xs sm:text-sm uppercase tracking-wider transition-colors flex items-center justify-center gap-2 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
              >
                <span>{t('checkout.continue')}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            )}

            {step === 2 && (
              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="min-h-[50px] px-4 rounded-[8px] border border-white/[0.16] hover:border-white text-xs font-agrandir-semibold text-[#C8C8C8] hover:text-white transition-colors cursor-pointer shrink-0"
                >
                  {t('checkout.back')}
                </button>
                <button
                  type="button"
                  onClick={handleProceedToPayment}
                  className="flex-1 min-h-[50px] px-6 rounded-[8px] bg-[#D4AF6A] hover:bg-[#DFBE7D] text-black font-agrandir-extrabold text-xs sm:text-sm uppercase tracking-wider transition-colors flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>{t('checkout.proceedToPayment')}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </footer>
      )}

        {/* SUBMODAL : APERÇU EMAIL DE CONFIRMATION */}
        {showEmailPreview && createdOrder && (
          <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4">
            <div className="bg-[#0E0E0E] border border-white/[0.16] rounded-[12px] max-w-2xl w-full p-5 space-y-4 shadow-2xl text-left">
              <div className="flex items-center justify-between border-b border-white/[0.1] pb-3">
                <div className="flex items-center gap-2 min-w-0">
                  <Sparkles className="w-4 h-4 text-[#D4AF6A] shrink-0" />
                  <h3 className="font-agrandir-bold text-xs sm:text-sm text-white uppercase truncate">
                    {isEn ? 'CONFIRMATION EMAIL SENT TO' : 'E-MAIL ENVOYÉ À'}{' '}
                    {createdOrder.customerEmail}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setShowEmailPreview(false)}
                  className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-white/20 cursor-pointer shrink-0"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="rounded-[8px] border border-white/[0.1] overflow-hidden bg-black h-96">
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

              <div className="text-right">
                <button
                  type="button"
                  onClick={() => setShowEmailPreview(false)}
                  className="px-5 py-2.5 rounded-[8px] bg-white text-black font-agrandir-extrabold text-xs uppercase cursor-pointer"
                >
                  {t('checkout.closePreview')}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* TIROIR PAYS & INDICATIFS */}
        {isCountryDrawerOpen && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
            <div
              className="fixed inset-0 bg-black/80 backdrop-blur-sm"
              onClick={() => setIsCountryDrawerOpen(false)}
            />
            <div className="relative z-10 w-full max-w-lg bg-[#0E0E0E] border border-white/[0.14] rounded-t-[16px] sm:rounded-[12px] shadow-2xl max-h-[85vh] flex flex-col overflow-hidden text-left">
              <div className="p-5 border-b border-white/[0.1] flex items-center justify-between">
                <div>
                  <h3 className="font-agrandir-extrabold text-base text-white uppercase">
                    {t('checkout.selectCountryTitle')}
                  </h3>
                  <p className="text-[11px] text-[#9A9A9A] mt-0.5">
                    {t('checkout.selectCountryDesc')}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsCountryDrawerOpen(false)}
                  className="w-8 h-8 rounded-full bg-white/[0.06] hover:bg-white/[0.14] text-white flex items-center justify-center cursor-pointer"
                  aria-label={t('nav.close')}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-4 border-b border-white/[0.1] bg-[#090909]">
                <div className="relative">
                  <Search className="w-4 h-4 text-[#777] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    value={countrySearchQuery}
                    onChange={(e) => setCountrySearchQuery(e.target.value)}
                    placeholder={t('checkout.searchCountry')}
                    className="w-full bg-black border border-white/[0.14] rounded-[8px] pl-10 pr-9 py-2.5 text-xs text-white placeholder-[#666] focus:outline-none focus:border-[#D4AF6A]"
                    autoFocus
                  />
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-1.5 max-h-[58vh]">
                {filteredCountries.map((c) => {
                  const currentDial =
                    countryDrawerTarget === 'customer' ? customerDialCode : paymentDialCode;
                  const isSelected = currentDial === c.dialCode;
                  return (
                    <button
                      key={c.name + c.dialCode}
                      type="button"
                      onClick={() => handleSelectCountry(c)}
                      className={`w-full p-3 rounded-[8px] border flex items-center justify-between transition-colors cursor-pointer text-left ${
                        isSelected
                          ? 'bg-[#15130E] border-[#D4AF6A] text-white'
                          : 'bg-[#090909] border-white/[0.08] hover:border-white/25 text-[#C8C8C8]'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="text-xl shrink-0">{c.flag}</span>
                        <span className="font-agrandir-bold text-xs uppercase truncate text-white">
                          {c.name}
                        </span>
                      </div>
                      <span className="font-mono text-xs text-[#D4AF6A] shrink-0">
                        {c.dialCode}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}
    </div>
  );
};
