/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Project, DSREntry, ProjectWork, CustomSubmissionType, AppUser, ProjectLocation } from './types';
import {
  DEFAULT_PROJECTS,
  INITIAL_DSR_ENTRIES,
  ADMIN_EMAILS,
} from './data';
import DSRForm from './components/DSRForm';
import DSRLogs from './components/DSRLogs';
import DSRDashboard from './components/DSRDashboard';
import DSRSettings from './components/DSRSettings';
import LoginScreen from './components/LoginScreen';
import { initAuth, googleSignIn, getAccessToken, logout } from './lib/firebase';
import {
  fetchProjectsFromSheet,
  fetchSubmissionsFromSheet,
  appendSubmissionsToSheet,
  fetchLocationsFromSheet
} from './lib/sheetsService';
import {
  LayoutGrid,
  PenTool,
  Database,
  Sliders,
  Shield,
  User,
  LogOut,
  FileSpreadsheet,
  Building2,
  HardDriveUpload,
  UserCheck,
  Bell
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function App() {
  // Global States (synchronized with localStorage)
  const [adminEmails, setAdminEmails] = useState<string[]>(() => {
    const saved = localStorage.getItem('dsr_admin_emails');
    return saved ? JSON.parse(saved) : ADMIN_EMAILS;
  });

  const [projects, setProjects] = useState<Project[]>(() => {
    const saved = localStorage.getItem('dsr_projects');
    return saved ? JSON.parse(saved) : DEFAULT_PROJECTS;
  });

  const [allowedUsers, setAllowedUsers] = useState<AppUser[]>(() => {
    const saved = localStorage.getItem('dsr_allowed_users');
    return saved ? JSON.parse(saved) : [
      { email: 'vatsalpatel1720@gmail.com', name: 'Vatsal Patel' },
      { email: 'alex.rivera@company.com', name: 'Alex Rivera' },
      { email: 'user@company.com', name: 'John Doe' }
    ];
  });

  const [projectLocations, setProjectLocations] = useState<ProjectLocation[]>(() => {
    const saved = localStorage.getItem('dsr_project_locations');
    return saved ? JSON.parse(saved) : [
      { projectId: 'proj-1', north: 'Delhi', west: 'Mumbai' },
      { projectId: 'proj-2', north: 'Jaipur', west: 'Pune' },
      { projectId: 'proj-3', north: 'New York', west: 'Los Angeles' },
      { projectId: 'proj-4', north: 'London', west: 'Liverpool' },
    ];
  });

  const [customSubmissionTypes, setCustomSubmissionTypes] = useState<CustomSubmissionType[]>(() => {
    const saved = localStorage.getItem('dsr_custom_submission_types');
    return saved ? JSON.parse(saved) : [];
  });

  const [sheetSettings, setSheetSettings] = useState(() => {
    const saved = localStorage.getItem('dsr_sheet_settings');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return {
          spreadsheetId: parsed.spreadsheetId || '',
          projectsTab: parsed.projectsTab || 'Projects',
          submissionsTab: parsed.submissionsTab || 'Submissions',
          locationsTab: parsed.locationsTab || 'Locations',
          isConnected: !!parsed.isConnected
        };
      } catch (e) {
        // ignore fallback
      }
    }
    return {
      spreadsheetId: '',
      projectsTab: 'Projects',
      submissionsTab: 'Submissions',
      locationsTab: 'Locations',
      isConnected: false
    };
  });

  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  const [alerts, setAlerts] = useState<any[]>(() => {
    try {
      const saved = localStorage.getItem('dsr_admin_alerts');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [showNotifications, setShowNotifications] = useState(false);

  useEffect(() => {
    localStorage.setItem('dsr_admin_alerts', JSON.stringify(alerts));
  }, [alerts]);

  const handleAddAlert = (alert: any) => {
    setAlerts(prev => [alert, ...prev]);
  };

  const handleMarkAllAlertsAsRead = () => {
    setAlerts(prev => prev.map(a => ({ ...a, read: true })));
  };

  const handleClearAlert = (id: string) => {
    setAlerts(prev => prev.filter(a => a.id !== id));
  };

  const [entries, setEntries] = useState<DSREntry[]>(() => {
    const saved = localStorage.getItem('dsr_entries');
    if (!saved) return INITIAL_DSR_ENTRIES;
    try {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) {
        return parsed.map((entry: any) => {
          // If already format-compliant, return as is
          if (entry && entry.userEmail && Array.isArray(entry.works)) {
            return entry as DSREntry;
          }

          // Convert a legacy entry to the modern multi-work layout
          const userEmail = entry?.userEmail || entry?.employeeEmail || (entry?.employeeName ? `${entry.employeeName.toLowerCase().replace(/\s+/g, '.')}@company.com` : 'user@company.com');
          
          let works = entry?.works;
          if (!Array.isArray(works)) {
            works = [
              {
                id: `work-legacy-${entry?.id || Date.now()}`,
                projectId: entry?.projectId || 'proj-1',
                projectName: entry?.projectName || 'Phoenix Redesign',
                listingCount: typeof entry?.metric1 === 'number' ? entry.metric1 : (typeof entry?.metric2 === 'number' ? entry.metric2 : 100),
                blog: entry?.notes || entry?.blog || 'Completed legacy task activities logged dynamically.',
                customValues: entry?.customValues || {},
              }
            ];
          }

          return {
            id: entry?.id || `dsr-legacy-${Date.now()}-${Math.random()}`,
            date: entry?.date || new Date().toISOString().split('T')[0],
            userEmail,
            works,
            createdAt: entry?.createdAt || new Date().toISOString(),
          } as DSREntry;
        });
      }
    } catch (e) {
      console.error("Failed to parse or migrate saved entries:", e);
    }
    return INITIAL_DSR_ENTRIES;
  });

  // Login session state
  const [currentUserEmail, setCurrentUserEmail] = useState<string | null>(() => {
    return localStorage.getItem('dsr_logged_user') || null;
  });

  const [activeTab, setActiveTab] = useState<'submit' | 'logs' | 'dashboard' | 'settings'>(() => {
    const savedUser = localStorage.getItem('dsr_logged_user');
    if (savedUser) {
      const savedAdmins = localStorage.getItem('dsr_admin_emails');
      const admins = savedAdmins ? JSON.parse(savedAdmins) : ADMIN_EMAILS;
      return admins.includes(savedUser.trim().toLowerCase()) ? 'dashboard' : 'submit';
    }
    return 'submit';
  });

  // Load and cache Auth automatically
  useEffect(() => {
    initAuth(async (user, token) => {
      if (user && user.email) {
        const userEmail = user.email;
        const isLoginAdmin = adminEmails.some(adm => adm.toLowerCase() === userEmail.trim().toLowerCase());
        const isAllowedUser = allowedUsers.some(u => u.email.trim().toLowerCase() === userEmail.trim().toLowerCase());

        if (!isLoginAdmin && !isAllowedUser) {
          await logout();
          setCurrentUserEmail(null);
          return;
        }

        setCurrentUserEmail(userEmail);
        
        // Read sheetSettings from local storage directly for reliability
        const storedStr = localStorage.getItem('dsr_sheet_settings');
        const settings = storedStr ? JSON.parse(storedStr) : null;
        if (settings && settings.spreadsheetId && settings.isConnected && token) {
          triggerSyncWithToken(settings, token);
        }
      }
    }, () => {
      // Sign-out action
    });
  }, [adminEmails, allowedUsers]);

  // Sync states triggers
  useEffect(() => {
    localStorage.setItem('dsr_admin_emails', JSON.stringify(adminEmails));
  }, [adminEmails]);

  useEffect(() => {
    localStorage.setItem('dsr_projects', JSON.stringify(projects));
  }, [projects]);

  useEffect(() => {
    localStorage.setItem('dsr_allowed_users', JSON.stringify(allowedUsers));
  }, [allowedUsers]);

  useEffect(() => {
    localStorage.setItem('dsr_project_locations', JSON.stringify(projectLocations));
  }, [projectLocations]);

  useEffect(() => {
    localStorage.setItem('dsr_custom_submission_types', JSON.stringify(customSubmissionTypes));
  }, [customSubmissionTypes]);

  useEffect(() => {
    localStorage.setItem('dsr_sheet_settings', JSON.stringify(sheetSettings));
  }, [sheetSettings]);

  useEffect(() => {
    localStorage.setItem('dsr_entries', JSON.stringify(entries));
  }, [entries]);

  useEffect(() => {
    if (currentUserEmail) {
      localStorage.setItem('dsr_logged_user', currentUserEmail);
    } else {
      localStorage.removeItem('dsr_logged_user');
    }
  }, [currentUserEmail]);

  // Derived user parameters
  const isAdmin = currentUserEmail ? adminEmails.some(adm => adm.toLowerCase() === currentUserEmail.trim().toLowerCase()) : false;
  const unreadCount = alerts.filter(a => !a.read).length;
  const [filteredLogsCount, setFilteredLogsCount] = useState<number | null>(null);

  // Actions
  const handleLogin = (email: string) => {
    const isLoginAdmin = adminEmails.some(adm => adm.toLowerCase() === email.trim().toLowerCase());
    const isAllowedUser = allowedUsers.some(u => u.email.trim().toLowerCase() === email.trim().toLowerCase());

    if (!isLoginAdmin && !isAllowedUser) {
      alert(`Access Denied: Your email (${email}) is not authorized by the administrator. Please contact your admin.`);
      return;
    }

    setCurrentUserEmail(email);
    setActiveTab(isLoginAdmin ? 'dashboard' : 'submit');
  };

  const handleLogout = async () => {
    try {
      await logout();
    } catch (e) {
      // silent catch for local logins
    }
    setCurrentUserEmail(null);
    localStorage.removeItem('dsr_logged_user');
  };

  const handleAddCustomSubmissionType = (type: CustomSubmissionType) => {
    setCustomSubmissionTypes((prev) => [...prev, type]);
  };

  const handleDeleteCustomSubmissionType = (id: string) => {
    setCustomSubmissionTypes((prev) => prev.filter(t => t.id !== id));
  };

  const handleUpdateSheetSettings = (settings: typeof sheetSettings) => {
    setSheetSettings(settings);
  };

  // Google SSO authenticator
  const handleGoogleSignIn = async () => {
    setIsLoggingIn(true);
    try {
      const result = await googleSignIn();
      if (result && result.user && result.user.email) {
        const userEmail = result.user.email;
        const isLoginAdmin = adminEmails.some(adm => adm.toLowerCase() === userEmail.trim().toLowerCase());
        const isAllowedUser = allowedUsers.some(u => u.email.trim().toLowerCase() === userEmail.trim().toLowerCase());

        if (!isLoginAdmin && !isAllowedUser) {
          await logout();
          alert(`Access Denied: Your email (${userEmail}) is not authorized by the administrator. Please contact your admin.`);
          setCurrentUserEmail(null);
          return;
        }

        setCurrentUserEmail(userEmail);
        setActiveTab(isLoginAdmin ? 'dashboard' : 'submit');

        // Check if there is configured sheet and sync automatically
        const token = await getAccessToken();
        if (token && sheetSettings.spreadsheetId) {
          await triggerSyncWithToken(sheetSettings, token);
        }
      }
    } catch (err: any) {
      console.error(err);
      alert('SSO Registration error: ' + (err.message || err));
    } finally {
      setIsLoggingIn(false);
    }
  };

  // Synchronizer tool
  const triggerSyncWithToken = async (settings: typeof sheetSettings, token: string) => {
    setIsSyncing(true);
    try {
      const loadedProjects = await fetchProjectsFromSheet(settings.spreadsheetId, settings.projectsTab, token);
      if (loadedProjects && loadedProjects.length > 0) {
        setProjects(loadedProjects);
      }
      
      const loadedEntries = await fetchSubmissionsFromSheet(settings.spreadsheetId, settings.submissionsTab, token);
      if (loadedEntries) {
        setEntries(loadedEntries);
      }

      const loadedLocations = await fetchLocationsFromSheet(settings.spreadsheetId, settings.locationsTab || 'Locations', token);
      if (loadedLocations && loadedLocations.length > 0) {
        setProjectLocations(loadedLocations);
      }

      setSheetSettings({
        ...settings,
        isConnected: true
      });
    } catch (err: any) {
      console.warn('Real-time sheets data retrieval failed, maintaining local offline database:', err);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleTriggerSync = async () => {
    if (!sheetSettings.spreadsheetId) return;
    const token = await getAccessToken();
    if (!token) {
      // Re-trigger SSO consent first
      await handleGoogleSignIn();
      return;
    }
    await triggerSyncWithToken(sheetSettings, token);
  };

  const handleAddDSR = async (worksData: Omit<ProjectWork, 'id'>[], date: string) => {
    if (!currentUserEmail) return;

    // Build the clean works subrecords with unique stable IDs
    const worksWithIds: ProjectWork[] = worksData.map((w, index) => ({
      ...w,
      id: `work-sub-${Date.now()}-${index}-${Math.round(Math.random() * 1000)}`,
    }));

    const newEntry: DSREntry = {
      id: `dsr-${Date.now()}`,
      date,
      userEmail: currentUserEmail,
      works: worksWithIds,
      createdAt: new Date().toISOString(),
    };

    // Save locally immediately
    setEntries((prev) => [newEntry, ...prev]);

    // Async write to sheets if synced live
    if (sheetSettings.spreadsheetId && sheetSettings.isConnected) {
      try {
        const token = await getAccessToken();
        if (token) {
          await appendSubmissionsToSheet(
            sheetSettings.spreadsheetId,
            sheetSettings.submissionsTab,
            worksData,
            date,
            currentUserEmail,
            token
          );
        }
      } catch (err) {
        console.warn('Silent append failure. Maintained on local storage fallback trace.');
      }
    }
  };

  const handleDeleteDSR = (id: string) => {
    if (window.confirm('Are you sure you want to permanently delete this DSR reporting session log?')) {
      setEntries((prev) => prev.filter((e) => e.id !== id));
    }
  };

  const handleUpdateDSRStatus = (id: string, status: 'Pending' | 'Approved' | 'Needs Revision') => {
    setEntries((prev) =>
      prev.map((e) => (e.id === id ? { ...e, status } : e))
    );
  };

  // Admin Project Registry callbacks
  const handleAddProject = (newProj: Omit<Project, 'id'>) => {
    const project: Project = {
      ...newProj,
      id: `proj-${Date.now()}`,
    };
    setProjects((prev) => [...prev, project]);
  };

  const handleDeleteProject = (id: string) => {
    if (window.confirm('Deleting this project will prevent future DSR submissions from tagging it. Continue?')) {
      setProjects((prev) => prev.filter((p) => p.id !== id));
    }
  };

  // Admin Registry Dynamic modification
  const handleAddAdminEmail = (email: string) => {
    setAdminEmails((prev) => [...prev, email]);
  };

  const handleDeleteAdminEmail = (email: string) => {
    if (window.confirm(`Revoke admin clearance privileges for email ${email}?`)) {
      setAdminEmails((prev) => prev.filter((e) => e !== email));
    }
  };

  const handleResetToDefault = () => {
    if (window.confirm('Reset workspace database to default mock system state? All current custom additions will be cleared.')) {
      localStorage.removeItem('dsr_admin_emails');
      localStorage.removeItem('dsr_projects');
      localStorage.removeItem('dsr_entries');
      localStorage.removeItem('dsr_logged_user');
      localStorage.removeItem('dsr_custom_submission_types');
      localStorage.removeItem('dsr_sheet_settings');

      setAdminEmails(ADMIN_EMAILS);
      setProjects(DEFAULT_PROJECTS);
      setEntries(INITIAL_DSR_ENTRIES);
      setCustomSubmissionTypes([]);
      setSheetSettings({
        spreadsheetId: '',
        projectsTab: 'Projects',
        submissionsTab: 'Submissions',
        isConnected: false
      });
      setCurrentUserEmail(null);
      setActiveTab('submit');
    }
  };

  // Render Login state first if session is missing
  if (!currentUserEmail) {
    return (
      <LoginScreen
        onLogin={handleLogin}
        adminEmails={adminEmails}
        onGoogleSignIn={handleGoogleSignIn}
        isLoggingIn={isLoggingIn}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gray-50/50 text-gray-900 font-sans selection:bg-indigo-105 selection:text-indigo-900">

      {/* Main header block */}
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-gray-150">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            
            {/* Left side: branding */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center text-white shadow-xs shrink-0">
                <FileSpreadsheet size={19} />
              </div>
              <div className="overflow-hidden">
                <span className="block text-sm font-black tracking-tight text-gray-900 leading-none">ASSET SCOUT</span>
                <span className="block text-[9px] text-gray-400 font-bold tracking-wider font-mono uppercase mt-1">Daily Status Reports</span>
              </div>
            </div>

            {/* Middle navigation tabs */}
            <nav className="hidden md:flex space-x-1" aria-label="Global Workspace Navigation">
              {!isAdmin && (
                <button
                  id="tab-submit"
                  onClick={() => setActiveTab('submit')}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold cursor-pointer transition ${
                    activeTab === 'submit'
                      ? 'bg-indigo-50 text-indigo-700'
                      : 'text-gray-500 hover:text-gray-800 hover:bg-gray-50'
                  }`}
                >
                  <PenTool size={14} />
                  DSR Submission
                </button>
              )}

              <button
                id="tab-logs"
                onClick={() => setActiveTab('logs')}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold cursor-pointer transition ${
                  activeTab === 'logs'
                    ? 'bg-indigo-50 text-indigo-700'
                    : 'text-gray-500 hover:text-gray-800 hover:bg-gray-50'
                }`}
              >
                <Database size={14} />
                DSR History Logs
              </button>

              <button
                id="tab-dashboard"
                onClick={() => setActiveTab('dashboard')}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold cursor-pointer transition ${
                  activeTab === 'dashboard'
                    ? 'bg-indigo-50 text-indigo-700'
                    : 'text-gray-500 hover:text-gray-800 hover:bg-gray-50'
                }`}
              >
                <LayoutGrid size={14} />
                Analytics Dashboard
              </button>

              {isAdmin && (
                <button
                  id="tab-settings"
                  onClick={() => setActiveTab('settings')}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold cursor-pointer transition ${
                    activeTab === 'settings'
                      ? 'bg-indigo-50 text-indigo-700'
                      : 'text-gray-500 hover:text-gray-800 hover:bg-gray-50'
                  }`}
                >
                  <Sliders size={14} />
                  Admin Settings
                </button>
              )}
            </nav>

            {/* Right Side: Account Actions & Logouts */}
            <div className="flex items-center gap-3">
              {/* Notifications Bell */}
              <div className="relative">
                <button
                  onClick={() => setShowNotifications(!showNotifications)}
                  className={`p-2 border border-gray-150 hover:bg-slate-50 text-gray-500 hover:text-indigo-600 rounded-xl transition cursor-pointer relative ${showNotifications ? 'bg-indigo-50/50 text-indigo-600 border-indigo-200' : ''}`}
                  title="Notifications & Alerts"
                >
                  <Bell size={15} />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[9px] font-black text-white ring-2 ring-white">
                      {unreadCount}
                    </span>
                  )}
                </button>

                {showNotifications && (
                  <div className="absolute right-0 mt-2 w-80 bg-white border border-gray-150 rounded-2xl shadow-lg py-3 z-50 animate-fade-in divide-y divide-gray-100 max-h-[400px] overflow-y-auto">
                    <div className="px-4 pb-2 flex justify-between items-center">
                      <span className="font-extrabold text-xs text-gray-900 uppercase tracking-wider flex items-center gap-1.5 font-sans">
                        <Bell size={12} className="text-indigo-600" />
                        Admin Alerts
                      </span>
                      {unreadCount > 0 && (
                        <button
                          onClick={handleMarkAllAlertsAsRead}
                          className="text-[10px] text-indigo-600 hover:underline font-extrabold uppercase font-sans"
                        >
                          Mark all read
                        </button>
                      )}
                    </div>

                    <div className="py-1">
                      {alerts.length === 0 ? (
                        <div className="px-4 py-6 text-center text-xs text-gray-400 font-medium font-mono italic">
                          No alerts from administrator yet.
                        </div>
                      ) : (
                        alerts.map((alert) => (
                          <div
                            key={alert.id}
                            className={`px-4 py-3 text-left relative hover:bg-slate-50/50 transition-colors ${!alert.read ? 'bg-indigo-50/10 font-bold' : ''}`}
                          >
                            <div className="flex justify-between items-start gap-2">
                              <div>
                                <span className="inline-block bg-indigo-50 text-indigo-700 font-black px-1.5 py-0.5 rounded text-[8px] uppercase tracking-wider mb-1">
                                  {alert.projectName}
                                </span>
                                {alert.projectDomain && (
                                  <span className="text-[8px] text-gray-405 font-medium ml-1">
                                    ({alert.projectDomain})
                                  </span>
                                )}
                              </div>
                              <button
                                onClick={() => handleClearAlert(alert.id)}
                                className="text-gray-400 hover:text-rose-600 text-[12px] p-0.5 leading-none font-bold"
                                title="Dismiss Alert"
                              >
                                &times;
                              </button>
                            </div>
                            <p className="text-[11px] font-semibold text-gray-750 leading-relaxed mt-1 whitespace-pre-wrap">
                              {alert.message}
                            </p>
                            <div className="flex justify-between items-center mt-2 text-[8px] text-gray-405 font-bold font-mono uppercase">
                              <span>By {alert.adminEmail}</span>
                              <span>{new Date(alert.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                            </div>
                            {!alert.read && (
                              <span className="absolute left-1.5 top-1/2 -translate-y-1/2 w-1.5 h-1.5 bg-indigo-600 rounded-full"></span>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Profile card badge */}
              <div className="hidden lg:flex items-center gap-2.5 px-3 py-1.5 bg-gray-50 border border-gray-150 rounded-xl text-xs max-w-64">
                {isAdmin ? (
                  <Shield size={13} className="text-indigo-600 shrink-0" />
                ) : (
                  <User size={13} className="text-gray-550 shrink-0" />
                )}
                <div className="overflow-hidden leading-none text-left">
                  <span className="block font-bold text-gray-800 truncate" title={currentUserEmail}>
                    {currentUserEmail}
                  </span>
                  <span className="text-[9px] text-gray-400 font-mono mt-0.5 block uppercase tracking-wider">
                    {isAdmin ? 'Administrator' : 'Reporter Profile'}
                  </span>
                </div>
              </div>

              {/* Log out actions */}
              <button
                onClick={handleLogout}
                className="p-2 border border-gray-150 hover:bg-rose-50 text-gray-500 hover:text-rose-600 rounded-xl transition cursor-pointer"
                title="Switch Account / Sign Out"
              >
                <LogOut size={15} />
              </button>
            </div>

          </div>
        </div>
      </header>

      {/* Main app grid frame */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Mobile quick tab Navigation */}
        <div className="flex md:hidden bg-white p-2 rounded-2xl border border-gray-150 mb-6 gap-1 justify-around shadow-xs">
          {!isAdmin && (
            <button
              onClick={() => setActiveTab('submit')}
              className={`flex flex-col items-center gap-1 py-2 px-1 rounded-xl text-[10px] font-bold w-1/4 transition cursor-pointer ${
                activeTab === 'submit' ? 'text-indigo-600 bg-indigo-50/50' : 'text-gray-400 hover:text-gray-700'
              }`}
            >
              <PenTool size={15} />
              DSR Entry
            </button>
          )}
          
          <button
            onClick={() => setActiveTab('logs')}
            className={`flex flex-col items-center gap-1 py-1.5 px-1 rounded-xl text-[10px] font-bold w-1/4 transition cursor-pointer ${
              activeTab === 'logs' ? 'text-indigo-600 bg-indigo-50/50' : 'text-gray-400 hover:text-gray-700'
            }`}
          >
            <Database size={15} />
            History Logs
          </button>

          <button
            onClick={() => setActiveTab('dashboard')}
            className={`flex flex-col items-center gap-1 py-1.5 px-1 rounded-xl text-[10px] font-bold w-1/4 transition cursor-pointer ${
              activeTab === 'dashboard' ? 'text-indigo-600 bg-indigo-50/50' : 'text-gray-400 hover:text-gray-700'
            }`}
          >
            <LayoutGrid size={15} />
            Dashboard
          </button>
          
          {isAdmin && (
            <button
              onClick={() => setActiveTab('settings')}
              className={`flex flex-col items-center gap-1 py-1.5 px-1 rounded-xl text-[10px] font-bold w-1/4 transition cursor-pointer ${
                activeTab === 'settings' ? 'text-indigo-600 bg-indigo-50/50' : 'text-gray-400 hover:text-gray-700'
              }`}
            >
              <Sliders size={15} />
              Settings
            </button>
          )}
        </div>

        {/* Dynamic header descriptions */}
        {activeTab !== 'dashboard' && (
          <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-150 pb-6">
            <div className="space-y-1">
              <h1 className="text-xl font-black text-gray-900 tracking-tight sm:text-2xl flex items-center gap-2">
                {activeTab === 'submit' && 'DSR Status Submissions'}
                {activeTab === 'logs' && 'Daily Task History'}
                {activeTab === 'dashboard' && 'Team Progress Analytics'}
                {activeTab === 'settings' && 'System Configuration Studio'}
              </h1>
            </div>

            <div className="flex items-center gap-2 text-xs">
              {activeTab === 'logs' && (
                <span className="bg-indigo-50 border border-indigo-200/60 text-indigo-700 px-3 py-1.5 rounded-xl font-bold flex items-center gap-1.5 shadow-2xs">
                  ⚡ Total Logs: <strong>{filteredLogsCount !== null ? filteredLogsCount : 0} logs</strong>
                </span>
              )}
            </div>
          </div>
        )}

        {/* Primary Workspace View Switch */}
        <div className="min-h-[500px]">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.15 }}
            >
              {activeTab === 'submit' && !isAdmin && (
                <DSRForm
                  projects={projects}
                  onSubmit={handleAddDSR}
                  currentUserEmail={currentUserEmail}
                  onViewLogs={() => setActiveTab('logs')}
                  customSubmissionTypes={customSubmissionTypes}
                />
              )}

              {activeTab === 'logs' && (
                <DSRLogs
                  entries={entries}
                  projects={projects}
                  onDeleteEntry={handleDeleteDSR}
                  onUpdateStatus={handleUpdateDSRStatus}
                  isAdmin={isAdmin}
                  customSubmissionTypes={customSubmissionTypes}
                  allowedUsers={allowedUsers}
                  currentUserEmail={currentUserEmail}
                  onFilteredCountChange={setFilteredLogsCount}
                />
              )}

              {activeTab === 'dashboard' && (
                <DSRDashboard
                  entries={entries}
                  projects={projects}
                  allowedUsers={allowedUsers}
                  projectLocations={projectLocations}
                  isAdmin={isAdmin}
                  currentUserEmail={currentUserEmail || ''}
                  customSubmissionTypes={customSubmissionTypes}
                  alerts={alerts}
                  onAddAlert={handleAddAlert}
                />
              )}

              {activeTab === 'settings' && isAdmin && (
                <DSRSettings
                  projects={projects}
                  adminEmails={adminEmails}
                  entries={entries}
                  onAddAdminEmail={handleAddAdminEmail}
                  onDeleteAdminEmail={handleDeleteAdminEmail}
                  currentUserEmail={currentUserEmail}
                  customSubmissionTypes={customSubmissionTypes}
                  onAddCustomSubmissionType={handleAddCustomSubmissionType}
                  onDeleteCustomSubmissionType={handleDeleteCustomSubmissionType}
                  sheetSettings={sheetSettings}
                  onUpdateSheetSettings={handleUpdateSheetSettings}
                  onTriggerSync={handleTriggerSync}
                  isSyncing={isSyncing}
                  allowedUsers={allowedUsers}
                  onSetAllowedUsers={setAllowedUsers}
                  projectLocations={projectLocations}
                  onSetProjectLocations={setProjectLocations}
                  onUpdateProjects={setProjects}
                />
              )}
            </motion.div>
          </AnimatePresence>
        </div>

      </main>
    </div>
  );
}
