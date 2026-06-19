# vote

[![Open in Bolt](https://bolt.new/static/open-in-bolt.svg)](https://bolt.new/~/sb1-ixvhifsw)

## Admin login

Adminpanelen använder Supabase Auth. Skapa inga adminlösenord i frontend-koden.

1. Sätt frontend-miljövariablerna i servern:

   ```sh
   VITE_SUPABASE_URL=...
   VITE_SUPABASE_ANON_KEY=...
   ```

2. Lägg till appens adminadress i Supabase Auth redirect URLs, till exempel:

   ```text
   https://vote.asedatruckmeet.se/admin
   ```

   Appen skickar även med aktuell `/admin`-adress när ett konto skapas, så lokala tester går till lokal admin och produktion går till produktionsadmin.

3. Kör Supabase-migrationerna. De skapar `vote_admin_users`, låser röster till admins för just vote-appen och gör att första adminkontot kan skapas direkt i appen när adminlistan är tom.

4. Deploya Edge Function för röstning om den inte redan är deployad:

   ```sh
   supabase functions deploy submit-vote
   ```

5. Öppna `/admin`, skriv e-post och lösenord och klicka `Skapa första admin`.

6. När du är inloggad kan du under `Inställningar`:

   - byta lösenord på det inloggade kontot
   - lägga till fler admin-e-postadresser

När du lagt till en ny admin-e-post kan personen öppna `/admin`, skapa konto med samma e-postadress och sedan logga in som admin.
