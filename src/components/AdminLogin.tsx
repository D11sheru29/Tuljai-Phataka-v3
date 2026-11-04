import React, { useState } from 'react';
import { AlertCircle, Flame, KeyRound, Lock, ShieldCheck, User } from 'lucide-react';
import { AdminAccount, AdminUsername } from '../types';

interface AdminLoginProps {
  admins: AdminAccount[];
  onLogin: (username: AdminUsername, password: string) => boolean;
}

export const AdminLogin: React.FC<AdminLoginProps> = ({ admins, onLogin }) => {
  const [selectedUsername, setSelectedUsername] = useState<AdminUsername>('Shreyashbhut');
  const [customUsername, setCustomUsername] = useState('');
  const [isManualInput, setIsManualInput] = useState(false);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const targetUsername = isManualInput
      ? (customUsername.trim() as AdminUsername)
      : selectedUsername;

    if (!targetUsername) {
      setErrorMessage('Please select or enter an admin username.');
      return;
    }

    if (!password) {
      setErrorMessage('Please enter your password.');
      return;
    }

    const success = onLogin(targetUsername, password);
    if (!success) {
      setErrorMessage(
        'Invalid username or password. Please verify your credentials.'
      );
    }
  };

  const handleQuickSelectOwner = (admin: AdminAccount) => {
    setSelectedUsername(admin.username);
    setIsManualInput(false);
    setPassword('Tuljai@2626');
    setErrorMessage(null);
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col justify-center items-center px-4 py-12 selection:bg-orange-500 selection:text-white">
      {/* Background festive warm subtle glow */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-orange-200/40 rounded-full blur-3xl"></div>
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-amber-200/40 rounded-full blur-3xl"></div>
      </div>

      <div className="relative w-full max-w-md bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-xl shadow-slate-200/60 space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-3">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-500 via-orange-500 to-red-600 flex items-center justify-center mx-auto shadow-lg shadow-orange-500/20 text-white">
            <Flame className="w-8 h-8 fill-amber-200 stroke-red-900" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-900 font-display tracking-tight uppercase">
              TULJAI PHATAKA
            </h1>
            <p className="text-xs font-bold text-orange-600 mt-0.5">
              Admin & Owner Access Portal
            </p>
            <p className="text-xs text-slate-500 mt-1">
              Authorized owners sign in to manage billing, order history, and fireworks inventory.
            </p>
          </div>
        </div>

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-slate-700">
                Admin / Owner Account
              </label>
              <button
                type="button"
                onClick={() => setIsManualInput(!isManualInput)}
                className="text-[11px] text-orange-600 font-semibold hover:underline"
              >
                {isManualInput ? 'Select from list' : 'Type username'}
              </button>
            </div>

            {isManualInput ? (
              <div className="relative">
                <input
                  type="text"
                  value={customUsername}
                  onChange={(e) => setCustomUsername(e.target.value)}
                  placeholder="e.g. Shreyashbhut"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 text-sm focus:outline-none focus:border-orange-500 focus:bg-white transition-colors pr-10"
                />
                <User className="w-4 h-4 text-slate-400 absolute right-3.5 top-3" />
              </div>
            ) : (
              <select
                value={selectedUsername}
                onChange={(e) => setSelectedUsername(e.target.value as AdminUsername)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 text-sm focus:outline-none focus:border-orange-500 focus:bg-white transition-colors"
              >
                {admins.map((adm) => (
                  <option key={adm.username} value={adm.username}>
                    {adm.displayName} ({adm.username})
                  </option>
                ))}
              </select>
            )}
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-slate-700">
                Password
              </label>
              <button
                type="button"
                onClick={() => setPassword('Tuljai@2626')}
                className="text-[11px] text-orange-600 font-semibold hover:underline"
              >
                Insert Default Password
              </button>
            </div>

            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter admin password"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 text-sm focus:outline-none focus:border-orange-500 focus:bg-white transition-colors pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-3 text-slate-400 hover:text-slate-600"
                aria-label="Toggle password visibility"
              >
                <Lock className="w-4 h-4" />
              </button>
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              Default password: <code className="text-orange-600 font-mono font-semibold">Tuljai@2626</code>
            </p>
          </div>

          {errorMessage && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          <button
            type="submit"
            className="w-full py-3 px-4 bg-gradient-to-r from-amber-500 via-orange-500 to-red-500 text-slate-950 font-extrabold text-sm rounded-xl shadow-md shadow-orange-500/20 hover:brightness-105 active:scale-98 transition-all flex items-center justify-center gap-2"
          >
            <ShieldCheck className="w-4 h-4" />
            <span>Login as Shop Admin</span>
          </button>
        </form>

        {/* Quick select buttons for the 4 shop owners */}
        <div className="pt-4 border-t border-slate-200 space-y-2">
          <p className="text-xs font-semibold text-slate-600">
            Authorized 4 Admins:
          </p>
          <div className="grid grid-cols-2 gap-2 text-xs">
            {admins.map((admin) => (
              <button
                key={admin.username}
                type="button"
                onClick={() => handleQuickSelectOwner(admin)}
                className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 hover:border-orange-400 hover:bg-orange-50/40 text-left transition-colors group"
              >
                <div className="font-semibold text-slate-800 text-xs truncate group-hover:text-orange-600">
                  {admin.displayName}
                </div>
                <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                  ID: {admin.username}
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
