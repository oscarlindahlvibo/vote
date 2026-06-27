import { useState } from 'react';
import { Truck, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '../lib/supabase';

type FormState = 'idle' | 'loading' | 'success' | 'error';

export default function VotingPage() {
  const [truckNumber, setTruckNumber] = useState('');
  const [voterName, setVoterName] = useState('');
  const [mobileNumber, setMobileNumber] = useState('');
  const [formState, setFormState] = useState<FormState>('idle');
  const [message, setMessage] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormState('loading');
    setMessage('');

    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/submit-vote`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          truck_number: truckNumber,
          voter_name: voterName,
          mobile_number: mobileNumber,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setFormState('error');
        setMessage(data.error || 'Ett fel uppstod. Försök igen.');
      } else {
        setFormState('success');
        setMessage(data.message || 'Din röst är registrerad!');
      }
    } catch {
      setFormState('error');
      setMessage('Nätverksfel. Kontrollera din anslutning och försök igen.');
    }
  }

  if (formState === 'success') {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
        <div className="text-center max-w-sm w-full">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-amber-500/10 border border-amber-500/30 mb-6">
            <CheckCircle className="w-10 h-10 text-amber-400" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Röst registrerad!</h2>
          <p className="text-zinc-400 mb-2">
            Du röstade på lastbil nummer
          </p>
          <p className="text-5xl font-black text-amber-400 mb-6">{truckNumber}</p>
          <p className="text-zinc-500 text-sm">Tack för din röst, {voterName}!</p>
          <div className="mt-8 pt-6 border-t border-zinc-800">
            <p className="text-zinc-600 text-xs">Åseda Truckmeet — Publikens val</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col">
      {/* Header */}
      <header className="border-b border-zinc-800 bg-zinc-900/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-lg mx-auto px-4 py-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-amber-500 flex items-center justify-center flex-shrink-0">
            <Truck className="w-5 h-5 text-zinc-950" />
          </div>
          <div>
            <h1 className="text-white font-bold text-base leading-tight">Åseda Truckmeet</h1>
            <p className="text-amber-400 text-xs font-medium tracking-wide uppercase">Publikens Val</p>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          {/* Hero text */}
          <div className="text-center mb-8">
            <h2 className="text-3xl sm:text-4xl font-black text-white mb-2 leading-tight">
              Rösta på din<br />
              <span className="text-amber-400">favoritlastbil</span>
            </h2>
            <p className="text-zinc-400 text-sm">
              Ange utställningsnumret på den snyggaste eller häftigaste lastbilen.
            </p>
          </div>

          {/* Form card */}
          <form
            onSubmit={handleSubmit}
            className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-2xl shadow-black/50"
          >
            {/* Truck number */}
            <div className="mb-5">
              <label className="block text-zinc-300 text-sm font-semibold mb-2">
                Utställningsnummer
              </label>
              <input
                type="number"
                min={1001}
                max={2150}
                required
                value={truckNumber}
                onChange={(e) => setTruckNumber(e.target.value)}
                placeholder="t.ex. 1042"
                className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-white text-lg font-bold placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all"
              />
              <p className="text-zinc-600 text-xs mt-1.5">Nummer mellan 1001 och 2150</p>
            </div>

            {/* Name */}
            <div className="mb-5">
              <label className="block text-zinc-300 text-sm font-semibold mb-2">
                Ditt namn
              </label>
              <input
                type="text"
                required
                minLength={2}
                value={voterName}
                onChange={(e) => setVoterName(e.target.value)}
                placeholder="För- och efternamn"
                className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-white placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all"
              />
            </div>

            {/* Mobile */}
            <div className="mb-6">
              <label className="block text-zinc-300 text-sm font-semibold mb-2">
                Mobilnummer
              </label>
              <input
                type="tel"
                required
                value={mobileNumber}
                onChange={(e) => setMobileNumber(e.target.value)}
                placeholder="070 123 45 67"
                className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-white placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all"
              />
              <p className="text-zinc-600 text-xs mt-1.5">
                Endast en röst per mobilnummer. Vi lottar ut pris bland alla som röstar, så ange ett korrekt mobilnummer.
              </p>
            </div>

            <div className="bg-zinc-950/60 border border-zinc-800 rounded-xl p-3.5 mb-5 space-y-2">
              <p className="text-zinc-400 text-xs leading-relaxed">
                Vinnare kontaktas per telefon efter röstningen.
              </p>
              <p className="text-zinc-500 text-xs leading-relaxed">
                IP-adresser loggas för att upptäcka eventuellt fusk. Misstänkt fusk kan leda till diskvalificering.
              </p>
            </div>

            {/* Error */}
            {formState === 'error' && (
              <div className="flex items-start gap-3 bg-red-950/50 border border-red-900/50 rounded-xl p-3.5 mb-5">
                <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                <p className="text-red-300 text-sm">{message}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={formState === 'loading'}
              className="w-full bg-amber-500 hover:bg-amber-400 disabled:bg-amber-500/50 disabled:cursor-not-allowed text-zinc-950 font-bold text-base py-3.5 rounded-xl transition-all duration-200 flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20"
            >
              {formState === 'loading' ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Skickar röst...
                </>
              ) : (
                'Rösta nu'
              )}
            </button>
          </form>

          <p className="text-center text-zinc-700 text-xs mt-6">
            Åseda Truckmeet &mdash; Publikens val av snyggaste lastbil
          </p>
        </div>
      </main>
    </div>
  );
}
