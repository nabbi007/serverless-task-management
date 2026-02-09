import React, { useEffect } from 'react';
import { CheckCircle2, X } from 'lucide-react';

const SuccessModal = ({ message, onClose, autoClose = true }) => {
  useEffect(() => {
    if (autoClose) {
      // Auto close after 2.5 seconds
      const timer = setTimeout(() => {
        onClose();
      }, 2500);
      
      return () => clearTimeout(timer);
    }
  }, [onClose, autoClose]);

  return (
    <div className="modal-overlay-success" onClick={onClose}>
      <div className="success-modal-content" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close-success" onClick={onClose}>
          <X size={20} />
        </button>
        <div className="success-icon-circle">
          <CheckCircle2 size={48} strokeWidth={2} />
        </div>
        <h3 className="success-title">{message}</h3>
      </div>
    </div>
  );
};

export default SuccessModal;
