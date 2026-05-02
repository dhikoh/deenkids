"use client";

import { useState, useEffect } from "react";
import { Heart, Bookmark, Share2, Star } from "lucide-react";
import toast from "react-hot-toast";
import { API_BASE_URL, fetchEngagementStatus } from "@/lib/api";

function getUserHash(): string {
  if (typeof window === "undefined") return "ssr";
  let hash = localStorage.getItem("adably_user_hash");
  if (!hash) {
    hash = "u_" + Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
    localStorage.setItem("adably_user_hash", hash);
  }
  return hash;
}

interface EngagementBarProps {
  contentId: string;
  initialLikes: number;
  initialBookmarks: number;
  initialRating: number;
  initialShares?: number;
  initialViews?: number;
}

export function EngagementBar({
  contentId,
  initialLikes,
  initialBookmarks,
  initialRating,
  initialShares = 0,
  initialViews = 0,
}: EngagementBarProps) {
  const [likes, setLikes] = useState(initialLikes);
  const [isLiked, setIsLiked] = useState(false);
  const [bookmarks, setBookmarks] = useState(initialBookmarks);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [rating, setRating] = useState(initialRating);
  const [hasRated, setHasRated] = useState(false);
  const [userRating, setUserRating] = useState<number | null>(null);
  const [shares, setShares] = useState(initialShares);
  const [statusLoaded, setStatusLoaded] = useState(false);

  // Restore state from server on mount
  useEffect(() => {
    const userHash = getUserHash();

    // Record view
    fetch(`${API_BASE_URL}/engagement/view`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contentId, userHash }),
    }).catch(() => {});

    // Restore engagement state from server (source of truth)
    fetchEngagementStatus(contentId, userHash)
      .then(status => {
        setIsLiked(status.liked ?? false);
        const serverBookmarked = status.bookmarked ?? false;
        setIsBookmarked(serverBookmarked);
        // Sync localStorage with server state
        try {
          const stored = JSON.parse(localStorage.getItem('adably_bookmarks') || '[]');
          if (serverBookmarked && !stored.includes(contentId)) {
            stored.push(contentId);
            localStorage.setItem('adably_bookmarks', JSON.stringify(stored));
          } else if (!serverBookmarked && stored.includes(contentId)) {
            localStorage.setItem('adably_bookmarks', JSON.stringify(stored.filter((id: string) => id !== contentId)));
          }
        } catch {}
        if (status.userRating !== null) {
          setHasRated(true);
          setUserRating(status.userRating);
          setRating(status.userRating);
        }
      })
      .catch(() => {
        // Server unavailable — fallback to localStorage
        try {
          const stored = JSON.parse(localStorage.getItem('adably_bookmarks') || '[]');
          if (stored.includes(contentId)) setIsBookmarked(true);
        } catch {}
      })
      .finally(() => setStatusLoaded(true));
  }, [contentId]);

  const handleLike = async () => {
    const userHash = getUserHash();
    const newLiked = !isLiked;
    setIsLiked(newLiked);
    setLikes(prev => newLiked ? prev + 1 : Math.max(0, prev - 1));
    try {
      await fetch(`${API_BASE_URL}/engagement/like`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contentId, userHash }),
      });
    } catch {
      setIsLiked(!newLiked);
      setLikes(prev => !newLiked ? prev + 1 : Math.max(0, prev - 1));
    }
  };

  const handleBookmark = async () => {
    const userHash = getUserHash();
    const newBookmarked = !isBookmarked;
    setIsBookmarked(newBookmarked);
    setBookmarks(prev => newBookmarked ? prev + 1 : Math.max(0, prev - 1));

    // Sync with localStorage for /tersimpan page
    try {
      const stored = JSON.parse(localStorage.getItem('adably_bookmarks') || '[]');
      if (newBookmarked) {
        if (!stored.includes(contentId)) stored.push(contentId);
      } else {
        const idx = stored.indexOf(contentId);
        if (idx > -1) stored.splice(idx, 1);
      }
      localStorage.setItem('adably_bookmarks', JSON.stringify(stored));
    } catch {}

    try {
      await fetch(`${API_BASE_URL}/engagement/bookmark`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contentId, userHash }),
      });
    } catch {
      setIsBookmarked(!newBookmarked);
      setBookmarks(prev => !newBookmarked ? prev + 1 : Math.max(0, prev - 1));
    }
  };

  const handleRate = async (star: number) => {
    if (hasRated) return;
    const userHash = getUserHash();
    setUserRating(star);
    setHasRated(true);
    try {
      const res = await fetch(`${API_BASE_URL}/engagement/rating`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contentId, userHash, rating: star }),
      });
      if (res.ok) {
        const data = await res.json();
        setRating(data.avgRating ?? star);
      }
    } catch {}
  };

  const handleShare = async () => {
    const url = window.location.href;
    const title = document.title;
    try {
      if (navigator.share) {
        await navigator.share({ title, url });
      } else {
        await navigator.clipboard.writeText(url);
        toast.success("Link berhasil disalin!");
      }
      setShares(prev => prev + 1);
      fetch(`${API_BASE_URL}/engagement/share`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contentId }),
      }).catch(() => {});
    } catch {}
  };

  const displayRating = userRating ?? rating;

  return (
    <div className="flex flex-wrap items-center justify-between gap-4 p-4 bg-white border border-slate-200 rounded-2xl shadow-sm mt-8">
      {/* Rating System */}
      <div className="flex items-center gap-2">
        <span className="text-sm font-bold text-slate-700">
          Rating ({rating.toFixed(1)})
        </span>
        <div className="flex items-center gap-1">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              onClick={() => handleRate(star)}
              disabled={hasRated}
              title={hasRated ? `Anda memberi ${userRating} bintang` : `Beri ${star} bintang`}
              className={`p-1 transition-transform hover:scale-110 ${
                star <= (userRating ?? 0)
                  ? "text-amber-500"
                  : hasRated
                  ? "text-slate-200 cursor-default"
                  : "text-slate-300 hover:text-amber-400"
              }`}
            >
              <Star className={`h-6 w-6 ${star <= (userRating ?? 0) ? "fill-amber-500" : ""}`} />
            </button>
          ))}
        </div>
        {hasRated && (
          <span className="text-xs text-amber-600 font-semibold">✓ Sudah dinilai</span>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-3">
        <button
          onClick={handleLike}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all ${
            isLiked
              ? "bg-rose-100 text-rose-600 border border-rose-200"
              : "bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-100"
          }`}
        >
          <Heart className={`h-4 w-4 ${isLiked ? "fill-rose-600" : ""}`} />
          {likes}
        </button>

        <button
          onClick={handleBookmark}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all ${
            isBookmarked
              ? "bg-emerald-100 text-emerald-700 border border-emerald-200"
              : "bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-100"
          }`}
        >
          <Bookmark className={`h-4 w-4 ${isBookmarked ? "fill-emerald-700" : ""}`} />
          {bookmarks}
        </button>

        <button
          onClick={handleShare}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-100 transition-all"
        >
          <Share2 className="h-4 w-4" />
          {shares > 0 ? shares : "Share"}
        </button>
      </div>
    </div>
  );
}
