import React, { useEffect } from 'react';
import { CheckCircle2, AlertTriangle, Info, X } from 'lucide-react';

const ICONS = {
  success: CheckCircle2,
  danger: AlertTriangle,
  info: Info
};

const AppModal = ({
  open,
  title,
  message,
  variant = 'success',
  onClose,
  primaryAction,
  secondaryAction,
  autoClose = false,
  autoCloseDelay = 1800
}) => {
  useEffect(() => {
    if (!open || !autoClose) return undefined;
    const timer = setTimeout(() => {
      if (onClose) onClose();
    }, autoCloseDelay);

    return () => clearTimeout(timer);
  }, [open, autoClose, autoCloseDelay, onClose]);

  if (!open) return null;

  const Icon = ICONS[variant] || Info;
  const hasActions = Boolean(primaryAction || secondaryAction);

  const handlePrimary = () => {
    if (primaryAction?.onClick) {
      primaryAction.onClick();
      return;
    }
    if (onClose) onClose();
  };

  const handleSecondary = () => {
    if (secondaryAction?.onClick) {
      secondaryAction.onClick();
      return;
    }
    if (onClose) onClose();
  };

  return (
    <div className="app-modal-overlay" onClick={onClose}>
      <div className={`app-modal app-modal-${variant}`} onClick={(e) => e.stopPropagation()}>
        <button className="app-modal-close" onClick={onClose} aria-label="Close modal">
          <X size={18} />
        </button>
        <div className={`app-modal-icon app-modal-icon-${variant}`}>
          <Icon size={28} />
        </div>
        <h3 className="app-modal-title">{title}</h3>
        {message && <p className="app-modal-message">{message}</p>}
        {hasActions && (
          <div className="app-modal-actions">
            {secondaryAction && (
              <button className="btn btn-secondary" onClick={handleSecondary}>
                {secondaryAction.label || 'Cancel'}
              </button>
            )}
            <button
              className={`btn ${variant === 'danger' ? 'btn-danger' : 'btn-primary'}`}
              onClick={handlePrimary}
            >
              {primaryAction?.label || 'OK'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default AppModal;
