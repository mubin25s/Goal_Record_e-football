import { useState, useEffect } from 'react';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { auth } from './firebaseClient';
import { upsertProfile, fetchProfile } from './supabaseClient';
import { Navigation } from './components/Navigation';
import { Login } from './pages/Login';
import { Feed } from './pages/Feed';
import { UploadMatch } from './pages/UploadMatch';
import { Leaderboard } from './pages/Leaderboard';
import { Profile } from './pages/Profile';

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<{ username: string; avatarUrl?: string } | null>(null);
  const [currentPage, setCurrentPage] = useState<string>('feed');
  const [loading, setLoading] = useState(true);
  // When true, show the login page (guest clicked "Log in")
  const [showLogin, setShowLogin] = useState(false);


  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        // ⚡ Show UI immediately using Google auth data
        setProfile({
          username: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'Player',
          avatarUrl: firebaseUser.photoURL || undefined,
        });
        setShowLogin(false);
        setLoading(false);

        // Upsert profile to Supabase, then fetch custom username
        await upsertProfile({
          id:         firebaseUser.uid,
          username:   firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'Player',
          avatar_url: firebaseUser.photoURL || null,
          email:      firebaseUser.email || null,
        });
        const sbProfile = await fetchProfile(firebaseUser.uid);
        if (sbProfile?.username) {
          setProfile({ username: sbProfile.username, avatarUrl: sbProfile.avatar_url || firebaseUser.photoURL || undefined });
        }
      } else {
        setProfile(null);
        setLoading(false);
      }
    });
    return () => unsubscribe();
  }, []);

  const handleProfileUpdate = (newUsername: string, newAvatarUrl?: string) => {
    setProfile({ username: newUsername, avatarUrl: newAvatarUrl });
  };

  const handleLogout = () => {
    setUser(null);
    setProfile(null);
    setCurrentPage('feed');
  };

  // currentUser object passed to Feed / PostCard
  const currentUser = user
    ? { uid: user.uid, displayName: profile?.username || user.displayName || 'User', avatarUrl: profile?.avatarUrl }
    : null;

  if (loading) {
    return (
      <div className="flex-center" style={{ minHeight: '100vh', flexDirection: 'column', gap: '20px' }}>
        <div className="football-loader">⚽</div>
        <p style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: '18px', letterSpacing: '-0.01em' }}>
          Entering Goals Arena…
        </p>
      </div>
    );
  }

  // Show login page (triggered by guest clicking "Log In", or navigating to login)
  if (showLogin || currentPage === 'login') {
    return (
      <Login
        onLoginSuccess={() => {
          // Don't set loading=true — auth state change handles it instantly now
          setShowLogin(false);
          setCurrentPage('feed');
        }}
        onBack={() => {
          setShowLogin(false);
          setCurrentPage('feed');
        }}
      />
    );
  }

  const renderPage = () => {
    switch (currentPage) {
      case 'feed':
        return (
          <Feed
            currentUser={currentUser}
            onLoginRequest={() => setShowLogin(true)}
          />
        );
      case 'upload':
        return user
          ? <UploadMatch currentUserId={user.uid} currentUsername={profile?.username || 'Player'} onUploadSuccess={() => setCurrentPage('feed')} />
          : null;
      case 'leaderboard':
        return <Leaderboard />;
      case 'profile':
        return user
          ? (
            <Profile
              currentUserId={user.uid}
              userEmail={user.email || ''}
              onProfileUpdate={handleProfileUpdate}
            />
          )
          : null;
      default:
        return (
          <Feed
            currentUser={currentUser}
            onLoginRequest={() => setShowLogin(true)}
          />
        );
    }
  };

  return (
    <div className="app-container">
      <Navigation
        currentPage={currentPage}
        setCurrentPage={setCurrentPage}
        username={profile?.username || 'Guest'}
        avatarUrl={profile?.avatarUrl}
        onLogout={handleLogout}
        isGuest={!user}
        onLoginRequest={() => setShowLogin(true)}
      />
      <main className="content-area">
        {renderPage()}
      </main>
    </div>
  );
}

export default App;
