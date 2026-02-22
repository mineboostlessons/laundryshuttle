"use client";

import { useMemo } from "react";
import { format, parseISO, addDays } from "date-fns";
import { CalendarDays, Clock } from "lucide-react";
import type { TimeSlotData } from "../actions";

const DAY_NAMES = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
];

function getAvailableDatesClient(
  allowedDays: string[],
  blockedDates: Array<{ date: string; reason: string }>,
  startFrom: Date = new Date(),
  count: number = 14
): string[] {
  const blocked = new Set(blockedDates.map((b) => b.date));
  const dates: string[] = [];
  let current = new Date(
    startFrom.getFullYear(),
    startFrom.getMonth(),
    startFrom.getDate()
  );

  for (let i = 0; i < 60 && dates.length < count; i++) {
    const dayName = DAY_NAMES[current.getDay()];
    const yr = current.getFullYear();
    const mo = String(current.getMonth() + 1).padStart(2, "0");
    const da = String(current.getDate()).padStart(2, "0");
    const dateStr = `${yr}-${mo}-${da}`;

    if (allowedDays.includes(dayName) && !blocked.has(dateStr)) {
      dates.push(dateStr);
    }

    current = addDays(current, 1);
  }

  return dates;
}

interface ScheduleStepProps {
  timeSlots: TimeSlotData;
  pickupDate: string;
  pickupTimeSlot: string;
  deliveryDate: string;
  deliveryTimeSlot: string;
  onChange: (partial: {
    pickupDate?: string;
    pickupTimeSlot?: string;
    deliveryDate?: string;
    deliveryTimeSlot?: string;
  }) => void;
}

export function ScheduleStep({
  timeSlots,
  pickupDate,
  pickupTimeSlot,
  deliveryDate,
  deliveryTimeSlot,
  onChange,
}: ScheduleStepProps) {
  const pickupDates = useMemo(
    () =>
      getAvailableDatesClient(
        timeSlots.pickupDays,
        timeSlots.blockedDates,
        new Date()
      ),
    [timeSlots.pickupDays, timeSlots.blockedDates]
  );

  const deliveryDates = useMemo(() => {
    if (!pickupDate) return [];
    // Delivery must be at least minHoursBeforeDelivery after pickup
    const minDeliveryStart = addDays(
      parseISO(pickupDate),
      Math.ceil(timeSlots.minHoursBeforeDelivery / 24)
    );
    return getAvailableDatesClient(
      timeSlots.deliveryDays,
      timeSlots.blockedDates,
      minDeliveryStart
    );
  }, [
    pickupDate,
    timeSlots.deliveryDays,
    timeSlots.blockedDates,
    timeSlots.minHoursBeforeDelivery,
  ]);

  const formatDateLabel = (dateStr: string) => {
    const date = parseISO(dateStr);
    const today = new Date();
    const tomorrow = addDays(today, 1);

    if (format(date, "yyyy-MM-dd") === format(today, "yyyy-MM-dd")) {
      return `Today — ${format(date, "EEE, MMM d")}`;
    }
    if (format(date, "yyyy-MM-dd") === format(tomorrow, "yyyy-MM-dd")) {
      return `Tomorrow — ${format(date, "EEE, MMM d")}`;
    }
    return format(date, "EEE, MMM d");
  };

  return (
    <div>
      <h2 className="text-xl font-semibold text-foreground">
        Schedule Pickup & Delivery
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Choose when you&apos;d like us to pick up and deliver your laundry.
      </p>

      <div className="mt-6 space-y-8">
        {/* Pickup Date */}
        <div>
          <div className="flex items-center gap-2">
            <CalendarDays className="h-5 w-5 text-primary" />
            <h3 className="font-medium text-foreground">Pickup Date</h3>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {pickupDates.map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => {
                  onChange({ pickupDate: d, deliveryDate: "", deliveryTimeSlot: "" });
                }}
                className={`rounded-lg border px-3 py-2 text-sm transition-colors ${
                  pickupDate === d
                    ? "border-primary bg-primary/10 font-medium text-primary"
                    : "hover:border-muted-foreground/40"
                }`}
              >
                {formatDateLabel(d)}
              </button>
            ))}
          </div>
        </div>

        {/* Pickup Time Slot */}
        {pickupDate && (
          <div>
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-primary" />
              <h3 className="font-medium text-foreground">Pickup Time</h3>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {timeSlots.pickupTimeSlots.map((slot) => (
                <button
                  key={slot}
                  type="button"
                  onClick={() => onChange({ pickupTimeSlot: slot })}
                  className={`rounded-lg border px-4 py-2 text-sm transition-colors ${
                    pickupTimeSlot === slot
                      ? "border-primary bg-primary/10 font-medium text-primary"
                      : "hover:border-muted-foreground/40"
                  }`}
                >
                  {slot}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Delivery Date */}
        {pickupDate && pickupTimeSlot && (
          <div>
            <div className="flex items-center gap-2">
              <CalendarDays className="h-5 w-5 text-primary" />
              <h3 className="font-medium text-foreground">Delivery Date</h3>
            </div>
            {deliveryDates.length > 0 ? (
              <div className="mt-3 flex flex-wrap gap-2">
                {deliveryDates.map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => onChange({ deliveryDate: d })}
                    className={`rounded-lg border px-3 py-2 text-sm transition-colors ${
                      deliveryDate === d
                        ? "border-primary bg-primary/10 font-medium text-primary"
                        : "hover:border-muted-foreground/40"
                    }`}
                  >
                    {formatDateLabel(d)}
                  </button>
                ))}
              </div>
            ) : (
              <p className="mt-3 text-sm text-muted-foreground">
                No delivery dates available for the selected pickup date.
              </p>
            )}
          </div>
        )}

        {/* Delivery Time Slot */}
        {deliveryDate && (
          <div>
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-primary" />
              <h3 className="font-medium text-foreground">Delivery Time</h3>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {timeSlots.deliveryTimeSlots.map((slot) => (
                <button
                  key={slot}
                  type="button"
                  onClick={() => onChange({ deliveryTimeSlot: slot })}
                  className={`rounded-lg border px-4 py-2 text-sm transition-colors ${
                    deliveryTimeSlot === slot
                      ? "border-primary bg-primary/10 font-medium text-primary"
                      : "hover:border-muted-foreground/40"
                  }`}
                >
                  {slot}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
