import React, { useState } from 'react';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import API from '../api';
import OtpModal from '../components/OtpModal';

export default function Register() {
  const [formData, setFormData] = useState({ username: '', email: '', password: '' });
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await API.post('/auth/register', formData);
      toast.success(res.data.message || 'OTP sent to your email!');
      setShowOtpModal(true); // Open the verification modal
    } catch (err) {
      toast.error(err.response?.data?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 text-white p-4">
      <form onSubmit={handleSubmit} className="bg-slate-900 p-8 rounded-2xl border border-slate-800 w-full max-w-md space-y-4">
        <h1 className="text-2xl font-bold text-center mb-6">Create NoteTaker Account</h1>
        
        <input
          type="text"
          placeholder="Username"
          required
          value={formData.username}
          onChange={(e) => setFormData({ ...formData, username: e.target.value })}
          className="w-full p-3 bg-slate-800 border border-slate-700 rounded-xl focus:outline-none focus:border-indigo-500"
        />
        <input
          type="email"
          placeholder="Email address"
          required
          value={formData.email}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          className="w-full p-3 bg-slate-800 border border-slate-700 rounded-xl focus:outline-none focus:border-indigo-500"
        />
        <input
          type="password"
          placeholder="Password"
          required
          value={formData.password}
          onChange={(e) => setFormData({ ...formData, password: e.target.value })}
          className="w-full p-3 bg-slate-800 border border-slate-700 rounded-xl focus:outline-none focus:border-indigo-500"
        />

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-indigo-600 hover:bg-indigo-500 p-3 rounded-xl font-semibold transition disabled:opacity-50"
        >
          {loading ? 'Sending OTP...' : 'Register'}
        </button>
      </form>

      {/* Render OTP Modal when triggered */}
      {showOtpModal && (
        <OtpModal
          email={formData.email}
          onSuccess={() => navigate('/dashboard')}
          onClose={() => setShowOtpModal(false)}
        />
      )}
    </div>
  );
}