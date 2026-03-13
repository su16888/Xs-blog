'use client';

import { useEffect, useState } from 'react';
import { CheckCircle, XCircle, X } from 'lucide-react';

interface ToastProps {
  show: boolean;
  message: string;
  type: 'success' | 'error';
  duration?: number;
  onClose: () => void;
}

export default function AdminToast({ show, message, type, duration = 3000, onClose }: ToastProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (show) {
      setVisible(true);
      const timer = setTimeout(() => {
        setVisible(false);
      }, duration);

      return () => clearTimeout(timer);
    } else {
      setVisible(false);
    }
  }, [show, duration]);

  useEffect(() => {
    if (!visible && show) {
      const closeTimer = setTimeout(onClose, 300); // 等待动画结束
      return () => clearTimeout(closeTimer);
    }
  }, [visible, show, onClose]);

  const handleClose = () => {
    setVisible(false);
  };

  const getToastStyles = () => {
    switch (type) {
      case 'success':
        return {
          bg: 'bg-green-50 border-green-200',
          text: 'text-green-800',
          icon: <CheckCircle className="w-5 h-5 text-green-500" />
        };
      case 'error':
        return {
          bg: 'bg-red-50 border-red-200',
          text: 'text-red-800',
          icon: <XCircle className="w-5 h-5 text-red-500" />
        };
      default:
        return {
          bg: 'bg-blue-50 border-blue-200',
          text: 'text-blue-800',
          icon: <CheckCircle className="w-5 h-5 text-blue-500" />
        };
    }
  };

  const styles = getToastStyles();

  return (
    <>
      {visible && (
        <div
          className="fixed top-4 right-4 z-[999999] min-w-[300px] max-w-md animate-slide-down"
        >
          <div className={`${styles.bg} border rounded-lg shadow-lg p-4 flex items-start gap-3`}>
            <div className="flex-shrink-0 mt-0.5">
              {styles.icon}
            </div>
            <div className="flex-1">
              <p className={`${styles.text} text-sm font-medium`}>
                {message}
              </p>
            </div>
            <button
              onClick={handleClose}
              className="flex-shrink-0 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </>
  );
}