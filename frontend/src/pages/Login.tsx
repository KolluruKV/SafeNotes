import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { authApi } from '../services/api';
import { useAuth } from '../context/AuthContext';
import AdminPinModal from '../components/AdminPinModal';
import logo from '../images/savenotes_logo.png';

type AuthMode = 'login' | 'register';
type LoginStep = 'credentials' | 'otp';

function maskEmail(email: string): string {
  const [local, domain] = email.split('@');
  if (!domain) return email;
  return `${local.slice(0, 2)}***@${domain}`;
}

export default function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [mode, setMode] = useState<AuthMode>('login');
  const [mobile, setMobile] = useState('');
  const [password, setPassword] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // OTP step state
  const [loginStep, setLoginStep] = useState<LoginStep>('credentials');
  const [otpInput, setOtpInput] = useState('');
  const [preAuthToken, setPreAuthToken] = useState('');
  const [maskedEmail, setMaskedEmail] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (mode === 'register') {
        const res = await authApi.register(mobile, password, email);
        login(res.data.token);
        navigate('/');
        return;
      }

      // Login step 1: verify credentials; backend generates OTP and emails it
      const res = await authApi.login(mobile, password);
      const { preAuthToken: pat, email: userEmail } = res.data;

      setPreAuthToken(pat);
      setMaskedEmail(maskEmail(userEmail));
      setLoginStep('otp');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      setError(msg || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const handleOtpVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await authApi.completeLogin(preAuthToken, otpInput);
      login(res.data.token);
      navigate('/');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      setError(msg || 'Session expired. Please login again.');
    } finally {
      setLoading(false);
    }
  };

  // Auto-verify when all 6 digits are entered
  useEffect(() => {
    if (otpInput.length === 6 && loginStep === 'otp' && !loading) {
      handleOtpVerify(new Event('submit') as unknown as React.FormEvent);
    }
  }, [otpInput]);

  const handleResendOtp = async () => {
    setError('');
    setLoading(true);
    try {
      // Re-verify credentials; backend generates and emails a fresh OTP
      const res = await authApi.login(mobile, password);
      const { preAuthToken: pat } = res.data;
      setPreAuthToken(pat);
      setOtpInput('');
    } catch {
      setError('Failed to resend OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const switchMode = (newMode: AuthMode) => {
    setMode(newMode);
    setError('');
    setEmail('');
    setLoginStep('credentials');
  };

  const [showAdminPin, setShowAdminPin] = useState(false);

  // ── OTP verification step ──
  if (loginStep === 'otp') {
    return (
      <div className="login-page">
        <div className="login-container">
          <div className="login-header">
            <div className="logo">
              <img src={logo} alt="SafeNotes" />
            </div>
            <p>Your Notes. Your Privacy. Always Safe.</p>
          </div>

          <div className="otp-info">
            <span className="otp-icon">📧</span>
            <p>A 6-digit OTP has been sent to</p>
            <strong>{maskedEmail}</strong>
          </div>

          <form onSubmit={handleOtpVerify} className="login-form">
            <div className="form-group">
              <label htmlFor="otp">Enter OTP</label>
              <input
                id="otp"
                type="text"
                inputMode="numeric"
                value={otpInput}
                onChange={(e) => setOtpInput(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="6-digit OTP"
                maxLength={6}
                autoFocus
                autoComplete="one-time-code"
                required
              />
            </div>

            {error && <p className="error-text">{error}</p>}

            <button
              type="submit"
              className="btn btn-primary btn-full"
              disabled={loading || otpInput.length !== 6}
            >
              {loading ? 'Verifying...' : 'Verify OTP'}
            </button>
          </form>

          <button
            type="button"
            className="btn btn-link btn-full"
            onClick={handleResendOtp}
            disabled={loading}
          >
            Resend OTP
          </button>

          <button
            type="button"
            className="btn btn-link btn-full"
            onClick={() => { setLoginStep('credentials'); setError(''); setOtpInput(''); }}
          >
            ← Back to Login
          </button>

          <p className="login-footer">
            All notes are encrypted with AES-256-GCM before storage
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="login-page">
      <div className="login-container">
        <div className="login-header">
          <div className="logo">
            <img src={logo} alt="SafeNotes" />
          </div>
          <p>Your Notes. Your Privacy. Always Safe.</p>
        </div>

        <div className="login-tabs">
          <button
            className={`tab ${mode === 'login' ? 'active' : ''}`}
            onClick={() => switchMode('login')}
          >
            Login
          </button>
          <button
            className={`tab ${mode === 'register' ? 'active' : ''}`}
            onClick={() => switchMode('register')}
          >
            Register
          </button>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group">
            <label htmlFor="mobile">Mobile Number</label>
            <input
              id="mobile"
              type="tel"
              value={mobile}
              onChange={(e) => setMobile(e.target.value.replace(/\D/g, '').slice(0, 10))}
              placeholder="10-digit mobile number"
              maxLength={10}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">4-Digit Password</label>
            <input
              id="password"
              type="password"
              inputMode="numeric"
              value={password}
              onChange={(e) => setPassword(e.target.value.replace(/\D/g, '').slice(0, 4))}
              placeholder="••••"
              maxLength={4}
              required
            />
          </div>

          {mode === 'register' && (
            <div className="form-group">
              <label htmlFor="email">Email</label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                required
              />
            </div>
          )}

          {error && <p className="error-text">{error}</p>}

          <button type="submit" className="btn btn-primary btn-full" disabled={loading}>
            {loading ? 'Please wait...' : mode === 'login' ? 'Login' : 'Register'}
          </button>
        </form>

        <p className="login-footer">
          All notes are encrypted with AES-256-GCM before storage
        </p>

        {/* Hidden admin access — visually blended version tag */}
        <button
          type="button"
          className="admin-secret-link"
          onClick={() => setShowAdminPin(true)}
          tabIndex={-1}
          aria-hidden="true"
        >
          v1.0
        </button>

        {showAdminPin && <AdminPinModal onClose={() => setShowAdminPin(false)} />}
      </div>
    </div>
  );
}
