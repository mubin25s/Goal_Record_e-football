import React from 'react';
import { auth } from '../firebaseClient';
import { signOut } from 'firebase/auth';
import { Flame, PlusSquare, Award, User, LogOut, LogIn } from 'lucide-react';

interface NavigationProps {
  currentPage: string;
  setCurrentPage: (page: string) => void;
  username?: string;
  avatarUrl?: string;
  onLogout: () => void;
  isGuest?: boolean;
  onLoginRequest?: () => void;
}

export const Navigation: React.FC<NavigationProps> = ({
  currentPage,
  setCurrentPage,
  username = 'Guest',
  avatarUrl,
  onLogout,
  isGuest = false,
  onLoginRequest,
}) => {
  // All users see Feed; authenticated users see extra nav items
  const guestItems = [
    { id: 'feed',        name: 'Goals Feed', icon: Flame },
  ];
  const authItems = [
    { id: 'feed',        name: 'Goals Feed', icon: Flame  },
    { id: 'upload',      name: 'Submit Score', icon: PlusSquare },
    { id: 'leaderboard', name: 'Leaderboard',  icon: Award     },
    { id: 'profile',     name: 'My Profile',   icon: User      },
  ];
  const navItems = isGuest ? guestItems : authItems;

  const handleLogoutClick = async () => {
    if (confirm('Are you sure you want to sign out?')) {
      await signOut(auth);
      onLogout();
    }
  };

  const AvatarPlaceholder = () => (
    <div style={{
      width: '40px', height: '40px', borderRadius: '50%',
      backgroundColor: isGuest ? 'rgba(169,14,2,0.2)' : 'var(--primary)',
      color: isGuest ? 'var(--primary)' : 'var(--text-dark)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontWeight: 'bold', overflow: 'hidden',
      border: '1.5px solid var(--border-color-glow)',
      fontSize: '12px',
    }}>
      {avatarUrl
        ? <img src={avatarUrl} alt={username} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        : isGuest
          ? <User size={18} />
          : username.substring(0, 2).toUpperCase()
      }
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="sidebar">
        <div className="logo-container">
          <img
            src="/icon-192.png"
            alt="Goals Arena Logo"
            className="logo-icon"
            onError={(e) => { (e.target as HTMLImageElement).src = '/favicon.svg'; }}
          />
          <h1 className="logo-text">Goals Arena</h1>
        </div>

        <ul className="nav-menu">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <li key={item.id} className={`nav-item ${currentPage === item.id ? 'active' : ''}`}>
                <a href={`#${item.id}`} onClick={(e) => { e.preventDefault(); setCurrentPage(item.id); }}>
                  <Icon size={20} />
                  <span>{item.name}</span>
                </a>
              </li>
            );
          })}
        </ul>

        <div style={{ marginTop: 'auto', borderTop: '1px solid var(--border-color)', paddingTop: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
            <AvatarPlaceholder />
            <div style={{ overflow: 'hidden' }}>
              <p style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '14px', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                {isGuest ? 'Guest' : username}
              </p>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                {isGuest ? 'Not signed in' : 'Signed in'}
              </p>
            </div>
          </div>

          {isGuest ? (
            <button
              onClick={onLoginRequest}
              className="btn btn-primary btn-block"
              style={{ padding: '10px 16px', fontSize: '13px', gap: '8px' }}
            >
              <LogIn size={16} />
              <span>Sign In</span>
            </button>
          ) : (
            <button onClick={handleLogoutClick} className="btn btn-secondary btn-block" style={{ padding: '8px 16px', fontSize: '13px' }}>
              <LogOut size={16} />
              <span>Sign Out</span>
            </button>
          )}
        </div>
      </aside>

      {/* Mobile Bottom Navigation */}
      <nav className="mobile-nav">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentPage === item.id;
          return (
            <a
              key={item.id}
              href={`#${item.id}`}
              className={`mobile-nav-item ${isActive ? 'active' : ''}`}
              onClick={(e) => { e.preventDefault(); setCurrentPage(item.id); }}
            >
              <Icon size={22} style={{ color: isActive ? 'var(--primary)' : 'inherit' }} />
              <span>{item.name}</span>
            </a>
          );
        })}
        {isGuest && (
          <a
            href="#login"
            className="mobile-nav-item"
            onClick={(e) => { e.preventDefault(); onLoginRequest?.(); }}
          >
            <LogIn size={22} />
            <span>Sign In</span>
          </a>
        )}
      </nav>
    </>
  );
};
