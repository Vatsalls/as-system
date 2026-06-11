/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { Project, CustomSubmissionType, DSREntry, AppUser, ProjectLocation } from '../types';
import {
  Plus,
  Trash2,
  Lock,
  Mail,
  ShieldCheck,
  FileSpreadsheet,
  Users,
  Settings2,
  HardDriveUpload,
  RefreshCw,
  PlusCircle,
  HelpCircle,
  Hash,
  Database,
  UserPlus
} from 'lucide-react';
import { motion } from 'motion/react';

interface DSRSettingsProps {
  projects: Project[];
  adminEmails: string[];
  entries: DSREntry[];
  onAddAdminEmail: (email: string) => void;
  onDeleteAdminEmail: (email: string) => void;
  currentUserEmail: string;

  // Custom Submission Type Callbacks
  customSubmissionTypes: CustomSubmissionType[];
  onAddCustomSubmissionType: (type: CustomSubmissionType) => void;
  onDeleteCustomSubmissionType: (id: string) => void;

  // Google Sheets integration state and callbacks
  sheetSettings: {
    spreadsheetId: string;
    projectsTab: string;
    submissionsTab: string;
    locationsTab?: string;
    isConnected: boolean;
  };
  onUpdateSheetSettings: (settings: {
    spreadsheetId: string;
    projectsTab: string;
    submissionsTab: string;
    locationsTab: string;
    isConnected: boolean;
  }) => void;
  onTriggerSync: () => Promise<void>;
  isSyncing: boolean;

  // Admin access-control users callbacks
  allowedUsers: AppUser[];
  onSetAllowedUsers: React.Dispatch<React.SetStateAction<AppUser[]>>;
  projectLocations: ProjectLocation[];
  onSetProjectLocations: React.Dispatch<React.SetStateAction<ProjectLocation[]>>;
}

export default function DSRSettings({
  projects,
  adminEmails,
  entries,
  onAddAdminEmail,
  onDeleteAdminEmail,
  currentUserEmail,

  customSubmissionTypes,
  onAddCustomSubmissionType,
  onDeleteCustomSubmissionType,

  sheetSettings,
  onUpdateSheetSettings,
  onTriggerSync,
  isSyncing,

  allowedUsers,
  onSetAllowedUsers,
  projectLocations,
  onSetProjectLocations,
}: DSRSettingsProps) {
  // Navigation Tabs inside Settings Panel
  const [activeSubTab, setActiveSubTab] = useState<'sheets' | 'metrics' | 'users' | 'admins'>('sheets');

  // Input states
  const [newAdminEmail, setNewAdminEmail] = useState('');
  const [spreadsheetUrlInput, setSpreadsheetUrlInput] = useState(sheetSettings.spreadsheetId);
  const [projectsTabInput, setProjectsTabInput] = useState(sheetSettings.projectsTab || 'Projects');
  const [submissionsTabInput, setSubmissionsTabInput] = useState(sheetSettings.submissionsTab || 'Submissions');
  const [locationsTabInput, setLocationsTabInput] = useState(sheetSettings.locationsTab || 'Locations');

  // User additions inputs
  const [newUserName, setNewUserName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');



  // New Custom Submission Type Form state
  const [metricName, setMetricName] = useState('');
  const [metricCode, setMetricCode] = useState('');

  // Status Alerts
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const triggerAlert = (type: 'success' | 'error', text: string) => {
    setStatusMsg({ type, text });
    setTimeout(() => {
      setStatusMsg(null);
    }, 4000);
  };

  // 1. Google Sheets Save
  const handleSaveSheetsConfig = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateSheetSettings({
      spreadsheetId: spreadsheetUrlInput.trim(),
      projectsTab: projectsTabInput.trim() || 'Projects',
      submissionsTab: submissionsTabInput.trim() || 'Submissions',
      locationsTab: locationsTabInput.trim() || 'Locations',
      isConnected: sheetSettings.isConnected, // maintain current
    });
    triggerAlert('success', 'Google Sheet spreadsheet indices saved successfully.');
  };

  // Connect & Sync action
  const handleTestSheetsSync = async () => {
    if (!spreadsheetUrlInput.trim()) {
      triggerAlert('error', 'Spreadsheet Link or ID cannot be blank.');
      return;
    }
    try {
      await onTriggerSync();
      triggerAlert('success', 'Connected! Google Sheets projects and submissions directory synced in real-time.');
    } catch (err: any) {
      console.error(err);
      triggerAlert('error', err.message || 'Sheets connection failed. Check authorization and spreadsheet permissions.');
    }
  };

  // Disconnect Sheet
  const handleDisconnectSheets = () => {
    onUpdateSheetSettings({
      spreadsheetId: '',
      projectsTab: 'Projects',
      submissionsTab: 'Submissions',
      locationsTab: 'Locations',
      isConnected: false
    });
    setSpreadsheetUrlInput('');
    triggerAlert('success', 'Google Sheets database link disconnected cleanly. Switched into local offline database state.');
  };

  // 2. Custom Metrics Addition
  const handleCreateMetric = (e: React.FormEvent) => {
    e.preventDefault();
    const name = metricName.trim();
    const code = metricCode.trim().toUpperCase();

    if (!name || !code) return;

    // Check collision
    const slug = name.toLowerCase().replace(/\s+/g, '-');
    if (customSubmissionTypes.some(t => t.id === slug || t.code === code)) {
      alert('A submission type with this name or code identifier already exists!');
      return;
    }

    onAddCustomSubmissionType({
      id: slug,
      name,
      code,
      placeholder: '0'
    });

    setMetricName('');
    setMetricCode('');
    triggerAlert('success', `Dynamic submission parameter "${name}" successfully registered!`);
  };

  // 3. User & Reporter directory compilation
  const reportersDir = useMemo(() => {
    const map: Record<string, {
      email: string;
      submissionsCount: number;
      listing: number;
      blog: number;
      pdf: number;
      image: number;
      lastActive: string;
    }> = {};

    entries.forEach((entry) => {
      if (!entry || !entry.userEmail) return;
      const email = entry.userEmail.trim().toLowerCase();
      if (!map[email]) {
        map[email] = {
          email: entry.userEmail,
          submissionsCount: 0,
          listing: 0,
          blog: 0,
          pdf: 0,
          image: 0,
          lastActive: entry.date,
        };
      }

      const userRecord = map[email];
      userRecord.submissionsCount += 1;
      
      if (new Date(entry.date) > new Date(userRecord.lastActive)) {
        userRecord.lastActive = entry.date;
      }

      (entry.works || []).forEach((work) => {
        userRecord.listing += (work.listingCount || 0);
        userRecord.blog += (work.blogCount || 0);
        userRecord.pdf += (work.pdfCount || 0);
        userRecord.image += (work.imageCount || 0);
      });
    });

    return Object.values(map).sort((a, b) => b.submissionsCount - a.submissionsCount);
  }, [entries]);

  // 4. Admin addition
  const handleAddAdminEmail = (e: React.FormEvent) => {
    e.preventDefault();
    const email = newAdminEmail.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email)) return;
    
    if (adminEmails.includes(email)) {
      alert('Email specified is already in the administrator registry!');
      return;
    }

    onAddAdminEmail(email);
    setNewAdminEmail('');
    triggerAlert('success', 'Authorized admin email added to secure list.');
  };

  return (
    <div className="space-y-8 animate-fade-in">
      
      {/* Internal Setup Tabs */}
      <div className="flex border-b border-gray-150 gap-2 overflow-x-auto pb-px">
        <button
          onClick={() => setActiveSubTab('sheets')}
          className={`flex items-center gap-2 px-5 py-3 border-b-2 font-bold text-xs cursor-pointer transition ${
            activeSubTab === 'sheets'
              ? 'border-indigo-600 text-indigo-700'
              : 'border-transparent text-gray-400 hover:text-gray-700 hover:border-gray-200'
          }`}
        >
          <FileSpreadsheet size={15} />
          Google Sheets Database Link
        </button>
        <button
          onClick={() => setActiveSubTab('metrics')}
          className={`flex items-center gap-2 px-5 py-3 border-b-2 font-bold text-xs cursor-pointer transition ${
            activeSubTab === 'metrics'
              ? 'border-indigo-600 text-indigo-700'
              : 'border-transparent text-gray-400 hover:text-gray-700 hover:border-gray-200'
          }`}
        >
          <Settings2 size={15} />
          Dynamic Metrics (Custom Type)
        </button>
        <button
          onClick={() => setActiveSubTab('users')}
          className={`flex items-center gap-2 px-5 py-3 border-b-2 font-bold text-xs cursor-pointer transition ${
            activeSubTab === 'users'
              ? 'border-indigo-600 text-indigo-700'
              : 'border-transparent text-gray-400 hover:text-gray-700 hover:border-gray-200'
          }`}
        >
          <Users size={15} />
          Users
        </button>
        <button
          onClick={() => setActiveSubTab('admins')}
          className={`flex items-center gap-2 px-5 py-3 border-b-2 font-bold text-xs cursor-pointer transition ${
            activeSubTab === 'admins'
              ? 'border-indigo-600 text-indigo-700'
              : 'border-transparent text-gray-400 hover:text-gray-700 hover:border-gray-200'
          }`}
        >
          <Mail size={15} />
          Authorized Administrators
        </button>
      </div>

      {/* Sub-Alert status notifications */}
      {statusMsg && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className={`p-4 rounded-xl text-xs font-bold flex items-center gap-2 shadow-xs ${
            statusMsg.type === 'success'
              ? 'bg-emerald-55 text-emerald-900 border border-emerald-100'
              : 'bg-rose-50 text-rose-900 border border-rose-100'
          }`}
        >
          <span>{statusMsg.type === 'success' ? '🟢' : '🔴'}</span>
          <span>{statusMsg.text}</span>
        </motion.div>
      )}

      {/* Active settings module view */}
      <div className="bg-white p-6 sm:p-8 rounded-3xl border border-gray-150 shadow-xs">
        
        {/* TAB 1: Google Sheets Database */}
        {activeSubTab === 'sheets' && (
          <div className="space-y-8 animate-fade-in">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 pb-5">
              <div className="space-y-1">
                <h4 className="font-extrabold text-gray-900 text-sm">Google Sheets Live Sync Hub</h4>
                <p className="text-xs text-gray-400">Integrate dynamic external Google Sheets to power active projects and record teammate reports in real-time.</p>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <span className={`inline-flex w-2.5 h-2.5 rounded-full ${sheetSettings.isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-rose-400'}`}></span>
                <span className="text-xs font-bold font-mono">
                  {sheetSettings.isConnected ? 'Live Sync Active' : 'Offline Mode (Local Storage)'}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              
              {/* Settings Configuration form */}
              <form onSubmit={handleSaveSheetsConfig} className="space-y-5">
                <div className="space-y-2">
                  <label htmlFor="sheets-url-id" className="block text-xs font-bold text-gray-750 uppercase tracking-widest flex items-center gap-1.5">
                    <FileSpreadsheet size={15} className="text-indigo-500" />
                    Google Spreadsheet ID or Link
                  </label>
                  <input
                    id="sheets-url-id"
                    type="text"
                    required
                    placeholder="https://docs.google.com/spreadsheets/d/SpreadsheetIDGoesHere/edit"
                    value={spreadsheetUrlInput}
                    onChange={(e) => setSpreadsheetUrlInput(e.target.value)}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-250 focus:border-indigo-600 focus:bg-white rounded-xl text-gray-950 font-medium placeholder-gray-400 focus:outline-none transition text-xs"
                  />
                  <p className="text-[10px] text-gray-400 leading-snug font-medium pl-0.5">
                    Copy and paste the full URL of the Google Sheet, or the raw Spreadsheet ID directly.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label htmlFor="sheets-projects-tab" className="block text-xs font-bold text-gray-750 uppercase tracking-widest">
                      📂 Projects Tab Name
                    </label>
                    <input
                      id="sheets-projects-tab"
                      type="text"
                      placeholder="Projects"
                      value={projectsTabInput}
                      onChange={(e) => setProjectsTabInput(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-250 rounded-xl text-xs text-gray-950 font-bold focus:outline-none focus:bg-white"
                    />
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="sheets-submissions-tab" className="block text-xs font-bold text-gray-750 uppercase tracking-widest">
                      📝 Reports Tab Name
                    </label>
                    <input
                      id="sheets-submissions-tab"
                      type="text"
                      placeholder="Submissions"
                      value={submissionsTabInput}
                      onChange={(e) => setSubmissionsTabInput(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-250 rounded-xl text-xs text-gray-950 font-bold focus:outline-none focus:bg-white"
                    />
                  </div>
                </div>

                <div className="pt-3 flex flex-wrap gap-3">
                  <button
                    type="submit"
                    className="px-5 py-3 bg-gray-900 hover:bg-black text-white rounded-xl text-xs font-bold flex items-center gap-2 cursor-pointer transition shadow-xs"
                  >
                    Save Configuration
                  </button>
                  <button
                    type="button"
                    onClick={handleTestSheetsSync}
                    disabled={isSyncing}
                    className="px-5 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-extrabold flex items-center justify-center gap-2 cursor-pointer transition shadow-xs disabled:opacity-50 shrink-0"
                  >
                    {isSyncing ? (
                      <RefreshCw size={14} className="animate-spin" />
                    ) : (
                      <HardDriveUpload size={14} />
                    )}
                    Connect & Real-Time Sync
                  </button>
                  {sheetSettings.isConnected && (
                    <button
                      type="button"
                      onClick={handleDisconnectSheets}
                      className="px-4 py-3 border border-rose-200 hover:bg-rose-50 text-rose-600 rounded-xl text-xs font-bold cursor-pointer transition"
                    >
                      Disconnect Live Sync
                    </button>
                  )}
                </div>
              </form>

              {/* Instructions Panel */}
              <div className="bg-indigo-50/20 border border-indigo-150 p-6 rounded-2xl space-y-4">
                <span className="block text-[10px] font-bold text-indigo-700 uppercase tracking-widest">💡 How to prepare your Google Sheet:</span>
                <div className="space-y-3.5 text-xs text-gray-700 leading-relaxed font-semibold">
                  <p>
                    1. <strong>Create your Google Sheet</strong>: Prepare a blank worksheet or copy your existing tracking grid.
                  </p>
                  <p>
                    2. <strong>Setup Worksheet tab names</strong>: Ensure you have sections that match your Tab names typed here (e.g. <code className="font-mono bg-indigo-100 text-indigo-850 px-1 py-0.5 rounded">Projects</code> and <code className="font-mono bg-indigo-100 text-indigo-850 px-1 py-0.5 rounded">Submissions</code>).
                  </p>
                  <p>
                    3. <strong>Permissions Check</strong>: Share this Spreadsheet so that teammates can write to it, or assure that the app's logged-in users have permission to write directly.
                  </p>
                  <p className="p-3 bg-amber-50 text-amber-900 rounded-xl border border-amber-100 text-[11px]">
                    ⚠️ <strong>High Craftsmanship Check</strong>: If you connect a blank spreadsheet with empty worksheets, our sync module will automatically populate and seed the respective columns and headers for you!
                  </p>
                </div>
              </div>

            </div>

            {/* If connected, display Google Sheet metadata summaries */}
            {sheetSettings.isConnected && (
              <div className="pt-6 border-t border-gray-100 grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/50">
                  <span className="block text-[9px] text-gray-400 font-bold uppercase tracking-wide">Connected Source</span>
                  <span className="block text-xs font-bold font-mono text-gray-800 mt-1 truncate" title={sheetSettings.spreadsheetId}>
                    {sheetSettings.spreadsheetId}
                  </span>
                </div>
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/50">
                  <span className="block text-[9px] text-gray-400 font-bold uppercase tracking-wide">Synced Active Projects</span>
                  <span className="block text-sm font-extrabold text-indigo-700 mt-1">
                    {projects.length} Projects loaded automatically
                  </span>
                </div>
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/50">
                  <span className="block text-[9px] text-gray-400 font-bold uppercase tracking-wide">Synced Log Submissions</span>
                  <span className="block text-sm font-extrabold text-purple-700 mt-1">
                    {entries.length} flattened submission items parsed
                  </span>
                </div>
              </div>
            )}

          </div>
        )}

        {/* TAB 2: Dynamic Custom Metrics */}
        {activeSubTab === 'metrics' && (
          <div className="space-y-8 animate-fade-in">
            <div className="border-b border-gray-100 pb-5">
              <h4 className="font-extrabold text-gray-900 text-sm">Dynamic Custom Backlink Types</h4>
              <p className="text-xs text-gray-400">Add dynamic submission metric fields beyond standard Listings, Blogs, PDFs, and Images. Instructors can see and configure these immediately.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              
              {/* Left Form: Add dynamic metric */}
              <div className="lg:col-span-1">
                <form onSubmit={handleCreateMetric} className="bg-gray-50 p-6 rounded-2xl border border-gray-150 space-y-4">
                  <h5 className="text-xs font-black text-gray-700 uppercase tracking-widest flex items-center gap-1">
                    <PlusCircle size={14} className="text-indigo-500" />
                    Register Custom Metric
                  </h5>

                  <div className="space-y-1.5">
                    <label htmlFor="metric-name" className="text-[10px] text-gray-500 font-bold block uppercase">Custom Field Name</label>
                    <input
                      id="metric-name"
                      type="text"
                      required
                      placeholder="e.g. Forum Backlink"
                      value={metricName}
                      onChange={(e) => setMetricName(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-xs font-semibold focus:ring-1 focus:ring-indigo-500"
                    />
                    <span className="text-[9px] text-gray-400 block font-medium leading-tight">Display label shown on submissions (e.g. Forum Backlinks)</span>
                  </div>

                  <div className="space-y-1.5">
                    <label htmlFor="metric-code" className="text-[10px] text-gray-500 font-bold block uppercase">Short Code Identifier</label>
                    <input
                      id="metric-code"
                      type="text"
                      required
                      maxLength={8}
                      placeholder="e.g. FORUM"
                      value={metricCode}
                      onChange={(e) => setMetricCode(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-xs font-bold uppercase focus:ring-1 focus:ring-indigo-500"
                    />
                    <span className="text-[9px] text-gray-400 block font-medium leading-tight">Capital letters code displayed on lists/tables (e.g. FORUM, QUORA)</span>
                  </div>

                  <div className="pt-2">
                    <button
                      type="submit"
                      className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition shadow-xs"
                    >
                      Create Submission Type
                    </button>
                  </div>
                </form>
              </div>

              {/* Right List of Custom Metrics */}
              <div className="lg:col-span-2 space-y-4">
                <span className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest pl-0.5">Active Custom Submission Types ({customSubmissionTypes.length})</span>
                
                {customSubmissionTypes.length === 0 ? (
                  <div className="p-8 text-center bg-gray-50/50 rounded-2xl border border-dashed border-gray-200 text-xs text-gray-400 italic">
                    No custom submission parameters registered yet. Add Forum backlinks, Social bookmarks, or Q&A replies above to expand tracking capabilities.
                  </div>
                ) : (
                  <div className="divide-y divide-gray-100 max-h-96 overflow-y-auto pr-1">
                    {customSubmissionTypes.map((type) => (
                      <div key={type.id} className="py-3.5 flex items-center justify-between text-xs hover:bg-slate-50/45 px-2 rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded bg-purple-50 text-purple-700 font-black text-[10px] flex items-center justify-center font-mono">
                            {type.code}
                          </div>
                          <div>
                            <span className="font-extrabold text-gray-800">{type.name}</span>
                            <span className="block text-[10px] text-gray-400 font-mono mt-0.5">Variable Key: <strong className="font-bold">{type.id}</strong></span>
                          </div>
                        </div>

                        <button
                          onClick={() => {
                            if (window.confirm(`Are you sure you want to delete this custom metric type? Existing logs containing "${type.name}" values won't show it anymore.`)) {
                              onDeleteCustomSubmissionType(type.id);
                            }
                          }}
                          className="p-1 hover:bg-rose-50 text-gray-400 hover:text-rose-500 rounded cursor-pointer transition"
                          title="Delete Custom Submission parameter"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

            </div>
          </div>
        )}
                  {/* TAB 3: Users Panel (Email authorization & Location assignment) */}
        {activeSubTab === 'users' && (
          <div className="space-y-12 animate-fade-in text-left">
            
            {/* Section 1: User Identity & Registration */}
            <div className="space-y-6">
              <div className="border-b border-gray-100 pb-4">
                <h4 className="font-extrabold text-gray-900 text-sm flex items-center gap-2">
                  <Users size={16} className="text-indigo-600 animate-pulse" />
                  Employee Directory & Authorized Emails
                </h4>
                <p className="text-xs text-gray-400">
                  Assign human names to corporate emails. Authorized employees will gain DSR access. All reports in the system will display these names.
                </p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                
                {/* Form: Add / Edit User */}
                <div className="bg-gray-50 p-6 rounded-2xl border border-gray-150 h-fit">
                  <h5 className="font-bold text-gray-800 text-xs mb-4 flex items-center gap-1.5 uppercase tracking-wide">
                    <UserPlus size={14} className="text-slate-500" />
                    Authorize New User
                  </h5>
                  <form onSubmit={(e) => {
                    e.preventDefault();
                    const email = newUserEmail.trim().toLowerCase();
                    const name = newUserName.trim();
                    if (!email || !name) return;

                    const exists = allowedUsers.some(u => u.email.toLowerCase() === email);
                    if (exists) {
                      onSetAllowedUsers(prev => prev.map(u => u.email.toLowerCase() === email ? { ...u, name } : u));
                      triggerAlert('success', `Updated human name for ${email} to "${name}".`);
                    } else {
                      onSetAllowedUsers(prev => [...prev, { email, name }]);
                      triggerAlert('success', `Successfully authorized employee "${name}" (${email}).`);
                    }
                    setNewUserEmail('');
                    setNewUserName('');
                  }} className="space-y-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] text-gray-500 font-bold block uppercase">Full Name</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Alex Rivera"
                        value={newUserName}
                        onChange={(e) => setNewUserName(e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-gray-200 rounded text-xs focus:ring-1 focus:ring-indigo-500 font-semibold"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] text-gray-500 font-bold block uppercase">Email Address</label>
                      <input
                        type="email"
                        required
                        placeholder="e.g. employee@company.com"
                        value={newUserEmail}
                        onChange={(e) => setNewUserEmail(e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-gray-200 rounded text-xs focus:ring-1 focus:ring-indigo-500 font-mono font-semibold"
                      />
                    </div>

                    <button
                      type="submit"
                      className="w-full px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer"
                    >
                      Save & Authorize User
                    </button>
                  </form>
                </div>

                {/* Table: Registered Users */}
                <div className="lg:col-span-2 space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest pl-0.5">Authorized Directories ({allowedUsers.length})</span>
                  </div>
                  
                  <div className="overflow-x-auto border border-gray-150 rounded-2xl bg-white max-h-96 overflow-y-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-gray-150 bg-gray-50/70 text-[9px] font-bold text-gray-400 uppercase tracking-widest">
                          <th className="py-3 px-4 text-left">Employee Name</th>
                          <th className="py-3 px-4 text-left">Authorized Email</th>
                          <th className="py-3 px-4 text-center">Submissions Logged</th>
                          <th className="py-3 px-4 text-center">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-105">
                        {allowedUsers.map((u) => {
                          const userSubmissions = entries.filter(e => e.userEmail?.toLowerCase() === u.email.toLowerCase()).length;
                          return (
                            <tr key={u.email} className="hover:bg-slate-50/45 transition text-xs">
                              <td className="py-3.5 px-4 font-extrabold text-gray-900">{u.name}</td>
                              <td className="py-3.5 px-4 font-mono font-semibold text-gray-500">{u.email}</td>
                              <td className="py-3.5 px-4 text-center font-mono text-gray-500">{userSubmissions} DSRs</td>
                              <td className="py-3.5 px-4 text-center">
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (window.confirm(`Revoke DSR system access and delete identity mapping for: ${u.name}?`)) {
                                      onSetAllowedUsers(prev => prev.filter(item => item.email.toLowerCase() !== u.email.toLowerCase()));
                                      triggerAlert('success', `Revoked access for ${u.name}`);
                                    }
                                  }}
                                  className="p-1 hover:bg-rose-50 text-gray-400 hover:text-rose-500 rounded transition cursor-pointer"
                                  title="Revoke User"
                                >
                                  <Trash2 size={13} />
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

              </div>
            </div>



          </div>
        )}

        {/* TAB 4: Authorized Administrators */}
        {activeSubTab === 'admins' && (
          <div className="space-y-8 animate-fade-in">
            <div className="border-b border-gray-100 pb-5">
              <h4 className="font-extrabold text-gray-900 text-sm">Privileged Admin Emails</h4>
              <p className="text-xs text-gray-400">Invite trusted business accounts to clear submissions blocks and access real-time status visualizers.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              
              {/* Left Column: Authorized Admins List */}
              <div className="space-y-3">
                <span className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest pl-0.5">Admin Emails Directory</span>
                <div className="divide-y divide-gray-100 max-h-72 overflow-y-auto pr-1">
                  {adminEmails.map((email) => (
                    <div key={email} className="py-3 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-gray-800 font-mono">{email}</span>
                        {email === currentUserEmail && (
                          <span className="text-[8px] font-sans font-bold bg-indigo-100 text-indigo-750 px-1.5 py-0.5 rounded-full uppercase">
                            Your account
                          </span>
                        )}
                      </div>
                      {email !== currentUserEmail && adminEmails.length > 1 && (
                        <button
                          onClick={() => {
                            if (window.confirm(`Revoke administrator permissions for email: ${email}?`)) {
                              onDeleteAdminEmail(email);
                            }
                          }}
                          className="p-1 hover:bg-rose-50 text-gray-400 hover:text-rose-500 rounded cursor-pointer transition"
                          title="Revoke Admin Access privileges"
                        >
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Right Column: Invite Form */}
              <div className="bg-gray-50 p-6 rounded-2xl border border-gray-150 flex flex-col justify-between">
                <form onSubmit={handleAddAdminEmail} className="space-y-4">
                  <span className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest">Register Authorized Admin</span>
                  
                  <div className="space-y-1.5">
                    <label htmlFor="admin-sub-email" className="text-[10px] text-gray-500 font-bold block uppercase">Email Address</label>
                    <input
                      id="admin-sub-email"
                      type="email"
                      required
                      placeholder="account@company.com"
                      value={newAdminEmail}
                      onChange={(e) => setNewAdminEmail(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-gray-200 rounded text-xs focus:ring-1 focus:ring-indigo-500 font-mono font-semibold"
                    />
                  </div>

                  <div className="pt-2">
                    <button
                      type="submit"
                      className="w-full px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition"
                    >
                      <Plus size={13} /> Elevate Email to Admin
                    </button>
                  </div>
                </form>
              </div>

            </div>
          </div>
        )}

      </div>
    </div>
  );
}
