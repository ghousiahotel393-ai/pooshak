import React, { useState, useEffect, useCallback } from 'react';
import { KeyRound, Loader2, LogOut } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useUsersStore } from '../../stores';
import { getActiveStaffUsers, getLockoutRemainingSeconds, AuthUserInfo } from '../../lib/auth/localAuthService';
import { Button, Avatar, CapsLockIndicator, SearchableSelect } from '../../shared/ui';
import { PinKeypad } from './PinKeypad';
import { RealIcon } from '../../shared/icons';
import { sonner } from '../../lib/sonner';

interface FastLockModalProps {
  isOpen: boolean;
  onUnlock: () => void;
}

export function FastLockModal({ isOpen, onUnlock }: FastLockModalProps) {
  const { signInWithPin, signOut } = useAuth();
  const appCurrentUser = useUsersStore((s) => s.currentUser);
  const [staffList, setStaffList] = useState<AuthUserInfo[]>([]);
  const [selectedUser, setSelectedUser] = useState<AuthUserInfo | null>(null);
  const [pin, setPin] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lockoutSecs, setLockoutSecs] = useState(0);

  useEffect(() => {
    if (!isOpen) return;
    async function fetchStaff() {
      const list = await getActiveStaffUsers();
      setStaffList(list);
      if (appCurrentUser) {
        const found = list.find((u) => u.id === appCurrentUser.id);
        setSelectedUser(found || list[0] || null);
      } else if (list.length > 0) {
        setSelectedUser(list[0]);
      }
    }
    fetchStaff();
    setPin('');
  }, [isOpen, appCurrentUser]);

  // Lockout timer ticker
  useEffect(() => {
    if (!isOpen) return;
    const timer = setInterval(() => {
      const remaining = getLockoutRemainingSeconds();
      setLockoutSecs(remaining);
    }, 1000);
    return () => clearInterval(timer);
  }, [isOpen]);

  const handleDigit = (digit: string) => {
    if (lockoutSecs > 0 || isSubmitting) return;
    if (pin.length < 64) {
      setPin((prev) => prev + digit);
    }
  };

  const handleBackspace = () => {
    if (isSubmitting) return;
    setPin((prev) => prev.slice(0, -1));
  };

  const handleClear = () => {
    if (isSubmitting) return;
    setPin('');
  };

  const handleUnlock = useCallback(
    async (pinToSubmit = pin) => {
      if (lockoutSecs > 0) {
        sonner.error(`Terminal is locked. Please wait ${lockoutSecs}s.`);
        return;
      }
      if (!pinToSubmit || pinToSubmit.length < 4) {
        sonner.warning('Password must be at least 4 characters.');
        return;
      }

      setIsSubmitting(true);
      try {
        await signInWithPin(pinToSubmit, selectedUser?.id);
        setPin('');
        sonner.success(`Terminal unlocked for ${selectedUser?.name || 'Operator'}`);
        onUnlock();
      } catch (err: any) {
        sonner.error(err?.message || 'Invalid PIN. Please try again.');
        setPin('');
      } finally {
        setIsSubmitting(false);
      }
    },
    [lockoutSecs, pin, selectedUser, signInWithPin, onUnlock]
  );

  // Enter submits, Escape clears. Alphanumeric typing is captured by the password
  // <input> below (staff credentials can contain letters), the on-screen keypad handles
  // numeric-only entry — both write the same `pin` state so they stay in sync.
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (lockoutSecs > 0 || isSubmitting) return;
      if (e.key === 'Escape') {
        setPin('');
      } else if (e.key === 'Enter') {
        if (pin.length >= 4) {
          handleUnlock(pin);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, pin, lockoutSecs, isSubmitting, handleUnlock]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 pt-[calc(1rem+env(safe-area-inset-top))] pb-[calc(1rem+env(safe-area-inset-bottom))] animate-in fade-in duration-150">
      <div className="w-full max-w-sm bg-surface border border-gray-200 dark:border-white/[0.08] rounded-md shadow-2xl p-6 flex flex-col items-center">
        {/* Terminal Header */}
        <div className="flex items-center gap-2 mb-4">
          <div className="h-10 w-10 rounded-lg bg-gray-100 dark:bg-white/[0.06] border border-gray-200 dark:border-white/[0.08] flex items-center justify-center overflow-visible">
            <RealIcon name="lock" size={32} />
          </div>
          <div>
            <h2 className="text-[14px] font-semibold text-gray-900 dark:text-white tracking-[-0.01em]">
              Terminal Locked
            </h2>
            <p className="text-[11px] text-gray-500 font-mono">Enter password to resume session</p>
          </div>
        </div>

        {/* Staff Switcher */}
        <div className="w-full mb-4 p-2.5 bg-gray-50 dark:bg-black/30 border border-gray-200 dark:border-white/[0.08] rounded">
          <label className="block text-[10px] font-medium text-gray-500 uppercase tracking-wider mb-1.5">
            Active Operator
          </label>
          <div className="flex items-center gap-2">
            <Avatar
              src={selectedUser?.avatar || undefined}
              name={selectedUser?.name || 'User'}
              size="sm"
              shape="square"
              className="!h-9 !w-9 rounded-md border border-gray-200 dark:border-white/[0.08]"
            />
            <div className="flex items-center gap-2">
            <SearchableSelect
              options={staffList.map(u => ({ id: u.id, label: `${u.name} (${u.role.toUpperCase()})` }))}
              value={selectedUser?.id || ''}
              onChange={(value) => {
                const found = staffList.find(u => u.id === value);
                if (found) {
                  setSelectedUser(found);
                  setPin('');
                }
              }}
              placeholder="Select operator"
              disabled={lockoutSecs > 0 || isSubmitting}
            />
          </div>
          </div>
        </div>

        {/* Credential entry & Caps Lock Warning */}
        <div className="flex flex-col items-center justify-center my-3 gap-1.5 w-full">
          {/* Flexible password field — accepts full alphanumeric staff credentials of any
              length (verified against the synced staff_users.password_hash). No fixed-length
              dot indicators: the input itself is the entry area and grows/scrolls naturally.
              The keypad below is a numeric shortcut that writes into this same field. */}
          <input
            type="password"
            inputMode="text"
            autoComplete="current-password"
            value={pin}
            onChange={(e) => {
              if (lockoutSecs > 0 || isSubmitting) return;
              setPin(e.target.value.slice(0, 64));
            }}
            disabled={lockoutSecs > 0 || isSubmitting}
            placeholder="Password or PIN"
            aria-label="Password or PIN"
            className="w-full h-10 px-3 text-center text-[15px] tracking-widest font-mono rounded bg-gray-50 dark:bg-black/30 border border-gray-200 dark:border-white/[0.08] text-gray-900 dark:text-white focus:outline-none focus:border-primary"
          />
          <CapsLockIndicator variant="inline" />
        </div>

        {/* Lockout Warning */}
        {lockoutSecs > 0 && (
          <div className="w-full mb-3 p-2 bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 rounded text-center">
            <p className="text-[11px] font-medium text-rose-600 dark:text-rose-400 font-mono">
              Terminal Locked: retry in {lockoutSecs}s
            </p>
          </div>
        )}

        {/* Keypad Grid (PinKeypad preserves touch/click focus & preventDefault) */}
        <PinKeypad
          onDigit={handleDigit}
          onClear={handleClear}
          onBackspace={handleBackspace}
          disabled={lockoutSecs > 0 || isSubmitting}
          clearDisabled={pin.length === 0}
        />

        {/* Submit Button */}
        <Button
          variant="primary"
          onClick={() => handleUnlock()}
          disabled={pin.length < 4 || lockoutSecs > 0 || isSubmitting}
          className="w-full h-9 mt-4 text-[13px]"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
              Verifying...
            </>
          ) : (
            <>
              <KeyRound className="h-3.5 w-3.5 mr-1.5" />
              Unlock Session
            </>
          )}
        </Button>

        {/* Switch User / Log In as Staff */}
        <button
          type="button"
          onClick={async () => {
            localStorage.removeItem('pos_terminal_locked');
            onUnlock();
            await signOut();
          }}
          className="mt-3 text-[12px] text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors flex items-center gap-1.5 cursor-pointer py-1"
        >
          <LogOut className="h-3.5 w-3.5" /> Switch User / Staff Login
        </button>
      </div>
    </div>
  );
}
