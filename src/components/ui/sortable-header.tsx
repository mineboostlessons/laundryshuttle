"use client";

import Link from "next/link";
import { ChevronUp, ChevronDown, ChevronsUpDown } from "lucide-react";

interface SortableHeaderProps {
  column: string;
  label: string;
  currentSort: string;
  currentOrder: string;
  basePath: string;
  filterParams: string;
  className?: string;
}

export function SortableHeader({
  column,
  label,
  currentSort,
  currentOrder,
  basePath,
  filterParams,
  className = "",
}: SortableHeaderProps) {
  const isActive = currentSort === column;
  const nextOrder = isActive && currentOrder === "asc" ? "desc" : "asc";

  const params = new URLSearchParams(filterParams);
  params.set("sortBy", column);
  params.set("sortOrder", nextOrder);
  params.set("page", "1");

  return (
    <th className={`px-4 py-3 font-medium ${className}`}>
      <Link
        href={`${basePath}?${params.toString()}`}
        className="inline-flex items-center gap-1 hover:text-foreground"
      >
        {label}
        {isActive ? (
          currentOrder === "asc" ? (
            <ChevronUp className="h-3.5 w-3.5" />
          ) : (
            <ChevronDown className="h-3.5 w-3.5" />
          )
        ) : (
          <ChevronsUpDown className="h-3.5 w-3.5 opacity-40" />
        )}
      </Link>
    </th>
  );
}
