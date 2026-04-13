/**
 * BharatYatra — Supabase Initialisation
 * Single source of truth for the Supabase project URL and anon key.
 *
 * Load this script BEFORE any page script that calls supabase.createClient().
 * admin-auth.js already reads window.BY_SUPABASE_URL / window.BY_SUPABASE_KEY
 * if present — all other pages will be updated to do the same.
 *
 * To rotate the anon key: change BY_SUPABASE_KEY here only.
 */

window.BY_SUPABASE_URL = 'https://gtpnojbbamoaznlutxap.supabase.co';
window.BY_SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd0cG5vamJiYW1vYXpubHV0eGFwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg4Mjk3NjMsImV4cCI6MjA4NDQwNTc2M30.t6fwQJR9ljGGfOajPlXzWGSQbKCtpaTb4dWfb33BHxE';
