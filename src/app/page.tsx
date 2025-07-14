"use client";
import { useEffect, useState } from "react";
import { supabase } from "./lib/supabase";
import AuthGuard from "./components/AuthGuard";
import { User } from "@supabase/supabase-js";

interface Message {
  id: number;
  username: string;
  content: string;
  created_at: string;
}

export default function HomePage() {
  const [user, setUser] = useState<User | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [isPosting, setIsPosting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const getSessionAndMessages = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setUser(user);
      fetchMessages();
    };
    getSessionAndMessages();

    const channel = supabase
      .channel("messages-realtime")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "Messages" },
        (payload) => {
          setMessages((prev) => [payload.new as Message, ...prev]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchMessages = async () => {
    const { data, error } = await supabase
      .from("Messages")
      .select("*")
      .order("created_at", { ascending: false });

    if (!error && data) setMessages(data);
  };

  const handlePost = async () => {
    if (!newMessage.trim()) return;
    if (!user) {
      setError("User not authenticated");
      return;
    }

    setIsPosting(true);
    setError(null);

    try {
      const { data, error: insertError } = await supabase
        .from("Messages")
        .insert([
          {
            username: user.user_metadata?.full_name || user.email,
            content: newMessage,
          },
        ]);

      if (insertError) {
        setError(`Failed to post message: ${insertError.message}`);
        return;
      }

      setNewMessage("");
      await fetchMessages();
    } catch (err) {
      console.error("Unexpected error:", err);
      setError("An unexpected error occurred");
    } finally {
      setIsPosting(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = "/login"; // or use router.push("/login");
  };

  return (
    <AuthGuard>
      <main className="p-6 max-w-xl mx-auto">
        {/* Header with Logout */}
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-2xl font-bold">📢 Message Wall</h1>
          <button
            onClick={handleLogout}
            className="bg-red-500 text-white px-3 py-1 rounded text-sm"
          >
            Logout
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
            {error}
          </div>
        )}

        <div className="mb-6">
          <textarea
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type your message..."
            className="w-full border rounded p-2"
            disabled={isPosting}
          />
          <button
            onClick={handlePost}
            disabled={isPosting || !newMessage.trim()}
            className="mt-2 bg-blue-500 text-white px-4 py-2 rounded disabled:bg-gray-400"
          >
            {isPosting ? "Posting..." : "Post"}
          </button>
        </div>

        <ul className="space-y-4">
          {messages.map((msg) => (
            <li key={msg.id} className="border p-3 rounded">
              <p className="text-sm text-gray-500">
                {msg.username} — {new Date(msg.created_at).toLocaleString()}
              </p>
              <p>{msg.content}</p>
            </li>
          ))}
        </ul>
      </main>
    </AuthGuard>
  );
}
