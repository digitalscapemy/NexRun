"use client";

import React, { useEffect, useState, use, startTransition } from "react";
import Link from "next/link";
import { trpc } from "@/lib/trpc";
import { formatCurrency } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import {
  Compass,
  User,
  Shirt,
  Receipt,
  CreditCard,
  CheckCircle2,
  Calendar,
  MapPin,
  Plus,
  Trash2,
  Info,
} from "lucide-react";
import toast from "react-hot-toast";

type Step = "CATEGORY" | "PARTICIPANTS" | "SHIRT_MEDICAL" | "SUMMARY" | "PAYMENT" | "SUCCESS";

interface ParticipantDetails {
  ticketCategoryId: string;
  fullName: string;
  icNumber: string;
  nationality: string;
  gender: "MALE" | "FEMALE";
  phone: string;
  email: string;
  dateOfBirth: string;
  tshirtType: "MICROFIBER" | "COTTON";
  tshirtSize: "XS" | "S" | "M" | "L" | "XL" | "XXL" | "3XL";
  bloodType: string;
  medicalConditions: string;
  emergencyContactName: string;
  emergencyContactPhone: string;
}

const initialParticipant = (ticketCategoryId = ""): ParticipantDetails => ({
  ticketCategoryId,
  fullName: "",
  icNumber: "",
  nationality: "Malaysian",
  gender: "MALE",
  phone: "",
  email: "",
  dateOfBirth: "",
  tshirtType: "MICROFIBER",
  tshirtSize: "M",
  bloodType: "",
  medicalConditions: "",
  emergencyContactName: "",
  emergencyContactPhone: "",
});

interface WizardDraft {
  step: Step;
  selectedCategoryId: string;
  participants: ParticipantDetails[];
  voucherCodeInput: string;
  activeVoucherCode: string | null;
  acceptTerms: boolean;
  acceptPrivacy: boolean;
  savedAt: string;
}

const DRAFT_RESUMABLE_STEPS: Step[] = ["CATEGORY", "PARTICIPANTS", "SHIRT_MEDICAL", "SUMMARY"];

export default function RegistrationWizardPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const draftKey = `nexrun:registration-draft:${resolvedParams.id}`;

  // Step state
  const [step, setStep] = useState<Step>("CATEGORY");

  // Selection states
  const [selectedCategoryId, setSelectedCategoryId] = useState("");
  const [participants, setParticipants] = useState<ParticipantDetails[]>([initialParticipant()]);
  const [voucherCodeInput, setVoucherCodeInput] = useState("");
  const [activeVoucherCode, setActiveVoucherCode] = useState<string | null>(null);

  // Billing summary state calculated during step transitions
  const [orderSummary, setOrderSummary] = useState<{
    orderId: string;
    orderNumber: string;
    totalPaidSen: number;
    expiresAt: Date | string | null;
  } | null>(null);

  const [acceptTerms, setAcceptTerms] = useState(false);
  const [acceptPrivacy, setAcceptPrivacy] = useState(false);
  const [participantErrors, setParticipantErrors] = useState<Record<number, Partial<Record<keyof ParticipantDetails, string>>>>({});
  const [paymentMethod, setPaymentMethod] = useState<"ONLINE_BANKING" | "EWALLET" | "CARD">("ONLINE_BANKING");
  const [checkoutIdempotencyKey, setCheckoutIdempotencyKey] = useState(() => crypto.randomUUID());
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const [draftRestored, setDraftRestored] = useState(false);
  const [draftBannerDismissed, setDraftBannerDismissed] = useState(true);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);

  // B-21: Restore a saved wizard draft on mount (before order creation only)
  useEffect(() => {
    if (typeof window === "undefined") return;
    startTransition(() => {
      try {
        const raw = window.localStorage.getItem(draftKey);
        if (!raw) return;
        const draft: WizardDraft = JSON.parse(raw);
        if (!DRAFT_RESUMABLE_STEPS.includes(draft.step)) return;
        setSelectedCategoryId(draft.selectedCategoryId);
        setParticipants(draft.participants);
        setVoucherCodeInput(draft.voucherCodeInput);
        setActiveVoucherCode(draft.activeVoucherCode);
        setAcceptTerms(draft.acceptTerms);
        setAcceptPrivacy(draft.acceptPrivacy);
        setStep(draft.step);
        setLastSavedAt(new Date(draft.savedAt));
        setDraftBannerDismissed(false);
      } catch {
        window.localStorage.removeItem(draftKey);
      } finally {
        setDraftRestored(true);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // B-21: Persist wizard progress to localStorage while the user is still filling in the form
  useEffect(() => {
    if (!draftRestored || typeof window === "undefined") return;
    if (!DRAFT_RESUMABLE_STEPS.includes(step)) {
      window.localStorage.removeItem(draftKey);
      return;
    }
    const savedAt = new Date();

    // Strip PII (IC numbers, medical conditions, emergency contact phone) before persisting
    const sanitizedParticipants = participants.map((p) => ({
      ...p,
      icNumber: "",
      medicalConditions: "",
      emergencyContactPhone: "",
    }));

    const draft: WizardDraft = {
      step,
      selectedCategoryId,
      participants: sanitizedParticipants,
      voucherCodeInput,
      activeVoucherCode,
      acceptTerms,
      acceptPrivacy,
      savedAt: savedAt.toISOString(),
    };
    window.localStorage.setItem(draftKey, JSON.stringify(draft));
    startTransition(() => {
      setLastSavedAt(savedAt);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draftRestored, step, selectedCategoryId, participants, voucherCodeInput, activeVoucherCode, acceptTerms, acceptPrivacy]);

  const clearDraft = () => {
    if (typeof window === "undefined") return;
    window.localStorage.removeItem(draftKey);
  };

  const discardDraft = () => {
    clearDraft();
    setSelectedCategoryId("");
    setParticipants([initialParticipant()]);
    setVoucherCodeInput("");
    setActiveVoucherCode(null);
    setAcceptTerms(false);
    setAcceptPrivacy(false);
    setStep("CATEGORY");
    setDraftBannerDismissed(true);
    setLastSavedAt(null);
  };

  // Fetch Event details
  const { data: event, isLoading, error } = trpc.event.getEventBySlug.useQuery({
    slug: resolvedParams.id,
  });
  const { data: feeDisclosure } = trpc.registration.getPaymentFeeDisclosure.useQuery();
  const processingFeePercentage = feeDisclosure?.processingFeePercentage ?? 3;

  useEffect(() => {
    if (!orderSummary?.expiresAt || step !== "PAYMENT") return;
    const update = () => {
      setRemainingSeconds(Math.max(0, Math.floor((new Date(orderSummary.expiresAt!).getTime() - Date.now()) / 1000)));
    };
    update();
    const interval = window.setInterval(update, 1000);
    return () => window.clearInterval(interval);
  }, [orderSummary, step]);

  // Fetch Voucher query (only run when activeVoucherCode is set)
  const { data: voucherData, error: voucherError, isFetching: isValidatingVoucher } =
    trpc.registration.validateVoucher.useQuery(
      { eventId: event?.id || "", code: activeVoucherCode || "" },
      { enabled: !!activeVoucherCode && !!event?.id, retry: false }
    );

  // Mutations
  const createOrderMutation = trpc.registration.createOrder.useMutation({
    onSuccess: (data) => {
      setOrderSummary(data);
      setStep("PAYMENT");
    },
    onError: (err) => {
      toast.error(err.message || "Failed to create order. Please try again.");
    },
  });

  const paymentMutation = trpc.registration.processMockPayment.useMutation({
    onSuccess: (data) => {
      if (data.status === "PAID") {
        toast.success("Payment confirmed. Your registrations are ready.");
        clearDraft();
        setStep("SUCCESS");
        return;
      }
      toast(data.message);
    },
    onError: (err) => {
      toast.error(err.message || "Payment could not be completed.");
    },
  });

  // Calculate pricing subtotals locally for preview
  const getSubtotal = () => {
    if (!event) return 0;
    const now = new Date();
    return participants.reduce((total, participant) => {
      const category = event.categories.find((item) => item.id === participant.ticketCategoryId);
      if (!category) return total;
      const isEarlyBird = category.earlyBirdPriceSen !== null && category.earlyBirdDeadline !== null && now <= new Date(category.earlyBirdDeadline);
      return total + (isEarlyBird ? category.earlyBirdPriceSen! : category.priceSen);
    }, 0);
  };

  const getDiscount = (subtotal: number) => {
    if (!voucherData) return 0;
    if (voucherData.discountType === "PERCENTAGE") {
      return Math.round((subtotal * voucherData.discountValue) / 100);
    }
    const fixedDiscount =
      voucherData.applicationPolicy === "PER_PARTICIPANT"
        ? voucherData.discountValue * participants.length
        : voucherData.discountValue;
    return Math.min(fixedDiscount, subtotal);
  };

  const handleApplyVoucher = () => {
    if (!voucherCodeInput.trim()) {
      toast.error("Please enter a voucher code.");
      return;
    }
    setActiveVoucherCode(voucherCodeInput);
    toast.success("Voucher applied! Validating...");
  };

  const handleAddParticipant = () => {
    setParticipants([...participants, initialParticipant(selectedCategoryId)]);
  };

  const handleRemoveParticipant = (idx: number) => {
    if (participants.length <= 1) return;
    setParticipants(participants.filter((_, i) => i !== idx));
  };

  const updateParticipant = <K extends keyof ParticipantDetails>(
    idx: number,
    key: K,
    val: ParticipantDetails[K]
  ) => {
    const next = [...participants];
    next[idx] = { ...next[idx], [key]: val };
    setParticipants(next);
  };

  // Step 1 check
  const handleCategoryNext = () => {
    if (!selectedCategoryId) {
      toast.error("Please select a ticket category.");
      return;
    }
    setParticipants((current) => current.map((participant) => ({
      ...participant,
      ticketCategoryId: participant.ticketCategoryId || selectedCategoryId,
    })));
    setStep("PARTICIPANTS");
  };

  // Step 2 validation
  const handleParticipantsNext = () => {
    const errors: Record<number, Partial<Record<keyof ParticipantDetails, string>>> = {};
    for (let i = 0; i < participants.length; i++) {
      const p = participants[i];
      const errs: Partial<Record<keyof ParticipantDetails, string>> = {};
      if (!p.ticketCategoryId) errs.ticketCategoryId = "Please select a ticket category.";
      if (!p.fullName.trim() || p.fullName.length < 3) errs.fullName = "Name must be at least 3 characters.";
      if (!p.icNumber.trim() || p.icNumber.length < 6) errs.icNumber = "Valid IC / Passport is required.";
      if (!p.email.trim() || !p.email.includes("@")) errs.email = "Valid email is required.";
      if (!p.phone.trim() || p.phone.length < 8) errs.phone = "Valid phone number is required.";
      if (!p.dateOfBirth) errs.dateOfBirth = "Date of birth is required.";
      if (Object.keys(errs).length > 0) errors[i] = errs;
    }
    if (Object.keys(errors).length > 0) {
      setParticipantErrors(errors);
      setTimeout(() => {
        document.querySelector("[data-participant-error]")?.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 0);
      return;
    }
    setParticipantErrors({});
    setStep("SHIRT_MEDICAL");
  };

  // Step 3 validation
  const handleShirtMedicalNext = () => {
    const errors: Record<number, Partial<Record<keyof ParticipantDetails, string>>> = {};
    for (let i = 0; i < participants.length; i++) {
      const p = participants[i];
      const errs: Partial<Record<keyof ParticipantDetails, string>> = {};
      if (!p.emergencyContactName.trim()) errs.emergencyContactName = "Emergency contact name required.";
      if (!p.emergencyContactPhone.trim()) errs.emergencyContactPhone = "Emergency contact phone required.";
      if (Object.keys(errs).length > 0) errors[i] = errs;
    }
    if (Object.keys(errors).length > 0) {
      setParticipantErrors(errors);
      setTimeout(() => {
        document.querySelector("[data-participant-error]")?.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 0);
      return;
    }
    setParticipantErrors({});
    setStep("SUMMARY");
  };

  // Step 4 checkout action
  const handleCreateOrder = () => {
    if (!event || !selectedCategoryId) return;
    if (!acceptTerms || !acceptPrivacy) {
      toast.error("Please accept the event terms and privacy notice to continue.");
      return;
    }

    createOrderMutation.mutate({
      eventId: event.id,
      registrations: participants.map((p) => ({
        ...p,
        dateOfBirth: new Date(p.dateOfBirth).toISOString(),
      })),
      voucherCode: voucherData ? voucherData.code : null,
      idempotencyKey: checkoutIdempotencyKey,
      acceptTerms: true,
      acceptPrivacy: true,
    });
  };

  const handlePayment = () => {
    if (!orderSummary) return;

    paymentMutation.mutate({
      orderId: orderSummary.orderId,
      paymentMethod,
      scenario: "SUCCESS",
      idempotencyKey: `payment:${orderSummary.orderId}:success`,
    });
  };

  const restartCheckout = () => {
    setOrderSummary(null);
    setCheckoutIdempotencyKey(crypto.randomUUID());
    setStep("SUMMARY");
  };

  if (isLoading) {
    return (
      <div className="fluid-container py-12">
        <div className="mx-auto max-w-5xl animate-pulse space-y-8">
          <div className="h-8 w-48 bg-neutral-200 dark:bg-neutral-800 rounded-md" />
          <div className="h-64 w-full bg-neutral-200 dark:bg-neutral-800 rounded-md" />
        </div>
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="fluid-container py-24">
        <div className="mx-auto max-w-md text-center">
          <h2 className="text-xl font-bold">Event Registration Error</h2>
          <p className="mt-2 text-sm text-neutral-500">Failed to load registration module.</p>
        </div>
      </div>
    );
  }

  const registrationNow = new Date();
  const registrationAvailable =
    event.status === "PUBLISHED" &&
    registrationNow >= new Date(event.registrationOpenDate) &&
    registrationNow <= new Date(event.registrationCloseDate);

  if (!registrationAvailable) {
    const unavailableMessage = event.status === "COMPLETED"
      ? "This event has been completed and is no longer accepting registrations."
      : event.status === "REGISTRATION_CLOSED" || registrationNow > new Date(event.registrationCloseDate)
        ? "Registration for this event has closed."
        : "Registration for this event is not available yet.";

    return (
      <div className="fluid-container py-16 sm:py-24">
        <div className="mx-auto max-w-md rounded-2xl border border-neutral-200 bg-white p-6 text-center shadow-sm dark:border-neutral-800 dark:bg-neutral-900 sm:p-8">
          <Info className="mx-auto h-12 w-12 text-primary-500" aria-hidden="true" />
          <h1 className="mt-4 text-2xl font-bold text-neutral-900 dark:text-neutral-50">Registration unavailable</h1>
          <p className="mt-2 text-sm leading-relaxed text-neutral-500 dark:text-neutral-400">{unavailableMessage}</p>
          <Link
            href={`/events/${event.slug}`}
            className="mt-6 inline-flex min-h-11 items-center justify-center rounded-xl bg-primary-500 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-primary-600"
          >
            View event details
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="fluid-container py-8 sm:py-12">
      <div className="mx-auto max-w-5xl space-y-8">
        {/* Event Header Banner */}
      <div className="flex flex-col md:flex-row items-center justify-between border-b pb-6 gap-4">
        <div>
          <span className="text-xs text-primary-500 font-bold uppercase tracking-wider">
            Registration Module
          </span>
          <h1 className="text-3xl font-extrabold tracking-tight text-neutral-900 dark:text-neutral-50">
            {event.title}
          </h1>
          <p className="mt-1 text-sm text-neutral-500 flex items-center gap-1">
            <Calendar className="h-4 w-4" />
            <span>
              {new Date(event.eventDate).toLocaleDateString("en-MY", {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </span>
            <span className="mx-2">|</span>
            <MapPin className="h-4 w-4" />
            <span>{event.venue}</span>
          </p>
        </div>
      </div>

      {/* B-21: Resume draft banner */}
      {!draftBannerDismissed && step !== "SUCCESS" && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-primary-200 bg-primary-50/70 p-4 text-sm dark:border-primary-900/50 dark:bg-primary-950/20">
          <div className="flex items-start gap-2.5">
            <Info className="h-4 w-4 text-primary-500 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-neutral-900 dark:text-neutral-100">Resumed your saved registration draft.</p>
              {lastSavedAt && (
                <p className="text-xs text-neutral-500 mt-0.5">
                  Last saved at {lastSavedAt.toLocaleTimeString("en-MY", { hour: "2-digit", minute: "2-digit" })}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button type="button" variant="ghost" size="sm" onClick={() => setDraftBannerDismissed(true)} className="h-8 text-xs font-bold text-neutral-500">
              Keep editing
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={discardDraft} className="h-8 text-xs font-bold text-error-600 border-error-200 hover:bg-error-50">
              Start fresh
            </Button>
          </div>
        </div>
      )}

      {/* 5-Step Progress Stepper Header */}
      {step !== "SUCCESS" && (
        <div className="space-y-1.5">
          <div className="grid grid-cols-5 gap-2 text-center text-[10px] font-bold tracking-wider uppercase">
            <div className={`pb-2 border-b-2 ${step === "CATEGORY" ? "border-primary-500 text-primary-500" : "border-neutral-200 text-neutral-400"}`}>
              <Compass className="h-4 w-4 mx-auto mb-1" />
              <span className="hidden sm:inline">1. Category</span>
            </div>
            <div className={`pb-2 border-b-2 ${step === "PARTICIPANTS" ? "border-primary-500 text-primary-500" : "border-neutral-200 text-neutral-400"}`}>
              <User className="h-4 w-4 mx-auto mb-1" />
              <span className="hidden sm:inline">2. Profiles</span>
            </div>
            <div className={`pb-2 border-b-2 ${step === "SHIRT_MEDICAL" ? "border-primary-500 text-primary-500" : "border-neutral-200 text-neutral-400"}`}>
              <Shirt className="h-4 w-4 mx-auto mb-1" />
              <span className="hidden sm:inline">3. Swag</span>
            </div>
            <div className={`pb-2 border-b-2 ${step === "SUMMARY" ? "border-primary-500 text-primary-500" : "border-neutral-200 text-neutral-400"}`}>
              <Receipt className="h-4 w-4 mx-auto mb-1" />
              <span className="hidden sm:inline">4. Invoice</span>
            </div>
            <div className={`pb-2 border-b-2 ${step === "PAYMENT" ? "border-primary-500 text-primary-500" : "border-neutral-200 text-neutral-400"}`}>
              <CreditCard className="h-4 w-4 mx-auto mb-1" />
              <span className="hidden sm:inline">5. Checkout</span>
            </div>
          </div>
          {lastSavedAt && DRAFT_RESUMABLE_STEPS.includes(step) && (
            <p className="text-right text-[10px] font-medium text-neutral-400">
              Draft saved at {lastSavedAt.toLocaleTimeString("en-MY", { hour: "2-digit", minute: "2-digit" })}
            </p>
          )}
        </div>
      )}

      {/* Stepper Wizard Panels */}
      {step === "CATEGORY" && (
        <div className="space-y-6">
          <h2 className="text-xl font-bold text-neutral-900 dark:text-neutral-50">Select Ticket Category</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {event.categories.map((cat) => {
              const isSelected = selectedCategoryId === cat.id;
              const slotsLeft = cat.maxSlots ? Math.max(0, cat.maxSlots - cat.currentRegistrations) : null;
              const isUnavailable = slotsLeft === 0;
              const earlyBirdActive = cat.earlyBirdPriceSen !== null && cat.earlyBirdDeadline !== null && new Date() <= new Date(cat.earlyBirdDeadline);
              return (
                <Card
                  key={cat.id}
                  role="button"
                  tabIndex={isUnavailable ? -1 : 0}
                  aria-pressed={isSelected}
                  aria-disabled={isUnavailable}
                  onKeyDown={(event) => {
                    if (!isUnavailable && (event.key === "Enter" || event.key === " ")) setSelectedCategoryId(cat.id);
                  }}
                  onClick={() => !isUnavailable && setSelectedCategoryId(cat.id)}
                  className={`p-6 border cursor-pointer transition hover:shadow-md flex flex-col justify-between min-h-50 rounded-2xl ${
                    isUnavailable ? "cursor-not-allowed opacity-60" : ""
                  } ${
                    isSelected
                      ? "border-primary-500 bg-primary-50/20 dark:bg-primary-950/10 shadow-xs"
                      : "border-neutral-200 bg-white dark:border-neutral-800"
                  }`}
                >
                  <div>
                    <span className="rounded bg-neutral-100 dark:bg-neutral-800 px-2 py-0.5 text-[10px] font-bold text-neutral-600 dark:text-neutral-400">
                      {cat.distance}KM • {cat.gender}
                    </span>
                    <h3 className="mt-3 font-extrabold text-lg text-neutral-900 dark:text-neutral-50">{cat.name}</h3>
                    <p className="text-xs text-neutral-500 mt-1">Age Eligibility: {cat.ageMin}-{cat.ageMax} yrs</p>
                  </div>
                  <div className="mt-6 flex items-end justify-between">
                    <div>
                      {slotsLeft !== null && (
                        <span className="text-[10px] text-error-600 font-bold block mb-0.5">
                          {slotsLeft === 0 ? "Sold out" : `${slotsLeft} slots remaining`}
                        </span>
                      )}
                      <span className="text-lg font-black text-primary-500">
                        {formatCurrency(earlyBirdActive ? cat.earlyBirdPriceSen! : cat.priceSen)}
                      </span>
                      {earlyBirdActive && <span className="ml-2 text-xs text-neutral-400 line-through">{formatCurrency(cat.priceSen)}</span>}
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
          <div className="flex justify-end pt-4">
            <Button onClick={handleCategoryNext} className="bg-primary-500 hover:bg-primary-600 text-white font-semibold">
              Continue to Participant Profile &rarr;
            </Button>
          </div>
        </div>
      )}

      {step === "PARTICIPANTS" && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-neutral-900 dark:text-neutral-50">Participant Profiles</h2>
            <Button type="button" variant="outline" size="sm" onClick={handleAddParticipant} className="gap-1 border-primary-500/20 text-primary-600 hover:bg-primary-50">
              <Plus className="h-4 w-4" />
              <span>Add Participant (Group)</span>
            </Button>
          </div>

          {participants.map((p, idx) => (
            <div key={idx} className="border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900/50 p-6 rounded-2xl relative space-y-4">
              {participants.length > 1 && (
                <button
                  type="button"
                  onClick={() => handleRemoveParticipant(idx)}
                  className="absolute top-4 right-4 text-neutral-400 hover:text-error-600"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}

              <h3 className="font-bold text-sm text-neutral-700">Participant #{idx + 1} Profile Info</h3>

              <div className="space-y-1">
                <Label htmlFor={`participant-${idx}-category`}>Ticket category</Label>
                <select
                  id={`participant-${idx}-category`}
                  value={p.ticketCategoryId}
                  onChange={(event) => updateParticipant(idx, "ticketCategoryId", event.target.value)}
                  className="h-10 w-full rounded-xl border border-neutral-200 bg-transparent px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 dark:border-neutral-800"
                >
                  {event.categories.map((category) => {
                    const available = category.maxSlots === null || category.currentRegistrations < category.maxSlots;
                    return <option key={category.id} value={category.id} disabled={!available}>{category.name} · {category.distance}KM{available ? "" : " · Sold out"}</option>;
                  })}
                </select>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-1">
                  <Label>Full Name (as in NRIC/Passport)</Label>
                  <Input
                    placeholder="Ahmad Hafizuddin"
                    value={p.fullName}
                    onChange={(e) => updateParticipant(idx, "fullName", e.target.value)}
                  />
                  {participantErrors[idx]?.fullName && <p data-participant-error className="mt-0.5 text-xs text-error-600 font-semibold">{participantErrors[idx].fullName}</p>}
                </div>
                <div className="space-y-1">
                  <Label>IC / Passport Number</Label>
                  <Input
                    placeholder="990101141234"
                    value={p.icNumber}
                    onChange={(e) => updateParticipant(idx, "icNumber", e.target.value)}
                  />
                  {participantErrors[idx]?.icNumber && <p data-participant-error className="mt-0.5 text-xs text-error-600 font-semibold">{participantErrors[idx].icNumber}</p>}
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-1">
                  <Label>Nationality</Label>
                  <Input
                    value={p.nationality}
                    onChange={(e) => updateParticipant(idx, "nationality", e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <Label>Gender</Label>
                  <select
                    value={p.gender}
                    onChange={(e) => updateParticipant(idx, "gender", e.target.value as "MALE" | "FEMALE")}
                    className="w-full border border-neutral-200 dark:border-neutral-800 bg-transparent px-3 py-2 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="MALE">Male</option>
                    <option value="FEMALE">Female</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <Label>Date of Birth</Label>
                  <Input
                    type="date"
                    value={p.dateOfBirth.split("T")[0]}
                    onChange={(e) => updateParticipant(idx, "dateOfBirth", e.target.value ? new Date(e.target.value).toISOString() : "")}
                  />
                  {participantErrors[idx]?.dateOfBirth && <p data-participant-error className="mt-0.5 text-xs text-error-600 font-semibold">{participantErrors[idx].dateOfBirth}</p>}
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-1">
                  <Label>Email</Label>
                  <Input
                    placeholder="runner@gmail.com"
                    value={p.email}
                    onChange={(e) => updateParticipant(idx, "email", e.target.value)}
                  />
                  {participantErrors[idx]?.email && <p data-participant-error className="mt-0.5 text-xs text-error-600 font-semibold">{participantErrors[idx].email}</p>}
                </div>
                <div className="space-y-1">
                  <Label>Phone Number</Label>
                  <Input
                    placeholder="012-3456789"
                    value={p.phone}
                    onChange={(e) => updateParticipant(idx, "phone", e.target.value)}
                  />
                  {participantErrors[idx]?.phone && <p data-participant-error className="mt-0.5 text-xs text-error-600 font-semibold">{participantErrors[idx].phone}</p>}
                </div>
              </div>
            </div>
          ))}

          <div className="flex justify-between pt-4">
            <Button variant="outline" onClick={() => setStep("CATEGORY")}>
              &larr; Back
            </Button>
            <Button onClick={handleParticipantsNext} className="bg-primary-500 hover:bg-primary-600 text-white font-semibold">
              Continue to shirt and emergency details &rarr;
            </Button>
          </div>
        </div>
      )}

      {step === "SHIRT_MEDICAL" && (
        <div className="space-y-6">
          <h2 className="text-xl font-bold text-neutral-900 dark:text-neutral-50">T-Shirt &amp; Emergency Details</h2>
          <p className="text-sm leading-relaxed text-neutral-500">Emergency contact details are used only to support participant safety during the event.</p>

          {participants.map((p, idx) => (
            <div key={idx} className="border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900/50 p-6 rounded-2xl space-y-4">
              <h3 className="font-bold text-sm text-neutral-700">Participant #{idx + 1}: Swag &amp; Emergency</h3>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-1">
                  <Label>T-Shirt Material</Label>
                  <select
                    value={p.tshirtType}
                    onChange={(e) => updateParticipant(idx, "tshirtType", e.target.value as "MICROFIBER" | "COTTON")}
                    className="w-full border border-neutral-200 bg-transparent px-3 py-2 rounded-xl text-sm"
                  >
                    <option value="MICROFIBER">Microfiber (Sporty)</option>
                    <option value="COTTON">Cotton (Premium)</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <Label>T-Shirt Size</Label>
                  <select
                    value={p.tshirtSize}
                    onChange={(e) => updateParticipant(idx, "tshirtSize", e.target.value as "XS" | "S" | "M" | "L" | "XL" | "XXL" | "3XL")}
                    className="w-full border border-neutral-200 bg-transparent px-3 py-2 rounded-xl text-sm"
                  >
                    {["XS", "S", "M", "L", "XL", "XXL", "3XL"].map((sz) => (
                      <option key={sz} value={sz}>
                        {sz} Size
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-1">
                  <Label>Emergency Contact Person</Label>
                  <Input
                    placeholder="Father / Mother Name"
                    value={p.emergencyContactName}
                    onChange={(e) => updateParticipant(idx, "emergencyContactName", e.target.value)}
                  />
                  {participantErrors[idx]?.emergencyContactName && <p data-participant-error className="mt-0.5 text-xs text-error-600 font-semibold">{participantErrors[idx].emergencyContactName}</p>}
                </div>
                <div className="space-y-1">
                  <Label>Emergency Contact Phone</Label>
                  <Input
                    placeholder="019-8765432"
                    value={p.emergencyContactPhone}
                    onChange={(e) => updateParticipant(idx, "emergencyContactPhone", e.target.value)}
                  />
                  {participantErrors[idx]?.emergencyContactPhone && <p data-participant-error className="mt-0.5 text-xs text-error-600 font-semibold">{participantErrors[idx].emergencyContactPhone}</p>}
                </div>
              </div>
            </div>
          ))}

          <div className="flex justify-between pt-4">
            <Button variant="outline" onClick={() => setStep("PARTICIPANTS")}>
              &larr; Back
            </Button>
            <Button onClick={handleShirtMedicalNext} className="bg-primary-500 hover:bg-primary-600 text-white font-semibold">
              Continue to Billing Summary &rarr;
            </Button>
          </div>
        </div>
      )}

      {step === "SUMMARY" && (
        <div className="grid gap-8 md:grid-cols-3">
          {/* Billing Calculations details */}
          <div className="md:col-span-2 space-y-6">
            <Card className="p-6 border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 rounded-2xl">
              <h2 className="text-xl font-bold text-neutral-900 dark:text-neutral-50 mb-4">Registration Review</h2>
              <div className="divide-y text-sm">
                <div className="flex py-3 justify-between">
                  <span className="text-neutral-500">Event Title</span>
                  <span className="font-semibold text-neutral-900 dark:text-neutral-100">{event.title}</span>
                </div>
                <div className="flex py-3 justify-between">
                  <span className="text-neutral-500">Selected Category</span>
                  <span className="text-right font-semibold text-neutral-900 dark:text-neutral-100">
                    {Array.from(new Set(participants.map((participant) => event.categories.find((category) => category.id === participant.ticketCategoryId)?.name).filter(Boolean))).join(", ")}
                  </span>
                </div>
                <div className="flex py-3 justify-between">
                  <span className="text-neutral-500">Total Participants</span>
                  <span className="font-semibold text-neutral-900 dark:text-neutral-100">
                    {participants.length} Runner(s)
                  </span>
                </div>
              </div>
            </Card>

            {/* Voucher code form */}
            <Card className="p-6 border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 rounded-2xl">
              <h3 className="text-base font-bold text-neutral-950 mb-3">Voucher Code Discount</h3>
              <div className="flex gap-2">
                <Input
                  placeholder="Enter Voucher Code (e.g. EARLY5)"
                  value={voucherCodeInput}
                  onChange={(e) => setVoucherCodeInput(e.target.value.toUpperCase())}
                  disabled={isValidatingVoucher}
                />
                <Button onClick={handleApplyVoucher} disabled={isValidatingVoucher} variant="outline" className="border-primary-500 text-primary-600">
                  {isValidatingVoucher ? "Verifying..." : "Apply"}
                </Button>
              </div>
              {voucherData && (
                <div className="mt-3 flex items-center gap-1.5 text-xs font-semibold text-success-600">
                  <CheckCircle2 className="h-4 w-4" />
                  <span>
                    Voucher &quot;{voucherData.code}&quot; applied successfully! Saved{" "}
                    {voucherData.discountType === "PERCENTAGE"
                      ? `${voucherData.discountValue}%`
                      : formatCurrency(voucherData.discountValue)}
                  </span>
                </div>
              )}
              {voucherError && (
                <p className="mt-2 text-xs font-semibold text-error-600">{voucherError.message}</p>
              )}
            </Card>
          </div>

          {/* Pricing calculations */}
          <div className="space-y-6">
            <Card className="p-6 border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 rounded-2xl shadow-xs">
              <h3 className="text-lg font-bold text-neutral-900 dark:text-neutral-50 mb-4">Invoice Summary</h3>
              <div className="divide-y text-sm space-y-3">
                <div className="flex justify-between py-2">
                  <span className="text-neutral-500">Ticket Subtotal</span>
                  <span className="font-semibold text-neutral-800">{formatCurrency(getSubtotal())}</span>
                </div>
                {voucherData && (
                  <div className="flex justify-between py-2 text-success-600">
                    <span>Discount Code</span>
                    <span>-{formatCurrency(getDiscount(getSubtotal()))}</span>
                  </div>
                )}
                <div className="flex justify-between py-2">
                  <span className="text-neutral-500">Payment service fee ({processingFeePercentage}%)</span>
                  <span className="font-semibold text-neutral-800">
                    {formatCurrency(Math.round((Math.max(0, getSubtotal() - getDiscount(getSubtotal())) * processingFeePercentage) / 100))}
                  </span>
                </div>
                <div className="flex justify-between py-3 font-extrabold text-base border-t pt-4">
                  <span className="text-neutral-900">Total Price</span>
                  <span className="text-primary-500 text-lg">
                    {formatCurrency(
                      Math.max(0, getSubtotal() - getDiscount(getSubtotal())) +
                        Math.round((Math.max(0, getSubtotal() - getDiscount(getSubtotal())) * processingFeePercentage) / 100)
                    )}
                  </span>
                </div>
              </div>

              <div className="mt-5 space-y-3 rounded-xl border border-neutral-200 bg-neutral-50/70 p-4 text-xs text-neutral-600 dark:border-neutral-800 dark:bg-neutral-950/40 dark:text-neutral-300">
                <label className="flex cursor-pointer items-start gap-2.5">
                  <input
                    type="checkbox"
                    checked={acceptTerms}
                    onChange={(event) => setAcceptTerms(event.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded border-neutral-300 text-primary-500 focus:ring-primary-500"
                  />
                  <span>I have read and agree to this event&apos;s terms, eligibility rules, and cancellation policy.</span>
                </label>
                <label className="flex cursor-pointer items-start gap-2.5">
                  <input
                    type="checkbox"
                    checked={acceptPrivacy}
                    onChange={(event) => setAcceptPrivacy(event.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded border-neutral-300 text-primary-500 focus:ring-primary-500"
                  />
                  <span>I consent to NexRun and the organizer processing the supplied participant data for this registration.</span>
                </label>
              </div>

              <Button
                onClick={handleCreateOrder}
                disabled={createOrderMutation.isPending || !acceptTerms || !acceptPrivacy}
                className="w-full mt-6 bg-primary-500 hover:bg-primary-600 text-white font-bold py-3.5 shadow-lg shadow-primary-500/20"
              >
                {createOrderMutation.isPending ? "Generating Order..." : "Proceed to Checkout Payment"}
              </Button>
            </Card>
          </div>
        </div>
      )}

      {step === "PAYMENT" && orderSummary && (
        <div className="mx-auto max-w-md space-y-6">
          <Card className="p-6 border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 rounded-2xl shadow-sm">
            <div className="text-center pb-6 border-b">
              <CreditCard className="h-10 w-10 text-primary-500 mx-auto" />
              <h2 className="mt-3 text-lg font-bold text-neutral-900 dark:text-neutral-50">Secure payment</h2>
              <p className="mt-1 text-xs text-neutral-400">Choose a method to continue with your payment.</p>
            </div>

            <div className="py-6 space-y-4 text-sm">
              <div className="flex justify-between">
                <span className="text-neutral-500">Order Ref</span>
                <span className="font-bold">{orderSummary.orderNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-500">Slot reservation</span>
                <span className={`font-mono font-bold ${remainingSeconds <= 60 ? "text-error-600" : "text-neutral-800 dark:text-neutral-200"}`}>
                  {String(Math.floor(remainingSeconds / 60)).padStart(2, "0")}:{String(remainingSeconds % 60).padStart(2, "0")}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-500">Total Amount Due</span>
                <span className="font-extrabold text-primary-500 text-base">
                  {formatCurrency(orderSummary.totalPaidSen)}
                </span>
              </div>
            </div>

            <div className="space-y-4">
              <div className="space-y-2" role="radiogroup" aria-label="Payment method">
                {[
                  ["ONLINE_BANKING", "Online banking", "Continue through your bank securely."],
                  ["EWALLET", "E-wallet", "Continue through your preferred wallet."],
                  ["CARD", "Debit or credit card", "Card details are entered with the payment provider."],
                ].map(([value, label, description]) => (
                  <label
                    key={value}
                    className={`flex cursor-pointer items-center gap-3 rounded-xl border p-3 text-sm transition ${
                      paymentMethod === value
                        ? "border-primary-500 bg-primary-50/70 dark:bg-primary-950/25"
                        : "border-neutral-200 dark:border-neutral-800"
                    }`}
                  >
                    <input
                      type="radio"
                      name="payment-method"
                      value={value}
                      checked={paymentMethod === value}
                      onChange={() => setPaymentMethod(value as typeof paymentMethod)}
                      className="h-4 w-4 text-primary-500 focus:ring-primary-500"
                    />
                    <span>
                      <span className="block font-semibold text-neutral-900 dark:text-neutral-100">{label}</span>
                      <span className="block text-xs text-neutral-500">{description}</span>
                    </span>
                  </label>
                ))}
              </div>

              <div className="bg-neutral-50 dark:bg-neutral-900/50 p-4 rounded-xl flex gap-3 text-xs text-neutral-500 border border-neutral-100">
                <Info className="h-5 w-5 text-primary-500 shrink-0" />
                <p>Payment details are never collected on this page. You can safely retry if the payment provider takes longer than expected.</p>
              </div>

              <Button
                onClick={handlePayment}
                disabled={paymentMutation.isPending || remainingSeconds <= 0}
                className="w-full mt-4 bg-primary-500 hover:bg-primary-600 text-white font-bold py-3.5 shadow-lg shadow-primary-500/20"
              >
                {paymentMutation.isPending ? "Confirming payment..." : `PAY ${formatCurrency(orderSummary.totalPaidSen)} NOW`}
              </Button>
              <Link
                href={`/orders/${orderSummary.orderId}/pay`}
                className="block text-center text-xs font-semibold text-primary-600 hover:underline dark:text-primary-400"
              >
                Save this checkout and complete payment later
              </Link>
              {remainingSeconds <= 0 && (
                <Button type="button" variant="outline" onClick={restartCheckout} className="w-full rounded-xl font-bold">
                  Refresh price and reserve again
                </Button>
              )}
            </div>
          </Card>
        </div>
      )}

      {step === "SUCCESS" && orderSummary && (
        <div className="mx-auto max-w-md text-center py-12 space-y-6">
          <CheckCircle2 className="h-16 w-16 text-success-500 mx-auto" />
          <div>
            <h2 className="text-2xl font-black text-neutral-900 dark:text-neutral-50">Registration Complete!</h2>
            <p className="mt-2 text-sm text-neutral-500">
              Your payment was confirmed. Thank you for registering!
            </p>
          </div>

          <Card className="p-5 border border-neutral-100 bg-neutral-50/50 text-sm text-left space-y-3 rounded-2xl">
            <div className="flex justify-between">
              <span className="text-neutral-400">Order ID:</span>
              <span className="font-semibold">{orderSummary.orderNumber}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-neutral-400">Status:</span>
              <span className="font-bold text-success-600">PAID (CONFIRMED)</span>
            </div>
          </Card>

          <div className="flex flex-col gap-2">
            <Link
              href={`/orders/${orderSummary.orderId}/receipt`}
              className="flex w-full items-center justify-center rounded-xl bg-primary-500 text-white py-3.5 font-bold shadow-lg shadow-primary-500/20 hover:bg-primary-600 transition"
            >
              Print Receipt &amp; Race Bib QR Vouchers
            </Link>
            <Link
              href="/events"
              className="text-xs font-semibold text-neutral-500 hover:text-neutral-800 transition py-2"
            >
              &larr; Back to Events discovery
            </Link>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}
