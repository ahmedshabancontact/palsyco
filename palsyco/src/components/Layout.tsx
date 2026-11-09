import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import {
  FileText,
  Hash,
  LayoutDashboard,
  Lock,
  LogIn,
  LogOut,
  Menu,
  MessagesSquare,
  Server,
  ShieldCheck,
  UserPlus,
  Users,
  Vote,
  Volume2,
  Wrench,
  X,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useDiscord } from '../lib/useDiscord';
import type { Overview, StatusResponse } from '../lib/types';
import { Avatar, LiveIndicator } from './ui';
import { JoinButton } from './discord';
import { fmtNum } from '../lib/format';

const groups = [
  {
    label: 'Server',
    items: [
      { to: '/', label: 'Home', icon: LayoutDashboard, end: true },
      { to: '/overview', label: 'Server Overview', icon: Server },
      { to: '/channels', label: 'Channels', icon: Hash },
      { to: '/voice', label: 'Voice Channels', icon: Volume2 },
    ],
  },
  {
    label: 'Community',
    items: [
      { to: '/members', label: 'Members', icon: Users },
      { to: '/polls', label: 'Voting & Polls', icon: Vote },
      { to: '/comments', label: 'Community Comments', icon: MessagesSquare },
    ],
  },
];

function Sidebar() {
  const { data: ov } = useDiscord<Overview>('overview', 60000);
  const { user, profile, isAdmin, signOut } = useAuth();
  const linkCls = ({ isActive }: { isActive: boolean }) =>
    `group flex items-center gap-3 px-3 py-2 rounded-lg text-[15px] transition-all ${
      isActive ? 'bg-blurple/15 text-fg nav-active' : 'text-muted hover:text-fg hover:bg-surface-2'
    }`;
  return (
    <div className="h-full flex flex-col bg-surface/95 border-r border-line backdrop-blur-xl">
      <Link to="/" className="flex items-center gap-3 p-4 border-b border-line">
        <div className="relative">
          {ov?.icon_url ? (
            <img src={ov.icon_url} alt="" className="w-11 h-11 rounded-2xl object-cover" />
          ) : (
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-blurple to-fuchsia" />
          )}
          <span className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-surface ${ov?.status === 'online' ? 'bg-online' : 'bg-offline'}`} />
        </div>
        <div className="min-w-0">
          <div className="font-display font-bold truncate leading-tight">{ov?.name || 'Loading server…'}</div>
          <div className="text-xs text-muted">
            {ov?.online_count != null ? `${fmtNum(ov.online_count)} online · ${fmtNum(ov.member_count)} members` : 'Discord community'}
          </div>
        </div>
      </Link>

      <nav className="flex-1 overflow-y-auto p-3 space-y-5">
        {groups.map((g) => (
          <div key={g.label}>
            <div className="px-3 mb-1.5 text-[11px] font-bold uppercase tracking-[0.18em] text-dim">{g.label}</div>
            <div className="space-y-0.5">
              {g.items.map((it) => (
                <NavLink key={it.to} to={it.to} end={it.end} className={linkCls}>
                  <it.icon className="w-[18px] h-[18px]" />
                  {it.label}
                </NavLink>
              ))}
            </div>
          </div>
        ))}
        <div>
          <div className="px-3 mb-1.5 text-[11px] font-bold uppercase tracking-[0.18em] text-dim">Account</div>
          <div className="space-y-0.5">
            {!user && (
              <>
                <NavLink to="/login" className={linkCls}>
                  <LogIn className="w-[18px] h-[18px]" /> Login
                </NavLink>
                <NavLink to="/register" className={linkCls}>
                  <UserPlus className="w-[18px] h-[18px]" /> Register
                </NavLink>
              </>
            )}
            {user && (
              <NavLink to="/admin" className={linkCls}>
                <ShieldCheck className="w-[18px] h-[18px]" /> Admin Dashboard
                {isAdmin && <span className="ml-auto text-[10px] px-1.5 py-0.5 rounded bg-fuchsia/20 text-fuchsia font-bold">ADMIN</span>}
              </NavLink>
            )}
            <NavLink to="/setup" className={linkCls}>
              <Wrench className="w-[18px] h-[18px]" /> Setup & Integration
            </NavLink>
          </div>
        </div>
      </nav>

      <div className="p-3 border-t border-line">
        {user ? (
          <div className="flex items-center gap-3 p-2 rounded-xl bg-surface-2">
            <Link to="/account" className="flex items-center gap-3 min-w-0 flex-1">
              <Avatar src={profile?.avatar_url} name={profile?.display_name || user.email} size={36} status="online" />
              <div className="min-w-0">
                <div className="text-sm font-semibold truncate">{profile?.display_name || 'Member'}</div>
                <div className="text-xs text-muted truncate">{profile?.discord_username ? `@${profile.discord_username}` : profile ? `@${profile.username}` : ''}</div>
              </div>
            </Link>
            <button onClick={signOut} className="p-2 rounded-lg text-muted hover:text-dnd hover:bg-surface-3" title="Sign out" aria-label="Sign out">
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <JoinButton className="w-full" />
        )}
      </div>
    </div>
  );
}

function Topbar({ onMenu }: { onMenu: () => void }) {
  const { data: st } = useDiscord<StatusResponse>('status', 120000);
  const connected = !!st?.invite.ok;
  return (
    <header className="sticky top-0 z-20 border-b border-line bg-bg/70 backdrop-blur-xl">
      <div className="flex items-center gap-3 px-4 sm:px-6 lg:px-10 h-16 max-w-[1400px] mx-auto">
        <button onClick={onMenu} className="lg:hidden p-2 -ml-2 rounded-lg hover:bg-surface-2" aria-label="Open menu">
          <Menu className="w-5 h-5" />
        </button>
        <Link to="/setup" className="hidden sm:flex items-center gap-3 px-3 py-1.5 rounded-full border border-line bg-surface/60 hover:border-blurple/40 transition">
          <LiveIndicator live={connected} label={st ? (connected ? 'Discord connected' : 'Discord unreachable') : 'Checking Discord…'} />
          {st && (
            <span className="text-xs text-dim border-l border-line pl-3">
              Bot {st.bot.ok ? 'online' : st.bot.configured ? 'error' : 'not set'} · Widget {st.widget.enabled ? 'on' : 'off'}
            </span>
          )}
        </Link>
        <div className="ml-auto">
          <JoinButton size="sm" />
        </div>
      </div>
    </header>
  );
}

export default function Layout() {
  const [open, setOpen] = useState(false);
  const loc = useLocation();
  useEffect(() => {
    setOpen(false);
    window.scrollTo({ top: 0 });
  }, [loc.pathname]);

  return (
    <div className="min-h-screen">
      <aside className={`fixed inset-y-0 left-0 z-40 w-72 transition-transform duration-300 lg:translate-x-0 ${open ? 'translate-x-0' : '-translate-x-full'}`}>
        <Sidebar />
        <button onClick={() => setOpen(false)} className="lg:hidden absolute top-4 -right-12 p-2 rounded-full bg-surface border border-line" aria-label="Close menu">
          <X className="w-5 h-5" />
        </button>
      </aside>
      {open && <div className="fixed inset-0 z-30 bg-black/60 lg:hidden" onClick={() => setOpen(false)} />}
      <div className="lg:pl-72 min-w-0">
        <Topbar onMenu={() => setOpen(true)} />
        <main className="px-4 sm:px-6 lg:px-10 py-8 max-w-[1400px] mx-auto">
          <Outlet />
        </main>
        <footer className="border-t border-line mt-16">
          <div className="px-4 sm:px-6 lg:px-10 py-8 max-w-[1400px] mx-auto flex flex-col sm:flex-row gap-4 justify-between text-sm text-muted">
            <p>Community site for our Discord server. Not affiliated with Discord Inc.</p>
            <div className="flex gap-5">
              <Link to="/privacy" className="hover:text-fg inline-flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5" /> Privacy
              </Link>
              <Link to="/terms" className="hover:text-fg inline-flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5" /> Terms
              </Link>
              <Link to="/setup" className="hover:text-fg inline-flex items-center gap-1.5">
                <Wrench className="w-3.5 h-3.5" /> Setup
              </Link>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
