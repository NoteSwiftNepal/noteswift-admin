"use client";

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { useLoading } from '@/context/loading-context';

export function PageNavigationHandler() {
  const pathname = usePathname();
  const { stopLoading } = useLoading();

  useEffect(() => {
    stopLoading();
  }, [pathname, stopLoading]);

  return null; // This component doesn't render anything
}
