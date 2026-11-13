"use client";

import { Printer } from "lucide-react";

export function PrintButton({ label = "تنزيل PDF" }: { label?: string }) {
  return (
    <button type="button" className="btn-primary btn-sm no-print" onClick={() => window.print()}>
      <Printer className="h-3.5 w-3.5" /> {label}
    </button>
  );
}
