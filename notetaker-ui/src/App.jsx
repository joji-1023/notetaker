import React, { useState, useEffect, useMemo } from 'react';
import { 
  loginUser, registerUser, 
  getNotesByUser, createNote, deleteNote,
  getTasksByUser, createTask, toggleTaskStatus, deleteTask 
} from './api';
import { 
  Search, LogOut, Trash2, Plus, 
  Lock, User, Mail, CheckCircle2, Circle, Pin, 
  Type, Sun, Moon, Command, Tag, AlertCircle, X, Check, Flame,
  Calendar, Clock, Filter, ArrowUpDown, Sparkles, CheckCheck
} from 'lucide-react';
import './App.css';

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

  // App & Theme State
  const [activeTab, setActiveTab] = useState('Today');
  const [searchQuery, setSearchQuery] = useState('');
  const [theme, setTheme] = useState('dark');
  const [isAppLoading, setIsAppLoading] = useState(true);
  const [isCmdKOpen, setIsCmdKOpen] = useState(false);
  const [toasts, setToasts] = useState([]);

  // Data State
  const [tasks, setTasks] = useState([]);
  const [notes, setNotes] = useState([]);
  
  // Task Creator State
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [taskPriority, setTaskPriority] = useState('medium');
  const [taskWorkspace, setTaskWorkspace] = useState('Personal');
  const [taskDueDate, setTaskDueDate] = useState('');

  // Filtering & Sorting State
  const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'active' | 'completed'
  const [priorityFilter, setPriorityFilter] = useState('all'); // 'all' | 'high' | 'medium' | 'low'
  const [sortBy, setSortBy] = useState('dueDate'); // 'dueDate' | 'priority' | 'title'

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
    if (userId) fetchData(userId);
  }, [userId]);

  const fetchData = async (id) => {
    try {
      const [notesRes, tasksRes] = await Promise.all([getNotesByUser(id), getTasksByUser(id)]);
      setNotes(notesRes.data || []);
      setTasks(tasksRes.data || []);
    } catch (err) {
      console.error('Failed to fetch data:', err);
    }
  };

  const showToast = (message, type = 'info') => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3000);
  };

  // Auth Handlers
  const handleAuthSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    try {
      const res = isLogin 
        ? await loginUser({ username: authData.username, password: authData.password }) 
        : await registerUser(authData);
      localStorage.setItem('token', res.data.token);
      localStorage.setItem('userId', res.data.userId);
      setUserId(res.data.userId);
      showToast(isLogin ? 'Welcome back!' : 'Account registered!', 'success');
    } catch (err) {
      setErrorMsg(isLogin ? 'Invalid credentials.' : 'Registration failed.');
      showToast('Auth error', 'error');
    }
  };

  const handleLogout = () => {
    localStorage.clear();
    setUserId(null);
    setTasks([]);
    setNotes([]);
    showToast('Logged out');
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
      showToast('Task added successfully', 'success');
    } catch (err) {
      const fallbackTask = { id: Date.now(), ...payload };
      setTasks((prev) => [fallbackTask, ...prev]);
      setNewTaskTitle('');
      setTaskDueDate('');
      showToast('Task added locally', 'info');
    }
  };

  const handleToggleTask = async (taskId) => {
    try {
      const res = await toggleTaskStatus(taskId);
      setTasks((prev) => prev.map((t) => (t.id === taskId ? res.data : t)));
    } catch (err) {
      setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, completed: !t.completed } : t)));
    }
  };

  const handleDeleteTask = async (taskId) => {
    try {
      await deleteTask(taskId);
      setTasks((prev) => prev.filter((t) => t.id !== taskId));
      showToast('Task removed');
    } catch (err) {
      setTasks((prev) => prev.filter((t) => t.id !== taskId));
      showToast('Task removed locally');
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
      showToast('Note saved', 'success');
    } catch (err) {
      const fallbackNote = { id: Date.now(), ...newNote };
      setNotes((prev) => [fallbackNote, ...prev]);
      setNewNote({ title: '', content: '', fontFamily: 'System', color: 'default', isPinned: false });
      showToast('Note saved locally', 'info');
    }
  };

  const handleDeleteNote = async (noteId) => {
    try {
      await deleteNote(noteId, userId);
      setNotes((prev) => prev.filter((n) => n.id !== noteId));
      showToast('Note deleted');
    } catch (err) {
      setNotes((prev) => prev.filter((n) => n.id !== noteId));
      showToast('Note deleted locally');
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
      <div className="app-layout auth-layout">
        <div className="ambient-orb orb-1"></div>
        <div className="ambient-orb orb-2"></div>
        <div className="auth-card glass-panel">
          <div className="auth-header">
            <div className="brand-badge"><Command size={22} /></div>
            <h1 className="auth-title">{isLogin ? 'Welcome Back' : 'Create Account'}</h1>
            <p className="auth-subtitle">NoteTaker Pro — VisionOS</p>
          </div>
          {errorMsg && <div className="auth-error-chip">{errorMsg}</div>}
          <form onSubmit={handleAuthSubmit} className="auth-form">
            <div className="input-field-group">
              <User size={16} className="field-icon" />
              <input 
                type="text" 
                placeholder="Username" 
                value={authData.username} 
                onChange={(e) => setAuthData({ ...authData, username: e.target.value })} 
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
            <button type="submit" className="glass-btn primary-btn full-btn">
              {isLogin ? 'Sign In' : 'Create ID'}
            </button>
          </form>
          <button className="text-toggle-btn" onClick={() => setIsLogin(!isLogin)}>
            {isLogin ? "Don't have an account? Register" : 'Already registered? Sign in'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="app-layout">
      <div className="ambient-orb orb-1"></div>
      <div className="ambient-orb orb-2"></div>

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
                      <button 
                        type="button" 
                        className="delete-hover-btn" 
                        onClick={() => handleDeleteNote(note.id)}
                      >
                        <Trash2 size={14} />
                      </button>
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

      {/* Toast Notifications */}
      <div className="toast-container">
        {toasts.map((t) => (
          <div key={t.id} className={`toast-chip glass-panel ${t.type}`}>
            {t.type === 'success' ? <Check size={14} /> : <AlertCircle size={14} />}
            <span>{t.message}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default App;