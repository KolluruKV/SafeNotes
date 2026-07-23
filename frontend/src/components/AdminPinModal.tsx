import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminApi } from '../services/api';
import { useAdmin } from '../context/AdminContext';

interface Props {
  onClose: () => void;
}

export default function AdminPinModal({ onClose }: Props) {
  const navigate = useNavigate();
  const { adminLogin } = useAdmin();
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pin.length !== 6) return;
    setLoading(true);
    setError('');
    try {
      const res = await adminApi.login(pin);
      adminLogin(res.data.token);
      onClose();
      navigate('/admin');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      setError(msg || 'Invalid admin PIN');
      setPin('');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal admin-pin-modal" onClick={(e) => e.stopPropagation()}>
        <div className="admin-pin-header">
          <span className="admin-pin-lock-icon">🔐</span>
          <h2>Admin Access</h2>
          <p>Enter your 6-digit admin PIN to continue</p>
        </div>

        <form onSubmit={handleSubmit} className="admin-pin-form">
          <input
            type="password"
            inputMode="numeric"
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
            placeholder="••••••"
            maxLength={6}
            autoFocus
            autoComplete="off"
            className="admin-pin-input"
          />
          {error && <p className="error-text" style={{ textAlign: 'center' }}>{error}</p>}
          <div className="admin-pin-actions">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading || pin.length !== 6}
            >
              {loading ? 'Verifying…' : 'Access Admin'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
