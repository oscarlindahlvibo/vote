import { useState, useEffect, useCallback } from 'react';
import {
  Truck,
  BarChart3,
  List,
  LogIn,
  LogOut,
  Mail,
  RefreshCw,
  Loader2,
  Trophy,
  User,
  Phone,
  Globe,
  Calendar,
  ArrowLeft,
  ChevronUp,
  ChevronDown,
  AlertTriangle,
  KeyRound,
  Settings,
  Trash2,
  UserPlus,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { Vote, TruckTally } from '../lib/types';

type SortKey = 'truck_number' | 'voter_name' | 'mobile_number' | 'created_at';
type SortDir = 'asc' | 'desc';
type Tab = 'summary' | 'individual' | 'settings';
type IpAlert = { ip_address: string; vote_count: number; truck_numbers: number[]; votes: Vote[] };
type TruckIpGroup = { ip_address: string; votes: Vote[] };

const LOCAL_ADMIN_ENABLED =
  import.meta.env.DEV && import.meta.env.VITE_ENABLE_LOCAL_ADMIN === 'true';
const LOCAL_ADMIN_EMAIL = import.meta.env.VITE_LOCAL_ADMIN_EMAIL as string | undefined;
const LOCAL_ADMIN_PASSWORD = import.meta.env.VITE_LOCAL_ADMIN_PASSWORD as string | undefined;

function getAdminRedirectUrl() {
  return `${window.location.origin}/admin`;
}

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
  const [authChecked, setAuthChecked] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [loginError, setLoginError] = useState('');
  const [setupMessage, setSetupMessage] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [localAdmin, setLocalAdmin] = useState(false);
  const [hasAdminUsers, setHasAdminUsers] = useState<boolean | null>(null);

  const [tab, setTab] = useState<Tab>('summary');
  const [votes, setVotes] = useState<Vote[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [createAdminLoading, setCreateAdminLoading] = useState(false);
  const [createAdminMessage, setCreateAdminMessage] = useState('');
  const [createAdminError, setCreateAdminError] = useState('');
  const [newAdminEmail, setNewAdminEmail] = useState('');
  const [resetPassword, setResetPassword] = useState('');
  const [resetConfirmText, setResetConfirmText] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [resetMessage, setResetMessage] = useState('');
  const [resetError, setResetError] = useState('');
  const [selectedTruckNumber, setSelectedTruckNumber] = useState<number | null>(null);

  const [sortKey, setSortKey] = useState<SortKey>('created_at');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  useEffect(() => {
    let mounted = true;

    supabase.rpc('vote_has_admins').then(({ data }) => {
      if (!mounted) return;
      setHasAdminUsers(Boolean(data));
    });

    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      const userEmail = data.session?.user.email ?? '';
      setAuthed(Boolean(data.session));
      setAdminEmail(userEmail);
      setAuthChecked(true);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      const userEmail = session?.user.email ?? '';
      setAuthed(Boolean(session));
      setAdminEmail(userEmail);
      setAuthChecked(true);
    });

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  const login = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthLoading(true);
    setLoginError('');

    if (
      LOCAL_ADMIN_ENABLED &&
      email.trim() === LOCAL_ADMIN_EMAIL &&
      password === LOCAL_ADMIN_PASSWORD
    ) {
      setLocalAdmin(true);
      setAuthed(true);
      setAdminEmail(email.trim());
      setAuthLoading(false);
      return;
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (error) {
      setLoginError('Inloggning misslyckades. Kontrollera e-post och lösenord.');
    } else if (hasAdminUsers === false && data.user.email) {
      const { error: adminError } = await supabase.from('vote_admin_users').insert({
        email: data.user.email.toLowerCase(),
        created_by: data.user.id,
      });

      if (adminError) {
        setLoginError('Du är inloggad, men första adminrollen kunde inte skapas.');
      } else {
        setHasAdminUsers(true);
        setAdminEmail(data.user.email);
      }
    }

    setAuthLoading(false);
  };

  const createFirstAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthLoading(true);
    setLoginError('');
    setSetupMessage('');

    if (hasAdminUsers) {
      setLoginError('Första admin är redan skapad.');
      setAuthLoading(false);
      return;
    }

    if (password.length < 8) {
      setLoginError('Lösenordet måste vara minst 8 tecken.');
      setAuthLoading(false);
      return;
    }

    const normalizedEmail = email.trim().toLowerCase();
    let sessionUserId = '';

    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email: normalizedEmail,
      password,
      options: {
        emailRedirectTo: getAdminRedirectUrl(),
      },
    });

    if (signUpError) {
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password,
      });

      if (signInError) {
        setLoginError('Kunde inte skapa första admin. Kontrollera e-post och lösenord.');
        setAuthLoading(false);
        return;
      }

      sessionUserId = signInData.user.id;
    } else if (signUpData.session && signUpData.user) {
      sessionUserId = signUpData.user.id;
    } else {
      setSetupMessage('Kontot är skapat. Ange verifieringskoden från mejlet här nedan.');
      setAuthLoading(false);
      return;
    }

    const { error: adminError } = await supabase.from('vote_admin_users').insert({
      email: normalizedEmail,
      created_by: sessionUserId,
    });

    if (adminError) {
      setLoginError('Kontot skapades, men kunde inte göras till admin. Försök logga in och skapa första admin igen.');
    } else {
      setHasAdminUsers(true);
      setAuthed(true);
      setAdminEmail(normalizedEmail);
      setSetupMessage('');
    }

    setAuthLoading(false);
  };

  const verifyEmailCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthLoading(true);
    setLoginError('');
    setSetupMessage('');

    const normalizedEmail = email.trim().toLowerCase();
    const cleanedCode = verificationCode.trim().replace(/\s+/g, '');

    if (!normalizedEmail || !cleanedCode) {
      setLoginError('Ange e-post och verifieringskod.');
      setAuthLoading(false);
      return;
    }

    const { data, error } = await supabase.auth.verifyOtp({
      email: normalizedEmail,
      token: cleanedCode,
      type: 'signup',
    });

    if (error || !data.user) {
      setLoginError('Koden kunde inte verifieras. Kontrollera koden eller skicka en ny.');
      setAuthLoading(false);
      return;
    }

    if (hasAdminUsers === false && data.user.email) {
      const { error: adminError } = await supabase.from('vote_admin_users').insert({
        email: data.user.email.toLowerCase(),
        created_by: data.user.id,
      });

      if (adminError) {
        setLoginError('E-postadressen verifierades, men första adminrollen kunde inte skapas.');
      } else {
        setHasAdminUsers(true);
        setAuthed(true);
        setAdminEmail(data.user.email);
        setVerificationCode('');
      }
    } else {
      setAuthed(true);
      setAdminEmail(data.user.email ?? normalizedEmail);
      setVerificationCode('');
    }

    setAuthLoading(false);
  };

  const resendVerificationCode = async () => {
    setAuthLoading(true);
    setLoginError('');
    setSetupMessage('');

    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedEmail) {
      setLoginError('Ange e-postadress först.');
      setAuthLoading(false);
      return;
    }

    const { error } = await supabase.auth.resend({
      type: 'signup',
      email: normalizedEmail,
      options: {
        emailRedirectTo: getAdminRedirectUrl(),
      },
    });

    if (error) {
      setLoginError('Kunde inte skicka ny verifieringskod.');
    } else {
      setSetupMessage('Ny verifieringskod skickad.');
    }

    setAuthLoading(false);
  };

  const logout = async () => {
    if (!localAdmin) {
      await supabase.auth.signOut();
    }
    setAuthed(false);
    setLocalAdmin(false);
    setEmail('');
    setPassword('');
    setAdminEmail('');
    setVotes([]);
  };

  const changePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordLoading(true);
    setPasswordMessage('');
    setPasswordError('');

    if (localAdmin) {
      setPasswordError('Det lokala förhandsvisningskontot kan inte byta lösenord.');
      setPasswordLoading(false);
      return;
    }

    if (newPassword.length < 8) {
      setPasswordError('Lösenordet måste vara minst 8 tecken.');
      setPasswordLoading(false);
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError('Lösenorden matchar inte.');
      setPasswordLoading(false);
      return;
    }

    const { error } = await supabase.auth.updateUser({ password: newPassword });

    if (error) {
      setPasswordError('Kunde inte byta lösenord. Försök igen.');
    } else {
      setPasswordMessage('Lösenordet är uppdaterat.');
      setNewPassword('');
      setConfirmPassword('');
    }

    setPasswordLoading(false);
  };

  const createAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateAdminLoading(true);
    setCreateAdminMessage('');
    setCreateAdminError('');

    if (localAdmin) {
      setCreateAdminError('Det lokala förhandsvisningskontot kan inte skapa riktiga användare.');
      setCreateAdminLoading(false);
      return;
    }

    const normalizedEmail = newAdminEmail.trim().toLowerCase();
    const { error } = await supabase.from('vote_admin_users').insert({
      email: normalizedEmail,
    });

    if (error) {
      setCreateAdminError('Kunde inte lägga till admin. Finns e-postadressen redan?');
    } else {
      setCreateAdminMessage(`${normalizedEmail} kan nu skapa konto eller logga in som admin.`);
      setNewAdminEmail('');
    }

    setCreateAdminLoading(false);
  };

  const resetVotes = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetLoading(true);
    setResetMessage('');
    setResetError('');

    if (localAdmin) {
      setResetError('Det lokala förhandsvisningskontot kan inte återställa riktiga röster.');
      setResetLoading(false);
      return;
    }

    if (!adminEmail || !resetPassword) {
      setResetError('Ange adminlösenordet.');
      setResetLoading(false);
      return;
    }

    if (resetConfirmText.trim().toUpperCase() !== 'NOLLSTALL') {
      setResetError('Skriv NOLLSTALL för att bekräfta.');
      setResetLoading(false);
      return;
    }

    const { error: passwordError } = await supabase.auth.signInWithPassword({
      email: adminEmail,
      password: resetPassword,
    });

    if (passwordError) {
      setResetError('Lösenordet stämmer inte.');
      setResetLoading(false);
      return;
    }

    const { error } = await supabase
      .from('votes')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000');

    if (error) {
      setResetError('Kunde inte återställa rösterna.');
    } else {
      setVotes([]);
      setResetPassword('');
      setResetConfirmText('');
      setResetMessage('Rösträknaren och IP-larmen är återställda.');
    }

    setResetLoading(false);
  };

  const fetchVotes = useCallback(async () => {
    setLoading(true);
    setLoadError('');

    if (localAdmin) {
      setVotes([]);
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from('votes')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) {
      setLoadError('Kunde inte hämta röster. Kontrollera att kontot har adminbehörighet.');
    } else if (data) {
      setVotes(data as Vote[]);
    }
    setLoading(false);
  }, [localAdmin]);

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

  const ipAlerts: IpAlert[] = Object.values(
    votes.reduce<Record<string, IpAlert>>((acc, vote) => {
      const ip = vote.ip_address || 'unknown';
      if (!acc[ip]) {
        acc[ip] = { ip_address: ip, vote_count: 0, truck_numbers: [], votes: [] };
      }
      acc[ip].vote_count++;
      acc[ip].votes.push(vote);
      if (!acc[ip].truck_numbers.includes(vote.truck_number)) {
        acc[ip].truck_numbers.push(vote.truck_number);
      }
      return acc;
    }, {})
  )
    .map((alert) => ({
      ...alert,
      truck_numbers: [...alert.truck_numbers].sort((a, b) => a - b),
      votes: [...alert.votes].sort((a, b) => {
        const truckCmp = a.truck_number - b.truck_number;
        if (truckCmp !== 0) return truckCmp;
        return String(b.created_at).localeCompare(String(a.created_at));
      }),
    }))
    .filter((alert) => alert.vote_count > 1)
    .sort((a, b) => {
      const truckCmp = (a.truck_numbers[0] ?? 0) - (b.truck_numbers[0] ?? 0);
      if (truckCmp !== 0) return truckCmp;
      return b.vote_count - a.vote_count;
    });

  const selectedTruckVotes = selectedTruckNumber
    ? votes
        .filter((vote) => vote.truck_number === selectedTruckNumber)
        .sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)))
    : [];

  const selectedTruckIpGroups: TruckIpGroup[] = Object.values(
    selectedTruckVotes.reduce<Record<string, TruckIpGroup>>((acc, vote) => {
      const ip = vote.ip_address || 'unknown';
      if (!acc[ip]) acc[ip] = { ip_address: ip, votes: [] };
      acc[ip].votes.push(vote);
      return acc;
    }, {})
  ).sort((a, b) => {
    const countCmp = b.votes.length - a.votes.length;
    if (countCmp !== 0) return countCmp;
    return a.ip_address.localeCompare(b.ip_address);
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

  if (!authChecked) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
        <Loader2 className="w-8 h-8 text-amber-400 animate-spin" />
      </div>
    );
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
            <label className="block text-zinc-300 text-sm font-semibold mb-2">E-post</label>
            <div className="relative mb-4">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
              <input
                type="email"
                autoComplete="username"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@example.com"
                className="w-full bg-zinc-800 border border-zinc-700 rounded-xl pl-10 pr-4 py-3 text-white placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all"
              />
            </div>

            <label className="block text-zinc-300 text-sm font-semibold mb-2">Lösenord</label>
            <input
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Ange lösenord"
              className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-white placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all mb-4"
            />
            {loginError && (
              <p className="text-red-400 text-sm mb-4">{loginError}</p>
            )}
            {setupMessage && (
              <p className="text-emerald-400 text-sm mb-4">{setupMessage}</p>
            )}

            <div className="border-t border-zinc-800 pt-4 mb-4">
              <label className="block text-zinc-300 text-sm font-semibold mb-2">
                Verifieringskod
              </label>
              <input
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value)}
                placeholder="Koden från mejlet"
                className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-white placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all mb-3"
              />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={verifyEmailCode}
                  disabled={authLoading}
                  className="border border-emerald-500/40 hover:border-emerald-400 text-emerald-300 hover:text-emerald-200 font-bold py-2.5 rounded-xl transition-all"
                >
                  Verifiera kod
                </button>
                <button
                  type="button"
                  onClick={resendVerificationCode}
                  disabled={authLoading}
                  className="border border-zinc-700 hover:border-zinc-600 text-zinc-300 hover:text-white font-bold py-2.5 rounded-xl transition-all"
                >
                  Skicka ny kod
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={authLoading}
              className="w-full bg-amber-500 hover:bg-amber-400 disabled:bg-amber-500/50 disabled:cursor-not-allowed text-zinc-950 font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2"
            >
              {authLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Loggar in...
                </>
              ) : (
                <>
                  <LogIn className="w-4 h-4" />
                  Logga in
                </>
              )}
            </button>
            {hasAdminUsers === false && (
              <button
                type="button"
                onClick={(e) => createFirstAdmin(e)}
                disabled={authLoading}
                className="w-full mt-3 border border-amber-500/40 hover:border-amber-400 text-amber-300 hover:text-amber-200 font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2"
              >
                <UserPlus className="w-4 h-4" />
                Skapa första admin
              </button>
            )}
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
            {adminEmail && (
              <span className="hidden md:block text-zinc-600 text-xs max-w-48 truncate">
                {adminEmail}
              </span>
            )}
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

        {ipAlerts.length > 0 && (
          <IpAlertPanel alerts={ipAlerts} />
        )}

        {selectedTruckNumber !== null && (
          <TruckVoteDetail
            truckNumber={selectedTruckNumber}
            groups={selectedTruckIpGroups}
            onClose={() => setSelectedTruckNumber(null)}
          />
        )}

        {/* Tabs */}
        <div className="flex gap-1 bg-zinc-900 border border-zinc-800 rounded-xl p-1 mb-6 max-w-full overflow-x-auto w-fit">
          <button
            onClick={() => setTab('summary')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold whitespace-nowrap transition-all ${
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
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold whitespace-nowrap transition-all ${
              tab === 'individual'
                ? 'bg-amber-500 text-zinc-950'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <List className="w-4 h-4" />
            Individuella svar
          </button>
          <button
            onClick={() => setTab('settings')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold whitespace-nowrap transition-all ${
              tab === 'settings'
                ? 'bg-amber-500 text-zinc-950'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Settings className="w-4 h-4" />
            Inställningar
          </button>
        </div>

        {tab === 'settings' ? (
          <SettingsTab
            adminEmail={adminEmail}
            localAdmin={localAdmin}
            newPassword={newPassword}
            confirmPassword={confirmPassword}
            passwordLoading={passwordLoading}
            passwordMessage={passwordMessage}
            passwordError={passwordError}
            newAdminEmail={newAdminEmail}
            createAdminLoading={createAdminLoading}
            createAdminMessage={createAdminMessage}
            createAdminError={createAdminError}
            voteCount={votes.length}
            resetPassword={resetPassword}
            resetConfirmText={resetConfirmText}
            resetLoading={resetLoading}
            resetMessage={resetMessage}
            resetError={resetError}
            setNewPassword={setNewPassword}
            setConfirmPassword={setConfirmPassword}
            setNewAdminEmail={setNewAdminEmail}
            setResetPassword={setResetPassword}
            setResetConfirmText={setResetConfirmText}
            changePassword={changePassword}
            createAdmin={createAdmin}
            resetVotes={resetVotes}
          />
        ) : loading && votes.length === 0 ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="w-8 h-8 text-amber-400 animate-spin" />
          </div>
        ) : loadError ? (
          <div className="bg-red-950/50 border border-red-900/50 rounded-xl p-4 text-red-300 text-sm">
            {loadError}
          </div>
        ) : tab === 'summary' ? (
          <SummaryTab
            tally={tally}
            maxVotes={maxVotes}
            onSelectTruck={setSelectedTruckNumber}
          />
        ) : (
          <IndividualTab
            votes={sortedVotes}
            toggleSort={toggleSort}
            SortIcon={SortIcon}
            onSelectTruck={setSelectedTruckNumber}
          />
        )}
      </div>
    </div>
  );
}

function SettingsTab({
  adminEmail,
  localAdmin,
  newPassword,
  confirmPassword,
  passwordLoading,
  passwordMessage,
  passwordError,
  newAdminEmail,
  createAdminLoading,
  createAdminMessage,
  createAdminError,
  voteCount,
  resetPassword,
  resetConfirmText,
  resetLoading,
  resetMessage,
  resetError,
  setNewPassword,
  setConfirmPassword,
  setNewAdminEmail,
  setResetPassword,
  setResetConfirmText,
  changePassword,
  createAdmin,
  resetVotes,
}: {
  adminEmail: string;
  localAdmin: boolean;
  newPassword: string;
  confirmPassword: string;
  passwordLoading: boolean;
  passwordMessage: string;
  passwordError: string;
  newAdminEmail: string;
  createAdminLoading: boolean;
  createAdminMessage: string;
  createAdminError: string;
  voteCount: number;
  resetPassword: string;
  resetConfirmText: string;
  resetLoading: boolean;
  resetMessage: string;
  resetError: string;
  setNewPassword: (value: string) => void;
  setConfirmPassword: (value: string) => void;
  setNewAdminEmail: (value: string) => void;
  setResetPassword: (value: string) => void;
  setResetConfirmText: (value: string) => void;
  changePassword: (e: React.FormEvent) => void;
  createAdmin: (e: React.FormEvent) => void;
  resetVotes: (e: React.FormEvent) => void;
}) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {localAdmin && (
        <div className="lg:col-span-2 bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 text-amber-200 text-sm">
          Du är inloggad med ett lokalt förhandsvisningskonto. Lösenordsbyte och användarskapande fungerar när appen körs mot riktig Supabase.
        </div>
      )}

      <form onSubmit={changePassword} className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
        <div className="flex items-center gap-2 mb-5">
          <KeyRound className="w-4 h-4 text-amber-400" />
          <h2 className="text-white font-bold text-base">Byt lösenord</h2>
        </div>
        <p className="text-zinc-500 text-xs mb-4">{adminEmail}</p>

        <label className="block text-zinc-300 text-sm font-semibold mb-2">Nytt lösenord</label>
        <input
          type="password"
          autoComplete="new-password"
          minLength={8}
          required
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-white placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all mb-4"
        />

        <label className="block text-zinc-300 text-sm font-semibold mb-2">Bekräfta lösenord</label>
        <input
          type="password"
          autoComplete="new-password"
          minLength={8}
          required
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-white placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all mb-4"
        />

        {passwordError && <p className="text-red-400 text-sm mb-4">{passwordError}</p>}
        {passwordMessage && <p className="text-emerald-400 text-sm mb-4">{passwordMessage}</p>}

        <button
          type="submit"
          disabled={passwordLoading}
          className="w-full bg-amber-500 hover:bg-amber-400 disabled:bg-amber-500/50 disabled:cursor-not-allowed text-zinc-950 font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2"
        >
          {passwordLoading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Sparar...
            </>
          ) : (
            'Byt lösenord'
          )}
        </button>
      </form>

      <form onSubmit={createAdmin} className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
        <div className="flex items-center gap-2 mb-5">
          <UserPlus className="w-4 h-4 text-amber-400" />
          <h2 className="text-white font-bold text-base">Lägg till admin</h2>
        </div>

        <label className="block text-zinc-300 text-sm font-semibold mb-2">E-post</label>
        <input
          type="email"
          autoComplete="off"
          required
          value={newAdminEmail}
          onChange={(e) => setNewAdminEmail(e.target.value)}
          placeholder="ny-admin@example.com"
          className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-white placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all mb-4"
        />

        {createAdminError && <p className="text-red-400 text-sm mb-4">{createAdminError}</p>}
        {createAdminMessage && <p className="text-emerald-400 text-sm mb-4">{createAdminMessage}</p>}

        <button
          type="submit"
          disabled={createAdminLoading}
          className="w-full bg-amber-500 hover:bg-amber-400 disabled:bg-amber-500/50 disabled:cursor-not-allowed text-zinc-950 font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2"
        >
          {createAdminLoading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Sparar...
            </>
          ) : (
            'Lägg till admin'
          )}
        </button>
      </form>

      <form onSubmit={resetVotes} className="bg-red-950/30 border border-red-900/60 rounded-2xl p-5 lg:col-span-2">
        <div className="flex items-center gap-2 mb-5">
          <Trash2 className="w-4 h-4 text-red-400" />
          <h2 className="text-white font-bold text-base">Återställ rösträknaren</h2>
        </div>

        <p className="text-red-200/80 text-sm mb-4">
          Detta raderar alla {voteCount} registrerade röster permanent. Åtgärden kräver adminlösenordet.
        </p>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-zinc-300 text-sm font-semibold mb-2">Adminlösenord</label>
            <input
              type="password"
              autoComplete="current-password"
              required
              value={resetPassword}
              onChange={(e) => setResetPassword(e.target.value)}
              className="w-full bg-zinc-900 border border-red-900/60 rounded-xl px-4 py-3 text-white placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all"
            />
          </div>
          <div>
            <label className="block text-zinc-300 text-sm font-semibold mb-2">Bekräftelse</label>
            <input
              type="text"
              autoComplete="off"
              required
              value={resetConfirmText}
              onChange={(e) => setResetConfirmText(e.target.value)}
              placeholder="Skriv NOLLSTALL"
              className="w-full bg-zinc-900 border border-red-900/60 rounded-xl px-4 py-3 text-white placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all"
            />
          </div>
        </div>

        {resetError && <p className="text-red-300 text-sm mt-4">{resetError}</p>}
        {resetMessage && <p className="text-emerald-400 text-sm mt-4">{resetMessage}</p>}

        <button
          type="submit"
          disabled={resetLoading || voteCount === 0}
          className="mt-5 w-full sm:w-auto bg-red-600 hover:bg-red-500 disabled:bg-red-900/50 disabled:cursor-not-allowed text-white font-bold px-5 py-3 rounded-xl transition-all flex items-center justify-center gap-2"
        >
          {resetLoading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Återställer...
            </>
          ) : (
            <>
              <Trash2 className="w-4 h-4" />
              Återställ rösträknaren
            </>
          )}
        </button>
      </form>
    </div>
  );
}

function IpAlertPanel({ alerts }: { alerts: IpAlert[] }) {
  const suspiciousVotes = alerts.reduce((sum, alert) => sum + alert.vote_count, 0);

  return (
    <div className="bg-red-950/40 border border-red-900/60 rounded-2xl p-4 mb-6">
      <div className="flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
        <div className="min-w-0 flex-1">
          <h2 className="text-red-200 font-bold text-sm mb-1">Flera röster från samma IP</h2>
          <p className="text-red-200/70 text-xs mb-3">
            {alerts.length} IP-adress{alerts.length !== 1 ? 'er' : ''} har tillsammans {suspiciousVotes} röster.
          </p>
          <div className="max-h-[32rem] overflow-y-auto pr-1 space-y-3">
            {alerts.map((alert) => (
              <div key={alert.ip_address} className="bg-zinc-950/50 border border-red-900/40 rounded-xl p-3">
                <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="text-red-100 font-mono text-xs break-all">{alert.ip_address}</p>
                    <p className="text-red-200/80 text-xs mt-1">
                      {alert.vote_count} röster på #{alert.truck_numbers.join(', #')}
                    </p>
                  </div>
                  <span className="w-fit rounded-full bg-red-500/15 border border-red-500/30 px-2 py-1 text-red-200 text-xs font-bold">
                    {alert.vote_count} röster
                  </span>
                </div>
                <div className="mt-3 overflow-x-auto">
                  <table className="w-full min-w-[620px] text-xs">
                    <thead>
                      <tr className="border-b border-red-900/30 text-red-200/60">
                        <th className="py-2 pr-3 text-left font-semibold">Lastbil</th>
                        <th className="py-2 pr-3 text-left font-semibold">Namn</th>
                        <th className="py-2 pr-3 text-left font-semibold">Mobil</th>
                        <th className="py-2 text-left font-semibold">Tid</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-red-900/20">
                      {alert.votes.map((vote) => (
                        <tr key={vote.id}>
                          <td className="py-2 pr-3 text-amber-300 font-bold">#{vote.truck_number}</td>
                          <td className="py-2 pr-3 text-white">{vote.voter_name}</td>
                          <td className="py-2 pr-3 text-zinc-300 font-mono">{vote.mobile_number}</td>
                          <td className="py-2 text-zinc-400">{formatDate(vote.created_at)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function TruckVoteDetail({
  truckNumber,
  groups,
  onClose,
}: {
  truckNumber: number;
  groups: TruckIpGroup[];
  onClose: () => void;
}) {
  const voteCount = groups.reduce((sum, group) => sum + group.votes.length, 0);

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden mb-6">
      <div className="px-4 py-3 border-b border-zinc-800 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Truck className="w-4 h-4 text-amber-400" />
            <h2 className="text-white font-bold text-sm">Röster för lastbil #{truckNumber}</h2>
          </div>
          <p className="text-zinc-500 text-xs mt-1">
            {voteCount} röst{voteCount !== 1 ? 'er' : ''} grupperade på {groups.length} IP-adress{groups.length !== 1 ? 'er' : ''}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="w-fit flex items-center gap-1.5 text-zinc-400 hover:text-white text-xs border border-zinc-800 hover:border-zinc-700 px-3 py-1.5 rounded-lg transition-all"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Tillbaka
        </button>
      </div>

      {groups.length === 0 ? (
        <div className="text-center py-12 text-zinc-600">
          <p>Inga röster hittades för denna lastbil.</p>
        </div>
      ) : (
        <div className="divide-y divide-zinc-800/50">
          {groups.map((group) => (
            <div key={group.ip_address} className="p-4">
              <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between mb-3">
                <p className="text-zinc-300 font-mono text-xs break-all">{group.ip_address}</p>
                <span className={`w-fit rounded-full border px-2 py-1 text-xs font-bold ${
                  group.votes.length > 1
                    ? 'bg-red-500/15 border-red-500/30 text-red-200'
                    : 'bg-zinc-800 border-zinc-700 text-zinc-300'
                }`}>
                  {group.votes.length} röst{group.votes.length !== 1 ? 'er' : ''}
                </span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[560px] text-xs">
                  <thead>
                    <tr className="border-b border-zinc-800 text-zinc-500">
                      <th className="py-2 pr-3 text-left font-semibold">Namn</th>
                      <th className="py-2 pr-3 text-left font-semibold">Mobil</th>
                      <th className="py-2 text-left font-semibold">Tid</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/50">
                    {group.votes.map((vote) => (
                      <tr key={vote.id}>
                        <td className="py-2 pr-3 text-white">{vote.voter_name}</td>
                        <td className="py-2 pr-3 text-zinc-300 font-mono">{vote.mobile_number}</td>
                        <td className="py-2 text-zinc-400">{formatDate(vote.created_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function SummaryTab({
  tally,
  maxVotes,
  onSelectTruck,
}: {
  tally: TruckTally[];
  maxVotes: number;
  onSelectTruck: (truckNumber: number) => void;
}) {
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
                <button
                  type="button"
                  onClick={() => onSelectTruck(t.truck_number)}
                  className={`font-black text-base hover:underline underline-offset-4 transition-colors ${i === 0 ? 'text-amber-400 hover:text-amber-300' : 'text-white hover:text-amber-300'}`}
                >
                  #{t.truck_number}
                </button>
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
  toggleSort,
  SortIcon,
  onSelectTruck,
}: {
  votes: Vote[];
  toggleSort: (k: SortKey) => void;
  SortIcon: React.FC<{ k: SortKey }>;
  onSelectTruck: (truckNumber: number) => void;
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
                <td className="px-4 py-3">
                  <button
                    type="button"
                    onClick={() => onSelectTruck(v.truck_number)}
                    className="font-bold text-amber-400 hover:text-amber-300 hover:underline underline-offset-4"
                  >
                    #{v.truck_number}
                  </button>
                </td>
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
              <button
                type="button"
                onClick={() => onSelectTruck(v.truck_number)}
                className="text-amber-400 hover:text-amber-300 hover:underline underline-offset-4 font-black text-lg"
              >
                #{v.truck_number}
              </button>
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
