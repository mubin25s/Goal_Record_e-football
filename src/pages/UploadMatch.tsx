import React, { useEffect, useState } from 'react';
import { db } from '../firebaseClient';
import { uploadToSupabase } from '../supabaseClient';
import { addDoc, collection, getDocs, serverTimestamp } from 'firebase/firestore';
import { Upload, X, Award, AlertTriangle } from 'lucide-react';
import confetti from 'canvas-confetti';

interface UserProfile {
  id: string;
  username: string;
}

interface UploadMatchProps {
  currentUserId: string;
  currentUsername: string;
  onUploadSuccess: () => void;
}

// ⚡ Compress image before upload — shrinks file 5-10x so upload is way faster
const compressImage = (file: File, maxPx = 900, quality = 0.72): Promise<Blob> =>
  new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const scale = Math.min(1, maxPx / Math.max(img.width, img.height));
      const w = Math.round(img.width * scale);
      const h = Math.round(img.height * scale);
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      canvas.getContext('2d')!.drawImage(img, 0, 0, w, h);
      canvas.toBlob(
        blob => blob ? resolve(blob) : reject(new Error('Compression failed')),
        'image/jpeg',
        quality,
      );
    };
    img.onerror = reject;
    img.src = url;
  });

export const UploadMatch: React.FC<UploadMatchProps> = ({
  currentUserId,
  currentUsername,
  onUploadSuccess,
}) => {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [errorMsg, setErrorMsg] = useState('');

  const [loserIsRegistered, setLoserIsRegistered] = useState(true);
  const [selectedLoserId, setSelectedLoserId] = useState('');
  const [selectedLoserUsername, setSelectedLoserUsername] = useState('');
  const [loserNameInput, setLoserNameInput] = useState('');
  const [winnerScore, setWinnerScore] = useState('');
  const [loserScore, setLoserScore] = useState('');
  const [trollComment, setTrollComment] = useState('');

  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  useEffect(() => {
    const fetchUsers = async () => {
      setLoadingUsers(true);
      try {
        const snap = await getDocs(collection(db, 'users'));
        const all: UserProfile[] = snap.docs
          .map(d => ({ id: d.id, username: (d.data() as any).username }))
          .filter(u => u.id !== currentUserId);
        setUsers(all);
      } catch (err) {
        console.error('Error fetching users:', err);
      } finally {
        setLoadingUsers(false);
      }
    };
    fetchUsers();
  }, [currentUserId]);

  const handleImageChange = (file: File) => {
    if (!file.type.startsWith('image/')) {
      setErrorMsg('Please select a valid image file.');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setErrorMsg('Image size must be less than 10MB.');
      return;
    }
    setImageFile(file);
    const reader = new FileReader();
    reader.onloadend = () => setImagePreview(reader.result as string);
    reader.readAsDataURL(file);
    setErrorMsg('');
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files?.[0]) handleImageChange(e.dataTransfer.files[0]);
  };

  const handleOpponentSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const id = e.target.value;
    setSelectedLoserId(id);
    const found = users.find(u => u.id === id);
    setSelectedLoserUsername(found?.username || '');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!imageFile) { setErrorMsg('Upload a screenshot as evidence.'); return; }

    const winVal = parseInt(winnerScore);
    const loseVal = parseInt(loserScore);
    if (isNaN(winVal) || isNaN(loseVal) || winVal < 0 || loseVal < 0) {
      setErrorMsg('Enter valid score numbers.');
      return;
    }
    if (winVal <= loseVal) {
      setErrorMsg("Your score must be higher than the opponent's score!");
      return;
    }
    if (loserIsRegistered && !selectedLoserId) {
      setErrorMsg('Select the opponent you defeated.');
      return;
    }
    if (!loserIsRegistered && !loserNameInput.trim()) {
      setErrorMsg("Enter the opponent's name.");
      return;
    }

    setSubmitting(true);
    setUploadProgress(0);

    try {
      // ⚡ Step 1: Compress image (5-10x smaller = much faster upload)
      const compressed = await compressImage(imageFile);
      setUploadProgress(20);

      // ⚡ Step 2: Upload to Supabase Storage (free, no billing needed)
      const path = `${currentUserId}/${Date.now()}.jpg`;
      setUploadProgress(40);
      const downloadURL = await uploadToSupabase('matches', path, compressed);
      setUploadProgress(90);

      // Step 3: Save match to Firestore
      await addDoc(collection(db, 'matches'), {
        winnerId:       currentUserId,
        winnerUsername: currentUsername,
        loserId:        loserIsRegistered ? selectedLoserId : null,
        loserUsername:  loserIsRegistered ? selectedLoserUsername : loserNameInput.trim(),
        winnerScore:    winVal,
        loserScore:     loseVal,
        screenshotUrl:  downloadURL,
        trollComment:   trollComment.trim() || null,
        createdAt:      serverTimestamp(),
      });

      // Step 4: Celebrate!
      confetti({ particleCount: 150, spread: 80, origin: { y: 0.6 }, colors: ['#A90E02', '#FFFBD4', '#FFFFFF'] });
      setTimeout(() => onUploadSuccess(), 1500);

    } catch (err: any) {
      console.error('Upload error:', err);
      setErrorMsg(err.message || 'An error occurred. Check Firebase Storage rules.');
      setSubmitting(false);
      setUploadProgress(0);
    }
  };

  return (
    <div style={{ maxWidth: '650px', margin: '0 auto' }}>
      <div style={{ marginBottom: '32px' }}>
        <h2 style={{ fontSize: '32px', marginBottom: '8px' }}>Log a Victory</h2>
        <p>Upload the screenshot, fill in the scores, and make sure your opponent never lives it down.</p>
      </div>

      {errorMsg && (
        <div style={{
          background: 'rgba(239,68,68,0.1)', border: '1px solid var(--danger)',
          color: 'var(--danger)', padding: '14px 18px', borderRadius: '8px',
          fontSize: '14px', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '10px',
        }}>
          <AlertTriangle size={18} style={{ flexShrink: 0 }} />
          <span>{errorMsg}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="card" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

        {/* Screenshot Upload */}
        <div className="form-group">
          <label className="form-label">Match Screenshot (Proof of Victory)</label>
          {imagePreview ? (
            <div style={{ position: 'relative', borderRadius: '8px', overflow: 'hidden', border: '1.5px solid var(--primary)' }}>
              <img src={imagePreview} alt="Preview" style={{ width: '100%', maxHeight: '300px', objectFit: 'contain', display: 'block', background: '#f0f0f0' }} />
              <button
                type="button"
                onClick={() => { setImageFile(null); setImagePreview(null); }}
                style={{ position: 'absolute', top: '12px', right: '12px', background: 'rgba(169,14,2,0.85)', border: 'none', color: 'white', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>
          ) : (
            <div
              onDragOver={e => { e.preventDefault(); setIsDragOver(true); }}
              onDragLeave={() => setIsDragOver(false)}
              onDrop={handleDrop}
              onClick={() => document.getElementById('screenshot-input')?.click()}
              style={{
                border: isDragOver ? '2px dashed var(--primary)' : '2px dashed var(--border-color)',
                borderRadius: '8px', padding: '40px 20px', textAlign: 'center', cursor: 'pointer',
                background: isDragOver ? 'rgba(169,14,2,0.05)' : 'rgba(0,0,0,0.02)',
                transition: 'var(--transition)',
              }}
            >
              <Upload size={40} style={{ color: 'var(--primary)', marginBottom: '12px', opacity: 0.8 }} />
              <h4 style={{ fontSize: '16px', marginBottom: '4px', color: 'var(--text-primary)' }}>Drag and drop your screenshot here</h4>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                or <span style={{ color: 'var(--primary)', textDecoration: 'underline' }}>browse files</span> (Max 10MB)
              </p>
              <input
                id="screenshot-input" type="file" accept="image/*"
                onChange={e => { if (e.target.files?.[0]) handleImageChange(e.target.files[0]); }}
                style={{ display: 'none' }}
              />
            </div>
          )}
        </div>

        {/* Scores — stack on mobile */}
        <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
          <div className="form-group" style={{ flex: 1, minWidth: '140px' }}>
            <label className="form-label" htmlFor="winnerScore">Your Score</label>
            <input
              id="winnerScore" type="number" min="0" placeholder="e.g. 3"
              className="form-input" value={winnerScore}
              onChange={e => setWinnerScore(e.target.value)} required
            />
          </div>
          <div className="form-group" style={{ flex: 1, minWidth: '140px' }}>
            <label className="form-label" htmlFor="loserScore">Opponent's Score</label>
            <input
              id="loserScore" type="number" min="0" placeholder="e.g. 0"
              className="form-input" value={loserScore}
              onChange={e => setLoserScore(e.target.value)} required
            />
          </div>
        </div>

        {/* Opponent */}
        <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
            <input
              id="unregistered-checkbox" type="checkbox"
              checked={!loserIsRegistered}
              onChange={e => {
                setLoserIsRegistered(!e.target.checked);
                setSelectedLoserId('');
                setSelectedLoserUsername('');
                setLoserNameInput('');
              }}
              style={{ accentColor: 'var(--primary)', width: '18px', height: '18px', cursor: 'pointer' }}
            />
            <label htmlFor="unregistered-checkbox" style={{ fontSize: '14px', cursor: 'pointer', color: 'var(--text-muted)' }}>
              Opponent is NOT a registered user
            </label>
          </div>

          {loserIsRegistered ? (
            <div className="form-group">
              <label className="form-label" htmlFor="opponentSelect">Who did you destroy? 😈</label>
              <select
                id="opponentSelect" className="form-input" value={selectedLoserId}
                onChange={handleOpponentSelect} required
                style={{ width: '100%', appearance: 'auto', backgroundColor: 'var(--bg-input)' }}
              >
                <option value="">-- Select Opponent --</option>
                {loadingUsers
                  ? <option disabled>Loading players...</option>
                  : users.map(u => <option key={u.id} value={u.id}>{u.username}</option>)
                }
              </select>
            </div>
          ) : (
            <div className="form-group">
              <label className="form-label" htmlFor="loserNameInput">Opponent's Name</label>
              <input
                id="loserNameInput" type="text" placeholder="e.g. NoobFriendJohn"
                className="form-input" value={loserNameInput}
                onChange={e => setLoserNameInput(e.target.value)} required
              />
            </div>
          )}
        </div>

        {/* Troll Comment */}
        <div className="form-group">
          <label className="form-label" htmlFor="roast">Troll / Roast Comment (Optional)</label>
          <textarea
            id="roast" placeholder='e.g. "Delete the game bro 😂"'
            className="form-input" value={trollComment}
            onChange={e => setTrollComment(e.target.value)}
            rows={3} style={{ width: '100%', resize: 'vertical', minHeight: '80px' }}
          />
        </div>

        {/* Upload progress bar */}
        {submitting && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: 'var(--text-muted)' }}>
              <span>{uploadProgress < 100 ? '⚡ Compressing & uploading…' : '💾 Saving match…'}</span>
              <span style={{ fontWeight: 600, color: 'var(--primary)' }}>{uploadProgress}%</span>
            </div>
            <div style={{ height: '6px', borderRadius: '99px', background: 'rgba(169,14,2,0.12)', overflow: 'hidden' }}>
              <div style={{
                height: '100%', width: `${uploadProgress}%`,
                background: 'var(--primary)', borderRadius: '99px', transition: 'width 0.2s ease',
              }} />
            </div>
          </div>
        )}

        {/* Submit */}
        <button
          type="submit" className="btn btn-primary" disabled={submitting}
          style={{ marginTop: '4px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', padding: '14px' }}
        >
          {submitting ? (
            <>
              <div className="spinner" style={{ width: '18px', height: '18px', borderWidth: '2px', borderTopColor: '#FFFFFF' }} />
              <span>Uploading Evidence…</span>
            </>
          ) : (
            <>
              <Award size={18} />
              <span>Broadcast Victory 🔥</span>
            </>
          )}
        </button>
      </form>
    </div>
  );
};
