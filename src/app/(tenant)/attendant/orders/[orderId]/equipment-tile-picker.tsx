"use client";

import { cn } from "@/lib/utils";

interface EquipmentTilePickerProps {
  type: "washer" | "dryer";
  total: number;
  inUse: number[];
  selected: number | null;
  onSelect: (num: number) => void;
}

export function EquipmentTilePicker({
  type,
  total,
  inUse,
  selected,
  onSelect,
}: EquipmentTilePickerProps) {
  if (total === 0) return null;

  const prefix = type === "washer" ? "W" : "D";
  const inUseSet = new Set(inUse);

  return (
    <div>
      <p className="mb-2 text-sm font-medium">
        Select {type === "washer" ? "Washer" : "Dryer"} (
        {inUse.length}/{total} in use)
      </p>
      <div className="grid grid-cols-5 sm:grid-cols-8 gap-2">
        {Array.from({ length: total }, (_, i) => {
          const num = i + 1;
          const isInUse = inUseSet.has(num);
          const isSelected = selected === num;

          return (
            <button
              key={num}
              type="button"
              disabled={isInUse}
              onClick={() => onSelect(num)}
              className={cn(
                "flex h-10 items-center justify-center rounded-md border text-xs font-medium transition-colors",
                isSelected
                  ? type === "washer"
                    ? "bg-blue-600 text-white border-blue-600 ring-2 ring-blue-300"
                    : "bg-orange-600 text-white border-orange-600 ring-2 ring-orange-300"
                  : isInUse
                    ? "bg-red-100 text-red-400 border-red-200 cursor-not-allowed"
                    : "bg-green-50 text-green-700 border-green-200 hover:bg-green-100 cursor-pointer"
              )}
            >
              {prefix}{num}
            </button>
          );
        })}
      </div>
    </div>
  );
}
