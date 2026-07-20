import React, { useEffect, useState } from 'react';
import { uploadMatchScreenshot, insertMatch, fetchAllProfiles } from '../supabaseClient';
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

  const winVal = parseInt(winnerScore);
  const loseVal = parseInt(loserScore);
  const isDrawMode = !isNaN(winVal) && !isNaN(loseVal) && winVal === loseVal;

  // Load registered players from Supabase
  useEffect(() => {
    setLoadingUsers(true);
    fetchAllProfiles()
      .then(profiles => {
        setUsers(profiles
          .filter(p => p.id !== currentUserId)
          .map(p => ({ id: p.id, username: p.username })));
      })
      .catch(console.error)
      .finally(() => setLoadingUsers(false));
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
    if (winVal < loseVal) {
      setErrorMsg("Your score cannot be lower than the opponent's score!");
      return;
    }
    if (loserIsRegistered && !selectedLoserId) {
      setErrorMsg(isDrawMode ? 'Select the opponent you drew against.' : 'Select the opponent you defeated.');
      return;
    }
    if (!loserIsRegistered && !loserNameInput.trim()) {
      setErrorMsg("Enter the opponent's name.");
      return;
    }

    setSubmitting(true);
    setUploadProgress(0);

    try {
      // ⚡ Upload screenshot to Supabase Storage (compress → upload)
      const screenshotUrl = await uploadMatchScreenshot(
        imageFile,
        currentUserId,
        pct => setUploadProgress(pct),
      );
      setUploadProgress(95);

      // Save match record to Supabase Database
      await insertMatch({
        winner_id: currentUserId,
        winner_username: currentUsername,
        loser_id: loserIsRegistered ? selectedLoserId : null,
        loser_username: loserIsRegistered ? selectedLoserUsername : loserNameInput.trim(),
        winner_score: winVal,
        loser_score: loseVal,
        screenshot_url: screenshotUrl,
        troll_comment: trollComment.trim() || null,
      });

      setUploadProgress(100);

      // 🎉 Celebrate!
      confetti({ particleCount: 150, spread: 80, origin: { y: 0.6 }, colors: ['#A90E02', '#FFFBD4', '#FFFFFF'] });
      setTimeout(() => onUploadSuccess(), 1500);

    } catch (err: any) {
      console.error('Upload error:', err);
      setErrorMsg(err.message || 'Upload failed. Please try again.');
      setSubmitting(false);
      setUploadProgress(0);
    }
  };

  return (
    <div style={{ maxWidth: '650px', margin: '0 auto' }}>
      <div style={{ marginBottom: '32px' }}>
        <h2 style={{ fontSize: '32px', marginBottom: '8px' }}>{isDrawMode ? 'Log a Draw' : 'Log a Victory'}</h2>
        <p>{isDrawMode ? 'Upload the screenshot, fill in the scores, and record the draw.' : 'Upload the screenshot, fill in the scores, and make sure your opponent never lives it down.'}</p>
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
          <label className="form-label">{isDrawMode ? 'Match Screenshot (Proof of Draw)' : 'Match Screenshot (Proof of Victory)'}</label>
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

        {/* Scores */}
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
              <label className="form-label" htmlFor="opponentSelect">{isDrawMode ? 'Who did you draw against? 🤝' : 'Who did you destroy? 😈'}</label>
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

        {/* Progress bar */}
        {submitting && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: 'var(--text-muted)' }}>
              <span>{uploadProgress < 100 ? '⚡ Compressing & uploading…' : '💾 Saving match…'}</span>
              <span style={{ fontWeight: 600, color: 'var(--primary)' }}>{uploadProgress}%</span>
            </div>
            <div style={{ height: '6px', borderRadius: '99px', background: 'rgba(169,14,2,0.12)', overflow: 'hidden' }}>
              <div style={{
                height: '100%', width: `${uploadProgress}%`,
                background: 'var(--primary)', borderRadius: '99px', transition: 'width 0.3s ease',
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
              <span>{isDrawMode ? 'Broadcast Draw 🤝' : 'Broadcast Victory 🔥'}</span>
            </>
          )}
        </button>
      </form>
    </div>
  );
};
