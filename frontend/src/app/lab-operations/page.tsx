'use client';

import React, { useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

function LabOperationsRedirectInner() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const lab = searchParams.get('lab');
    const targetUrl = lab ? `/dashboard?tab=lab-operations&lab=${lab}` : '/dashboard?tab=lab-operations';
    router.replace(targetUrl);
  }, [router, searchParams]);

  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="flex items-center gap-3 text-slate-500 text-sm font-medium">
        <div className="h-5 w-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
        <span>Redirecting to QC Dashboard &bull; Lab Operations...</span>
      </div>
    </div>
  );
}

export default function LabOperationsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="h-5 w-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <LabOperationsRedirectInner />
    </Suspense>
  );
}
