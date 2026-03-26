'use client';

import { useLoading } from '@/context/loading-context';
import { cn } from '@/lib/utils';

export function LoadingBar() {
  const { isLoading } = useLoading();

  return (
    <div
      className={cn(
        'absolute bottom-0 left-0 w-full h-1 overflow-hidden transition-opacity duration-300',
        isLoading ? 'opacity-100' : 'opacity-0'
      )}
      role="progressbar"
      aria-hidden={!isLoading}
      aria-valuetext={isLoading ? 'Loading' : 'Idle'}
    >
      <div className="absolute h-full w-full bg-accent/30" />
      <div
        className={cn(
          'absolute h-full bg-accent animate-loading-bar'
        )}
      />
    </div>
  );
}
