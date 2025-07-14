"use client";
import { supabase } from "../lib/supabase";

export default function LoginPage() {
  return (
    <main className="p-8 text-center">
      <h1 className="text-2xl mb-4">Sign in</h1>
      <button
        onClick={() => supabase.auth.signInWithOAuth({ provider: "github" })}
        className="bg-black text-white px-4 py-2 rounded"
      >
        Sign in with GitHub
      </button>
    </main>
  );
}
