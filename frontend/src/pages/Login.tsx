import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authApi } from '../services/api';
import { useAuth } from '../context/AuthContext';
import logo from '../images/savenotes_logo.png';

type AuthMode = 'login' | 'register';
type AuthStep = 'credentials' | 'otp';

export default function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [mode, setMode] = useState<AuthMode>('login');
  const [step, setStep] = useState<AuthStep>('credentials');
  const [mobile, setMobile] = useState('');
  const [password, setPassword] = useState('');
  const [email, setEmail] = useState('kollurukv@gmail.com');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const handleCredentialsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');

    try {
      if (mode === 'login') {
        const res = await authApi.login(mobile, password);
        setMessage(res.data.message);
      } else {
        const res = await authApi.register(mobile, password, email);
        setMessage(res.data.message);
      }
      setStep('otp');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      setError(msg || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const handleOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      let res;
      if (mode === 'login') {
        res = await authApi.verifyLogin(mobile, otp);
      } else {
        res = await authApi.verifyRegister(mobile, password, otp, email);
      }
      login(res.data.token);
      navigate('/');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      setError(msg || 'Invalid OTP');
    } finally {
      setLoading(false);
    }
  };

  const switchMode = (newMode: AuthMode) => {
    setMode(newMode);
    setStep('credentials');
    setError('');
    setMessage('');
    setOtp('');
  };

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

        {step === 'credentials' ? (
          <form onSubmit={handleCredentialsSubmit} className="login-form">
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
                <label htmlFor="email">Email (for OTP)</label>
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
        ) : (
          <form onSubmit={handleOtpSubmit} className="login-form">
            {message && <p className="success-text">{message}</p>}

            <div className="form-group">
              <label htmlFor="otp">Enter OTP from Email</label>
              <input
                id="otp"
                type="text"
                inputMode="numeric"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="6-digit OTP"
                maxLength={6}
                required
                autoFocus
              />
            </div>

            {error && <p className="error-text">{error}</p>}

            <button type="submit" className="btn btn-primary btn-full" disabled={loading || otp.length !== 6}>
              {loading ? 'Verifying...' : 'Verify OTP'}
            </button>

            <button
              type="button"
              className="btn btn-link"
              onClick={() => { setStep('credentials'); setOtp(''); setError(''); }}
            >
              ← Back
            </button>
          </form>
        )}

        <p className="login-footer">
          All notes are encrypted with AES-256-GCM before storage
        </p>
      </div>
    </div>
  );
}
