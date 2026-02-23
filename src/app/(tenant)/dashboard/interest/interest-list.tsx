"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Download, Trash2, Loader2, Mail } from "lucide-react";
import { deleteInterest, exportInterestsCsv } from "./actions";

interface Interest {
  id: string;
  email: string;
  addressLine1: string;
  city: string;
  state: string;
  zip: string;
  createdAt: Date;
  notifiedAt: Date | null;
}

export function InterestList({ interests }: { interests: Interest[] }) {
  const router = useRouter();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    await deleteInterest(id);
    setDeletingId(null);
    router.refresh();
  };

  const handleExport = async () => {
    setExporting(true);
    const csv = await exportInterestsCsv();
    setExporting(false);

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `service-area-interests-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {interests.length} {interests.length === 1 ? "entry" : "entries"}
        </p>
        {interests.length > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleExport}
            disabled={exporting}
          >
            {exporting ? (
              <Loader2 className="mr-2 h-3 w-3 animate-spin" />
            ) : (
              <Download className="mr-2 h-3 w-3" />
            )}
            Export CSV
          </Button>
        )}
      </div>

      {interests.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center">
            <Mail className="mx-auto h-10 w-10 text-muted-foreground" />
            <p className="mt-3 text-sm text-muted-foreground">
              No interest submissions yet. When customers check an address outside your
              service area and leave their email, they&apos;ll appear here.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="px-4 py-3 text-left font-medium">Email</th>
                <th className="px-4 py-3 text-left font-medium">Address</th>
                <th className="px-4 py-3 text-left font-medium">City</th>
                <th className="px-4 py-3 text-left font-medium">State</th>
                <th className="px-4 py-3 text-left font-medium">ZIP</th>
                <th className="px-4 py-3 text-left font-medium">Date</th>
                <th className="px-4 py-3 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {interests.map((i) => (
                <tr key={i.id} className="border-b last:border-0 hover:bg-muted/30">
                  <td className="px-4 py-3 font-medium">{i.email}</td>
                  <td className="px-4 py-3 text-muted-foreground">{i.addressLine1}</td>
                  <td className="px-4 py-3 text-muted-foreground">{i.city}</td>
                  <td className="px-4 py-3 text-muted-foreground">{i.state}</td>
                  <td className="px-4 py-3 text-muted-foreground">{i.zip}</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {new Date(i.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={() => handleDelete(i.id)}
                      disabled={deletingId === i.id}
                    >
                      {deletingId === i.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
