import { createClient } from '@supabase/supabase-js';

const supabaseUrl  = import.meta.env.VITE_SUPABASE_URL  as string;
const supabaseKey  = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

export const supabase = createClient(supabaseUrl, supabaseKey);

// ─── Types ────────────────────────────────────────────────────────────────────
export interface SBPost {
  id: string;
  author_id: string;
  author_name: string;
  author_avatar: string | null;
  content: string;
  image_url: string | null;
  category: string;
  created_at: string;
}

export interface SBComment {
  id: string;
  post_id: string;
  author_id: string;
  author_name: string;
  author_avatar: string | null;
  content: string;
  created_at: string;
}

export interface SBMatch {
  id: string;
  winner_id: string;
  winner_username: string;
  loser_id: string | null;
  loser_username: string;
  winner_score: number;
  loser_score: number;
  screenshot_url: string;
  troll_comment: string | null;
  created_at: string;
}

export interface SBProfile {
  id: string;
  username: string;
  avatar_url: string | null;
  email: string | null;
}

// ─── Profile helpers ──────────────────────────────────────────────────────────
export const upsertProfile = async (profile: SBProfile) => {
  const { error } = await supabase
    .from('profiles')
    .upsert({ ...profile, updated_at: new Date().toISOString() }, { onConflict: 'id' });
  if (error) console.error('upsertProfile error:', error.message);
};

export const fetchProfile = async (uid: string): Promise<SBProfile | null> => {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', uid)
    .single();
  if (error) return null;
  return data as SBProfile;
};

export const fetchAllProfiles = async (): Promise<SBProfile[]> => {
  const { data } = await supabase.from('profiles').select('*');
  return (data as SBProfile[]) ?? [];
};

export const updateProfileUsername = async (uid: string, username: string) => {
  const { error } = await supabase
    .from('profiles')
    .update({ username, updated_at: new Date().toISOString() })
    .eq('id', uid);
  if (error) throw new Error(error.message);
};

// ─── Post helpers ─────────────────────────────────────────────────────────────
export const fetchPosts = async (): Promise<SBPost[]> => {
  const { data, error } = await supabase
    .from('posts')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) { console.error('fetchPosts error:', error.message); return []; }
  return (data as SBPost[]) ?? [];
};

export const insertPost = async (post: Omit<SBPost, 'id' | 'created_at'>) => {
  const { error } = await supabase.from('posts').insert(post);
  if (error) throw new Error(error.message);
};

export const deletePost = async (postId: string) => {
  const { error } = await supabase.from('posts').delete().eq('id', postId);
  if (error) throw new Error(error.message);
};

// ─── Comment helpers ──────────────────────────────────────────────────────────
export const fetchComments = async (postId: string): Promise<SBComment[]> => {
  const { data, error } = await supabase
    .from('post_comments')
    .select('*')
    .eq('post_id', postId)
    .order('created_at', { ascending: true });
  if (error) return [];
  return (data as SBComment[]) ?? [];
};

export const insertComment = async (comment: Omit<SBComment, 'id' | 'created_at'>) => {
  const { error } = await supabase.from('post_comments').insert(comment);
  if (error) throw new Error(error.message);
};

// ─── Reaction helpers ─────────────────────────────────────────────────────────
export const fetchReaction = async (postId: string, userId: string): Promise<string | null> => {
  const { data } = await supabase
    .from('post_reactions')
    .select('type')
    .eq('post_id', postId)
    .eq('user_id', userId)
    .single();
  return data?.type ?? null;
};

export const fetchReactionCounts = async (postId: string): Promise<Record<string, number>> => {
  const { data } = await supabase
    .from('post_reactions')
    .select('type')
    .eq('post_id', postId);
  const counts: Record<string, number> = { like: 0, love: 0, haha: 0, sad: 0, wow: 0 };
  (data ?? []).forEach((r: any) => { counts[r.type] = (counts[r.type] ?? 0) + 1; });
  return counts;
};

export const upsertReaction = async (postId: string, userId: string, type: string) => {
  const { error } = await supabase
    .from('post_reactions')
    .upsert({ post_id: postId, user_id: userId, type }, { onConflict: 'post_id,user_id' });
  if (error) throw new Error(error.message);
};

export const deleteReaction = async (postId: string, userId: string) => {
  const { error } = await supabase
    .from('post_reactions')
    .delete()
    .eq('post_id', postId)
    .eq('user_id', userId);
  if (error) throw new Error(error.message);
};

// ─── Match helpers ────────────────────────────────────────────────────────────
export const fetchAllMatches = async (): Promise<SBMatch[]> => {
  const { data, error } = await supabase
    .from('matches')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) return [];
  return (data as SBMatch[]) ?? [];
};

export const fetchUserMatches = async (uid: string): Promise<SBMatch[]> => {
  const [wonRes, lostRes] = await Promise.all([
    supabase.from('matches').select('*').eq('winner_id', uid).order('created_at', { ascending: false }),
    supabase.from('matches').select('*').eq('loser_id', uid).order('created_at', { ascending: false }),
  ]);
  const won  = (wonRes.data  as SBMatch[]) ?? [];
  const lost = (lostRes.data as SBMatch[]) ?? [];
  return [...won, ...lost].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
};

export const insertMatch = async (match: Omit<SBMatch, 'id' | 'created_at'>) => {
  const { error } = await supabase.from('matches').insert(match);
  if (error) throw new Error(error.message);
};

// ─── Storage helpers ──────────────────────────────────────────────────────────
/** Compress image on client before upload to reduce size 5-10x */
const compressImage = (file: File, maxPx = 900, quality = 0.72): Promise<Blob> =>
  new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      try {
        URL.revokeObjectURL(url);
        const scale = Math.min(1, maxPx / Math.max(img.width, img.height));
        const w = Math.round(img.width * scale);
        const h = Math.round(img.height * scale);
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (!ctx) { reject(new Error('Canvas context unavailable')); return; }
        ctx.drawImage(img, 0, 0, w, h);
        canvas.toBlob(
          blob => blob ? resolve(blob) : reject(new Error('Compression failed')),
          'image/jpeg',
          quality,
        );
      } catch (e) { reject(e); }
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Image failed to load')); };
    img.src = url;
  });

/**
 * Upload a match screenshot to Supabase Storage.
 * Returns the public URL. Compresses image first for speed.
 */
export const uploadMatchScreenshot = async (
  file: File,
  userId: string,
  onProgress?: (pct: number) => void,
): Promise<string> => {
  onProgress?.(10);
  const compressed = await compressImage(file);
  onProgress?.(40);

  const path = `${userId}/${Date.now()}.jpg`;
  const { error } = await supabase.storage
    .from('matches')
    .upload(path, compressed, { contentType: 'image/jpeg', upsert: false });

  if (error) throw new Error(error.message);
  onProgress?.(90);

  const { data } = supabase.storage.from('matches').getPublicUrl(path);
  return data.publicUrl;
};
