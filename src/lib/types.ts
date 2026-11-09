export type Overview = {
  id: string;
  name: string;
  description: string | null;
  icon_url: string | null;
  banner_url: string | null;
  splash_url: string | null;
  created_at: string | null;
  features: string[];
  verification_level: number | null;
  premium_tier: number;
  boosts: number;
  vanity_url_code: string | null;
  member_count: number | null;
  online_count: number | null;
  offline_count: number | null;
  counts_source: string;
  text_channels: number | null;
  voice_channels: number | null;
  categories: number | null;
  channels_source: string;
  voice_connected: number | null;
  voice_source: string;
  status: 'online' | 'unreachable' | 'unknown';
  status_detail: string | null;
  invite: { code: string; url: string; channel: string | null; inviter: string | null; expires_at: string | null };
  widget_enabled: boolean;
  bot_connected: boolean;
  updated_at: string;
};

export type ChannelKind = 'text' | 'voice' | 'announcement' | 'stage' | 'forum' | 'media' | 'category';

export type Channel = {
  id: string;
  name: string;
  kind: ChannelKind;
  topic: string | null;
  nsfw: boolean;
  position: number;
  parent_id: string | null;
  user_limit: number;
  rate_limit: number;
};

export type ChannelsResponse = {
  source: 'bot' | 'widget' | 'none';
  groups: { id: string; name: string | null; channels: Channel[] }[];
  hidden_private: number;
  error: string | null;
};

export type VoiceMember = {
  id: string;
  channel_id: string;
  username: string | null;
  display_name: string;
  avatar_url: string;
  self_mute: boolean;
  self_deaf: boolean;
  streaming: boolean;
  video: boolean;
};

export type VoiceChannel = {
  id: string;
  name: string;
  kind: string;
  position: number;
  category: string | null;
  user_limit: number;
  members: VoiceMember[];
};

export type VoiceResponse = {
  source: 'sync-bot' | 'widget' | 'bot-rest' | 'none';
  partial: boolean;
  available: boolean;
  channels_source: string;
  channels: VoiceChannel[];
  total_connected: number;
  updated_at: string;
};

export type Role = { id: string; name: string; color: string | null };

export type Member = {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string;
  bot: boolean;
  joined_at: string | null;
  status: 'online' | 'idle' | 'dnd' | 'offline' | null;
  roles: Role[];
  top_role: Role | null;
  voice_channel: string | null;
  activity?: string | null;
};

export type WebsiteProfile = {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  discord_id: string | null;
  discord_username: string | null;
  created_at: string;
};

export type MembersResponse = {
  disabled?: boolean;
  source: 'bot' | 'widget' | 'none';
  presence_source?: string;
  members: Member[];
  website_profiles: WebsiteProfile[];
  roles: Role[];
  total: number | null;
  online: number | null;
  error?: string | null;
};

export type StatusResponse = {
  guild_id: string;
  invite: { ok: boolean; error: string | null; code: string };
  widget: { enabled: boolean; error: string | null };
  bot: { configured: boolean; ok: boolean; error: string | null; channels_ok: boolean; members_ok: boolean; members_error: string | null };
  sync: { configured: boolean; last_update: string | null; live: boolean };
  oauth: { configured: boolean };
  checked_at: string;
};

export type Profile = {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  discord_id: string | null;
  discord_username: string | null;
  provider: string;
  show_in_directory: boolean;
  banned: boolean;
  created_at: string;
};

export type PollOption = { id: number; label: string; votes: number };
export type Poll = {
  id: number;
  title: string;
  description: string | null;
  starts_at: string | null;
  ends_at: string | null;
  is_closed: boolean;
  created_at: string;
  author: { display_name: string; avatar_url: string | null } | null;
  status: 'active' | 'upcoming' | 'closed';
  total_votes: number;
  my_vote: number | null;
  options: PollOption[];
};

export type CommentT = {
  id: number;
  parent_id: number | null;
  body: string;
  is_hidden: boolean;
  created_at: string;
  edited_at: string | null;
  user_id: string;
  author: (Pick<Profile, 'id' | 'username' | 'display_name' | 'avatar_url' | 'discord_username' | 'provider'> & { is_admin: boolean }) | null;
  like_count: number;
  liked_by_me: boolean;
  reported_by_me: boolean;
  is_mine: boolean;
};

export type Settings = {
  directory_enabled: boolean;
  show_roles: boolean;
  show_bots: boolean;
  show_voice: boolean;
  show_website_profiles: boolean;
  comments_enabled: boolean;
};
