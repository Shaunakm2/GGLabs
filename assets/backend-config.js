/* =============================================================================
   Where the site keeps its data
   -----------------------------------------------------------------------------
   Fill in ONE of the two blocks below. Leave both empty and the site works
   exactly as before — admin edits save in that admin's own browser and nobody
   else sees them.

   Fill one in and admin edits become global: every visitor sees them.

   Both keys below are meant to be public. They sit in every web app built on
   these services. The security rules on the server decide what they may do.
   Never put a Supabase service_role key or a Firebase Admin key here.

   Setup steps: FIREBASE-SETUP.md or SUPABASE-SETUP.md
   ========================================================================== */

// Option A — Firebase (recommended: never pauses, no credit card)
window.GG_FIREBASE = {
  projectId: "gglabs-3e7f5",
  apiKey: "AIzaSyAdd9jifTYpyx_eCyBttT7Zr1b8unwiN9c",
};

// Option B — Supabase
window.GG_SUPABASE = {
  url: "",
  anonKey: "",
};
