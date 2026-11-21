# ArtHive Digital Museum

ArtHive is a Vite and TypeScript digital museum, literature archive, creator network, and art marketplace.

## Run locally

```powershell
npm install
npm run dev
```

## Image assets

All image files must be local project assets under `public/assets/images/`; Vite bundles these into `dist/assets/images/`. Firebase Storage and Supabase Storage are not used for media. Public artwork and literature previews are available without signing in. The full-screen viewer supports zoom and multi-image navigation for galleries. Local references accept JPG, PNG, and SVG files; the development uploader accepts JPEG and static PNG only, rejecting animated PNGs and animated formats such as GIF, WebP, and AVIF.

The project includes original local illustrations for clearly labeled demo artworks and 49 Explore category cards. It also contains 24 downloaded, static JPEGs from The Metropolitan Museum of Art's Open Access collection, organized under `public/assets/images/artworks/met-collection/`. Their verified object metadata, original museum image URLs, source records, and CC0 1.0 attribution are in `public/assets/images/artworks/met-collection/metadata.json`; the application checks the 8/4/4/4/4 collection counts and presents these works separately from marketplace listings and Best Sellers. The Met collection uses local images at runtime and does not imply museum endorsement. Guest ratings for these works are browser-local, not shared or presented as published Met ratings. The inspected project had no creator-uploaded artwork or founder portrait. Original database records and legacy media metadata are not deleted; remote image URLs now display the local fallback until their original files are obtained with permission, copied into the project, and the reference is changed to `/assets/images/<category>/<file>`. Missing or unsupported references do not load remote images.

When Supabase is not configured, the public museum and collection pages use the local demonstration content in `src/lib/demoCollections.ts`. Its attribution is fictional and labeled as sample content; it is not presented as published historical or cultural work. No sample prices, sales, ratings, or customer reviews are invented. The marketplace and Best Sellers remain empty until a permitted persistent data source provides real listings and verified sales.

### Local development image management

The founder/admin image manager uses a Vite development-only endpoint to write images into `public/assets/images/`. Use `npm run dev`, choose a category, and add an image. The manager validates its file type and size, generates a unique filename (it never overwrites bundled files), previews the selection, and returns a local path to paste into the related image field. It can delete only files added by this manager; original bundled assets are protected. The `.arthive-managed-assets.json` manifest tracks manager-created files.

Vercel's static production filesystem is read-only/ephemeral. The local upload/delete endpoint is not included in production; adding or changing production images requires a controlled local project edit and redeployment. To replace an image, add a new uniquely named file and update its local path reference. The preview server is not a permanent writable upload service.

## Firebase Authentication + Supabase account management

1. Create or select a Firebase project and enable **Email/Password** in Firebase Authentication.
2. In Firebase, register a web app and set the public Firebase web values in `.env.local` using `.env.example`. Set `VITE_FIREBASE_ACCOUNT_URL` to the deployed `firebaseAccounts` HTTPS function URL. Do not enable or configure Firebase Storage for ArtHive; never put Firebase Admin credentials or a Supabase service-role key in a `VITE_` variable.
3. Configure Supabase **Auth → Third-Party Auth → Firebase** with the same Firebase project ID. The app supplies verified Firebase ID tokens to Supabase; it does not treat Firebase and Supabase sessions as interchangeable.
4. Apply `supabase/schema.sql` in the Supabase SQL editor. It adds private Firebase-to-profile account links, privacy/settings fields, account activity, and RLS policies without dropping existing application rows. The account resolver lets registration reuse an existing Supabase Auth UUID for a matching email; new Firebase accounts receive UUID identities so the existing UUID-based record relationships and RLS remain compatible.
5. Deploy the Firebase HTTPS functions. Set the server-side parameters/secrets:

   ```powershell
   firebase functions:secrets:set SUPABASE_SERVICE_ROLE_KEY
   firebase functions:secrets:set OPENAI_API_KEY
   firebase deploy --only functions:firebaseAccounts,functions:artHiveAi
   ```

   Configure `SUPABASE_URL`, `ALLOWED_ORIGINS`, and `ART_HIVE_AI_MODEL` as Firebase Functions parameters for the deployed project. Grant the Functions runtime service account permission to sign Firebase custom tokens. Service-role keys and Firebase Admin credentials must remain server-side.
6. Deploy the deny-all Firebase Storage rules to prevent media access through any previously configured bucket:

   ```powershell
   firebase deploy --only storage
   ```

   ArtHive does not upload, read, or delete image files in Firebase Storage. Existing stored files are not deleted by these rules.
7. New users register with Firebase, verify their email, then sign in. The server verifies the Firebase identity, links it to private Supabase account/profile rows, and refreshes Firebase custom claims from the account role. Supabase RLS accepts only verified, active Firebase identities. Password reset and session persistence use Firebase Authentication. Existing Firebase accounts with non-UUID UIDs need administrator-assisted migration before they can use the current UUID-based Supabase records.
8. For the first administrator only, have the founder register and verify `morenohoneylyn73@gmail.com`, sign in once so the profile is synchronized, then run this guarded statement in the Supabase SQL editor:

   ```sql
   update public.profiles p
   set role = 'admin'
   from auth.users u
   join public.user_accounts a on a.id = u.id
   where p.id = u.id
     and lower(u.email) = lower('morenohoneylyn73@gmail.com')
     and u.email_confirmed_at is not null
     and a.firebase_uid = u.id::text
     and a.account_status = 'active';
   ```

   Account holders can edit profile and privacy preferences from **My account**. Administrators can manage roles and account status there; server-side RLS and database guards prevent non-admin privilege changes. Existing administrator roles are preserved. Do not grant the public/anonymous role administrator privileges.

## Founder profile

The founder profile is available at `#founder`. Founder image fields accept local `/assets/images/...` paths only. Add the approved image with the development-only local asset manager, then copy its path into the founder editor. No professional portrait was present in the portfolio or local project.

## ArtHive AI

The AI screen is available at `#ai`. Set `VITE_ART_HIVE_AI_URL` in `.env.local` to the deployed `artHiveAi` HTTPS function URL and configure the provider key with `firebase functions:secrets:set OPENAI_API_KEY`. Enable `ai_assistant_settings.enabled` only after the function, schema, and frontend URL are configured. The provider key must never be added to client code. Signed-in AI requests authenticate with Firebase ID tokens; saved history and support features require a verified active account.

## Build and preview

```powershell
npm run build
npm run preview
```

The production build includes all files under `public/`; verify local image assets in `dist/assets/images/`. Runtime Firebase/Supabase account tests require live project credentials, the Firebase third-party integration in Supabase, deployed functions, and applied SQL schema. Without those project settings, the frontend build and local image rendering can be tested, but live registration, recovery, RLS, and role enforcement cannot be exercised. The SQL migration disables client access to the legacy `media_assets` table without deleting its records.

### Existing application data limitation

The existing museum/marketplace discovery screens and founder text still read and write legacy Supabase content tables when Supabase is configured. Those records are not deleted or silently migrated because no authorized database export was provided. The new demo content is only the unconfigured-preview fallback; it does not migrate or replace those records. A full migration of application content out of Supabase requires an authorized data export and a separate backward-compatible content migration.

Guest star selections are stored in the visitor's browser `localStorage` only. A browser can submit one rating per item and up to 10 ratings per hour in that browser, but these client-side limits are not abuse-resistant; visitors can clear or alter browser data. The displayed average, count, and distribution are therefore local to that browser and are not shared, moderated, or a site-wide score. No guest written reviews are collected. Existing written reviews remain tied to completed purchases and moderation through the existing Supabase schema; no backend or database schema was added for guest ratings.
