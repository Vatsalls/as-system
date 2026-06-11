/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { DSREntry, Project, ProjectWork, CustomSubmissionType, AppUser } from '../types';
import {
  Search,
  Calendar,
  Layers,
  FileCheck2,
  Image,
  Tag,
  Clock,
  Trash2,
  Compass,
  Download,
  Flame,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  X,
  User
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface DSRLogsProps {
  entries: DSREntry[];
  projects: Project[];
  onDeleteEntry?: (id: string) => void;
  onUpdateStatus?: (id: string, status: 'Pending' | 'Approved' | 'Needs Revision') => void;
  isAdmin: boolean;
  customSubmissionTypes?: CustomSubmissionType[];
  allowedUsers?: AppUser[];
}

export default function DSRLogs({
  entries,
  projects,
  onDeleteEntry,
  onUpdateStatus,
  isAdmin,
  customSubmissionTypes = [],
  allowedUsers = [],
}: DSRLogsProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProjectId, setSelectedProjectId] = useState('all');
  const [selectedEmployeeEmail, setSelectedEmployeeEmail] = useState('all');
  const [dateFilterType, setDateFilterType] = useState<'all' | 'today' | 'yesterday_today' | 'yesterday' | 'last_7_days' | 'custom'>('all');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [expandedEntries, setExpandedEntries] = useState<Record<string, boolean>>({});

  // Active Image Modal state for viewing uploaded screenshot full scale
  const [activePreviewImage, setActivePreviewImage] = useState<{ src: string; title: string } | null>(null);

  // Extract all unique employee emails dynamically from logged entries
  const uniqueEmployeeEmails = Array.from(
    new Set(entries.map((entry) => entry.userEmail).filter(Boolean))
  ).sort();

  const employeeNamesMap = useMemo(() => {
    const map: Record<string, string> = {};
    allowedUsers.forEach(u => {
      map[u.email.trim().toLowerCase()] = u.name;
    });
    return map;
  }, [allowedUsers]);

  const toggleExpand = (id: string) => {
    setExpandedEntries(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const getLocalDateStrings = () => {
    const todayObj = new Date();
    
    const formatDate = (d: Date) => {
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      return `${yyyy}-${mm}-${dd}`;
    };

    const todayStr = formatDate(todayObj);

    const yesterdayObj = new Date();
    yesterdayObj.setDate(yesterdayObj.getDate() - 1);
    const yesterdayStr = formatDate(yesterdayObj);

    const list7Days: string[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      list7Days.push(formatDate(d));
    }

    return { todayStr, yesterdayStr, list7Days };
  };

  // Filtering logs
  const filteredEntries = entries.filter((entry) => {
    if (!entry) return false;
    const email = entry.userEmail || '';
    const worksList = Array.isArray(entry.works) ? entry.works : [];

    // Search matches everything (developer email, project names, code, deliverables, text notes)
    const matchesEmail = email.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesWorks = worksList.some((work) => {
      if (!work) return false;
      
      // Match against local parameters
      const localProjName = (work.projectName || '').toLowerCase();
      const blogText = (work.blog || '').toLowerCase();
      const summaryText = (work.workSummary || '').toLowerCase();
      const pdfText = (work.pdfName || '').toLowerCase();
      const imgText = (work.imageName || '').toLowerCase();
      
      // Resolve matches against full project dynamic entity (name & code)
      const matchedProj = projects.find(p => p.id === work.projectId);
      const fullProjName = matchedProj ? matchedProj.name.toLowerCase() : '';
      const fullProjCode = matchedProj ? matchedProj.code.toLowerCase() : '';

      const query = searchTerm.toLowerCase();

      return (
        localProjName.includes(query) ||
        fullProjName.includes(query) ||
        fullProjCode.includes(query) ||
        blogText.includes(query) ||
        summaryText.includes(query) ||
        pdfText.includes(query) ||
        imgText.includes(query)
      );
    });

    const matchesSearch = matchesEmail || matchesWorks || searchTerm === '';

    // Date qualification filter
    const { todayStr, yesterdayStr, list7Days } = getLocalDateStrings();
    const isDateQualified = (entryDate: string) => {
      if (!entryDate) return false;
      const dStr = entryDate.trim().split('T')[0];

      switch (dateFilterType) {
        case 'all':
          return true;
        case 'today':
          return dStr === todayStr;
        case 'yesterday_today':
          return dStr === todayStr || dStr === yesterdayStr;
        case 'yesterday':
          return dStr === yesterdayStr;
        case 'last_7_days':
          return list7Days.includes(dStr);
        case 'custom': {
          let ok = true;
          if (customStartDate) {
            ok = ok && dStr >= customStartDate;
          }
          if (customEndDate) {
            ok = ok && dStr <= customEndDate;
          }
          return ok;
        }
        default:
          return true;
      }
    };

    const matchesDate = isDateQualified(entry.date);

    // Project matches if 'all' or if the entry has at least one work targeting this project
    const matchesProject = selectedProjectId === 'all' || worksList.some(w => w && w.projectId === selectedProjectId);

    // Employee selection dropdown matching
    const matchesEmployee = selectedEmployeeEmail === 'all' || email.toLowerCase() === selectedEmployeeEmail.toLowerCase();

    return matchesSearch && matchesDate && matchesProject && matchesEmployee;
  });

  const handleResetFilters = () => {
    setSearchTerm('');
    setSelectedProjectId('all');
    setSelectedEmployeeEmail('all');
    setDateFilterType('all');
    setCustomStartDate('');
    setCustomEndDate('');
  };

  // Download logic simulation
  const triggerSimulatedDownload = (fileName: string) => {
    alert(`Success: Preparing simulated download link for "${fileName}". In a real environment, this transfers directly from Google Cloud Storage or Google Drive folder.`);
  };

  return (
    <div className="space-y-6">
      {/* Search & Parameters panel */}
      <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-base font-bold text-gray-900">Historical Daily Logs</h3>
            <p className="text-xs text-gray-400">Search and navigate through all reported tasks compiled by the workspace team.</p>
          </div>
          <button
            onClick={handleResetFilters}
            className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 focus:outline-none"
          >
            Reset Filters
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Text search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
            <input
              type="text"
              placeholder="Search everything (email, project, blog)..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-950 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition"
            />
          </div>

          {/* Employee selection dropdown */}
          <div className="flex items-center gap-1.5">
            <User size={12} className="text-gray-400 shrink-0" />
            <select
              value={selectedEmployeeEmail}
              onChange={(e) => setSelectedEmployeeEmail(e.target.value)}
              className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-950 focus:outline-none transition cursor-pointer"
            >
              <option value="all">Every Employee (All Members)</option>
              {uniqueEmployeeEmails.map((email) => (
                <option key={email} value={email}>
                  {employeeNamesMap[email.toLowerCase()] ? `${employeeNamesMap[email.toLowerCase()]} (${email})` : email}
                </option>
              ))}
            </select>
          </div>

          {/* Project Allocation selection */}
          <div className="flex items-center gap-1.5">
            <Tag size={12} className="text-gray-400 shrink-0" />
            <select
              value={selectedProjectId}
              onChange={(e) => setSelectedProjectId(e.target.value)}
              className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-950 focus:outline-none transition"
            >
              <option value="all">Every Project (All Allocations)</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} [{p.code}]
                </option>
              ))}
            </select>
          </div>

          {/* Date Selector */}
          <div className="flex items-center gap-1.5">
            <Calendar size={12} className="text-gray-400 shrink-0" />
            <select
              value={dateFilterType}
              onChange={(e) => setDateFilterType(e.target.value as any)}
              className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-950 focus:outline-none transition cursor-pointer"
            >
              <option value="all">All Dates</option>
              <option value="today">Today Only</option>
              <option value="yesterday_today">Yesterday & Today Combined</option>
              <option value="yesterday">Yesterday Only</option>
              <option value="last_7_days">Last 7 Days</option>
              <option value="custom">Custom Range...</option>
            </select>
          </div>
        </div>

        {/* Custom date pickers if range chosen */}
        {dateFilterType === 'custom' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-indigo-50/15 rounded-2xl border border-indigo-105/30">
            <div className="space-y-1">
              <label className="block text-[10px] font-bold text-indigo-900 uppercase tracking-wider">Start Date</label>
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs text-gray-950 focus:outline-none focus:ring-1 focus:ring-indigo-550"
              />
            </div>
            <div className="space-y-1">
              <label className="block text-[10px] font-bold text-indigo-900 uppercase tracking-wider">End Date</label>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs text-gray-950 focus:outline-none focus:ring-1 focus:ring-indigo-550"
              />
            </div>
          </div>
        )}
      </div>

      {/* Primary entries feed list */}
      {filteredEntries.length === 0 ? (
        <div className="bg-white p-12 rounded-3xl border border-gray-150 text-center flex flex-col items-center justify-center space-y-4 max-w-xl mx-auto">
          <Compass size={40} className="text-gray-300 animate-spin-slow" />
          <h4 className="text-sm font-bold text-gray-800">Clear Search Criteria</h4>
          <p className="text-xs text-gray-550 leading-relaxed">
            No daily status reports match your specified filters or search queries. Try resetting filters to explore seed project metrics.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="text-xs text-gray-400 font-semibold flex items-center justify-between">
            <span>SHOWING {Array.from(new Set(filteredEntries.map(e => e.userEmail).filter(Boolean))).length} UNIQUE DEVELOPERS ACTIVITY IN THIS FILTER</span>
          </div>

          <div className="grid grid-cols-1 gap-6">
            {Array.from(new Set(filteredEntries.map(e => e.userEmail).filter(Boolean))).map((userEmail) => {
              const userWorks = filteredEntries
                .filter(e => e.userEmail === userEmail)
                .flatMap(e => (e.works || []).map(w => ({ ...w, date: e.date, entryId: e.id, entryStatus: e.status, createdAt: e.createdAt })));

              const projectsCount = new Set(userWorks.map(w => w.projectId)).size;
              const isExpanded = !!expandedEntries[userEmail]; // collapsed by default
              
              // Cumulative counts
              const totalListings = userWorks.reduce((sum, w) => sum + (w.listingCount || 0), 0);
              const totalBlogs = userWorks.reduce((sum, w) => sum + (w.blogCount || 0), 0);
              const totalPdfs = userWorks.reduce((sum, w) => sum + (w.pdfCount || 0), 0);
              const totalImages = userWorks.reduce((sum, w) => sum + (w.imageCount || 0), 0);

              // Group works by project
              const worksByProject: Record<string, typeof userWorks> = {};
              userWorks.forEach(work => {
                if (!work.projectId) return;
                if (!worksByProject[work.projectId]) {
                  worksByProject[work.projectId] = [];
                }
                worksByProject[work.projectId].push(work);
              });

              return (
                <div
                  key={userEmail}
                  className="bg-white rounded-3xl border border-gray-150 hover:border-gray-200 transition-all shadow-xs overflow-hidden"
                >
                  {/* Card Main Bar - Grouped by Developer */}
                  <div
                    onClick={() => toggleExpand(userEmail)}
                    className="p-6 bg-gray-50/50 hover:bg-gray-100/40 border-b border-gray-100 flex flex-wrap items-center justify-between gap-4 cursor-pointer transition select-none"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-500 to-indigo-700 text-white font-black text-sm flex items-center justify-center shadow-xs uppercase">
                        {(employeeNamesMap[userEmail.toLowerCase()] || userEmail).slice(0, 2)}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-extrabold text-gray-900 text-sm">
                            {employeeNamesMap[userEmail.toLowerCase()] || userEmail}
                          </span>
                          {employeeNamesMap[userEmail.toLowerCase()] && (
                            <span className="text-[11px] text-gray-400 font-mono italic">
                              ({userEmail})
                            </span>
                          )}
                          {userEmail.includes('admin') || userEmail === 'vatsalpatel1720@gmail.com' ? (
                            <span className="text-[9px] bg-indigo-100 text-indigo-700 font-bold px-2 py-0.5 rounded-full uppercase">
                              Admin
                            </span>
                          ) : (
                            <span className="text-[9px] bg-slate-100 text-slate-600 font-bold px-2 py-0.5 rounded-full uppercase">
                              Workspace Member
                            </span>
                          )}
                        </div>

                        {/* Summary of what they achieved */}
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500 font-medium mt-1">
                          <span className="inline-flex items-center gap-1 bg-white border border-gray-200/50 px-2.5 py-0.5 rounded-lg text-[10px] text-indigo-650 font-bold shadow-2xs">
                            📂 {projectsCount} {projectsCount === 1 ? 'Project' : 'Projects'} Active
                          </span>
                          <span>•</span>
                          <span className="text-gray-400">Total Outputs:</span>
                          <span className="font-mono text-gray-950 font-semibold">{totalListings} Listings</span>
                          <span className="text-gray-300">|</span>
                          <span className="font-mono text-gray-950 font-semibold">{totalBlogs} Blogs</span>
                          <span className="text-gray-300">|</span>
                          <span className="font-mono text-gray-950 font-semibold">{totalPdfs} PDFs</span>
                          <span className="text-gray-300">|</span>
                          <span className="font-mono text-gray-950 font-semibold">{totalImages} Images</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => toggleExpand(userEmail)}
                        className="flex items-center gap-1.5 px-3.5 py-2 bg-white border border-gray-150 hover:bg-gray-50 hover:border-gray-200 text-gray-700 rounded-xl transition text-xs font-bold cursor-pointer animate-none"
                        title="Collapse or Expand developer's report log details"
                      >
                        {isExpanded ? 'Hide Projects' : 'Show Projects'}
                        {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                      </button>
                    </div>
                  </div>

                  {/* Redesigned multi-project drop-down details */}
                  <AnimatePresence initial={false}>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden bg-white"
                      >
                        <div className="p-4 sm:p-5 space-y-4">
                          {Object.keys(worksByProject).map((projectId) => {
                            const matchedProjectObj = projects.find(p => p.id === projectId);
                            const pWorks = worksByProject[projectId];

                            return (
                              <div
                                key={projectId}
                                className="bg-slate-50/40 rounded-xl border border-gray-150 overflow-hidden"
                              >
                                {/* Project bar */}
                                <div className="p-3 px-4 bg-white border-b border-gray-150 flex flex-wrap items-center justify-between gap-4">
                                  <div className="flex items-center gap-2">
                                    <span className="inline-flex items-center gap-1 bg-indigo-600 text-white font-black text-[10px] px-2 py-0.5 rounded uppercase font-mono">
                                      {matchedProjectObj?.code || 'DEV'}
                                    </span>
                                    <h4 className="text-xs font-extrabold text-gray-955">
                                      {matchedProjectObj?.name || 'Unknown Project'}
                                    </h4>
                                  </div>
                                  <span className="text-[10px] font-bold text-gray-450 uppercase font-mono bg-gray-50 border border-gray-200/40 px-2 py-0.5 rounded">
                                    {pWorks.length} {pWorks.length === 1 ? 'Report' : 'Reports'}
                                  </span>
                                </div>

                                {/* Works submitted list in a compact Table */}
                                <div className="overflow-x-auto">
                                  <table className="w-full text-left border-collapse">
                                    <thead>
                                      <tr className="border-b border-gray-150 bg-gray-50/50 text-[9px] font-bold text-gray-400 uppercase tracking-wider">
                                        <th className="py-2.5 px-4 whitespace-nowrap">Report Date & Submission Timestamp</th>

                                        <th className="py-2.5 px-3">SEO / Backlink Deliverables</th>
                                        <th className="py-2.5 px-3">Content Update Checklist</th>
                                        {isAdmin && onDeleteEntry && <th className="py-2.5 px-4 text-right">Actions</th>}
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                      {pWorks.map((work, idx) => {
                                        const workTypes = work.workTypes || ['seo_backlink'];
                                        const hasSEO = workTypes.includes('seo_backlink');
                                        const hasContentUpdate = workTypes.includes('content_update');

                                        return (
                                          <tr key={idx} className="hover:bg-slate-50/30 transition-colors text-xs text-gray-800">
                                            {/* Date */}
                                            <td className="py-3 px-4 text-gray-955">
                                              <div className="flex flex-col gap-1">
                                                <span className="inline-flex items-center gap-1 font-bold text-indigo-700 bg-indigo-50/60 border border-indigo-100/35 px-2 py-0.5 rounded text-[11px] w-fit whitespace-nowrap">
                                                  <Calendar size={11} className="text-indigo-400 shrink-0" />
                                                  For {new Date(work.date).toLocaleDateString('en-US', {
                                                    month: 'short',
                                                    day: 'numeric',
                                                    year: 'numeric'
                                                  })}
                                                </span>
                                                {work.createdAt && (
                                                  <span className="text-[10px] text-gray-450 font-mono flex items-center gap-1 whitespace-nowrap">
                                                    ⏱️ <span className="font-sans font-medium text-gray-400">Filed:</span> {new Date(work.createdAt).toLocaleString('en-US', {
                                                      month: 'short',
                                                      day: 'numeric',
                                                      year: 'numeric',
                                                      hour: '2-digit',
                                                      minute: '2-digit'
                                                    })}
                                                  </span>
                                                )}
                                              </div>
                                            </td>

                                            {/* SEO Deliverables */}
                                            <td className="py-2 px-3">
                                              {hasSEO ? (
                                                <div className="flex flex-wrap gap-1.5 max-w-md my-0.5">
                                                  {(work.listingCount ?? 0) > 0 && (
                                                    <span className="inline-flex items-center gap-0.5 text-[10px] bg-indigo-50 text-indigo-700 font-bold px-1.5 py-0.5 rounded border border-indigo-100/30">
                                                      Listing: <span className="font-mono">{work.listingCount}</span>
                                                    </span>
                                                  )}
                                                  {(work.blogCount ?? 0) > 0 && (
                                                    <span className="inline-flex items-center gap-0.5 text-[10px] bg-emerald-50 text-emerald-700 font-bold px-1.5 py-0.5 rounded border border-emerald-100/30">
                                                      Blog: <span className="font-mono">{work.blogCount}</span>
                                                    </span>
                                                  )}
                                                  {(work.pdfCount ?? 0) > 0 && (
                                                    <span className="inline-flex items-center gap-0.5 text-[10px] bg-teal-50 text-teal-700 font-bold px-1.5 py-0.5 rounded border border-teal-100/30">
                                                      PDF: <span className="font-mono">{work.pdfCount}</span>
                                                    </span>
                                                  )}
                                                  {(work.imageCount ?? 0) > 0 && (
                                                    <span className="inline-flex items-center gap-0.5 text-[10px] bg-sky-50 text-sky-700 font-bold px-1.5 py-0.5 rounded border border-sky-100/30">
                                                      Img: <span className="font-mono">{work.imageCount}</span>
                                                    </span>
                                                  )}

                                                  {customSubmissionTypes.map((type) => {
                                                    const rawVal = work.customValues?.[type.id];
                                                    const count = rawVal !== undefined ? Number(rawVal) : 0;
                                                    if (count <= 0) return null;
                                                    return (
                                                      <span key={type.id} className="inline-flex items-center gap-0.5 text-[10px] bg-purple-50 text-purple-750 font-bold px-1.5 py-0.5 rounded border border-purple-100/30" title={type.name}>
                                                        {type.code}: <span className="font-mono">{count}</span>
                                                      </span>
                                                    );
                                                  })}
                                                </div>
                                              ) : (
                                                <span className="text-[11px] text-gray-450 font-medium">-</span>
                                              )}
                                            </td>

                                            {/* Content update checklist */}
                                            <td className="py-2 px-3">
                                              {hasContentUpdate && work.contentUpdates && work.contentUpdates.length > 0 ? (
                                                <div className="flex flex-wrap gap-1 max-w-xs my-0.5">
                                                  {work.contentUpdates.map((item: string) => {
                                                    const labelMap: Record<string, string> = {
                                                      meta_title_desc: 'Meta',
                                                      keyword_update: 'Keywords',
                                                      section_update: 'Sections',
                                                      restructure: 'Structure'
                                                    };
                                                    return (
                                                      <span key={item} className="inline-flex items-center text-[9px] bg-slate-100 text-slate-700 font-bold px-1.5 py-0.5 rounded" title={item}>
                                                        ✓ {labelMap[item] || item}
                                                      </span>
                                                    );
                                                  })}
                                                </div>
                                              ) : (
                                                <span className="text-[11px] text-gray-450 font-medium">-</span>
                                              )}
                                            </td>

                                            {/* Actions */}
                                            {isAdmin && onDeleteEntry && (
                                              <td className="py-2 px-4 text-right">
                                                <button
                                                  onClick={() => onDeleteEntry(work.entryId)}
                                                  className="p-1 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded transition cursor-pointer"
                                                  title="Delete this daily report entry"
                                                >
                                                  <Trash2 size={12} />
                                                </button>
                                              </td>
                                            )}
                                          </tr>
                                        );
                                      })}
                                    </tbody>
                                  </table>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Polish Portal Screen Preview Lightbox modal for Image zooming */}
      <AnimatePresence>
        {activePreviewImage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-gray-950/90 flex items-center justify-center p-4 backdrop-blur-xs"
            onClick={() => setActivePreviewImage(null)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-white rounded-3xl overflow-hidden shadow-2xl max-w-3xl w-full relative"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal header */}
              <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                <span className="text-xs font-bold text-gray-800">{activePreviewImage.title}</span>
                <button
                  onClick={() => setActivePreviewImage(null)}
                  className="p-1 hover:bg-gray-200 rounded-lg text-gray-500"
                >
                  <X size={16} />
                </button>
              </div>
              {/* Zoom image container */}
              <div className="p-4 bg-gray-100 flex justify-center max-h-[80vh] overflow-hidden">
                <img
                  src={activePreviewImage.src}
                  alt={activePreviewImage.title}
                  className="max-h-full max-w-full rounded-2xl object-contain shadow-sm"
                  referrerPolicy="no-referrer"
                />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
