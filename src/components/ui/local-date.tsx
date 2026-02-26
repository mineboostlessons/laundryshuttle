"use client";

interface LocalDateProps {
  date: Date | string;
  options?: Intl.DateTimeFormatOptions;
}

const defaultOptions: Intl.DateTimeFormatOptions = {
  month: "short",
  day: "numeric",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
};

const dateOnlyOptions: Intl.DateTimeFormatOptions = {
  month: "short",
  day: "numeric",
  year: "numeric",
};

export function LocalDate({ date, options }: LocalDateProps) {
  return <>{new Date(date).toLocaleString(undefined, options ?? defaultOptions)}</>;
}

export function LocalDateOnly({ date, options }: LocalDateProps) {
  return <>{new Date(date).toLocaleDateString(undefined, options ?? dateOnlyOptions)}</>;
}
