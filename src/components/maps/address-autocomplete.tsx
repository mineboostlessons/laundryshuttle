"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MapPin, Loader2, X } from "lucide-react";

export interface AddressValue {
  addressLine1: string;
  city: string;
  state: string;
  zip: string;
  lat: number;
  lng: number;
  placeName: string;
}

interface Suggestion {
  id: string;
  placeName: string;
  addressLine1: string;
  city: string;
  state: string;
  zip: string;
  lat: number;
  lng: number;
}

interface AddressAutocompleteProps {
  value?: AddressValue | null;
  onChange: (address: AddressValue | null) => void;
  label?: string;
  placeholder?: string;
  required?: boolean;
  error?: string;
}

export function AddressAutocomplete({
  value,
  onChange,
  label = "Address",
  placeholder = "Start typing your address...",
  required = false,
  error,
}: AddressAutocompleteProps) {
  const [query, setQuery] = useState(value?.addressLine1 ?? "");
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const fetchSuggestions = useCallback(async (q: string) => {
    if (q.length < 3) {
      setSuggestions([]);
      setIsOpen(false);
      return;
    }

    setIsLoading(true);
    try {
      const token = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN ?? "";
      const url = new URL(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(q)}.json`
      );
      url.searchParams.set("access_token", token);
      url.searchParams.set("country", "us");
      url.searchParams.set("types", "address");
      url.searchParams.set("autocomplete", "true");
      url.searchParams.set("limit", "5");

      const res = await fetch(url.toString());
      if (!res.ok) return;

      const data = await res.json();
      const features = data.features ?? [];

      const mapped: Suggestion[] = features.map(
        (f: {
          id: string;
          place_name: string;
          center: [number, number];
          context?: Array<{ id: string; text: string; short_code?: string }>;
          address?: string;
          text?: string;
        }) => {
          const context = f.context ?? [];
          const city =
            context.find((c) => c.id.startsWith("place"))?.text ?? "";
          const state =
            context
              .find((c) => c.id.startsWith("region"))
              ?.short_code?.replace("US-", "") ?? "";
          const zip =
            context.find((c) => c.id.startsWith("postcode"))?.text ?? "";
          const streetNumber = f.address ?? "";
          const streetName = f.text ?? "";
          const addressLine1 = streetNumber
            ? `${streetNumber} ${streetName}`
            : streetName;

          return {
            id: f.id,
            placeName: f.place_name,
            addressLine1,
            city,
            state,
            zip,
            lat: f.center[1],
            lng: f.center[0],
          };
        }
      );

      setSuggestions(mapped);
      setIsOpen(mapped.length > 0);
      setActiveIndex(-1);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuery(val);

    // Clear selected value when user types
    if (value) {
      onChange(null);
    }

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      fetchSuggestions(val);
    }, 300);
  };

  const handleSelect = (suggestion: Suggestion) => {
    setQuery(suggestion.addressLine1);
    setSuggestions([]);
    setIsOpen(false);
    onChange({
      addressLine1: suggestion.addressLine1,
      city: suggestion.city,
      state: suggestion.state,
      zip: suggestion.zip,
      lat: suggestion.lat,
      lng: suggestion.lng,
      placeName: suggestion.placeName,
    });
  };

  const handleClear = () => {
    setQuery("");
    setSuggestions([]);
    setIsOpen(false);
    onChange(null);
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) return;

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setActiveIndex((prev) =>
          prev < suggestions.length - 1 ? prev + 1 : 0
        );
        break;
      case "ArrowUp":
        e.preventDefault();
        setActiveIndex((prev) =>
          prev > 0 ? prev - 1 : suggestions.length - 1
        );
        break;
      case "Enter":
        e.preventDefault();
        if (activeIndex >= 0 && suggestions[activeIndex]) {
          handleSelect(suggestions[activeIndex]);
        }
        break;
      case "Escape":
        setIsOpen(false);
        setActiveIndex(-1);
        break;
    }
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  return (
    <div ref={wrapperRef} className="relative">
      {label && (
        <Label className="mb-2 block">
          {label}
          {required && <span className="ml-1 text-destructive">*</span>}
        </Label>
      )}

      <div className="relative">
        <MapPin className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          ref={inputRef}
          type="text"
          value={query}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            if (suggestions.length > 0) setIsOpen(true);
          }}
          placeholder={placeholder}
          className={`pl-9 pr-9 ${error ? "border-destructive" : ""}`}
          autoComplete="off"
        />
        {isLoading && (
          <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
        )}
        {!isLoading && query && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {error && <p className="mt-1 text-sm text-destructive">{error}</p>}

      {/* Selected address display */}
      {value && (
        <p className="mt-1 text-xs text-muted-foreground">
          {value.city}, {value.state} {value.zip}
        </p>
      )}

      {/* Suggestions dropdown */}
      {isOpen && suggestions.length > 0 && (
        <ul className="absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-md border bg-background py-1 shadow-lg">
          {suggestions.map((s, idx) => (
            <li
              key={s.id}
              role="option"
              aria-selected={idx === activeIndex}
              className={`cursor-pointer px-3 py-2 text-sm transition-colors ${
                idx === activeIndex
                  ? "bg-accent text-accent-foreground"
                  : "hover:bg-accent/50"
              }`}
              onMouseDown={() => handleSelect(s)}
              onMouseEnter={() => setActiveIndex(idx)}
            >
              <div className="flex items-start gap-2">
                <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                <div>
                  <p className="font-medium">{s.addressLine1}</p>
                  <p className="text-xs text-muted-foreground">
                    {s.city}, {s.state} {s.zip}
                  </p>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
