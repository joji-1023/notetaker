import React, { useState } from 'react';
import toast from 'react-hot-toast';
import API from '../api';

export default function OtpModal({ email, onSuccess, onClose }) {
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);

  const handleVerify = async (e) => {
    e.preventDefault();
    if (otp.length !== 6) {
      toast.error('Please enter a 6-digit OTP code');
      return;
    }

    setLoading(true);
    try {
      const res = await API.post('/auth/verify-otp', { email, otp });
      toast.success(res.data.message || 'Account verified!');
      localStorage.setItem('token', res.data.token);
      onSuccess(res.data);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Verification failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl max-w-sm w-full text-white text-center shadow-2xl">
        <h2 className="text-2xl font-bold mb-2">Check Your Gmail</h2>
        <p className="text-sm text-slate-400 mb-6">
          We sent a 6-digit verification code to <span className="text-indigo-400 font-medium">{email}</span>
        </p>
        <form onSubmit={handleVerify}>
          <input
            type="text"
            maxLength="6"
            value={otp}
            onChange={(e) => setOtp(e.target.value)}
            placeholder="000000"
            className="w-full text-center text-3xl tracking-widest py-3 bg-slate-800 border border-slate-700 rounded-xl mb-6 focus:outline-none focus:border-indigo-500 font-mono"
          />
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-indigo-600 hover:bg-indigo-500 py-3 rounded-xl font-semibold transition disabled:opacity-50"
          >
            {loading ? 'Verifying...' : 'Verify Account'}
          </button>
        </form>
        <button onClick={onClose} className="mt-4 text-xs text-slate-500 hover:underline">
          Cancel
        </button>
      </div>
    </div>
  );
}