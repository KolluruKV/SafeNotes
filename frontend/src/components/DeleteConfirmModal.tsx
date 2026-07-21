import { useState } from 'react';

interface DeleteConfirmModalProps {
  onClose: () => void;
  onConfirm: (otp: string) => Promise<void>;
  onRequestOtp: () => Promise<void>;
  otpSent: boolean;
}

export default function DeleteConfirmModal({
  onClose,
  onConfirm,
  onRequestOtp,
  otpSent,
}: DeleteConfirmModalProps) {
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleRequestOtp = async () => {
    setError('');
    try {
      await onRequestOtp();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      setError(msg || 'Failed to send OTP');
    }
  };

  const handleConfirm = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await onConfirm(otp);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      setError(msg || 'Failed to delete note');
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal delete-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Delete Note</h2>
          <button className="btn-icon" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>

        <p className="delete-warning">
          This action cannot be undone. An OTP will be sent to your email for verification.
        </p>

        {!otpSent ? (
          <button className="btn btn-danger btn-full" onClick={handleRequestOtp}>
            Send OTP to Email
          </button>
        ) : (
          <form onSubmit={handleConfirm}>
            <div className="form-group">
              <label htmlFor="delete-otp">Enter OTP from email</label>
              <input
                id="delete-otp"
                type="text"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="6-digit OTP"
                maxLength={6}
                required
                autoFocus
              />
            </div>
            {error && <p className="error-text">{error}</p>}
            <div className="modal-actions">
              <button type="button" className="btn btn-secondary" onClick={onClose}>
                Cancel
              </button>
              <button type="submit" className="btn btn-danger" disabled={loading || otp.length !== 6}>
                {loading ? 'Deleting...' : 'Confirm Delete'}
              </button>
            </div>
          </form>
        )}

        {error && !otpSent && <p className="error-text">{error}</p>}
      </div>
    </div>
  );
}
