'use client';

import { useEffect, useState } from 'react';

interface PageLoaderProps {
  duration?: number;
  theme?: string;
}

export default function PageLoader({ duration = 1500, theme = 'white' }: PageLoaderProps) {
  const [loading, setLoading] = useState(true);
  const [fadeOut, setFadeOut] = useState(false);

  useEffect(() => {
    if (duration <= 0) {
      setLoading(false);
      return;
    }

    const timer = setTimeout(() => {
      setFadeOut(true);
      setTimeout(() => setLoading(false), 600);
    }, duration);

    return () => clearTimeout(timer);
  }, [duration]);

  if (duration <= 0 || !loading) {
    return null;
  }

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center transition-opacity duration-600 ${fadeOut ? 'opacity-0' : 'opacity-100'}`}
      style={{
        backgroundColor: 'transparent',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
      }}
    >
      <div className="relative flex items-center justify-center">
        <div
          className="absolute w-32 h-32 rounded-full animate-spin-slow"
          style={{
            background: 'radial-gradient(circle, rgba(52, 211, 153, 0.5) 0%, rgba(34, 197, 94, 0.5) 40%, rgba(59, 130, 246, 0.3) 70%, transparent 85%)',
            filter: 'blur(15px)',
            animation: 'spin 3s linear infinite, pulse 2s ease-in-out infinite',
          }}
        />
        <div
          className="absolute w-24 h-24 rounded-full"
          style={{
            background: 'radial-gradient(circle, rgba(52, 211, 153, 0.5) 0%, rgba(16, 185, 129, 0.5) 50%, rgba(37, 99, 235, 0.3) 70%, transparent 85%)',
            filter: 'blur(12px)',
            animation: 'spin 2.5s linear infinite reverse, pulse 1.8s ease-in-out infinite 0.2s',
          }}
        />
        <div
          className="absolute w-16 h-16 rounded-full"
          style={{
            background: 'radial-gradient(circle, rgba(52, 211, 153, 0.6) 0%, rgba(34, 197, 94, 0.5) 50%, rgba(59, 130, 246, 0.3) 70%, transparent 85%)',
            filter: 'blur(10px)',
            animation: 'spin 2s linear infinite, pulse 1.5s ease-in-out infinite 0.4s',
          }}
        />
        <div
          className="absolute w-8 h-8 rounded-full"
          style={{
            background: 'radial-gradient(circle, rgba(52, 211, 153, 0.7) 0%, rgba(34, 197, 94, 0.6) 50%, rgba(96, 165, 250, 0.3) 80%, transparent 100%)',
            filter: 'blur(8px)',
            animation: 'pulse 1.5s ease-in-out infinite',
          }}
        />
      </div>
    </div>
  );
}
