// Supabase Configuration
// This file should be gitignored in production
window.SUPABASE_CONFIG = {
    URL: process.env.VITE_SUPABASE_URL,
    ANON_KEY: process.env.VITE_SUPABASE_ANON_KEY
};
