"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { CaseReview } from "@/components/case-review";
import { getCase } from "@/lib/cases";
import type { CaseRecord } from "@/lib/types";

export default function CasePage() {
  const params = useParams<{ id: string }>();
  const [record, setRecord] = useState<CaseRecord | null | undefined>(undefined);

  useEffect(() => {
    setRecord(getCase(params.id));
  }, [params.id]);

  if (record === undefined) {
    return <p className="px-8 py-16 text-muted">Loading this case…</p>;
  }

  if (!record) {
    return (
      <div className="px-8 py-16">
        <h1 className="text-3xl font-semibold tracking-tight">This case is not on this desk.</h1>
        <p className="mt-3 text-muted">Cases stay in the browser where they were saved.</p>
        <Link href="/" className="action mt-6 inline-flex rounded-md px-4 py-2 text-sm font-semibold">
          Back
        </Link>
      </div>
    );
  }

  return <CaseReview initial={record} />;
}
