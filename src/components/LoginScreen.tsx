/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { FileSpreadsheet, Sparkles, KeyRound, ShieldAlert, ArrowRight, UserCheck } from 'lucide-react';
import { motion } from 'motion/react';

interface LoginScreenProps {
  onLogin: (email: string) => void;
  adminEmails: string[];
  onGoogleSignIn?: () => Promise<void>;
  isLoggingIn?: boolean;
}

export default function LoginScreen({
  onLogin,
  adminEmails,
  onGoogleSignIn,
  isLoggingIn = false,
}: LoginScreenProps) {
  const [emailInput, setEmailInput] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const email = emailInput.trim().toLowerCase();
    
    // Simple robust email validation regex
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email)) {
      setErrorMsg('Please enter a valid business email address (e.g., mail@company.com).');
      return;
    }

    onLogin(email);
  };

  const handleQuickDemoFill = (selectedEmail: string) => {
    setEmailInput(selectedEmail);
    setErrorMsg(null);
  };

  return (
    <div className="min-h-screen bg-gray-50/50 flex flex-col items-center justify-center p-4 sm:p-6 select-none">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="w-full max-w-md space-y-6"
      >
        {/* Brand Banner */}
        <div className="text-center space-y-2">
          <div className="inline-flex w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-600 to-purple-600 items-center justify-center text-white shadow-md">
            <FileSpreadsheet size={24} />
          </div>
          <h1 className="text-xl font-black text-gray-900 tracking-tight">ASSET SCOUT</h1>
          <p className="text-xs text-gray-400 font-semibold tracking-wider uppercase font-mono">
            DAILY STATUS REPORTING SYSTEM
          </p>
        </div>

        {/* Main login card */}
        <div className="bg-white p-8 rounded-3xl border border-gray-150 shadow-md space-y-6 relative overflow-hidden">
          <div className="space-y-1.5 text-center">
            <h2 className="text-base font-bold text-gray-900">Authenticate session</h2>
            <p className="text-xs text-gray-500">Sign in with email. Roles are assigned based on email parameters.</p>
          </div>

          {errorMsg && (
            <div className="p-3 bg-rose-50 border-l-4 border-rose-500 text-rose-800 rounded-r-xl text-xs font-semibold">
              {errorMsg}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="login-email" className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                Business Email Address
              </label>
              <input
                id="login-email"
                type="email"
                required
                autoFocus
                placeholder="e.g. employee@company.com"
                value={emailInput}
                onChange={(e) => {
                  setEmailInput(e.target.value);
                  setErrorMsg(null);
                }}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 focus:border-indigo-600 rounded-xl text-gray-950 font-medium placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-indigo-650 transition text-sm sm:text-xs"
              />
            </div>

            <button
              id="login-submit-btn"
              type="submit"
              className="w-full px-5 py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs transition shadow-sm hover:shadow-md flex items-center justify-center gap-2 cursor-pointer"
            >
              Enter Workspace
              <ArrowRight size={13} />
            </button>

            {onGoogleSignIn && (
              <>
                <div className="relative flex py-2 items-center">
                  <div className="flex-grow border-t border-gray-150"></div>
                  <span className="flex-shrink mx-4 text-[9px] text-gray-400 font-bold uppercase tracking-wider">or sign in with SSO</span>
                  <div className="flex-grow border-t border-gray-150"></div>
                </div>

                <button
                  type="button"
                  disabled={isLoggingIn}
                  onClick={onGoogleSignIn}
                  className="w-full select-none cursor-pointer flex items-center justify-center gap-2.5 px-4 py-3 border border-gray-250 hover:bg-slate-50 active:bg-slate-100 rounded-xl transition text-xs font-bold text-gray-700 disabled:opacity-50"
                >
                  <svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" className="w-4 h-4 shrink-0">
                    <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
                    <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
                    <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
                    <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
                  </svg>
                  {isLoggingIn ? 'Redirecting to Google...' : 'Sign in with Google'}
                </button>
              </>
            )}
          </form>

          {/* Quick Access presets for testing */}
          <div className="border-t border-gray-100 pt-5 space-y-3.5">
            <span className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest text-center">
              Quick access demo presets
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {/* Presets 1: Admin */}
              <button
                type="button"
                onClick={() => handleQuickDemoFill('vatsalpatel1720@gmail.com')}
                className="p-3 text-left bg-indigo-50/50 hover:bg-indigo-50 border border-indigo-100/50 rounded-xl transition"
              >
                <div className="flex items-center gap-1.5 text-indigo-700 font-bold text-[10px]">
                  <KeyRound size={12} /> Admin Preset
                </div>
                <div className="text-[10px] text-gray-705 font-mono mt-1 font-semibold truncate leading-none" title="vatsalpatel1720@gmail.com">
                  vatsalpatel1720@gmail.com
                </div>
              </button>

              {/* Presets 2: Regular user */}
              <button
                type="button"
                onClick={() => handleQuickDemoFill('alex.rivera@company.com')}
                className="p-3 text-left bg-slate-50 hover:bg-slate-100 border border-slate-200/50 rounded-xl transition"
              >
                <div className="flex items-center gap-1.5 text-gray-700 font-bold text-[10px]">
                  <UserCheck size={12} /> Standard User
                </div>
                <div className="text-[10px] text-gray-705 font-mono mt-1 font-semibold truncate leading-none" title="alex.rivera@company.com">
                  alex.rivera@company.com
                </div>
              </button>
            </div>
          </div>
        </div>

        {/* Security / Sheets info indicator footer */}
        <div className="flex items-center justify-center gap-4 text-[10px] text-gray-400 font-semibold font-mono">
          <span className="flex items-center gap-1">
            <ShieldAlert size={12} /> Sandbox active
          </span>
          <span>•</span>
          <span>Sheets layout configured</span>
        </div>
      </motion.div>
    </div>
  );
}
