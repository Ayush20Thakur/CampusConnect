import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  Stethoscope,
  GraduationCap,
  Calendar,
  Clock,
  UserCheck,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  RefreshCw,
  Ticket,
} from 'lucide-react';
import { catalogApi, availabilityApi, appointmentsApi } from '@/api/client';
import { useToast } from '@/app/ToastContext';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import type { ServiceType, Provider, AvailabilitySlot, Appointment } from '@/types';

export function BookingWizardPage() {
  const { serviceType = 'clinic' } = useParams<{ serviceType: string }>();
  const navigate = useNavigate();
  const { addToast } = useToast();

  const isClinic = serviceType.toLowerCase() === 'clinic';
  const serviceCode = isClinic ? 'CLINIC' : 'ADVISING';

  // Step state (1: Provider/Service, 2: Slot Selection, 3: Review & Policy, 4: Success)
  const [step, setStep] = useState(1);

  // Data state
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [services, setServices] = useState<ServiceType[]>([]);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [slots, setSlots] = useState<AvailabilitySlot[]>([]);

  // Selection state
  const [selectedProviderId, setSelectedProviderId] = useState<number | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedSlot, setSelectedSlot] = useState<AvailabilitySlot | null>(null);
  const [notes, setNotes] = useState<string>('');
  const [idempotencyKey, setIdempotencyKey] = useState<string>(() => crypto.randomUUID());

  // Result state
  const [confirmedBooking, setConfirmedBooking] = useState<Appointment | null>(null);
  const [bookingError, setBookingError] = useState<string | null>(null);

  // Load service metadata and providers
  useEffect(() => {
    const loadInit = async () => {
      setLoading(true);
      try {
        const [sRes, pRes] = await Promise.all([
          catalogApi.services(),
          catalogApi.providers(serviceCode),
        ]);
        if (sRes.data) setServices(sRes.data);
        if (pRes.data) {
          setProviders(pRes.data);
          if (pRes.data.length > 0) {
            setSelectedProviderId(pRes.data[0].id);
          }
        }
      } catch (err: any) {
        addToast({
          title: 'Failed to load service',
          description: err.message,
          type: 'error',
        });
      } finally {
        setLoading(false);
      }
    };
    loadInit();
  }, [serviceCode]);

  // Load slots when provider changes
  useEffect(() => {
    if (!selectedProviderId) return;

    const loadSlots = async () => {
      try {
        const res = await availabilityApi.list({
          service_type: serviceCode,
          provider_id: selectedProviderId,
        });
        if (res.data) {
          setSlots(res.data);
          // Default date to earliest slot's date if available
          if (res.data.length > 0 && !selectedDate) {
            const firstDate = res.data[0].start_at.split('T')[0];
            setSelectedDate(firstDate);
          }
        }
      } catch (err: any) {
        addToast({
          title: 'Failed to fetch slots',
          description: err.message,
          type: 'error',
        });
      }
    };

    loadSlots();
  }, [selectedProviderId, serviceCode]);

  // Group slots by date
  const availableSlotsOnDate = slots.filter(
    (s) => s.start_at.startsWith(selectedDate) && s.state === 'AVAILABLE' && !s.is_booked
  );

  // Smart suggestions: Earliest slot overall
  const earliestAvailableSlot = slots.find((s) => s.state === 'AVAILABLE' && !s.is_booked);

  // Handle final booking submission
  const handleConfirmBooking = async () => {
    if (!selectedSlot || !selectedProviderId) return;

    setSubmitting(true);
    setBookingError(null);

    try {
      const res = await appointmentsApi.create({
        service_type: serviceCode,
        slot_id: selectedSlot.id,
        provider_id: selectedProviderId,
        request_id: idempotencyKey,
        notes: notes || undefined,
      });

      if (res.data) {
        setConfirmedBooking(res.data);
        setStep(4);
        addToast({
          title: 'Appointment Confirmed',
          description: isClinic
            ? `Queue Ticket ${res.data.queue_entry?.ticket_number || 'Issued'}`
            : 'Advising session reserved successfully',
          type: 'success',
        });
      }
    } catch (err: any) {
      if (err.code === 'SLOT_UNAVAILABLE') {
        setBookingError('The selected slot was just booked by another student. Please pick an alternative time.');
        // Re-fetch slots
        const res = await availabilityApi.list({
          service_type: serviceCode,
          provider_id: selectedProviderId,
        });
        if (res.data) setSlots(res.data);
        setSelectedSlot(null);
      } else {
        setBookingError(err.message || 'An unexpected error occurred. Please try again.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const currentProvider = providers.find((p) => p.id === selectedProviderId);
  const currentService = services.find((s) => s.code === serviceCode);

  if (loading) {
    return <LoadingSpinner label="Preparing booking wizard..." />;
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-fade-in">
      {/* Wizard Progress Stepper */}
      <div className="card p-4 sm:p-5">
        <div className="flex items-center justify-between">
          {[
            { num: 1, label: 'Provider' },
            { num: 2, label: 'Date & Slot' },
            { num: 3, label: 'Review' },
            { num: 4, label: 'Confirmation' },
          ].map((s, idx) => (
            <React.Fragment key={s.num}>
              <div className="flex items-center gap-2">
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                    step === s.num
                      ? 'bg-navy-800 text-white'
                      : step > s.num
                      ? 'bg-teal-500 text-white'
                      : 'bg-slate-100 text-slate-400'
                  }`}
                >
                  {step > s.num ? <CheckCircle2 className="w-4 h-4" /> : s.num}
                </div>
                <span
                  className={`text-xs font-semibold hidden sm:inline ${
                    step >= s.num ? 'text-navy-900' : 'text-slate-400'
                  }`}
                >
                  {s.label}
                </span>
              </div>
              {idx < 3 && (
                <div
                  className={`flex-1 h-0.5 mx-2 ${
                    step > idx + 1 ? 'bg-teal-500' : 'bg-slate-200'
                  }`}
                />
              )}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* Step 1: Select Provider & Service Details */}
      {step === 1 && (
        <div className="card-md p-6 space-y-6 animate-slide-up">
          <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                isClinic ? 'bg-teal-50 text-teal-700' : 'bg-navy-50 text-navy-800'
              }`}
            >
              {isClinic ? <Stethoscope className="w-5 h-5" /> : <GraduationCap className="w-5 h-5" />}
            </div>
            <div>
              <h2 className="text-lg font-bold text-navy-900">
                {isClinic ? 'Campus Clinic Booking' : 'Academic Advising Booking'}
              </h2>
              <p className="text-xs text-slate-500">
                {isClinic
                  ? 'Choose your medical practitioner or triage provider'
                  : 'Select your designated faculty adviser'}
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <label className="label">Select Provider</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {providers.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setSelectedProviderId(p.id)}
                  className={`p-4 rounded-xl border text-left transition-all flex flex-col justify-between ${
                    selectedProviderId === p.id
                      ? 'border-teal-500 bg-teal-50/30 ring-2 ring-teal-500/20'
                      : 'border-slate-200 hover:border-slate-300 bg-white'
                  }`}
                >
                  <div>
                    <div className="font-bold text-sm text-navy-900">{p.display_name}</div>
                    <div className="text-xs text-slate-500 mt-1">
                      {p.location_label || 'Wellness Center'}
                    </div>
                  </div>
                  <div className="mt-3 text-[11px] font-semibold text-teal-700 flex items-center gap-1">
                    <UserCheck className="w-3.5 h-3.5" />
                    <span>Available for booking</span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="flex justify-between items-center pt-4 border-t border-slate-100">
            <Link to="/app/services" className="btn-ghost text-xs">
              Cancel
            </Link>
            <button
              onClick={() => setStep(2)}
              disabled={!selectedProviderId}
              className="btn-primary text-xs font-semibold py-2.5 px-4"
            >
              <span>Continue to Schedule</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Step 2: Date & Available Slot Selection */}
      {step === 2 && (
        <div className="card-md p-6 space-y-6 animate-slide-up">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <div>
              <h2 className="text-lg font-bold text-navy-900">Select Date & Time Slot</h2>
              <p className="text-xs text-slate-500">
                Provider: <span className="font-semibold text-navy-800">{currentProvider?.display_name}</span>
              </p>
            </div>
            {earliestAvailableSlot && (
              <button
                type="button"
                onClick={() => {
                  setSelectedDate(earliestAvailableSlot.start_at.split('T')[0]);
                  setSelectedSlot(earliestAvailableSlot);
                }}
                className="text-xs font-semibold bg-teal-50 text-teal-700 border border-teal-200 px-3 py-1 rounded-lg hover:bg-teal-100 transition-colors flex items-center gap-1.5"
              >
                <Sparkles className="w-3.5 h-3.5 text-teal-600" />
                <span>Earliest Slot ({new Date(earliestAvailableSlot.start_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})</span>
              </button>
            )}
          </div>

          {/* Date Picker Input */}
          <div>
            <label className="label">Appointment Date</label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => {
                setSelectedDate(e.target.value);
                setSelectedSlot(null);
              }}
              className="input max-w-xs font-mono"
            />
          </div>

          {/* Slots Selector */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="label mb-0">
                Available Time Slots on {selectedDate || 'Selected Date'}
              </label>
              <span className="text-[11px] text-slate-400">
                {availableSlotsOnDate.length} slot(s) open
              </span>
            </div>

            {availableSlotsOnDate.length === 0 ? (
              <div className="p-8 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200">
                <Clock className="w-6 h-6 text-slate-400 mx-auto mb-2" />
                <p className="text-xs text-slate-500">
                  No available slots found for this date. Please select another weekday or pick the suggested earliest slot.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {availableSlotsOnDate.map((slot) => {
                  const startTime = new Date(slot.start_at).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  });
                  const isSelected = selectedSlot?.id === slot.id;

                  return (
                    <button
                      key={slot.id}
                      type="button"
                      onClick={() => setSelectedSlot(slot)}
                      className={`py-3 px-2 rounded-xl text-xs font-mono font-semibold transition-all border text-center ${
                        isSelected
                          ? 'bg-navy-800 text-white border-navy-800 shadow-sm ring-2 ring-navy-800/20'
                          : 'bg-white border-slate-200 text-navy-800 hover:border-teal-500 hover:bg-teal-50/20'
                      }`}
                    >
                      {startTime}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Additional Notes */}
          <div>
            <label className="label">Appointment Notes / Reason (Optional)</label>
            <textarea
              rows={2}
              placeholder="e.g. Mild headache and fatigue, or course prerequisite discussion"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="input text-xs"
            />
          </div>

          <div className="flex justify-between items-center pt-4 border-t border-slate-100">
            <button
              onClick={() => setStep(1)}
              className="btn-outline text-xs bg-white flex items-center gap-1.5"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back</span>
            </button>
            <button
              onClick={() => setStep(3)}
              disabled={!selectedSlot}
              className="btn-primary text-xs font-semibold py-2.5 px-4"
            >
              <span>Review Details</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Review & Policy Confirmation */}
      {step === 3 && (
        <div className="card-md p-6 space-y-6 animate-slide-up">
          <div className="pb-4 border-b border-slate-100">
            <h2 className="text-lg font-bold text-navy-900">Review & Confirm Booking</h2>
            <p className="text-xs text-slate-500">
              Please verify your appointment information before final submission.
            </p>
          </div>

          {bookingError && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-rose-500 flex-shrink-0 mt-0.5" />
              <span>{bookingError}</span>
            </div>
          )}

          {/* Summary Box */}
          <div className="bg-slate-50 rounded-2xl border border-slate-200 p-5 space-y-3">
            <div className="flex items-center justify-between text-xs pb-3 border-b border-slate-200">
              <span className="text-slate-500">Service:</span>
              <span className="font-bold text-navy-900">
                {isClinic ? 'Campus Health Clinic' : 'Academic Advising'}
              </span>
            </div>

            <div className="flex items-center justify-between text-xs pb-3 border-b border-slate-200">
              <span className="text-slate-500">Provider:</span>
              <span className="font-bold text-navy-900">{currentProvider?.display_name}</span>
            </div>

            <div className="flex items-center justify-between text-xs pb-3 border-b border-slate-200">
              <span className="text-slate-500">Location:</span>
              <span className="font-semibold text-navy-800">
                {currentProvider?.location_label || 'Main Campus'}
              </span>
            </div>

            <div className="flex items-center justify-between text-xs pb-3 border-b border-slate-200">
              <span className="text-slate-500">Date & Time:</span>
              <span className="font-bold font-mono text-teal-800">
                {selectedSlot
                  ? new Date(selectedSlot.start_at).toLocaleDateString([], {
                      weekday: 'long',
                      month: 'short',
                      day: 'numeric',
                    }) +
                    ' at ' +
                    new Date(selectedSlot.start_at).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })
                  : '—'}
              </span>
            </div>

            {isClinic && (
              <div className="p-3 bg-teal-50 border border-teal-200 rounded-xl text-xs text-teal-800 flex items-center justify-between">
                <span className="flex items-center gap-1.5 font-semibold">
                  <Ticket className="w-4 h-4 text-teal-600" />
                  <span>Queue Ticket Generation</span>
                </span>
                <span className="text-[11px] font-mono">Issued automatically</span>
              </div>
            )}
          </div>

          {/* Cancellation Notice */}
          <div className="text-xs text-slate-500 bg-amber-50/60 border border-amber-200/80 rounded-xl p-3.5 leading-relaxed">
            <strong>Cancellation Notice:</strong> Cancellations are permitted free of charge up to{' '}
            {currentService?.cancellation_cutoff_hours || (isClinic ? 2 : 4)} hours prior to slot time. Releasing a slot restores availability to fellow students immediately.
          </div>

          <div className="flex justify-between items-center pt-4 border-t border-slate-100">
            <button
              onClick={() => setStep(2)}
              disabled={submitting}
              className="btn-outline text-xs bg-white flex items-center gap-1.5"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Modify Time</span>
            </button>

            <button
              onClick={handleConfirmBooking}
              disabled={submitting}
              className="btn-primary text-xs font-semibold py-2.5 px-6 shadow-card"
            >
              {submitting ? 'Confirming with Services...' : 'Confirm Appointment'}
            </button>
          </div>
        </div>
      )}

      {/* Step 4: Booking Success State */}
      {step === 4 && confirmedBooking && (
        <div className="card-md p-8 text-center space-y-6 animate-slide-up">
          <div className="w-16 h-16 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center mx-auto shadow-sm">
            <CheckCircle2 className="w-8 h-8" />
          </div>

          <div>
            <h2 className="text-2xl font-extrabold text-navy-900 tracking-tight">
              Appointment Successfully Confirmed!
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Your appointment has been registered and verified across campus services.
            </p>
          </div>

          {/* Confirmation Details Card */}
          <div className="max-w-md mx-auto bg-slate-50 rounded-2xl border border-slate-200 p-5 text-left space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400">Appointment ID:</span>
              <span className="font-mono text-navy-900">{confirmedBooking.id}</span>
            </div>

            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400">Provider:</span>
              <span className="font-bold text-navy-900">{confirmedBooking.provider_name}</span>
            </div>

            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400">Date & Time:</span>
              <span className="font-mono text-teal-800 font-bold">
                {confirmedBooking.start_at
                  ? new Date(confirmedBooking.start_at).toLocaleDateString([], {
                      weekday: 'short',
                      month: 'short',
                      day: 'numeric',
                    }) +
                    ' at ' +
                    new Date(confirmedBooking.start_at).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })
                  : '—'}
              </span>
            </div>

            {/* If clinic: Display generated ticket */}
            {confirmedBooking.queue_entry && (
              <div className="pt-3 border-t border-slate-200">
                <div className="p-3 bg-teal-50 border border-teal-200 rounded-xl flex items-center justify-between">
                  <div>
                    <div className="text-[10px] font-bold uppercase tracking-wider text-teal-700">
                      Clinic Queue Ticket
                    </div>
                    <div className="text-2xl font-extrabold font-mono text-teal-900">
                      {confirmedBooking.queue_entry.ticket_number}
                    </div>
                  </div>
                  <Link
                    to="/app/clinic/queue"
                    className="btn-accent text-xs py-1.5 px-3 font-semibold"
                  >
                    Track Queue
                  </Link>
                </div>
              </div>
            )}
          </div>

          {/* Navigation CTAs */}
          <div className="flex flex-wrap items-center justify-center gap-3 pt-4">
            <Link to="/app/dashboard" className="btn-primary text-xs font-semibold py-2.5 px-5">
              Go to Student Dashboard
            </Link>
            <Link
              to="/app/appointments"
              className="btn-outline text-xs font-semibold py-2.5 px-5 bg-white"
            >
              View All Appointments
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

