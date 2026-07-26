import React, { useState, useEffect } from 'react';
import { fetchAllProfiles, type SBProfile } from '../supabaseClient';
import { ALLOWED_PLAYER_COUNTS } from '../utils/tournamentEngine';
import { createTournament } from '../services/tournamentService';
import { Trophy, Users, CheckCircle2, Plus, X, AlertTriangle } from 'lucide-react';

interface Props {
  currentUserId: string;
  onClose: () => void;
  onSuccess: (tournamentId: string) => void;
}

export const TournamentCreateModal: React.FC<Props> = ({ currentUserId, onClose, onSuccess }) => {
  const [step, setStep] = useState<1 | 2>(1);
  const [title, setTitle] = useState('');
  const [selectedCount, setSelectedCount] = useState<number>(8); // Default 8

  // Registered profiles from DB
  const [profiles, setProfiles] = useState<SBProfile[]>([]);
  const [loadingProfiles, setLoadingProfiles] = useState(true);

  // Selected player IDs / Objects
  const [selectedPlayerUids, setSelectedPlayerUids] = useState<string[]>([]);
  // Custom guest player names
  const [customPlayers, setCustomPlayers] = useState<{ id: string; name: string }[]>([]);
  const [newGuestName, setNewGuestName] = useState('');

  const [creating, setCreating] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    fetchAllProfiles()
      .then(data => {
        setProfiles(data);
        // Pre-select current user if registered
        const me = data.find(p => p.id === currentUserId);
        if (me) {
          setSelectedPlayerUids([me.id]);
        }
      })
      .catch(console.error)
      .finally(() => setLoadingProfiles(false));
  }, [currentUserId]);

  const togglePlayerSelection = (uid: string) => {
    if (selectedPlayerUids.includes(uid)) {
      setSelectedPlayerUids(prev => prev.filter(id => id !== uid));
    } else {
      if (totalSelectedCount >= selectedCount) {
        setErrorMsg(`You can only select up to ${selectedCount} players.`);
        return;
      }
      setErrorMsg('');
      setSelectedPlayerUids(prev => [...prev, uid]);
    }
  };

  const handleAddGuest = () => {
    const trimmed = newGuestName.trim();
    if (!trimmed) return;
    if (totalSelectedCount >= selectedCount) {
      setErrorMsg(`You can only select up to ${selectedCount} players.`);
      return;
    }
    const guestObj = {
      id: `guest_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      name: trimmed,
    };
    setCustomPlayers(prev => [...prev, guestObj]);
    setNewGuestName('');
    setErrorMsg('');
  };

  const handleRemoveGuest = (id: string) => {
    setCustomPlayers(prev => prev.filter(g => g.id !== id));
  };

  const totalSelectedCount = selectedPlayerUids.length + customPlayers.length;

  const handleNextStep = () => {
    if (!title.trim()) {
      setErrorMsg('Please enter a tournament title.');
      return;
    }
    setErrorMsg('');
    setStep(2);
  };

  const handleCreate = async () => {
    if (totalSelectedCount !== selectedCount) {
      setErrorMsg(`Please select exactly ${selectedCount} players. Currently selected: ${totalSelectedCount}.`);
      return;
    }

    try {
      setCreating(true);
      setErrorMsg('');

      // Build full player objects
      const fullPlayers: { id: string; name: string; avatar_url?: string }[] = [];

      selectedPlayerUids.forEach(uid => {
        const prof = profiles.find(p => p.id === uid);
        if (prof) {
          fullPlayers.push({
            id: prof.id,
            name: prof.username,
            avatar_url: prof.avatar_url || undefined,
          });
        }
      });

      customPlayers.forEach(cp => {
        fullPlayers.push({
          id: cp.id,
          name: cp.name,
        });
      });

      const tournamentId = await createTournament(title.trim(), selectedCount, fullPlayers, currentUserId);
      onSuccess(tournamentId);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to create tournament');
    } finally {
      setCreating(false);
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
        maxWidth: '520px', width: '100%', maxHeight: '90vh', overflowY: 'auto',
        borderRadius: '20px', padding: '24px',
        boxShadow: '0 20px 50px rgba(0, 0, 0, 0.3)',
        border: '1px solid rgba(169, 14, 2, 0.2)',
        boxSizing: 'border-box',
      }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid rgba(0,0,0,0.08)', paddingBottom: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Trophy size={22} style={{ color: 'var(--primary)' }} />
            <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#1A1A1A', margin: 0 }}>Create New Tournament</h2>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'rgba(0,0,0,0.05)', border: 'none', color: '#555',
              borderRadius: '50%', width: '32px', height: '32px', display: 'flex',
              alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
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

        {step === 1 ? (
          <div>
            {/* Tournament Title */}
            <div style={{ marginBottom: '20px' }}>
              <label style={{ fontSize: '13px', fontWeight: 600, color: '#333333', marginBottom: '8px', display: 'block' }}>
                Tournament Title *
              </label>
              <input
                type="text"
                placeholder="e.g. Champions Arena Cup 2026"
                value={title}
                onChange={e => setTitle(e.target.value)}
                style={{
                  width: '100%', padding: '12px 14px', borderRadius: '10px',
                  border: '1.5px solid rgba(0,0,0,0.15)', backgroundColor: '#F8F9FA',
                  color: '#1A1A1A', fontSize: '15px', fontWeight: 500, outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            {/* Select Player Count */}
            <div style={{ marginBottom: '24px' }}>
              <label style={{ fontSize: '13px', fontWeight: 600, color: '#333333', marginBottom: '10px', display: 'block' }}>
                Select Number of Players (Allowed Counts Only)
              </label>
              <div style={{
                display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px',
              }}>
                {ALLOWED_PLAYER_COUNTS.map(count => {
                  const isSelected = selectedCount === count;
                  return (
                    <button
                      key={count}
                      type="button"
                      onClick={() => setSelectedCount(count)}
                      style={{
                        padding: '12px 8px',
                        borderRadius: '12px',
                        border: isSelected ? '2px solid var(--primary)' : '1px solid rgba(0,0,0,0.12)',
                        backgroundColor: isSelected ? 'var(--primary)' : '#F8F9FA',
                        color: isSelected ? '#FFFFFF' : '#1A1A1A',
                        fontWeight: 700,
                        fontSize: '16px',
                        cursor: 'pointer',
                        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px',
                        transition: 'all 0.2s ease',
                        boxShadow: isSelected ? '0 4px 12px rgba(169,14,2,0.3)' : 'none',
                      }}
                    >
                      <span>{count}</span>
                      <span style={{ fontSize: '10px', opacity: 0.85, fontWeight: 500 }}>
                        {count <= 5 ? 'Single Group' : count <= 12 ? '2 Groups' : count === 16 ? '4 Groups' : '8 Groups'}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <button
              onClick={handleNextStep}
              className="btn btn-primary btn-block"
              style={{ padding: '12px', borderRadius: '10px', fontSize: '15px', fontWeight: 700 }}
            >
              Next: Choose Players
            </button>
          </div>
        ) : (
          <div>
            {/* Step 2: Choose Players */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Users size={18} style={{ color: 'var(--primary)' }} />
                <span style={{ fontWeight: 700, fontSize: '14px', color: '#1A1A1A' }}>
                  Select {selectedCount} Players
                </span>
              </div>
              <span style={{
                padding: '4px 12px', borderRadius: '14px',
                backgroundColor: totalSelectedCount === selectedCount ? '#DCFCE7' : '#FEF3C7',
                color: totalSelectedCount === selectedCount ? '#166534' : '#92400E',
                fontSize: '12px', fontWeight: 700,
              }}>
                {totalSelectedCount} / {selectedCount} Selected
              </span>
            </div>

            {/* Registered Users List */}
            <p style={{ fontSize: '12px', fontWeight: 600, color: '#666666', marginBottom: '8px' }}>Registered App Users:</p>
            {loadingProfiles ? (
              <p style={{ fontSize: '13px', color: '#666666' }}>Loading players…</p>
            ) : (
              <div style={{
                maxHeight: '180px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px',
                marginBottom: '16px', paddingRight: '4px',
              }}>
                {profiles.map(p => {
                  const isChecked = selectedPlayerUids.includes(p.id);
                  return (
                    <div
                      key={p.id}
                      onClick={() => togglePlayerSelection(p.id)}
                      style={{
                        padding: '10px 14px', borderRadius: '10px',
                        border: isChecked ? '2px solid var(--primary)' : '1px solid rgba(0,0,0,0.1)',
                        backgroundColor: isChecked ? 'rgba(169, 14, 2, 0.06)' : '#F8F9FA',
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        cursor: 'pointer', transition: 'all 0.15s ease',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{
                          width: '30px', height: '30px', borderRadius: '50%',
                          backgroundColor: 'var(--primary)', color: '#FFFFFF',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontWeight: 700, fontSize: '12px', overflow: 'hidden'
                        }}>
                          {p.avatar_url ? <img src={p.avatar_url} alt="" referrerPolicy="no-referrer" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : p.username.slice(0, 2).toUpperCase()}
                        </div>
                        <span style={{ fontWeight: 600, fontSize: '14px', color: '#1A1A1A' }}>{p.username}</span>
                      </div>
                      {isChecked && <CheckCircle2 size={18} style={{ color: 'var(--primary)' }} />}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Custom Guest Players */}
            <p style={{ fontSize: '12px', fontWeight: 600, color: '#666666', marginBottom: '8px' }}>Add Extra / Guest Players:</p>
            <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
              <input
                type="text"
                placeholder="Enter player name..."
                value={newGuestName}
                onChange={e => setNewGuestName(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddGuest(); } }}
                style={{
                  flex: 1, padding: '10px 12px', borderRadius: '10px',
                  border: '1.5px solid rgba(0,0,0,0.15)', backgroundColor: '#F8F9FA',
                  color: '#1A1A1A', fontSize: '14px', outline: 'none',
                }}
              />
              <button
                type="button"
                onClick={handleAddGuest}
                className="btn btn-secondary"
                style={{ padding: '0 16px', gap: '4px', whiteSpace: 'nowrap', borderRadius: '10px', fontSize: '13px' }}
              >
                <Plus size={16} /> Add
              </button>
            </div>

            {/* Added Guest List */}
            {customPlayers.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '20px' }}>
                {customPlayers.map(cp => (
                  <span
                    key={cp.id}
                    style={{
                      padding: '4px 10px', borderRadius: '16px', backgroundColor: '#F1F5F9',
                      border: '1px solid rgba(0,0,0,0.1)', fontSize: '12px', display: 'inline-flex',
                      alignItems: 'center', gap: '6px', color: '#1A1A1A', fontWeight: 500,
                    }}
                  >
                    👤 {cp.name}
                    <X
                      size={14}
                      style={{ cursor: 'pointer', color: '#666' }}
                      onClick={() => handleRemoveGuest(cp.id)}
                    />
                  </span>
                ))}
              </div>
            )}

            {/* Buttons */}
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={() => setStep(1)}
                className="btn btn-secondary"
                style={{ flex: 1, padding: '12px', borderRadius: '10px', fontSize: '14px' }}
                disabled={creating}
              >
                Back
              </button>
              <button
                onClick={handleCreate}
                className="btn btn-primary"
                style={{ flex: 2, padding: '12px', borderRadius: '10px', fontSize: '14px', fontWeight: 700 }}
                disabled={creating || totalSelectedCount !== selectedCount}
              >
                {creating ? 'Generating Tournament…' : `Start Tournament (${selectedCount} Players)`}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
