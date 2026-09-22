import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  loginUser, registerUser, verifyOtp, forgotPassword, resetPassword,
  getNotesByUser, createNote, updateNote, deleteNote,
  getTasksByUser, createTask, toggleTaskStatus, deleteTask,
  getUserProfile, updateUserProfile
} from './api';
import { 
  Search, LogOut, Trash2, Plus, 
  Lock, User, Mail, CheckCircle2, Circle, Pin, 
  Type, Sun, Moon, Command, Tag, AlertCircle, X, Check, Flame,
  Calendar, Clock, Filter, ArrowUpDown, Sparkles, CheckCheck, KeyRound,
  Camera, Pencil, ArrowLeft, RotateCcw, StickyNote, ListChecks, LogIn
} from 'lucide-react';
import './App.css';

// iOS Contacts-style deterministic avatar colors
const AVATAR_PALETTE = [
  'linear-gradient(135deg, #ff9f0a, #ff6b00)',
  'linear-gradient(135deg, #ff453a, #d70015)',
  'linear-gradient(135deg, #ff375f, #d0004f)',
  'linear-gradient(135deg, #bf5af2, #8944ab)',
  'linear-gradient(135deg, #a855f7, #6366f1)',
  'linear-gradient(135deg, #0a84ff, #0060df)',
  'linear-gradient(135deg, #64d2ff, #0a84ff)',
  'linear-gradient(135deg, #30d158, #0a8f3c)',
  'linear-gradient(135deg, #ffd60a, #ff9f0a)',
];

const getInitials = (name) => {
  if (!name) return '?';
  const parts = name.trim().split(/[\s._-]+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

const getAvatarGradient = (name) => {
  if (!name) return AVATAR_PALETTE[0];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_PALETTE[Math.abs(hash) % AVATAR_PALETTE.length];
};

// Resize + compress an uploaded image client-side into a small square data URL
const fileToAvatarDataUrl = (file) => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onerror = reject;
  reader.onload = () => {
    const img = new Image();
    img.onerror = reject;
    img.onload = () => {
      const SIZE = 200;
      const canvas = document.createElement('canvas');
      canvas.width = SIZE;
      canvas.height = SIZE;
      const ctx = canvas.getContext('2d');
      const scale = Math.max(SIZE / img.width, SIZE / img.height);
      const w = img.width * scale, h = img.height * scale;
      ctx.drawImage(img, (SIZE - w) / 2, (SIZE - h) / 2, w, h);
      resolve(canvas.toDataURL('image/jpeg', 0.85));
    };
    img.src = reader.result;
  };
  reader.readAsDataURL(file);
});

// iPhone Contacts-card style avatar: photo if uploaded, otherwise initials on a color
function Avatar({ name, avatarUrl, size = 36 }) {
  const isCustomImage = avatarUrl && avatarUrl.startsWith('data:');
  const style = { width: size, height: size, fontSize: size * 0.4 };
  if (isCustomImage) {
    return <div className="avatar-circle" style={style}><img src={avatarUrl} alt={name} /></div>;
  }
  return (
    <div className="avatar-circle" style={{ ...style, background: getAvatarGradient(name) }}>
      <span>{getInitials(name)}</span>
    </div>
  );
}

const NOTE_COLORS = [
  { id: 'default', label: 'Glass', color: 'rgba(255, 255, 255, 0.05)' },
  { id: 'purple', label: 'Amethyst', color: 'rgba(168, 85, 247, 0.15)' },
  { id: 'blue', label: 'Sapphire', color: 'rgba(59, 130, 246, 0.15)' },
  { id: 'emerald', label: 'Emerald', color: 'rgba(16, 185, 129, 0.15)' },
  { id: 'amber', label: 'Amber', color: 'rgba(245, 158, 11, 0.15)' },
  { id: 'rose', label: 'Rose', color: 'rgba(244, 63, 94, 0.15)' },
];

function App() {
  const [userId, setUserId] = useState(localStorage.getItem('userId') || null);
  const [isLogin, setIsLogin] = useState(true);
  const [authData, setAuthData] = useState({ username: '', email: '', password: '' });
  const [errorMsg, setErrorMsg] = useState('');

  // OTP Verification State
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // App & Theme State
  const [activeTab, setActiveTab] = useState('Today');
  const [searchQuery, setSearchQuery] = useState('');
  const [theme, setTheme] = useState('dark');
  const [isAppLoading, setIsAppLoading] = useState(true);
  const [isCmdKOpen, setIsCmdKOpen] = useState(false);
  const [toasts, setToasts] = useState([]);

  // Profile / Avatar State
  const [profile, setProfile] = useState({ username: '', avatarUrl: '' });
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [profileDraft, setProfileDraft] = useState({ username: '', avatarUrl: '' });
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  // Forgot Password State
  const [forgotPw, setForgotPw] = useState({ step: null, email: '', code: '', newPassword: '', confirmPassword: '' });
  const [forgotPwError, setForgotPwError] = useState('');
  const [isForgotSubmitting, setIsForgotSubmitting] = useState(false);

  // Edit Note State
  const [editingNote, setEditingNote] = useState(null);

  // Parallax refs (direct DOM manipulation — avoids re-render storms on mousemove)
  const orb1Ref = useRef(null);
  const orb2Ref = useRef(null);

  // Data State
  const [tasks, setTasks] = useState([]);
  const [notes, setNotes] = useState([]);
  
  // Task Creator State
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [taskPriority, setTaskPriority] = useState('medium');
  const [taskWorkspace, setTaskWorkspace] = useState('Personal');
  const [taskDueDate, setTaskDueDate] = useState('');

  // Filtering & Sorting State
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [sortBy, setSortBy] = useState('dueDate');

  // Note Creator State
  const [newNote, setNewNote] = useState({ 
    title: '', 
    content: '', 
    fontFamily: 'System', 
    color: 'default',
    isPinned: false 
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    const timer = setTimeout(() => setIsAppLoading(false), 600);
    return () => clearTimeout(timer);
  }, [theme]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsCmdKOpen((prev) => !prev);
      }
      if (e.key === 'Escape') setIsCmdKOpen(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    if (userId) {
      fetchData(userId);
      fetchProfile(userId);
    }
  }, [userId]);

  const fetchData = async (id, isRetry = false) => {
    try {
      const [notesRes, tasksRes] = await Promise.all([getNotesByUser(id), getTasksByUser(id)]);
      setNotes(notesRes.data || []);
      setTasks(tasksRes.data || []);
    } catch (err) {
      console.error('Failed to fetch data:', err);
      // Previously this failed silently, leaving notes/tasks empty with no
      // indication anything went wrong -- indistinguishable from "data was
      // wiped". Surface it and retry once (handles the backend waking up
      // from an idle/cold state on Render's free tier).
      if (!isRetry) {
        showToast('Could not load your notes/tasks. Retrying...', 'error');
        setTimeout(() => fetchData(id, true), 4000);
      } else {
        showToast('Still unable to reach the server. Pull to refresh or check your connection.', 'error');
      }
    }
  };

  const fetchProfile = async (id) => {
    try {
      const res = await getUserProfile(id);
      setProfile({ username: res.data.username || '', avatarUrl: res.data.avatarUrl || '' });
    } catch (err) {
      console.error('Failed to fetch profile:', err);
    }
  };

  const showToast = (message, type = 'info') => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, message, type, leaving: false }]);
    setTimeout(() => {
      setToasts((prev) => prev.map((t) => (t.id === id ? { ...t, leaving: true } : t)));
    }, 2700);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3100);
  };

  // Subtle macOS/iOS-style cursor parallax on the ambient background orbs
  const handleAmbientParallax = (e) => {
    const x = e.clientX / window.innerWidth - 0.5;
    const y = e.clientY / window.innerHeight - 0.5;
    if (orb1Ref.current) orb1Ref.current.style.transform = `translate3d(${x * 50}px, ${y * 50}px, 0)`;
    if (orb2Ref.current) orb2Ref.current.style.transform = `translate3d(${x * -40}px, ${y * -40}px, 0)`;
  };

  // Auth Handlers
  const handleAuthSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setIsSubmitting(true);

    try {
      if (isLogin) {
        const res = await loginUser({ email: authData.email, password: authData.password });
        localStorage.setItem('token', res.data.token);
        localStorage.setItem('userId', res.data.userId);
        setUserId(res.data.userId);
        showToast('Welcome back!', 'login');
      } else {
        const res = await registerUser(authData);
        setShowOtpModal(true);
        showToast(res.data?.message || 'OTP code sent to your email!', 'info');
      }
    } catch (err) {
      setErrorMsg(err.response?.data?.message || (isLogin ? 'Invalid credentials.' : 'Registration failed.'));
      showToast('Auth error', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    if (otpCode.trim().length !== 6) {
      setErrorMsg('Please enter a valid 6-digit OTP code.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await verifyOtp({ email: authData.email, otp: otpCode.trim() });
      localStorage.setItem('token', res.data.token);
      localStorage.setItem('userId', res.data.userId);
      setUserId(res.data.userId);
      setShowOtpModal(false);
      showToast('Account verified successfully!', 'success');
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Invalid or expired OTP code.');
      showToast('OTP Verification failed', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLogout = () => {
    localStorage.clear();
    setUserId(null);
    setTasks([]);
    setNotes([]);
    setProfile({ username: '', avatarUrl: '' });
    showToast('Logged out', 'logout');
  };

  // Forgot Password Handlers
  const openForgotPassword = () => {
    setForgotPwError('');
    setForgotPw({ step: 'request', email: authData.email || '', code: '', newPassword: '', confirmPassword: '' });
  };

  const closeForgotPassword = () => {
    setForgotPw({ step: null, email: '', code: '', newPassword: '', confirmPassword: '' });
    setForgotPwError('');
  };

  const handleForgotPasswordRequest = async (e) => {
    e.preventDefault();
    setForgotPwError('');
    setIsForgotSubmitting(true);
    try {
      const res = await forgotPassword(forgotPw.email);
      setForgotPw((prev) => ({ ...prev, step: 'reset' }));
      showToast(res.data?.message || 'Reset code sent to your email', 'info');
    } catch (err) {
      setForgotPwError(err.response?.data?.message || 'Could not send reset code.');
    } finally {
      setIsForgotSubmitting(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setForgotPwError('');
    if (forgotPw.newPassword.length < 6) {
      setForgotPwError('Password must be at least 6 characters.');
      return;
    }
    if (forgotPw.newPassword !== forgotPw.confirmPassword) {
      setForgotPwError('Passwords do not match.');
      return;
    }
    setIsForgotSubmitting(true);
    try {
      await resetPassword({ email: forgotPw.email, code: forgotPw.code.trim(), newPassword: forgotPw.newPassword });
      showToast('Password reset — please sign in', 'success');
      closeForgotPassword();
      setIsLogin(true);
      setAuthData({ username: '', email: forgotPw.email, password: '' });
    } catch (err) {
      setForgotPwError(err.response?.data?.message || 'Invalid or expired reset code.');
    } finally {
      setIsForgotSubmitting(false);
    }
  };

  // Profile Handlers
  const openProfileModal = () => {
    setProfileDraft({ username: profile.username, avatarUrl: profile.avatarUrl });
    setShowProfileModal(true);
  };

  const handleAvatarFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const dataUrl = await fileToAvatarDataUrl(file);
      setProfileDraft((prev) => ({ ...prev, avatarUrl: dataUrl }));
    } catch (err) {
      showToast('Could not process that image', 'error');
    }
  };

  const handleSaveProfile = async () => {
    setIsSavingProfile(true);
    try {
      const res = await updateUserProfile(userId, profileDraft);
      setProfile({ username: res.data.username, avatarUrl: res.data.avatarUrl || '' });
      setShowProfileModal(false);
      showToast('Profile updated', 'success');
    } catch (err) {
      showToast(err.response?.data?.message || 'Could not update profile', 'error');
    } finally {
      setIsSavingProfile(false);
    }
  };

  // Task Handlers
  const handleCreateTask = async (e) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;
    
    const payload = { 
      title: newTaskTitle.trim(), 
      workspace: activeTab === 'Today' || activeTab === 'Inbox' ? taskWorkspace : activeTab, 
      priority: taskPriority,
      dueDate: taskDueDate || null,
      completed: false 
    };

    try {
      const res = await createTask(userId, payload);
      setTasks((prev) => [res.data, ...prev]);
      setNewTaskTitle('');
      setTaskDueDate('');
      showToast('Task added successfully', 'task');
    } catch (err) {
      // Previously faked success with a local-only task (id: Date.now()),
      // which is why tasks vanished on reload -- they were never saved.
      showToast(err.response?.data?.message || 'Could not add task. Please try again.', 'error');
    }
  };

  const handleToggleTask = async (taskId) => {
    try {
      const res = await toggleTaskStatus(taskId);
      setTasks((prev) => prev.map((t) => (t.id === taskId ? res.data : t)));
    } catch (err) {
      showToast('Could not update task. Please try again.', 'error');
    }
  };

  const handleDeleteTask = async (taskId) => {
    try {
      await deleteTask(taskId);
      setTasks((prev) => prev.filter((t) => t.id !== taskId));
      showToast('Task removed');
    } catch (err) {
      showToast('Could not delete task. Please try again.', 'error');
    }
  };

  const handleClearCompleted = async () => {
    const completedIds = tasks.filter((t) => t.completed).map((t) => t.id);
    if (completedIds.length === 0) return;

    for (const id of completedIds) {
      try { await deleteTask(id); } catch (e) { /* ignore */ }
    }
    setTasks((prev) => prev.filter((t) => !t.completed));
    showToast(`Cleared ${completedIds.length} completed task(s)`, 'success');
  };

  // Note Handlers
  const handleCreateNote = async (e) => {
    e.preventDefault();
    if (!newNote.title.trim() && !newNote.content.trim()) return;
    try {
      await createNote(userId, newNote);
      setNewNote({ title: '', content: '', fontFamily: 'System', color: 'default', isPinned: false });
      const res = await getNotesByUser(userId);
      setNotes(res.data || []);
      showToast('Note saved', 'note');
    } catch (err) {
      // NOTE: this used to fake success by adding the note to local state
      // only, which is exactly why notes disappeared on reload/login -
      // they were never actually persisted. Now we tell the truth.
      showToast(err.response?.data?.message || 'Could not save note. Please try again.', 'error');
    }
  };

  const openEditNote = (note) => setEditingNote({ ...note });
  const closeEditNote = () => setEditingNote(null);

  const handleUpdateNote = async (e) => {
    e.preventDefault();
    if (!editingNote) return;
    const payload = {
      title: editingNote.title,
      content: editingNote.content,
      fontFamily: editingNote.fontFamily,
      color: editingNote.color,
      isPinned: editingNote.isPinned,
    };
    try {
      const res = await updateNote(editingNote.id, userId, payload);
      setNotes((prev) => prev.map((n) => (n.id === editingNote.id ? res.data : n)));
      showToast('Note updated', 'note');
      closeEditNote();
    } catch (err) {
      // Previously this faked a local-only update, which is not what's
      // actually saved server-side, so it vanished on reload. Keep the
      // editor open and tell the user it failed instead.
      showToast(err.response?.data?.message || 'Could not update note. Please try again.', 'error');
    }
  };

  const handleDeleteNote = async (noteId) => {
    try {
      await deleteNote(noteId, userId);
      setNotes((prev) => prev.filter((n) => n.id !== noteId));
      showToast('Note deleted', 'note');
    } catch (err) {
      // Don't remove it from the UI if the server-side delete failed --
      // that made deleted-looking notes reappear after reload.
      showToast(err.response?.data?.message || 'Could not delete note. Please try again.', 'error');
    }
  };

  // Due Date Badge Calculator
  const getDueDateMeta = (dueDateStr) => {
    if (!dueDateStr) return null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const target = new Date(dueDateStr);
    target.setHours(0, 0, 0, 0);

    const diffDays = Math.round((target - today) / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return { label: 'Overdue', class: 'overdue' };
    if (diffDays === 0) return { label: 'Today', class: 'today' };
    if (diffDays === 1) return { label: 'Tomorrow', class: 'tomorrow' };
    return { label: new Date(dueDateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), class: 'upcoming' };
  };

  // Derived Task Statistics
  const activeTasksCount = tasks.filter((t) => !t.completed).length;
  const completedTasksCount = tasks.filter((t) => t.completed).length;
  const totalTasks = tasks.length;
  const completionPercentage = totalTasks > 0 ? Math.round((completedTasksCount / totalTasks) * 100) : 0;

  // Filtered and Sorted Tasks
  const processedTasks = useMemo(() => {
    return tasks
      .filter((t) => {
        if (activeTab !== 'Today' && activeTab !== 'Inbox' && t.workspace !== activeTab) return false;
        if (searchQuery && !t.title.toLowerCase().includes(searchQuery.toLowerCase())) return false;
        if (statusFilter === 'active' && t.completed) return false;
        if (statusFilter === 'completed' && !t.completed) return false;
        if (priorityFilter !== 'all' && t.priority !== priorityFilter) return false;
        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'priority') {
          const map = { high: 3, medium: 2, low: 1 };
          return (map[b.priority] || 0) - (map[a.priority] || 0);
        }
        if (sortBy === 'dueDate') {
          if (!a.dueDate) return 1;
          if (!b.dueDate) return -1;
          return new Date(a.dueDate) - new Date(b.dueDate);
        }
        if (sortBy === 'title') {
          return a.title.localeCompare(b.title);
        }
        return 0;
      });
  }, [tasks, activeTab, searchQuery, statusFilter, priorityFilter, sortBy]);

  const filteredNotes = useMemo(() => {
    return notes.filter((n) => 
      (n.title && n.title.toLowerCase().includes(searchQuery.toLowerCase())) || 
      (n.content && n.content.toLowerCase().includes(searchQuery.toLowerCase()))
    );
  }, [notes, searchQuery]);

  if (isAppLoading) {
    return (
      <div className="loader-screen">
        <div className="loader-content">
          <Command size={40} className="loader-icon" />
          <div className="loader-bar"><div className="loader-progress"></div></div>
        </div>
      </div>
    );
  }

  if (!userId) {
    return (
      <div className="app-layout auth-layout" onMouseMove={handleAmbientParallax}>
        <div className="ambient-orb orb-1" ref={orb1Ref}></div>
        <div className="ambient-orb orb-2" ref={orb2Ref}></div>
        
        <div className="auth-card glass-panel modal-pop-in">
          <div className="auth-header">
            <div className="brand-badge"><Command size={22} /></div>
            <h1 className="auth-title">{isLogin ? 'Welcome Back' : 'Create Account'}</h1>
            <p className="auth-subtitle">NoteTaker Pro — VisionOS</p>
          </div>

          {errorMsg && <div className="auth-error-chip">{errorMsg}</div>}

          <form onSubmit={handleAuthSubmit} className="auth-form">
            <div className="input-field-group">
              {isLogin ? <Mail size={16} className="field-icon" /> : <User size={16} className="field-icon" />}
              <input 
                type={isLogin ? "email" : "text"} 
                placeholder={isLogin ? "Email" : "Username"} 
                value={isLogin ? authData.email : authData.username} 
                onChange={(e) => setAuthData({ ...authData, [isLogin ? 'email' : 'username']: e.target.value })} 
                required 
              />
            </div>
            {!isLogin && (
              <div className="input-field-group">
                <Mail size={16} className="field-icon" />
                <input 
                  type="email" 
                  placeholder="Email" 
                  value={authData.email} 
                  onChange={(e) => setAuthData({ ...authData, email: e.target.value })} 
                  required 
                />
              </div>
            )}
            <div className="input-field-group">
              <Lock size={16} className="field-icon" />
              <input 
                type="password" 
                placeholder="Password" 
                value={authData.password} 
                onChange={(e) => setAuthData({ ...authData, password: e.target.value })} 
                required 
              />
            </div>
            <button type="submit" disabled={isSubmitting} className="glass-btn primary-btn full-btn">
              {isSubmitting ? 'Processing...' : isLogin ? 'Sign In' : 'Create ID'}
            </button>
          </form>

          {isLogin && (
            <button className="link-btn" onClick={openForgotPassword}>
              Forgot password?
            </button>
          )}

          <button className="text-toggle-btn" onClick={() => { setIsLogin(!isLogin); setErrorMsg(''); }}>
            {isLogin ? "Don't have an account? Register" : 'Already registered? Sign in'}
          </button>
        </div>

        {/* OTP Verification Glass Modal */}
        {showOtpModal && (
          <div className="cmdk-backdrop" style={{ zIndex: 1000 }}>
            <div className="auth-card glass-panel" style={{ maxWidth: '380px', width: '100%' }}>
              <div className="auth-header">
                <div className="brand-badge"><Mail size={22} /></div>
                <h1 className="auth-title">Verify Email</h1>
                <p className="auth-subtitle">Enter 6-digit OTP code sent to <br/><strong style={{ color: '#818cf8' }}>{authData.email}</strong></p>
              </div>

              {errorMsg && <div className="auth-error-chip">{errorMsg}</div>}

              <form onSubmit={handleVerifyOtp} className="auth-form">
                <div className="input-field-group">
                  <KeyRound size={16} className="field-icon" />
                  <input 
                    type="text" 
                    maxLength="6"
                    placeholder="000000" 
                    value={otpCode} 
                    onChange={(e) => setOtpCode(e.target.value)} 
                    style={{ textAlign: 'center', fontSize: '1.4rem', letterSpacing: '0.3rem', fontWeight: 'bold' }}
                    required 
                  />
                </div>
                <button type="submit" disabled={isSubmitting} className="glass-btn primary-btn full-btn">
                  {isSubmitting ? 'Verifying...' : 'Verify & Sign In'}
                </button>
              </form>

              <button className="text-toggle-btn" onClick={() => { setShowOtpModal(false); setErrorMsg(''); }}>
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Forgot Password Modal */}
        {forgotPw.step && (
          <div className="cmdk-backdrop" style={{ zIndex: 1000 }}>
            <div className="auth-card glass-panel modal-pop-in" style={{ maxWidth: '380px', width: '100%' }}>
              {forgotPw.step === 'request' ? (
                <>
                  <div className="auth-header">
                    <div className="brand-badge"><KeyRound size={22} /></div>
                    <h1 className="auth-title">Reset Password</h1>
                    <p className="auth-subtitle">Enter your account email and we'll send you a reset code.</p>
                  </div>

                  {forgotPwError && <div className="auth-error-chip">{forgotPwError}</div>}

                  <form onSubmit={handleForgotPasswordRequest} className="auth-form">
                    <div className="input-field-group">
                      <Mail size={16} className="field-icon" />
                      <input
                        type="email"
                        placeholder="Email"
                        value={forgotPw.email}
                        onChange={(e) => setForgotPw({ ...forgotPw, email: e.target.value })}
                        required
                      />
                    </div>
                    <button type="submit" disabled={isForgotSubmitting} className="glass-btn primary-btn full-btn">
                      {isForgotSubmitting ? 'Sending...' : 'Send Reset Code'}
                    </button>
                  </form>

                  <button className="text-toggle-btn" onClick={closeForgotPassword}>
                    Cancel
                  </button>
                </>
              ) : (
                <>
                  <div className="auth-header">
                    <div className="brand-badge"><Lock size={22} /></div>
                    <h1 className="auth-title">Set New Password</h1>
                    <p className="auth-subtitle">Enter the code sent to <br/><strong style={{ color: '#818cf8' }}>{forgotPw.email}</strong></p>
                  </div>

                  {forgotPwError && <div className="auth-error-chip">{forgotPwError}</div>}

                  <form onSubmit={handleResetPassword} className="auth-form">
                    <div className="input-field-group">
                      <KeyRound size={16} className="field-icon" />
                      <input
                        type="text"
                        maxLength="6"
                        placeholder="000000"
                        value={forgotPw.code}
                        onChange={(e) => setForgotPw({ ...forgotPw, code: e.target.value })}
                        style={{ textAlign: 'center', fontSize: '1.4rem', letterSpacing: '0.3rem', fontWeight: 'bold' }}
                        required
                      />
                    </div>
                    <div className="input-field-group">
                      <Lock size={16} className="field-icon" />
                      <input
                        type="password"
                        placeholder="New Password"
                        value={forgotPw.newPassword}
                        onChange={(e) => setForgotPw({ ...forgotPw, newPassword: e.target.value })}
                        required
                      />
                    </div>
                    <div className="input-field-group">
                      <Lock size={16} className="field-icon" />
                      <input
                        type="password"
                        placeholder="Confirm New Password"
                        value={forgotPw.confirmPassword}
                        onChange={(e) => setForgotPw({ ...forgotPw, confirmPassword: e.target.value })}
                        required
                      />
                    </div>
                    <button type="submit" disabled={isForgotSubmitting} className="glass-btn primary-btn full-btn">
                      {isForgotSubmitting ? 'Resetting...' : 'Reset Password'}
                    </button>
                  </form>

                  <button className="text-toggle-btn" onClick={() => setForgotPw((prev) => ({ ...prev, step: 'request' }))}>
                    <ArrowLeft size={13} style={{ verticalAlign: 'middle', marginRight: 4 }} />
                    Back
                  </button>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="app-layout" onMouseMove={handleAmbientParallax}>
      <div className="ambient-orb orb-1" ref={orb1Ref}></div>
      <div className="ambient-orb orb-2" ref={orb2Ref}></div>

      {/* Dynamic Navbar */}
      <header className="mac-nav-wrapper">
        <nav className="mac-nav glass-panel">
          <div className="nav-brand">
            <Command size={18} className="brand-logo" />
            <span className="brand-text">NoteTaker</span>
          </div>

          <div className="nav-segments">
            {['Today', 'Inbox', 'Personal', 'Work', 'Notes'].map((tab) => (
              <button
                key={tab}
                className={`segment-btn ${activeTab === tab ? 'active' : ''}`}
                onClick={() => setActiveTab(tab)}
              >
                {tab}
                {tab === 'Notes' ? (
                  <span className="count-badge">{notes.length}</span>
                ) : tab === 'Today' ? (
                  <span className="count-badge">{activeTasksCount}</span>
                ) : null}
              </button>
            ))}
          </div>

          <div className="nav-actions">
            <button className="search-pill-btn" onClick={() => setIsCmdKOpen(true)}>
              <Search size={14} />
              <span>Search...</span>
              <kbd className="kbd-shortcut">⌘K</kbd>
            </button>

            <button className="icon-action-btn" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
              {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
            </button>

            <button className="avatar-nav-btn" onClick={openProfileModal} title="Profile">
              <Avatar name={profile.username} avatarUrl={profile.avatarUrl} size={30} />
            </button>

            <button className="icon-action-btn logout-danger" onClick={handleLogout}>
              <LogOut size={16} />
            </button>
          </div>
        </nav>
      </header>

      {/* Main Dashboard Area */}
      <main className="main-container">
        <section className="dashboard-grid">
          <div className="hero-meta">
            <h1 className="hero-title">{activeTab}</h1>
            <p className="hero-subtitle">
              {activeTab === 'Notes' 
                ? `${notes.length} notes stored in memory` 
                : `${activeTasksCount} pending tasks remaining`}
            </p>
          </div>

          {activeTab !== 'Notes' && (
            <div className="stats-glass-card glass-panel">
              <div className="stats-info">
                <span className="stats-label">Daily Progress</span>
                <div className="stats-value-row">
                  <span className="stats-number">{completionPercentage}%</span>
                  <span className="stats-subtext">{completedTasksCount}/{totalTasks} Done</span>
                </div>
              </div>
              <div className="progress-bar-track">
                <div className="progress-bar-fill" style={{ width: `${completionPercentage}%` }}></div>
              </div>
            </div>
          )}
        </section>

        {activeTab !== 'Notes' ? (
          <section className="task-view-wrapper">
            {/* Input Dock */}
            <form className="glass-input-dock" onSubmit={handleCreateTask}>
              <Plus size={20} className="dock-icon" />
              <input
                type="text"
                placeholder="Add a new task..."
                value={newTaskTitle}
                onChange={(e) => setNewTaskTitle(e.target.value)}
              />

              {(activeTab === 'Today' || activeTab === 'Inbox') && (
                <div className="workspace-picker-inline">
                  <select 
                    value={taskWorkspace} 
                    onChange={(e) => setTaskWorkspace(e.target.value)}
                    className="glass-select"
                  >
                    <option value="Personal">Personal</option>
                    <option value="Work">Work</option>
                  </select>
                </div>
              )}

              <div className="priority-picker">
                {['low', 'medium', 'high'].map((p) => (
                  <button
                    key={p}
                    type="button"
                    className={`priority-chip ${p} ${taskPriority === p ? 'selected' : ''}`}
                    onClick={() => setTaskPriority(p)}
                  >
                    {p === 'high' && <Flame size={12} />}
                    {p}
                  </button>
                ))}
              </div>

              <div className="date-picker-inline">
                <Calendar size={15} className="date-input-icon" />
                <input
                  type="date"
                  value={taskDueDate}
                  onChange={(e) => setTaskDueDate(e.target.value)}
                  className="glass-date-input"
                />
              </div>

              <button type="submit" className="glass-btn primary-btn">
                Add Task
              </button>
            </form>

            {/* Filter & Sorting Controls */}
            <div className="controls-toolbar glass-panel">
              <div className="filter-group">
                <Filter size={14} className="toolbar-icon" />
                <button 
                  className={`chip-filter ${statusFilter === 'all' ? 'active' : ''}`}
                  onClick={() => setStatusFilter('all')}
                >
                  All ({totalTasks})
                </button>
                <button 
                  className={`chip-filter ${statusFilter === 'active' ? 'active' : ''}`}
                  onClick={() => setStatusFilter('active')}
                >
                  Active ({activeTasksCount})
                </button>
                <button 
                  className={`chip-filter ${statusFilter === 'completed' ? 'active' : ''}`}
                  onClick={() => setStatusFilter('completed')}
                >
                  Done ({completedTasksCount})
                </button>
              </div>

              <div className="toolbar-right-actions">
                <select 
                  value={priorityFilter} 
                  onChange={(e) => setPriorityFilter(e.target.value)}
                  className="glass-select filter-select"
                >
                  <option value="all">All Priorities</option>
                  <option value="high">High Priority</option>
                  <option value="medium">Medium Priority</option>
                  <option value="low">Low Priority</option>
                </select>

                <div className="sort-wrapper">
                  <ArrowUpDown size={14} className="toolbar-icon" />
                  <select 
                    value={sortBy} 
                    onChange={(e) => setSortBy(e.target.value)}
                    className="glass-select filter-select"
                  >
                    <option value="dueDate">Sort by Due Date</option>
                    <option value="priority">Sort by Priority</option>
                    <option value="title">Sort Alphabetically</option>
                  </select>
                </div>

                {completedTasksCount > 0 && (
                  <button className="clear-done-btn" onClick={handleClearCompleted}>
                    <CheckCheck size={14} /> Clear Done
                  </button>
                )}
              </div>
            </div>

            {/* Task Items */}
            <div className="task-stack">
              {processedTasks.length === 0 ? (
                <div className="empty-glass-state glass-panel">
                  <Sparkles size={36} className="empty-icon" />
                  <h3>No tasks match your filter</h3>
                  <p>Try resetting filters or adding a new item above.</p>
                </div>
              ) : (
                processedTasks.map((task) => {
                  const dueMeta = getDueDateMeta(task.dueDate);
                  return (
                    <div key={task.id} className="task-glass-row glass-panel">
                      <button 
                        type="button" 
                        className="check-spring-btn"
                        onClick={() => handleToggleTask(task.id)}
                      >
                        {task.completed ? (
                          <CheckCircle2 size={22} className="icon-done" />
                        ) : (
                          <Circle size={22} className="icon-pending" />
                        )}
                      </button>

                      <span className={`task-title-text ${task.completed ? 'completed' : ''}`}>
                        {task.title}
                      </span>

                      {dueMeta && (
                        <span className={`due-date-badge ${dueMeta.class}`}>
                          <Clock size={11} />
                          {dueMeta.label}
                        </span>
                      )}

                      {task.priority && (
                        <span className={`priority-tag ${task.priority}`}>
                          {task.priority}
                        </span>
                      )}

                      <span className="workspace-chip">
                        <Tag size={12} /> {task.workspace || 'Personal'}
                      </span>

                      <button 
                        type="button" 
                        className="delete-hover-btn" 
                        onClick={() => handleDeleteTask(task.id)}
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </section>
        ) : (
          /* Notes Masonry Grid */
          <section className="notes-view-wrapper">
            <form className="note-composer-card glass-panel" onSubmit={handleCreateNote}>
              <input
                type="text"
                placeholder="Note Title"
                className="composer-title-input"
                value={newNote.title}
                onChange={(e) => setNewNote({ ...newNote, title: e.target.value })}
              />
              <textarea
                placeholder="Write your thoughts..."
                className="composer-textarea"
                rows={3}
                value={newNote.content}
                onChange={(e) => setNewNote({ ...newNote, content: e.target.value })}
              />

              <div className="composer-toolbar">
                <div className="segmented-font-picker">
                  <Type size={14} className="picker-icon" />
                  {['System', 'Serif', 'Mono'].map((font) => (
                    <button
                      key={font}
                      type="button"
                      className={`font-option ${newNote.fontFamily === font ? 'selected' : ''}`}
                      onClick={() => setNewNote({ ...newNote, fontFamily: font })}
                    >
                      {font}
                    </button>
                  ))}
                </div>

                <div className="color-swatch-row">
                  {NOTE_COLORS.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      className={`swatch-btn ${newNote.color === c.id ? 'active' : ''}`}
                      style={{ background: c.color }}
                      onClick={() => setNewNote({ ...newNote, color: c.id })}
                    />
                  ))}
                </div>

                <div className="toolbar-right">
                  <button
                    type="button"
                    className={`pin-toggle-btn ${newNote.isPinned ? 'pinned' : ''}`}
                    onClick={() => setNewNote({ ...newNote, isPinned: !newNote.isPinned })}
                  >
                    <Pin size={14} /> {newNote.isPinned ? 'Pinned' : 'Pin'}
                  </button>

                  <button type="submit" className="glass-btn primary-btn">
                    Save Note
                  </button>
                </div>
              </div>
            </form>

            <div className="notes-masonry-grid">
              {filteredNotes.map((note) => {
                const colorObj = NOTE_COLORS.find((c) => c.id === note.color) || NOTE_COLORS[0];
                return (
                  <div 
                    key={note.id} 
                    className={`note-glass-card glass-panel ${note.isPinned ? 'pinned-border' : ''}`}
                    style={{ backgroundColor: colorObj.color }}
                  >
                    <div className="note-card-header">
                      <span className="font-badge">{note.fontFamily || 'System'}</span>
                      {note.isPinned && <span className="pin-badge"><Pin size={12} /> Pinned</span>}
                      <div className="note-card-actions">
                        <button 
                          type="button" 
                          className="edit-hover-btn" 
                          onClick={() => openEditNote(note)}
                        >
                          <Pencil size={13} />
                        </button>
                        <button 
                          type="button" 
                          className="delete-hover-btn" 
                          onClick={() => handleDeleteNote(note.id)}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>

                    {note.title && <h3 className="note-card-title">{note.title}</h3>}
                    <p className={`note-card-body font-style-${(note.fontFamily || 'system').toLowerCase()}`}>
                      {note.content}
                    </p>
                  </div>
                );
              })}
            </div>
          </section>
        )}
      </main>

      {/* Cmd+K Search Modal */}
      {isCmdKOpen && (
        <div className="cmdk-backdrop" onClick={() => setIsCmdKOpen(false)}>
          <div className="cmdk-modal glass-panel" onClick={(e) => e.stopPropagation()}>
            <div className="cmdk-search-header">
              <Search size={18} />
              <input
                type="text"
                autoFocus
                placeholder="Search notes & tasks..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <button className="cmdk-close-btn" onClick={() => setIsCmdKOpen(false)}>
                <X size={16} />
              </button>
            </div>

            <div className="cmdk-results">
              <div className="cmdk-section-title">Jump To Workspace</div>
              {['Today', 'Inbox', 'Personal', 'Work', 'Notes'].map((tab) => (
                <div
                  key={tab}
                  className="cmdk-row"
                  onClick={() => { setActiveTab(tab); setIsCmdKOpen(false); }}
                >
                  <Command size={14} /> View {tab}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Edit Note Modal */}
      {editingNote && (
        <div className="cmdk-backdrop" onClick={closeEditNote}>
          <form
            className="note-composer-card glass-panel modal-pop-in edit-note-modal"
            onClick={(e) => e.stopPropagation()}
            onSubmit={handleUpdateNote}
          >
            <div className="edit-note-header">
              <h3><Pencil size={15} /> Edit Note</h3>
              <button type="button" className="cmdk-close-btn" onClick={closeEditNote}>
                <X size={16} />
              </button>
            </div>

            <input
              type="text"
              placeholder="Note Title"
              className="composer-title-input"
              value={editingNote.title || ''}
              onChange={(e) => setEditingNote({ ...editingNote, title: e.target.value })}
            />
            <textarea
              placeholder="Write your thoughts..."
              className="composer-textarea"
              rows={5}
              value={editingNote.content || ''}
              onChange={(e) => setEditingNote({ ...editingNote, content: e.target.value })}
            />

            <div className="composer-toolbar">
              <div className="segmented-font-picker">
                <Type size={14} className="picker-icon" />
                {['System', 'Serif', 'Mono'].map((font) => (
                  <button
                    key={font}
                    type="button"
                    className={`font-option ${editingNote.fontFamily === font ? 'selected' : ''}`}
                    onClick={() => setEditingNote({ ...editingNote, fontFamily: font })}
                  >
                    {font}
                  </button>
                ))}
              </div>

              <div className="color-swatch-row">
                {NOTE_COLORS.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    className={`swatch-btn ${editingNote.color === c.id ? 'active' : ''}`}
                    style={{ background: c.color }}
                    onClick={() => setEditingNote({ ...editingNote, color: c.id })}
                  />
                ))}
              </div>

              <div className="toolbar-right">
                <button
                  type="button"
                  className={`pin-toggle-btn ${editingNote.isPinned ? 'pinned' : ''}`}
                  onClick={() => setEditingNote({ ...editingNote, isPinned: !editingNote.isPinned })}
                >
                  <Pin size={14} /> {editingNote.isPinned ? 'Pinned' : 'Pin'}
                </button>

                <button type="submit" className="glass-btn primary-btn">
                  Save Changes
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* Profile Modal */}
      {showProfileModal && (
        <div className="cmdk-backdrop" onClick={() => setShowProfileModal(false)}>
          <div className="auth-card glass-panel modal-pop-in profile-modal" onClick={(e) => e.stopPropagation()}>
            <div className="auth-header">
              <h1 className="auth-title">Your Profile</h1>
              <p className="auth-subtitle">Update your name and photo</p>
            </div>

            <div className="avatar-upload-wrap">
              <Avatar name={profileDraft.username} avatarUrl={profileDraft.avatarUrl} size={96} />
              <label className="avatar-edit-btn" title="Upload photo">
                <Camera size={15} />
                <input type="file" accept="image/*" hidden onChange={handleAvatarFileChange} />
              </label>
            </div>

            {profileDraft.avatarUrl && (
              <button
                type="button"
                className="link-btn"
                onClick={() => setProfileDraft((prev) => ({ ...prev, avatarUrl: '' }))}
              >
                <RotateCcw size={12} style={{ verticalAlign: 'middle', marginRight: 4 }} />
                Use Initials Avatar
              </button>
            )}

            <div className="auth-form" style={{ marginTop: 8 }}>
              <div className="input-field-group">
                <User size={16} className="field-icon" />
                <input
                  type="text"
                  placeholder="Username"
                  value={profileDraft.username}
                  onChange={(e) => setProfileDraft({ ...profileDraft, username: e.target.value })}
                />
              </div>

              <div className="toolbar-right" style={{ justifyContent: 'flex-end', marginTop: 4 }}>
                <button type="button" className="text-toggle-btn" onClick={() => setShowProfileModal(false)}>
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isSavingProfile}
                  className="glass-btn primary-btn"
                  onClick={handleSaveProfile}
                >
                  {isSavingProfile ? 'Saving...' : 'Save Profile'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notifications */}
      <div className="toast-container">
        {toasts.map((t) => {
          const icons = {
            success: <Check size={14} />,
            error: <AlertCircle size={14} />,
            login: <LogIn size={14} />,
            logout: <LogOut size={14} />,
            note: <StickyNote size={14} />,
            task: <ListChecks size={14} />,
            info: <Sparkles size={14} />,
          };
          return (
            <div key={t.id} className={`toast-chip glass-panel ${t.type} ${t.leaving ? 'leaving' : ''}`}>
              {icons[t.type] || <Check size={14} />}
              <span>{t.message}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default App;