import { supabase } from './supabase';

export interface FriendRow {
  id: string;
  otherId: string;
  name: string;
  status: 'pending' | 'accepted';
  incoming: boolean;
}

export interface BoardRow {
  userId: string;
  name: string;
  minutes: number;
  isMe: boolean;
}

function client() {
  if (!supabase) throw new Error('Accounts are not set up in this build.');
  return supabase;
}

export async function myInviteCode(userId: string): Promise<string> {
  const { data, error } = await client().from('profiles').select('invite_code').eq('id', userId).single();
  if (error) throw error;
  return data.invite_code as string;
}

export async function sendFriendRequest(code: string): Promise<'sent' | 'not_found' | 'self'> {
  const { data, error } = await client().rpc('send_friend_request', { code: code.trim() });
  if (error) throw error;
  return data as 'sent' | 'not_found' | 'self';
}

export async function listFriends(userId: string): Promise<FriendRow[]> {
  const c = client();
  const { data, error } = await c.from('friendships').select('id, requester_id, recipient_id, status');
  if (error) throw error;
  const others = data.map((f) => (f.requester_id === userId ? f.recipient_id : f.requester_id) as string);
  const { data: profiles } = others.length
    ? await c.from('profiles').select('id, display_name').in('id', others)
    : { data: [] as { id: string; display_name: string }[] };
  const names = new Map((profiles ?? []).map((p) => [p.id, p.display_name || 'A friend']));
  return data.map((f, i) => ({
    id: f.id as string,
    otherId: others[i],
    name: names.get(others[i]) ?? 'A friend',
    status: f.status as FriendRow['status'],
    incoming: f.recipient_id === userId,
  }));
}

export async function acceptFriend(id: string) {
  const { error } = await client().from('friendships').update({ status: 'accepted' }).eq('id', id);
  if (error) throw error;
}

export async function removeFriend(id: string) {
  const { error } = await client().from('friendships').delete().eq('id', id);
  if (error) throw error;
}

export async function weeklyLeaderboard(weekStartKey: string): Promise<BoardRow[]> {
  const { data, error } = await client().rpc('weekly_leaderboard', { week_start: weekStartKey });
  if (error) throw error;
  return (data as { user_id: string; display_name: string; minutes: number; is_me: boolean }[]).map((r) => ({
    userId: r.user_id,
    name: r.is_me ? 'You' : r.display_name || 'A friend',
    minutes: Number(r.minutes),
    isMe: r.is_me,
  }));
}
