"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { togglePagePublished, deletePage } from "./actions";

interface PageActionsProps {
  pageId: string;
  slug: string;
  isPublished: boolean;
}

export function PageActions({ pageId, slug, isPublished }: PageActionsProps) {
  const router = useRouter();

  async function handleTogglePublish() {
    const result = await togglePagePublished(pageId);
    if (!result.success) {
      alert(result.error);
    }
    router.refresh();
  }

  async function handleDelete() {
    if (!confirm("Are you sure you want to delete this page?")) return;
    const result = await deletePage(pageId);
    if (!result.success) {
      alert(result.error);
    }
    router.refresh();
  }

  return (
    <div className="flex items-center justify-end gap-2">
      <Link href={`/settings/pages/${pageId}/edit`}>
        <Button variant="outline" size="sm">
          Edit
        </Button>
      </Link>
      <Button variant="ghost" size="sm" onClick={handleTogglePublish}>
        {isPublished ? "Unpublish" : "Publish"}
      </Button>
      {slug !== "home" && (
        <Button variant="ghost" size="sm" onClick={handleDelete} className="text-destructive">
          Delete
        </Button>
      )}
    </div>
  );
}
