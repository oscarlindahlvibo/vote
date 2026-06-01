import { useState, useEffect, useCallback } from 'react';
import {
  Truck,
  BarChart3,
  List,
  LogIn,
  LogOut,
  RefreshCw,
  Loader2,
  Trophy,
  User,
  Phone,
  Globe,
  Calendar,
  ChevronUp,
  ChevronDown,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { Vote, TruckTally } from '../lib/types';

const ADMIN_PASSWORD = 'truckmeet2025';

type SortKey = 'truck_number' | 'voter_name' | 'mobile_number' | 'created_at';
type SortDir = 'asc' | 'desc';
type Tab = 'summary' | 'individual';

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('sv-SE', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function AdminPage() {
  const [authed, setAuthed] = useState(false);
  const [password, setPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');

  const [tab, setTab] = useState<Tab>('summary');
  const [votes, setVotes] = useState<Vote[]>([]);
  const [loading, setLoading] = useState(false);

  const [sortKey, setSortKey] = useState<SortKey>('created_at');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  const login = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password === ADMIN_PASSWORD) {
      // Sign in with a service session via anon key — we'll use service role via RLS bypass
      // For simplicity, use a shared admin credential stored in Supabase Auth
      const { error } = await supabase.auth.signInWithPassword({
        email: 'admin@truckmeet.local',
        password: ADMIN_PASSWORD,
      });
      if (error) {
        // Fallback: try to create the admin user first
        await supabase.auth.signUp({
          email: 'admin@truckmeet.local',
          password: ADMIN_PASSWORD,
        });
        const { error: retryError } = await supabase.auth.signInWithPassword({
          email: 'admin@truckmeet.local',
          password: ADMIN_PASSWORD,
        });
        if (retryError) {
          setPasswordError('Inloggning misslyckades. Kontakta teknisk support.');
          return;
        }
      }
      setAuthed(true);
      setPasswordError('');
    } else {
      setPasswordError('Fel lösenord.');
    }
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setAuthed(false);
    setPassword('');
    setVotes([]);
  };

  const fetchVotes = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('votes')
      .select('*')
      .order('created_at', { ascending: false });
    if (!error && data) setVotes(data as Vote[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (authed) fetchVotes();
  }, [authed, fetchVotes]);

  // Tally
  const tally: TruckTally[] = Object.values(
    votes.reduce<Record<number, TruckTally>>((acc, v) => {
      if (!acc[v.truck_number]) acc[v.truck_number] = { truck_number: v.truck_number, vote_count: 0 };
      acc[v.truck_number].vote_count++;
      return acc;
    }, {})
  ).sort((a, b) => b.vote_count - a.vote_count);

  const maxVotes = tally[0]?.vote_count ?? 1;

  // Sorted individual votes
  const sortedVotes = [...votes].sort((a, b) => {
    const av = a[sortKey];
    const bv = b[sortKey];
    const cmp = typeof av === 'number'
      ? (av as number) - (bv as number)
      : String(av).localeCompare(String(bv), 'sv');
    return sortDir === 'asc' ? cmp : -cmp;
  });

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortKey(key); setSortDir('asc'); }
  }

  function SortIcon({ k }: { k: SortKey }) {
    if (sortKey !== k) return <ChevronUp className="w-3.5 h-3.5 text-zinc-600" />;
    return sortDir === 'asc'
      ? <ChevronUp className="w-3.5 h-3.5 text-amber-400" />
      : <ChevronDown className="w-3.5 h-3.5 text-amber-400" />;
  }

  if (!authed) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
        <div className="w-full max-w-sm">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-xl bg-amber-500 mb-4">
              <Truck className="w-7 h-7 text-zinc-950" />
            </div>
            <h1 className="text-2xl font-black text-white">Adminpanel</h1>
            <p className="text-zinc-500 text-sm mt-1">Åseda Truckmeet — Publikens Val</p>
          </div>
          <form onSubmit={login} className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
            <label className="block text-zinc-300 text-sm font-semibold mb-2">Lösenord</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Ange adminlösenord"
              className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-white placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all mb-4"
            />
            {passwordError && (
              <p className="text-red-400 text-sm mb-4">{passwordError}</p>
            )}
            <button
              type="submit"
              className="w-full bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2"
            >
              <LogIn className="w-4 h-4" />
              Logga in
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col">
      {/* Header */}
      <header className="border-b border-zinc-800 bg-zinc-900/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-amber-500 flex items-center justify-center flex-shrink-0">
              <Truck className="w-4 h-4 text-zinc-950" />
            </div>
            <div>
              <h1 className="text-white font-bold text-sm leading-tight">Adminpanel</h1>
              <p className="text-zinc-500 text-xs">Åseda Truckmeet</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden sm:block text-zinc-500 text-xs">
              {votes.length} röst{votes.length !== 1 ? 'er' : ''}
            </span>
            <button
              onClick={fetchVotes}
              disabled={loading}
              className="flex items-center gap-1.5 text-zinc-400 hover:text-white text-xs border border-zinc-800 hover:border-zinc-700 px-3 py-1.5 rounded-lg transition-all"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              Uppdatera
            </button>
            <button
              onClick={logout}
              className="flex items-center gap-1.5 text-zinc-400 hover:text-white text-xs border border-zinc-800 hover:border-zinc-700 px-3 py-1.5 rounded-lg transition-all"
            >
              <LogOut className="w-3.5 h-3.5" />
              Logga ut
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 py-6 w-full flex-1">
        {/* Stats bar */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
            <p className="text-zinc-500 text-xs font-medium uppercase tracking-wide mb-1">Totalt röster</p>
            <p className="text-3xl font-black text-white">{votes.length}</p>
          </div>
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
            <p className="text-zinc-500 text-xs font-medium uppercase tracking-wide mb-1">Antal lastbilar</p>
            <p className="text-3xl font-black text-white">{tally.length}</p>
          </div>
          {tally[0] && (
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 col-span-2 sm:col-span-1">
              <p className="text-amber-400/70 text-xs font-medium uppercase tracking-wide mb-1">Ledare</p>
              <p className="text-3xl font-black text-amber-400">#{tally[0].truck_number}</p>
              <p className="text-amber-400/60 text-xs">{tally[0].vote_count} röst{tally[0].vote_count !== 1 ? 'er' : ''}</p>
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-zinc-900 border border-zinc-800 rounded-xl p-1 mb-6 w-fit">
          <button
            onClick={() => setTab('summary')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
              tab === 'summary'
                ? 'bg-amber-500 text-zinc-950'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            Sammanfattning
          </button>
          <button
            onClick={() => setTab('individual')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
              tab === 'individual'
                ? 'bg-amber-500 text-zinc-950'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <List className="w-4 h-4" />
            Individuella svar
          </button>
        </div>

        {loading && votes.length === 0 ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="w-8 h-8 text-amber-400 animate-spin" />
          </div>
        ) : tab === 'summary' ? (
          <SummaryTab tally={tally} maxVotes={maxVotes} />
        ) : (
          <IndividualTab
            votes={sortedVotes}
            sortKey={sortKey}
            sortDir={sortDir}
            toggleSort={toggleSort}
            SortIcon={SortIcon}
          />
        )}
      </div>
    </div>
  );
}

function SummaryTab({ tally, maxVotes }: { tally: TruckTally[]; maxVotes: number }) {
  if (tally.length === 0) {
    return (
      <div className="text-center py-20 text-zinc-600">
        <Truck className="w-10 h-10 mx-auto mb-3 opacity-30" />
        <p>Inga röster registrerade ännu.</p>
      </div>
    );
  }

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
      <div className="px-4 py-3 border-b border-zinc-800 flex items-center gap-2">
        <Trophy className="w-4 h-4 text-amber-400" />
        <span className="text-white font-semibold text-sm">Röster per lastbil</span>
      </div>
      <div className="divide-y divide-zinc-800/50">
        {tally.map((t, i) => {
          const pct = Math.round((t.vote_count / maxVotes) * 100);
          return (
            <div key={t.truck_number} className="px-4 py-3 flex items-center gap-4">
              <div className="w-6 text-center">
                {i === 0 ? (
                  <span className="text-amber-400 font-black text-sm">1</span>
                ) : (
                  <span className="text-zinc-600 text-sm">{i + 1}</span>
                )}
              </div>
              <div className="w-16 flex-shrink-0">
                <span className={`font-black text-base ${i === 0 ? 'text-amber-400' : 'text-white'}`}>
                  #{t.truck_number}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-700 ${i === 0 ? 'bg-amber-400' : 'bg-zinc-600'}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
              <div className="w-16 text-right flex-shrink-0">
                <span className={`font-bold text-sm ${i === 0 ? 'text-amber-400' : 'text-white'}`}>
                  {t.vote_count}
                </span>
                <span className="text-zinc-600 text-xs ml-1">röst{t.vote_count !== 1 ? 'er' : ''}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function IndividualTab({
  votes,
  sortKey,
  sortDir,
  toggleSort,
  SortIcon,
}: {
  votes: Vote[];
  sortKey: SortKey;
  sortDir: SortDir;
  toggleSort: (k: SortKey) => void;
  SortIcon: React.FC<{ k: SortKey }>;
}) {
  if (votes.length === 0) {
    return (
      <div className="text-center py-20 text-zinc-600">
        <List className="w-10 h-10 mx-auto mb-3 opacity-30" />
        <p>Inga röster registrerade ännu.</p>
      </div>
    );
  }

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
      {/* Desktop table */}
      <div className="hidden sm:block overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-800 text-zinc-500 text-xs uppercase tracking-wide">
              {(
                [
                  { key: 'truck_number' as SortKey, label: 'Lastbil', icon: Truck },
                  { key: 'voter_name' as SortKey, label: 'Namn', icon: User },
                  { key: 'mobile_number' as SortKey, label: 'Mobil', icon: Phone },
                  { key: 'created_at' as SortKey, label: 'Tid', icon: Calendar },
                ] as const
              ).map(({ key, label, icon: Icon }) => (
                <th
                  key={key}
                  className="px-4 py-3 text-left cursor-pointer hover:text-zinc-300 transition-colors"
                  onClick={() => toggleSort(key)}
                >
                  <div className="flex items-center gap-1.5">
                    <Icon className="w-3.5 h-3.5" />
                    {label}
                    <SortIcon k={key} />
                  </div>
                </th>
              ))}
              <th className="px-4 py-3 text-left">
                <div className="flex items-center gap-1.5">
                  <Globe className="w-3.5 h-3.5" />
                  IP-adress
                </div>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800/50">
            {votes.map((v) => (
              <tr key={v.id} className="hover:bg-zinc-800/30 transition-colors">
                <td className="px-4 py-3 font-bold text-amber-400">#{v.truck_number}</td>
                <td className="px-4 py-3 text-white">{v.voter_name}</td>
                <td className="px-4 py-3 text-zinc-300 font-mono text-xs">{v.mobile_number}</td>
                <td className="px-4 py-3 text-zinc-400 text-xs">{formatDate(v.created_at)}</td>
                <td className="px-4 py-3 text-zinc-500 font-mono text-xs">{v.ip_address}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile list */}
      <div className="sm:hidden divide-y divide-zinc-800/50">
        {votes.map((v) => (
          <div key={v.id} className="px-4 py-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-amber-400 font-black text-lg">#{v.truck_number}</span>
              <span className="text-zinc-500 text-xs">{formatDate(v.created_at)}</span>
            </div>
            <p className="text-white font-semibold text-sm">{v.voter_name}</p>
            <p className="text-zinc-400 font-mono text-xs mt-0.5">{v.mobile_number}</p>
            <p className="text-zinc-600 font-mono text-xs mt-0.5">{v.ip_address}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
