/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo, useState } from 'react';
import { DSREntry, Project, AppUser, ProjectLocation } from '../types';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
  Cell,
  PieChart,
  Pie,
} from 'recharts';
import { 
  FileSpreadsheet, 
  Percent, 
  TrendingUp, 
  Users, 
  Calendar, 
  ClipboardCheck, 
  Award,
  Filter,
  User,
  Tag,
  MapPin,
  ChevronDown,
  X
} from 'lucide-react';

interface DSRDashboardProps {
  entries: DSREntry[];
  projects: Project[];
  allowedUsers: AppUser[];
  projectLocations: ProjectLocation[];
}

export default function DSRDashboard({ entries, projects, allowedUsers, projectLocations }: DSRDashboardProps) {
  // 1st level filters
  const [selectedEmployeeEmail, setSelectedEmployeeEmail] = useState('all');
  const [selectedProjectId, setSelectedProjectId] = useState('all');

  // 2nd level filters (Middle level - new filters requested)
  const [regionFilter, setRegionFilter] = useState<'All' | 'North' | 'West'>('All');
  const [selectedLocations, setSelectedLocations] = useState<string[]>([]);
  const [isLocationDropdownOpen, setIsLocationDropdownOpen] = useState(false);

  // 3rd level filters
  const [dateFilterType, setDateFilterType] = useState<'all' | 'today' | 'yesterday' | 'last_7_days' | 'custom'>('all');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');

  // Extract dynamic list of employees (reconciling allowed list and historic entries)
  const employeeOptions = useMemo(() => {
    const list = [...allowedUsers];
    entries.forEach(entry => {
      if (entry && entry.userEmail) {
        const email = entry.userEmail.trim().toLowerCase();
        if (!list.some(u => u.email.trim().toLowerCase() === email)) {
          list.push({ email: entry.userEmail, name: entry.userEmail });
        }
      }
    });
    return list;
  }, [allowedUsers, entries]);

  const employeeEmailToNameMap = useMemo(() => {
    const map: Record<string, string> = {};
    employeeOptions.forEach(u => {
      map[u.email.trim().toLowerCase()] = u.name;
    });
    return map;
  }, [employeeOptions]);

  // Available locations list based on projectLocations prop
  const availableLocations = useMemo(() => {
    const locSet = new Set<string>();
    projectLocations.forEach((loc) => {
      if (loc.north) locSet.add(loc.north.trim());
      if (loc.west) locSet.add(loc.west.trim());
    });
    
    // Fallback default set if empty
    if (locSet.size === 0) {
      projects.forEach((p, idx) => {
        const defaultLoc = ['Delhi', 'Mumbai', 'New York', 'London', 'California', 'Bangalore'][idx % 6];
        locSet.add(defaultLoc);
      });
    }
    return Array.from(locSet).sort();
  }, [projectLocations, projects]);

  // Flat map of all individual project work blocks across all days to perform granular telemetry
  const flattenedWorks = useMemo(() => {
    const list: {
      date: string;
      userEmail: string;
      projectId: string;
      projectName: string;
      listingCount: number;
      blogCount: number;
      pdfCount: number;
      imageCount: number;
      blog: string;
      hasPdf: boolean;
      hasImg: boolean;
      entryId: string;
    }[] = [];
    if (!Array.isArray(entries)) return list;
    entries.forEach((entry) => {
      if (!entry) return;
      const worksList = Array.isArray(entry.works) ? entry.works : [];
      worksList.forEach((w) => {
        if (!w) return;
        list.push({
          date: entry.date || '',
          userEmail: entry.userEmail || '',
          projectId: w.projectId || '',
          projectName: w.projectName || '',
          listingCount: Number(w.listingCount) || 0,
          blogCount: Number(w.blogCount) || 0,
          pdfCount: Number(w.pdfCount) || 0,
          imageCount: Number(w.imageCount) || 0,
          blog: w.blog || '',
          hasPdf: !!w.pdfName,
          hasImg: !!w.imageUri,
          entryId: entry.id,
        });
      });
    });
    return list;
  }, [entries]);

  // Map projects with dynamic region & location attributes for filtering
  const enrichedWorks = useMemo(() => {
    return flattenedWorks.map((work) => {
      const mapping = projectLocations.find(l => l.projectId === work.projectId);
      
      let region: 'North' | 'West' | 'All' = 'All';
      let location = '';

      if (mapping) {
        if (regionFilter === 'North' && mapping.north) {
          region = 'North';
          location = mapping.north;
        } else if (regionFilter === 'West' && mapping.west) {
          region = 'West';
          location = mapping.west;
        } else {
          // If All regions
          if (mapping.north && mapping.west) {
            // Pick based on selectedLocations filter if possible
            if (selectedLocations.includes(mapping.west) && !selectedLocations.includes(mapping.north)) {
              region = 'West';
              location = mapping.west;
            } else {
              region = 'North';
              location = mapping.north;
            }
          } else if (mapping.north) {
            region = 'North';
            location = mapping.north;
          } else if (mapping.west) {
            region = 'West';
            location = mapping.west;
          }
        }
      }

      // Safe fallback if not assigned yet
      if (!location) {
        const projIndex = projects.findIndex(p => p.id === work.projectId);
        const safeIndex = projIndex >= 0 ? projIndex : 0;
        region = safeIndex % 2 === 0 ? 'North' : 'West';
        location = ['Delhi', 'Mumbai', 'New York', 'London', 'California', 'Bangalore'][safeIndex % 6];
      }

      return {
        ...work,
        region,
        location,
        allProjectLocations: mapping ? [mapping.north, mapping.west].filter(Boolean) : []
      };
    });
  }, [flattenedWorks, projects, projectLocations, regionFilter, selectedLocations]);

  // Filtered dataset active for telemetry
  const filteredWorks = useMemo(() => {
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    const list7Days: string[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date();
      d.setDate(today.getDate() - i);
      list7Days.push(d.toISOString().split('T')[0]);
    }

    return enrichedWorks.filter((work) => {
      // 1st level: Employee email dropdown filter
      if (selectedEmployeeEmail !== 'all' && work.userEmail.toLowerCase() !== selectedEmployeeEmail.toLowerCase()) {
        return false;
      }

      // 1st level: Project allocation filter
      if (selectedProjectId !== 'all' && work.projectId !== selectedProjectId) {
        return false;
      }

      // 2nd level (Middle): Region Toggle (Slider button toggle)
      if (regionFilter !== 'All' && work.region !== regionFilter) {
        return false;
      }

      // 2nd level (Middle): Location checklist filter
      if (selectedLocations.length > 0) {
        const matchesLocation = work.allProjectLocations.length > 0 
          ? work.allProjectLocations.some(loc => selectedLocations.includes(loc))
          : selectedLocations.includes(work.location);
        
        if (!matchesLocation) {
          return false;
        }
      }

      // 3rd level: Date range filter
      if (dateFilterType === 'today' && work.date !== todayStr) {
        return false;
      }
      if (dateFilterType === 'yesterday' && work.date !== yesterdayStr) {
        return false;
      }
      if (dateFilterType === 'last_7_days' && !list7Days.includes(work.date)) {
        return false;
      }
      if (dateFilterType === 'custom') {
        if (customStartDate && work.date < customStartDate) {
          return false;
        }
        if (customEndDate && work.date > customEndDate) {
          return false;
        }
      }

      return true;
    });
  }, [enrichedWorks, selectedEmployeeEmail, selectedProjectId, regionFilter, selectedLocations, dateFilterType, customStartDate, customEndDate]);

  const handleResetFilters = () => {
    setSelectedEmployeeEmail('all');
    setSelectedProjectId('all');
    setRegionFilter('All');
    setSelectedLocations([]);
    setDateFilterType('all');
    setCustomStartDate('');
    setCustomEndDate('');
  };

  // Calculated Stats on FILTERED data
  const totalSubmissions = useMemo(() => {
    return new Set(filteredWorks.map((w) => w.entryId)).size;
  }, [filteredWorks]);

  const totalWorkedBlocks = filteredWorks.length;
  
  const totalListingCount = useMemo(() => {
    return filteredWorks.reduce((acc, curr) => acc + (curr.listingCount || 0), 0);
  }, [filteredWorks]);

  const totalBlogCount = useMemo(() => {
    return filteredWorks.reduce((acc, curr) => acc + (curr.blogCount || 0), 0);
  }, [filteredWorks]);

  const totalPdfCount = useMemo(() => {
    return filteredWorks.reduce((acc, curr) => acc + (curr.pdfCount || 0), 0);
  }, [filteredWorks]);

  const totalImageCount = useMemo(() => {
    return filteredWorks.reduce((acc, curr) => acc + (curr.imageCount || 0), 0);
  }, [filteredWorks]);

  const totalBacklinksCount = useMemo(() => {
    return totalListingCount + totalBlogCount + totalPdfCount + totalImageCount;
  }, [totalListingCount, totalBlogCount, totalPdfCount, totalImageCount]);

  const averageListingCount = useMemo(() => {
    return totalWorkedBlocks > 0 ? Math.round(totalBacklinksCount / totalWorkedBlocks) : 0;
  }, [totalWorkedBlocks, totalBacklinksCount]);

  const uniqueUsersCount = useMemo(() => {
    return new Set(filteredWorks.map((w) => w.userEmail)).size;
  }, [filteredWorks]);

  // Chart 1: Listing Counts Grouped by Project (Summed)
  const projectStatsData = useMemo(() => {
    const map: Record<string, { name: string; code: string; sumListings: number; blocksCount: number }> = {};
    
    // Seed projects list
    projects.forEach((p) => {
      map[p.id] = { name: p.name, code: p.code, sumListings: 0, blocksCount: 0 };
    });

    filteredWorks.forEach((work) => {
      const totalWorkBC = work.listingCount + work.blogCount + work.pdfCount + work.imageCount;
      if (map[work.projectId]) {
        map[work.projectId].sumListings += totalWorkBC;
        map[work.projectId].blocksCount += 1;
      } else {
        map[work.projectId] = {
          name: work.projectName,
          code: 'GEN',
          sumListings: totalWorkBC,
          blocksCount: 1
        };
      }
    });

    return Object.values(map).sort((a, b) => b.sumListings - a.sumListings);
  }, [filteredWorks, projects]);

  // Chart 2: Daily Cumulative Listings Trends
  const dailyTrendData = useMemo(() => {
    const map: Record<string, { date: string; sumListings: number; blocksLogged: number }> = {};

    filteredWorks.forEach((work) => {
      if (!map[work.date]) {
        map[work.date] = { date: work.date, sumListings: 0, blocksLogged: 0 };
      }
      const totalWorkBC = work.listingCount + work.blogCount + work.pdfCount + work.imageCount;
      map[work.date].sumListings += totalWorkBC;
      map[work.date].blocksLogged += 1;
    });

    return Object.values(map).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [filteredWorks]);

  // Chart 3: Email workload contributors (Distribution of listing reports)
  const userContributionList = useMemo(() => {
    const map: Record<string, { email: string; value: number; records: number }> = {};

    filteredWorks.forEach((work) => {
      if (!map[work.userEmail]) {
        map[work.userEmail] = { email: work.userEmail, value: 0, records: 0 };
      }
      const totalWorkBC = work.listingCount + work.blogCount + work.pdfCount + work.imageCount;
      map[work.userEmail].value += totalWorkBC;
      map[work.userEmail].records += 1;
    });

    return Object.values(map).sort((a, b) => b.value - a.value);
  }, [filteredWorks]);

  // Leaderboard of projects sorted by records logged
  const projectLeaderboard = useMemo(() => {
    return projectStatsData
      .filter((p) => p.blocksCount > 0)
      .sort((a, b) => b.sumListings - a.sumListings);
  }, [projectStatsData]);

  // Backlink types breakdown for visual pie chart distribution analysis
  const backlinkDistributionData = useMemo(() => {
    return [
      { name: 'Listings', value: totalListingCount, fill: '#4f46e5' },
      { name: 'Blogs', value: totalBlogCount, fill: '#8b5cf6' },
      { name: 'PDFs', value: totalPdfCount, fill: '#14b8a6' },
      { name: 'Images', value: totalImageCount, fill: '#ec4899' },
    ];
  }, [totalListingCount, totalBlogCount, totalPdfCount, totalImageCount]);

  // Colors segment palettes
  const COLORS = ['#4f46e5', '#8b5cf6', '#3b82f6', '#ec4899', '#14b8a6', '#f59e0b'];

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Top Header Row of Dashboard with Title on Left and Date Filter on Right */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-150 pb-6">
        <div className="space-y-1 text-left">
          <h1 className="text-xl font-black text-gray-900 tracking-tight sm:text-2xl">
            Team Progress Analytics
          </h1>
          <p className="text-xs text-gray-550 font-semibold">
            Corporate tracking overview, cumulative work output speeds, and reporting stats.
          </p>
        </div>

        {/* Date filter dropdown and range inputs */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 bg-gray-50/80 p-2 rounded-2xl border border-gray-200 self-stretch md:self-auto shrink-0">
          <div className="flex items-center gap-1 px-1.5 py-1">
            <Calendar size={13} className="text-indigo-600 animate-pulse" />
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider whitespace-nowrap">Filter Date:</span>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 grow">
            <select
              value={dateFilterType}
              onChange={(e) => setDateFilterType(e.target.value as any)}
              className="px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs text-gray-950 font-bold focus:outline-none transition cursor-pointer hover:bg-gray-100 min-w-[130px]"
            >
              <option value="all">Every Date (All Time)</option>
              <option value="today">Today Only</option>
              <option value="yesterday">Yesterday Only</option>
              <option value="last_7_days">Last 7 Days</option>
              <option value="custom">Custom Range...</option>
            </select>

            {dateFilterType === 'custom' && (
              <div className="flex items-center gap-1">
                <input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  className="px-2 py-1.5 bg-white border border-gray-200 rounded-lg text-xs text-gray-950 font-bold focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer max-w-[115px]"
                />
                <span className="text-[10px] font-bold text-gray-400 font-sans px-0.5">to</span>
                <input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  className="px-2 py-1.5 bg-white border border-gray-200 rounded-lg text-xs text-gray-950 font-bold focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer max-w-[115px]"
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Counters Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Stat 1 */}
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <span className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest">Total Logs</span>
            <span className="block text-2xl font-black text-gray-900 leading-none">{totalSubmissions}</span>
            <span className="text-[10px] text-gray-400 block font-medium">Daily submissions recorded</span>
          </div>
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
            <ClipboardCheck size={18} />
          </div>
        </div>

        {/* Stat 2 */}
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <span className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest">Total Backlinks</span>
            <span className="block text-2xl font-black text-gray-900 leading-none font-mono">{totalBacklinksCount}</span>
            <span className="text-[10px] text-indigo-500 block font-bold font-sans">Avg {averageListingCount} per work block</span>
          </div>
          <div className="p-3 bg-purple-50 text-purple-600 rounded-xl">
            <TrendingUp size={18} />
          </div>
        </div>

        {/* Stat 3 */}
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <span className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest">Total Projects</span>
            <span className="block text-2xl font-black text-gray-900 leading-none font-mono">{totalWorkedBlocks}</span>
            <span className="text-[10px] text-gray-400 block font-medium">Project specific task items</span>
          </div>
          <div className="p-3 bg-pink-50 text-pink-600 rounded-xl">
            <FileSpreadsheet size={18} />
          </div>
        </div>

        {/* Stat 4 */}
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <span className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest">Total Employees</span>
            <span className="block text-2xl font-black text-gray-900 leading-none font-mono">{uniqueUsersCount}</span>
            <span className="text-[10px] text-gray-400 block font-medium">Verified reporter emails</span>
          </div>
          <div className="p-3 bg-teal-50 text-teal-600 rounded-xl">
            <Users size={18} />
          </div>
        </div>
      </div>

      {/* Interactive Filters Panel with 4 horizontal blocks layout */}
      <div className="bg-white p-5 rounded-3xl border border-gray-150 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Filter className="text-indigo-650 shrink-0" size={14} />
            <span className="text-xs font-black text-gray-900 uppercase tracking-wider">Workspace Demographics</span>
          </div>
          {(selectedEmployeeEmail !== 'all' || selectedProjectId !== 'all' || regionFilter !== 'All' || selectedLocations.length > 0) && (
            <button
              onClick={handleResetFilters}
              className="text-[10px] font-bold text-indigo-600 hover:text-indigo-850 flex items-center gap-1 bg-indigo-50/70 hover:bg-indigo-100/70 px-2 py-1 rounded-lg transition"
            >
              <X size={11} className="shrink-0" />
              Reset Workspace Filters
            </button>
          )}
        </div>

        {/* 4 Horizontal Blocks Side-by-Side */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-1">
          {/* Block 1: Filter by Employee */}
          <div className="flex flex-col gap-1.5">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1">
              <User size={11} className="text-gray-400" />
              Employee Filter
            </span>
            <select
              value={selectedEmployeeEmail}
              onChange={(e) => setSelectedEmployeeEmail(e.target.value)}
              className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-950 font-bold focus:outline-none focus:ring-1 focus:ring-indigo-500 transition cursor-pointer"
            >
              <option value="all">All Employees</option>
              {employeeOptions.map((opt) => (
                <option key={opt.email} value={opt.email}>
                  {opt.name ? `${opt.name} (${opt.email})` : opt.email}
                </option>
              ))}
            </select>
          </div>

          {/* Block 2: Filter by Project */}
          <div className="flex flex-col gap-1.5">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1">
              <Tag size={11} className="text-gray-400" />
              Project Allocation
            </span>
            <select
              value={selectedProjectId}
              onChange={(e) => setSelectedProjectId(e.target.value)}
              className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-950 font-bold focus:outline-none focus:ring-1 focus:ring-indigo-500 transition cursor-pointer"
            >
              <option value="all">All Projects</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} [{p.code}]
                </option>
              ))}
            </select>
          </div>

          {/* Block 3: Region Slider-like Toggle button */}
          <div className="flex flex-col gap-1.5">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1">
              <TrendingUp size={11} className="text-gray-400" />
              Region (Slider Control)
            </span>
            <div className="relative flex bg-gray-100 p-1 rounded-xl border border-gray-200 select-none h-[38px] items-center">
              <div 
                className="absolute top-1 bottom-1 bg-white rounded-lg shadow-xs transition-all duration-300 ease-out"
                style={{
                  width: 'calc(33.333% - 4px)',
                  left: regionFilter === 'North' 
                    ? '4px' 
                    : regionFilter === 'All' 
                      ? 'calc(33.333% + 2px)' 
                      : 'calc(66.666% - 2px)'
                }}
              />
              <button
                type="button"
                onClick={() => setRegionFilter('North')}
                className={`relative z-10 flex-1 text-center py-1 text-[11px] font-black transition-colors ${
                  regionFilter === 'North' ? 'text-indigo-700 font-extrabold' : 'text-gray-500 hover:text-gray-800'
                }`}
              >
                North
              </button>
              <button
                type="button"
                onClick={() => setRegionFilter('All')}
                className={`relative z-10 flex-1 text-center py-1 text-[11px] font-black transition-colors ${
                  regionFilter === 'All' ? 'text-indigo-700 font-extrabold' : 'text-gray-500 hover:text-gray-800'
                }`}
              >
                All
              </button>
              <button
                type="button"
                onClick={() => setRegionFilter('West')}
                className={`relative z-10 flex-1 text-center py-1 text-[11px] font-black transition-colors ${
                  regionFilter === 'West' ? 'text-indigo-700 font-extrabold' : 'text-gray-500 hover:text-gray-800'
                }`}
              >
                West
              </button>
            </div>
          </div>

          {/* Block 4: Checked Locations multi-select dropdown */}
          <div className="flex flex-col gap-1.5">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1">
              <MapPin size={11} className="text-gray-400" />
              Project Location
            </span>
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsLocationDropdownOpen(!isLocationDropdownOpen)}
                className="w-full flex items-center justify-between px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-950 font-bold focus:outline-none transition hover:bg-gray-100 h-[38px]"
              >
                <span className="truncate pr-4">
                  {selectedLocations.length === 0 
                    ? 'All Locations' 
                    : `${selectedLocations.length} selected`}
                </span>
                <ChevronDown size={14} className={`text-gray-400 transition-transform shrink-0 ${isLocationDropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              {isLocationDropdownOpen && (
                <>
                  <div 
                    className="fixed inset-0 z-40" 
                    onClick={() => setIsLocationDropdownOpen(false)} 
                  />
                  <div className="absolute right-0 left-0 mt-1.5 bg-white border border-gray-200 rounded-xl shadow-lg z-50 p-3 space-y-2.5 max-h-60 overflow-y-auto">
                    <div className="flex items-center justify-between text-[10px] pb-1.5 border-b border-gray-100 font-bold text-gray-450">
                      <span>PROJECT LOCATIONS</span>
                      <div className="flex gap-2">
                        <button 
                          type="button" 
                          onClick={(e) => { e.stopPropagation(); setSelectedLocations([]); }} 
                          className="text-indigo-600 hover:text-indigo-850"
                        >
                          Clear
                        </button>
                        <span>•</span>
                        <button 
                          type="button" 
                          onClick={(e) => { e.stopPropagation(); setSelectedLocations([...availableLocations]); }} 
                          className="text-indigo-600 hover:text-indigo-850"
                        >
                          All
                        </button>
                      </div>
                    </div>
                    <div className="space-y-1">
                      {availableLocations.map((loc) => {
                        const isChecked = selectedLocations.includes(loc);
                        return (
                          <div key={loc} className="flex items-center justify-between group hover:bg-gray-50/50 p-1.5 rounded-lg transition-colors">
                            <label className="flex items-center gap-2 cursor-pointer text-xs text-gray-750 font-bold select-none grow">
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => {
                                  if (isChecked) {
                                    setSelectedLocations(selectedLocations.filter(item => item !== loc));
                                  } else {
                                    setSelectedLocations([...selectedLocations, loc]);
                                  }
                                }}
                                className="rounded border-gray-300 text-indigo-650 focus:ring-indigo-500 w-3.5 h-3.5 cursor-pointer"
                              />
                              <span>{loc}</span>
                            </label>
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); setSelectedLocations([loc]); }}
                              className="opacity-0 group-hover:opacity-100 text-[10px] text-indigo-600 font-extrabold hover:underline transition-opacity px-1.5 py-0.5"
                            >
                              Only
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Backlink Type Breakdown Mini-Grid */}
      <div className="bg-white p-6 sm:p-8 rounded-3xl border border-gray-150 shadow-xs space-y-4">
        <div>
          <h4 className="font-bold text-gray-900 text-sm">Backlink Type Breakdown</h4>
          <p className="text-xs text-gray-400">Distribution of backlink categories created across all work blocks</p>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-indigo-50/20 p-4 rounded-2xl border border-indigo-100/30 flex flex-col justify-between">
            <span className="text-[10px] font-bold text-indigo-700 uppercase tracking-widest block">Listings</span>
            <span className="text-2xl font-black text-indigo-950 font-mono mt-1">{totalListingCount}</span>
            <span className="text-[10px] text-indigo-500 block font-normal font-sans mt-0.5">
              {totalBacklinksCount > 0 ? Math.round((totalListingCount / totalBacklinksCount) * 100) : 0}% of total
            </span>
          </div>
          <div className="bg-purple-50/20 p-4 rounded-2xl border border-purple-100/30 flex flex-col justify-between">
            <span className="text-[10px] font-bold text-purple-700 uppercase tracking-widest block">Blogs</span>
            <span className="text-2xl font-black text-purple-950 font-mono mt-1">{totalBlogCount}</span>
            <span className="text-[10px] text-purple-500 block font-normal font-sans mt-0.5">
              {totalBacklinksCount > 0 ? Math.round((totalBlogCount / totalBacklinksCount) * 100) : 0}% of total
            </span>
          </div>
          <div className="bg-teal-50/20 p-4 rounded-2xl border border-teal-100/30 flex flex-col justify-between">
            <span className="text-[10px] font-bold text-teal-700 uppercase tracking-widest block">PDFs</span>
            <span className="text-2xl font-black text-teal-900 font-mono mt-1">{totalPdfCount}</span>
            <span className="text-[10px] text-teal-500 block font-normal font-sans mt-0.5">
              {totalBacklinksCount > 0 ? Math.round((totalPdfCount / totalBacklinksCount) * 100) : 0}% of total
            </span>
          </div>
          <div className="bg-pink-50/20 p-4 rounded-2xl border border-pink-100/30 flex flex-col justify-between">
            <span className="text-[10px] font-bold text-pink-700 uppercase tracking-widest block">Images</span>
            <span className="text-2xl font-black text-pink-950 font-mono mt-1">{totalImageCount}</span>
            <span className="text-[10px] text-pink-500 block font-normal font-sans mt-0.5">
              {totalBacklinksCount > 0 ? Math.round((totalImageCount / totalBacklinksCount) * 100) : 0}% of total
            </span>
          </div>
        </div>
      </div>

      {/* Primary highest backlinks bar chart */}
      <div className="bg-white p-6 sm:p-8 rounded-3xl border border-gray-150 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-100 pb-4">
          <div>
            <h4 className="font-extrabold text-gray-900 text-sm tracking-tight flex items-center gap-1.5">
              <TrendingUp className="text-indigo-600" size={16} />
              Highest Backlink Volumetrics by Allocated Projects
            </h4>
            <p className="text-xs text-gray-400">Analysis displaying cumulative backlink listings registered per project, ordered highest first.</p>
          </div>
          <div className="text-[10px] bg-indigo-50 text-indigo-700 font-black px-2.5 py-1 rounded-lg self-start sm:self-auto">
            ADAPTS DYNAMICALLY TO ALL FILTERS & DATE RANGES
          </div>
        </div>

        <div className="h-80 w-full pt-2">
          {projectStatsData.length === 0 || projectStatsData.every(p => p.sumListings === 0) ? (
            <div className="h-full flex flex-col items-center justify-center text-xs text-gray-400">
              No workspace entries matched the active filters or custom date range selected.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={projectStatsData} margin={{ top: 20, right: 15, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis
                  dataKey="name"
                  stroke="#64748b"
                  fontSize={10}
                  fontWeight="bold"
                  tickLine={false}
                />
                <YAxis stroke="#64748b" fontSize={10} fontWeight="bold" tickLine={false} />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-white p-3 border border-gray-150 rounded-2xl shadow-sm space-y-1">
                          <p className="text-xs font-bold text-gray-900">{data.name} [{data.code}]</p>
                          <p className="text-[10px] text-gray-400 leading-none">Logged Blocks: {data.blocksCount}</p>
                          <p className="text-[11px] text-indigo-600 font-extrabold mt-1">Total Backlinks: {payload[0].value}</p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar dataKey="sumListings" name="Total Backlinks" fill="#4f46e5" radius={[6, 6, 0, 0]} maxBarSize={60}>
                  {projectStatsData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Contribution list & Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* User Contributions List */}
        <div className="bg-white p-6 sm:p-8 rounded-3xl border border-gray-150 shadow-xs space-y-4">
          <div>
            <h4 className="font-bold text-gray-900 text-sm">Reporters Leaderboard</h4>
            <p className="text-xs text-gray-400">Total backlinks reported by user email</p>
          </div>

          <div className="space-y-4 max-h-72 overflow-y-auto pr-1">
            {userContributionList.length === 0 ? (
              <p className="text-xs text-gray-450 italic text-center py-6">Pending active user reporting profiles.</p>
            ) : (
              userContributionList.map((user, idx) => (
                <div key={user.email} className="flex items-center justify-between text-xs border-b border-gray-50 pb-2.5">
                  <div className="flex items-center gap-2.5 overflow-hidden">
                    <span className="w-5 h-5 rounded bg-indigo-50 text-indigo-700 font-bold flex items-center justify-center font-mono text-[10px]">
                      {idx + 1}
                    </span>
                    <div className="overflow-hidden">
                      <span className="block font-semibold text-gray-800 truncate max-w-40" title={user.email}>
                        {employeeEmailToNameMap[user.email.toLowerCase()] || user.email}
                      </span>
                      {employeeEmailToNameMap[user.email.toLowerCase()] && (
                        <span className="block text-[9px] text-gray-400 leading-none truncate max-w-40">
                          {user.email}
                        </span>
                      )}
                      <span className="block text-[9px] text-gray-400 font-mono">
                        {user.records} work blocks logged
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="block font-extrabold text-indigo-700 font-mono text-xs">
                      {user.value}
                    </span>
                    <span className="block text-[8px] text-gray-400 uppercase tracking-wider font-semibold font-sans">
                      backlinks
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Type of Work Pie Chart */}
        <div className="bg-white p-6 sm:p-8 rounded-3xl border border-gray-150 shadow-xs lg:col-span-2 space-y-4 flex flex-col justify-between">
          <div>
            <h4 className="font-bold text-gray-900 text-sm font-sans flex items-center gap-1.5">
              <Percent size={15} className="text-indigo-600" />
              Type of Work Distribution
            </h4>
            <p className="text-xs text-gray-400">Proportional classification of backlink submission categories logged in the active view.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-5 gap-6 items-center grow mt-4">
            {totalBacklinksCount === 0 ? (
              <div className="md:col-span-5 text-center text-xs text-gray-405 italic py-12">
                No work log sessions matched selected active filters or custom date range.
              </div>
            ) : (
              <>
                <div className="md:col-span-3 h-56 w-full relative flex items-center justify-center">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={backlinkDistributionData.filter(item => item.value > 0)}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={3}
                        dataKey="value"
                      >
                        {backlinkDistributionData.filter(item => item.value > 0).map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.fill} />
                        ))}
                      </Pie>
                      <Tooltip
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            const data = payload[0].payload;
                            const share = totalBacklinksCount > 0 ? ((data.value / totalBacklinksCount) * 100).toFixed(1) : '0';
                            return (
                              <div className="bg-white p-3 border border-gray-150 rounded-2xl shadow-sm space-y-1">
                                <p className="text-xs font-bold text-gray-900 flex items-center gap-1.5">
                                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: data.fill }} />
                                  {data.name}
                                </p>
                                <p className="text-xs font-black text-indigo-600 leading-none">{data.value} Backlinks</p>
                                <p className="text-[10px] text-gray-400 font-semibold">{share}% of total</p>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  {/* Central display labels inside the donut */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest leading-none">Total</span>
                    <span className="text-xl font-black text-gray-900 mt-1 leading-none">{totalBacklinksCount}</span>
                    <span className="text-[9px] text-gray-400 font-bold mt-0.5 uppercase tracking-wide">Backlinks</span>
                  </div>
                </div>

                <div className="md:col-span-2 space-y-2.5">
                  {backlinkDistributionData.map((item) => {
                    const percentage = totalBacklinksCount > 0 ? Math.round((item.value / totalBacklinksCount) * 100) : 0;
                    return (
                      <div key={item.name} className="flex items-center justify-between p-2 rounded-xl border border-gray-100 bg-gray-50/50 hover:bg-gray-50/90 transition-colors">
                        <div className="flex items-center gap-2">
                          <span className="w-3 h-3 rounded-md shrink-0" style={{ backgroundColor: item.fill }} />
                          <span className="text-xs font-bold text-gray-700">{item.name}</span>
                        </div>
                        <div className="text-right">
                          <span className="text-xs font-extrabold text-gray-900 block">{item.value}</span>
                          <span className="text-[9px] font-bold text-indigo-600 block">{percentage}% share</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
