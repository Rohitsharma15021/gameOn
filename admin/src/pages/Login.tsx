import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { requestOtp, verifyOtp } from '../lib/endpoints';
import { useAuthStore } from '../store/auth';
import { Button, Card, Input } from '../components/ui';

export default function Login() {
  const [step, setStep] = useState<'phone' | 'code'>('phone');
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [devCode, setDevCode] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const signIn = useAuthStore((s) => s.signIn);
  const navigate = useNavigate();

  const sendCode = async () => {
    setError(null);
    setLoading(true);
    try {
      const res = await requestOtp(phone);
      setDevCode(res.devCode ?? null);
      setCode(res.devCode ?? '');
      setStep('code');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const confirm = async () => {
    setError(null);
    setLoading(true);
    try {
      const res = await verifyOtp(phone, code);
      if (res.user.role === 'PLAYER') {
        setError('This account is not a venue owner or admin. Ask support to upgrade your role.');
        return;
      }
      signIn(res.token, res.user);
      navigate('/venues');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f9f9f7', padding: 16, boxSizing: 'border-box' }}>
      <Card style={{ width: '100%', maxWidth: 380 }}>
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div style={{ fontSize: 32 }}>🏆</div>
          <h1 style={{ fontSize: 20, margin: '8px 0 0' }}>gameOn Venue Console</h1>
          <p style={{ color: '#898781', fontSize: 13, marginTop: 4 }}>Sign in to manage your venues</p>
        </div>

        {step === 'phone' ? (
          <>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Phone number</label>
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+919900000001" />
            {error && <p style={{ color: '#d03b3b', fontSize: 13, marginTop: 8 }}>{error}</p>}
            <Button onClick={sendCode} disabled={loading || phone.length < 6} style={{ width: '100%', marginTop: 16 }}>
              {loading ? 'Sending…' : 'Send code'}
            </Button>
          </>
        ) : (
          <>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Enter the 6-digit code</label>
            <Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="••••••" maxLength={6} />
            {devCode && <p style={{ fontSize: 12, color: '#a05a00', marginTop: 6 }}>Dev mode: code pre-filled ({devCode})</p>}
            {error && <p style={{ color: '#d03b3b', fontSize: 13, marginTop: 8 }}>{error}</p>}
            <Button onClick={confirm} disabled={loading || code.length < 4} style={{ width: '100%', marginTop: 16 }}>
              {loading ? 'Verifying…' : 'Verify & sign in'}
            </Button>
          </>
        )}
      </Card>
    </div>
  );
}
