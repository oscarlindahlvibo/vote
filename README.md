# vote

[![Open in Bolt](https://bolt.new/static/open-in-bolt.svg)](https://bolt.new/~/sb1-ixvhifsw)

## Admin login

Adminpanelen använder Supabase Auth. Skapa inga adminlösenord i frontend-koden.

1. Sätt frontend-miljövariablerna i servern:

   ```sh
   VITE_SUPABASE_URL=...
   VITE_SUPABASE_ANON_KEY=...
   ```

2. Kör Supabase-migrationerna. De skapar `admin_users`, låser röster till admins och gör att första adminkontot kan skapas direkt i appen när adminlistan är tom.

3. Deploya Edge Function för röstning om den inte redan är deployad:

   ```sh
   supabase functions deploy submit-vote
   ```

4. Öppna `/admin`, skriv e-post och lösenord och klicka `Skapa första admin`.

5. När du är inloggad kan du under `Inställningar`:

   - byta lösenord på det inloggade kontot
   - lägga till fler admin-e-postadresser

När du lagt till en ny admin-e-post kan personen öppna `/admin`, skapa konto med samma e-postadress och sedan logga in som admin.
