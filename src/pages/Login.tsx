import React, { useState } from 'react';
import { auth, db } from '../firebaseClient';
import {
  GoogleAuthProvider,
  signInWithPopup
} from 'firebase/auth';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { Shield } from 'lucide-react';

interface LoginProps {
  onLoginSuccess: () => void;
  onBack?: () => void;
}

// Google "G" SVG icon
const GoogleIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
  </svg>
);

export const Login: React.FC<LoginProps> = ({ onLoginSuccess, onBack }) => {
  const [googleLoading, setGoogleLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const getFriendlyError = (code: string): string => {
    switch (code) {
      case 'auth/popup-closed-by-user': return 'Sign-in window was closed. Please try again.';
      case 'auth/popup-blocked': return 'Pop-up was blocked. Please allow pop-ups for this site and try again.';
      case 'auth/cancelled-popup-request': return 'Sign-in cancelled. Please try again.';
      case 'auth/operation-not-allowed': return '⚠️ Google sign-in is not enabled. Go to Firebase Console → Authentication → Sign-in method → Enable Google.';
      case 'auth/unauthorized-domain': return '⚠️ This domain is not authorized. Go to Firebase Console → Authentication → Settings → Authorized domains and add this site.';
      case 'auth/configuration-not-found': return '⚠️ Firebase Auth is not configured. Enable Google in Firebase Console → Authentication → Sign-in method.';
      case 'auth/network-request-failed': return 'Network error. Check your internet connection and try again.';
      default: return `Error: ${code || 'unknown'}. Please check Firebase Console → Authentication → Sign-in method → Google is enabled.`;
    }
  };

  // --- Google Sign-In ---
  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    setErrorMsg('');
    try {
      const provider = new GoogleAuthProvider();
      provider.addScope('profile');
      provider.addScope('email');

      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      // Check if Firestore profile exists; if not, create one
      const profileRef = doc(db, 'users', user.uid);
      const profileSnap = await getDoc(profileRef);

      if (!profileSnap.exists()) {
        const rawName = user.displayName || user.email?.split('@')[0] || 'Player';
        const safeUsername = rawName.replace(/\s+/g, '_').substring(0, 20);
        await setDoc(profileRef, {
          username: safeUsername,
          avatarUrl: user.photoURL || null,
          createdAt: serverTimestamp(),
        });
      }

      onLoginSuccess();
    } catch (err: any) {
      setErrorMsg(getFriendlyError(err.code || ''));
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', padding: '20px', position: 'relative' }}>
      {onBack && (
        <button
          onClick={onBack}
          style={{
            position: 'absolute', top: '20px', left: '20px',
            background: 'none', border: 'none', color: 'var(--text-muted)',
            cursor: 'pointer', fontFamily: 'var(--font-sans)', fontSize: '14px',
            display: 'flex', alignItems: 'center', gap: '6px',
            transition: 'var(--transition)',
          }}
          onMouseEnter={e => (e.currentTarget.style.color = 'var(--text-primary)')}
          onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-muted)')}
        >
          ← Back to Feed
        </button>
      )}
      <div className="card" style={{
        maxWidth: '450px', width: '100%', padding: '40px 32px', textAlign: 'left',
        background: 'rgba(255, 251, 212, 0.95)',
        border: '1px solid var(--border-color)',
        boxShadow: 'var(--shadow-lg)'
      }}>

         {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <img
            src="/icon-192.png" alt="Goals Arena"
            style={{ width: '80px', height: '80px', borderRadius: '16px', border: '2px solid var(--primary)', marginBottom: '16px', boxShadow: '0 0 15px rgba(169, 14, 2, 0.3)' }}
            onError={(e) => { (e.target as HTMLImageElement).src = '/favicon.svg'; }}
          />
          <h2 style={{ fontSize: '28px', color: 'var(--primary)', marginBottom: '8px', fontFamily: 'var(--font-display)' }}>
            🔥 Goals Arena
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>
            Sign in with Google to post, react, and comment on the Goals feed.
          </p>
        </div>

        {/* Error Alert */}
        {errorMsg && (
          <div style={{ background: 'rgba(239, 68, 68, 0.15)', border: '1px solid var(--danger)', color: '#FCA5A5', padding: '12px 16px', borderRadius: '8px', fontSize: '14px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Shield size={18} style={{ flexShrink: 0 }} />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* ─── Google Sign-In Button ─── */}
        <button
          type="button"
          onClick={handleGoogleSignIn}
          disabled={googleLoading}
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '12px',
            padding: '14px 20px',
            borderRadius: 'var(--radius-sm)',
            border: '1.5px solid var(--border-color)',
            background: 'var(--bg-card)',
            color: 'var(--text-primary)',
            fontFamily: 'var(--font-display)',
            fontWeight: 600,
            fontSize: '15px',
            cursor: 'pointer',
            transition: 'var(--transition)',
            boxShadow: 'var(--shadow-sm)',
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.background = 'rgba(169, 14, 2, 0.05)';
            (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--primary)';
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.background = 'var(--bg-card)';
            (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--border-color)';
          }}
        >
          {googleLoading ? (
            <div className="spinner" style={{ width: '18px', height: '18px', borderWidth: '2px', borderTopColor: 'var(--primary)' }} />
          ) : (
            <GoogleIcon />
          )}
          <span>{googleLoading ? 'Signing in...' : 'Continue with Google'}</span>
        </button>
      </div>
    </div>
  );
};
