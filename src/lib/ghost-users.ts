export type GhostProfile = {
  id: string;
  username: string;
  avatar_url: string | null;
  bio: string | null;
  is_online: true;
  last_seen_at: string;
  age: number;
  name: string;
  state: string;
};

export const GHOST_USERS: GhostProfile[] = [
  { id: '00000000-0000-4000-8000-000000000001', username: 'arjun', avatar_url: null, bio: 'late night thoughts', is_online: true, last_seen_at: new Date().toISOString(), age: 21, name: 'Arjun', state: 'Maharashtra' },
  { id: '00000000-0000-4000-8000-000000000002', username: 'priya', avatar_url: null, bio: 'cant sleep again', is_online: true, last_seen_at: new Date().toISOString(), age: 20, name: 'Priya', state: 'Karnataka' },
  { id: '00000000-0000-4000-8000-000000000003', username: 'rohan', avatar_url: null, bio: 'just vibing', is_online: true, last_seen_at: new Date().toISOString(), age: 22, name: 'Rohan', state: 'Delhi' },
  { id: '00000000-0000-4000-8000-000000000004', username: 'sneha', avatar_url: null, bio: 'insomniac here', is_online: true, last_seen_at: new Date().toISOString(), age: 19, name: 'Sneha', state: 'Tamil Nadu' },
  { id: '00000000-0000-4000-8000-000000000005', username: 'karan', avatar_url: null, bio: 'bored at midnight', is_online: true, last_seen_at: new Date().toISOString(), age: 23, name: 'Karan', state: 'Gujarat' },
  { id: '00000000-0000-4000-8000-000000000006', username: 'ananya', avatar_url: null, bio: 'here to talk', is_online: true, last_seen_at: new Date().toISOString(), age: 20, name: 'Ananya', state: 'West Bengal' },
  { id: '00000000-0000-4000-8000-000000000007', username: 'dev', avatar_url: null, bio: 'night owl forever', is_online: true, last_seen_at: new Date().toISOString(), age: 24, name: 'Dev', state: 'Rajasthan' },
  { id: '00000000-0000-4000-8000-000000000008', username: 'meera', avatar_url: null, bio: 'anonymous and free', is_online: true, last_seen_at: new Date().toISOString(), age: 21, name: 'Meera', state: 'Kerala' },
];

export const GHOST_MAP = new Map<string, GhostProfile>(GHOST_USERS.map((g) => [g.id, g]));

export function isGhost(id: string): boolean {
  return GHOST_MAP.has(id);
}

export type GhostMsg = {
  id: string;
  sender_id: string;
  content: string;
  created_at: string;
  status?: string;
  _local?: boolean;
};

export function loadGhostMessages(ghostId: string): GhostMsg[] {
  try {
    const raw = localStorage.getItem(`ghost_chat_${ghostId}`);
    return raw ? (JSON.parse(raw) as GhostMsg[]) : [];
  } catch {
    return [];
  }
}

export function saveGhostMessages(ghostId: string, msgs: GhostMsg[]): void {
  try {
    localStorage.setItem(`ghost_chat_${ghostId}`, JSON.stringify(msgs));
  } catch {
    // storage full or blocked — silently ignore
  }
}
