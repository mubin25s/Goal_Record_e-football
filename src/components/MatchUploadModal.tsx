import React, { useState } from 'react';
import type { TournamentMatch } from '../services/tournamentService';
import { submitTournamentMatchScore } from '../services/tournamentService';
import { Upload, X, AlertTriangle, Swords } from 'lucide-react';

interface Props {
  match: TournamentMatch;
  tournamentId: string;
  currentUserId: string;
  onClose: () => void;
  onSuccess: () => void;
}

export const MatchUploadModal: React.FC<Props> = ({
  match,
  tournamentId,
  currentUserId,
  onClose,
  onSuccess,
}) => {
  const [p1Score, setP1Score] = useState<string>('');
  const [p2Score, setP2Score] = useState<string>('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [errorMsg, setErrorMsg] = useState('');

  const handleImageChange = (file: File) => {
    if (!file.type.startsWith('image/')) {
      setErrorMsg('Please upload a valid image file (JPEG, PNG, WebP).');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setErrorMsg('File size must be under 10MB.');
      return;
    }
    setErrorMsg('');
    setImageFile(file);
    const reader = new FileReader();
    reader.onload = e => setImagePreview(e.target?.result as string);
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const s1 = parseInt(p1Score);
    const s2 = parseInt(p2Score);

    if (isNaN(s1) || s1 < 0 || isNaN(s2) || s2 < 0) {
      setErrorMsg('Please enter valid scores for both players.');
      return;
    }

    if (!imageFile) {
      setErrorMsg('Match photo screenshot proof is required.');
      return;
    }

    try {
      setSubmitting(true);
      setErrorMsg('');

      await submitTournamentMatchScore(
        match.id,
        tournamentId,
        s1,
        s2,
        imageFile,
        currentUserId,
        pct => setUploadProgress(pct)
      );

      onSuccess();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to submit score.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.75)',
      backdropFilter: 'blur(6px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 1000, padding: '16px', boxSizing: 'border-box',
    }}>
      <div style={{
        backgroundColor: '#FFFFFF',
        color: '#1A1A1A',
        maxWidth: '460px', width: '100%', maxHeight: '90vh', overflowY: 'auto',
        borderRadius: '20px', padding: '24px',
        boxShadow: '0 20px 50px rgba(0, 0, 0, 0.3)',
        border: '1px solid rgba(169, 14, 2, 0.2)',
        boxSizing: 'border-box',
      }}>
        {/* Modal Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid rgba(0,0,0,0.08)', paddingBottom: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Swords size={20} style={{ color: 'var(--primary)' }} />
            <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#1A1A1A', margin: 0 }}>Submit Match Score</h3>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'rgba(0,0,0,0.05)', border: 'none', color: '#555',
              borderRadius: '50%', width: '32px', height: '32px', display: 'flex',
              alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
              transition: 'background 0.2s',
            }}
          >
            <X size={18} />
          </button>
        </div>

        {errorMsg && (
          <div style={{
            padding: '10px 14px', borderRadius: '10px', backgroundColor: '#FEE2E2',
            border: '1px solid #FCA5A5', color: '#DC2626', fontSize: '13px', marginBottom: '16px',
            display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 500,
          }}>
            <AlertTriangle size={16} />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* Match Score Card */}
          <div style={{
            backgroundColor: '#F8F9FA', border: '1px solid rgba(0,0,0,0.08)',
            borderRadius: '16px', padding: '18px 12px', marginBottom: '20px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              {/* Player 1 */}
              <div style={{ flex: 1, textAlign: 'center' }}>
                <div style={{
                  fontWeight: 700, fontSize: '14px', color: '#1A1A1A', marginBottom: '8px',
                  whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', padding: '0 4px',
                }}>
                  {match.player1_name}
                </div>
                <input
                  type="number"
                  min="0"
                  placeholder="0"
                  value={p1Score}
                  onChange={e => setP1Score(e.target.value)}
                  style={{
                    width: '100%', textAlign: 'center', fontSize: '22px', fontWeight: 800,
                    padding: '10px 6px', borderRadius: '10px', border: '1.5px solid rgba(0,0,0,0.15)',
                    backgroundColor: '#FFFFFF', color: '#1A1A1A', outline: 'none',
                    boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.05)',
                  }}
                  required
                />
              </div>

              <div style={{
                fontSize: '14px', fontWeight: 800, color: 'var(--primary)',
                backgroundColor: 'rgba(169, 14, 2, 0.1)', padding: '6px 10px',
                borderRadius: '8px', height: 'fit-content',
              }}>
                VS
              </div>

              {/* Player 2 */}
              <div style={{ flex: 1, textAlign: 'center' }}>
                <div style={{
                  fontWeight: 700, fontSize: '14px', color: '#1A1A1A', marginBottom: '8px',
                  whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', padding: '0 4px',
                }}>
                  {match.player2_name}
                </div>
                <input
                  type="number"
                  min="0"
                  placeholder="0"
                  value={p2Score}
                  onChange={e => setP2Score(e.target.value)}
                  style={{
                    width: '100%', textAlign: 'center', fontSize: '22px', fontWeight: 800,
                    padding: '10px 6px', borderRadius: '10px', border: '1.5px solid rgba(0,0,0,0.15)',
                    backgroundColor: '#FFFFFF', color: '#1A1A1A', outline: 'none',
                    boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.05)',
                  }}
                  required
                />
              </div>
            </div>
          </div>

          {/* Photo Proof Upload Box */}
          <div style={{ marginBottom: '24px' }}>
            <label style={{ fontSize: '13px', fontWeight: 600, color: '#333333', marginBottom: '8px', display: 'block' }}>
              Match Screenshot Proof *
            </label>

            {imagePreview ? (
              <div style={{ position: 'relative', borderRadius: '12px', overflow: 'hidden', border: '1.5px solid var(--primary)' }}>
                <img src={imagePreview} alt="Proof Preview" style={{ width: '100%', maxHeight: '180px', objectFit: 'cover', display: 'block' }} />
                <button
                  type="button"
                  onClick={() => { setImageFile(null); setImagePreview(null); }}
                  style={{
                    position: 'absolute', top: '8px', right: '8px', backgroundColor: 'rgba(0,0,0,0.7)',
                    color: '#fff', border: 'none', borderRadius: '50%', width: '28px', height: '28px',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                  }}
                >
                  <X size={16} />
                </button>
              </div>
            ) : (
              <label style={{
                border: '2px dashed rgba(169, 14, 2, 0.3)', borderRadius: '14px', padding: '20px 16px',
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', backgroundColor: 'rgba(169, 14, 2, 0.03)', gap: '6px',
                transition: 'background 0.2s',
              }}>
                <Upload size={26} style={{ color: 'var(--primary)' }} />
                <span style={{ fontSize: '13px', fontWeight: 600, color: '#1A1A1A' }}>
                  Tap to upload match screenshot proof
                </span>
                <span style={{ fontSize: '11px', color: '#666666' }}>JPEG, PNG, WebP up to 10MB</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={e => e.target.files?.[0] && handleImageChange(e.target.files[0])}
                  style={{ display: 'none' }}
                />
              </label>
            )}
          </div>

          {submitting && (
            <div style={{ marginBottom: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#555', marginBottom: '4px', fontWeight: 600 }}>
                <span>Uploading proof screenshot...</span>
                <span>{uploadProgress}%</span>
              </div>
              <div style={{ height: '6px', borderRadius: '3px', backgroundColor: '#E5E7EB', overflow: 'hidden' }}>
                <div style={{ width: `${uploadProgress}%`, height: '100%', backgroundColor: 'var(--primary)', transition: 'width 0.2s ease' }} />
              </div>
            </div>
          )}

          {/* Modal Action Buttons */}
          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              type="button"
              onClick={onClose}
              className="btn btn-secondary"
              style={{ flex: 1, padding: '12px', borderRadius: '10px', fontSize: '14px' }}
              disabled={submitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              style={{ flex: 2, padding: '12px', borderRadius: '10px', fontSize: '14px', fontWeight: 700 }}
              disabled={submitting}
            >
              {submitting ? 'Submitting…' : 'Submit & Lock Result'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
