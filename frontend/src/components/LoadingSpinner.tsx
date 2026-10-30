import React from 'react';
import { Loader2 } from 'lucide-react';

interface LoadingSpinnerProps {
  label?: string;
  size?: 'sm' | 'md' | 'lg';
}

export function LoadingSpinner({ label = 'Loading...', size = 'md' }: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
  };

  return (
    <div className="flex flex-col items-center justify-center p-8 gap-3 text-slate-500" role="status" aria-live="polite">
      <Loader2 className={`${sizeClasses[size]} animate-spin text-teal-600`} />
      <span className="text-sm font-medium">{label}</span>
      <span className="sr-only">{label}</span>
    </div>
  );
}

