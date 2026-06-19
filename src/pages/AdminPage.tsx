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
  ChevronUp,
  ChevronDown,
  KeyRound,
  Settings,
  UserPlus,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { Vote, TruckTally } from '../lib/types';

type SortKey = 'truck_number' | 'voter_name' | 'mobile_number' | 'created_at';
type SortDir = 'asc' | 'desc';
type Tab = 'summary' | 'individual' | 'settings';

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

  const signUpAdminAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthLoading(true);
    setLoginError('');
    setSetupMessage('');

    if (password.length < 8) {
      setLoginError('Lösenordet måste vara minst 8 tecken.');
      setAuthLoading(false);
      return;
    }

    const normalizedEmail = email.trim().toLowerCase();
    const { data, error } = await supabase.auth.signUp({
      email: normalizedEmail,
      password,
      options: {
        emailRedirectTo: getAdminRedirectUrl(),
      },
    });

    if (error) {
      setLoginError('Kunde inte skapa konto. Finns e-postadressen redan kan du logga in i stället.');
    } else if (!data.session) {
      setSetupMessage('Kontot är skapat. Ange verifieringskoden från mejlet här nedan.');
    }

    setAuthLoading(false);
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
            {hasAdminUsers && (
              <button
                type="button"
                onClick={(e) => signUpAdminAccount(e)}
                disabled={authLoading}
                className="w-full mt-3 border border-zinc-700 hover:border-zinc-600 text-zinc-300 hover:text-white font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2"
              >
                <UserPlus className="w-4 h-4" />
                Skapa konto
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
            setNewPassword={setNewPassword}
            setConfirmPassword={setConfirmPassword}
            setNewAdminEmail={setNewAdminEmail}
            changePassword={changePassword}
            createAdmin={createAdmin}
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
          <SummaryTab tally={tally} maxVotes={maxVotes} />
        ) : (
          <IndividualTab
            votes={sortedVotes}
            toggleSort={toggleSort}
            SortIcon={SortIcon}
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
  setNewPassword,
  setConfirmPassword,
  setNewAdminEmail,
  changePassword,
  createAdmin,
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
  setNewPassword: (value: string) => void;
  setConfirmPassword: (value: string) => void;
  setNewAdminEmail: (value: string) => void;
  changePassword: (e: React.FormEvent) => void;
  createAdmin: (e: React.FormEvent) => void;
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
  toggleSort,
  SortIcon,
}: {
  votes: Vote[];
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
