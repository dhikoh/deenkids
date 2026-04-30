"use client";

import { useState, useEffect } from "react";
import { Heart, Bookmark, Share2, Star } from "lucide-react";
import toast from "react-hot-toast";

import { API_BASE_URL } from "@/lib/api";

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

export function EngagementBar({ contentId, initialLikes, initialBookmarks, initialRating, initialShares = 0, initialViews = 0 }: EngagementBarProps) {
  const [likes, setLikes] = useState(initialLikes);
  const [isLiked, setIsLiked] = useState(false);
  const [bookmarks, setBookmarks] = useState(initialBookmarks);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [rating, setRating] = useState(initialRating);
  const [hasRated, setHasRated] = useState(false);
  const [shares, setShares] = useState(initialShares);

  // Record view on mount
  useEffect(() => {
    const userHash = getUserHash();
    fetch(`${API_BASE_URL}/engagement/view`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contentId, userHash }),
    }).catch(() => {});
  }, [contentId]);

  const handleLike = async () => {
    const userHash = getUserHash();
    const newLiked = !isLiked;
    setIsLiked(newLiked);
    setLikes(newLiked ? likes + 1 : likes - 1);
    try {
      await fetch(`${API_BASE_URL}/engagement/like`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contentId, userHash }),
      });
    } catch {
      // Revert on error
      setIsLiked(!newLiked);
      setLikes(newLiked ? likes : likes + 1);
    }
  };

  const handleBookmark = async () => {
    const userHash = getUserHash();
    const newBookmarked = !isBookmarked;
    setIsBookmarked(newBookmarked);
    setBookmarks(newBookmarked ? bookmarks + 1 : bookmarks - 1);
    try {
      await fetch(`${API_BASE_URL}/engagement/bookmark`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contentId, userHash }),
      });
    } catch {
      setIsBookmarked(!newBookmarked);
      setBookmarks(newBookmarked ? bookmarks : bookmarks + 1);
    }
  };

  const handleRate = async (star: number) => {
    if (hasRated) return;
    const userHash = getUserHash();
    setRating(star);
    setHasRated(true);
    try {
      const res = await fetch(`${API_BASE_URL}/engagement/rating`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contentId, userHash, rating: star }),
      });
      if (res.ok) {
        const data = await res.json();
        setRating(data.avgRating || star);
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
      setShares(shares + 1);
      fetch(`${API_BASE_URL}/engagement/share`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contentId }),
      }).catch(() => {});
    } catch {}
  };

  return (
    <div className="flex flex-wrap items-center justify-between gap-4 p-4 bg-white border border-slate-200 rounded-2xl shadow-sm mt-8">
      {/* Rating System */}
      <div className="flex items-center gap-2">
        <span className="text-sm font-bold text-slate-700">Rating ({rating.toFixed(1)})</span>
        <div className="flex items-center gap-1">
          {[1, 2, 3, 4, 5].map((star) => (
            <button 
              key={star}
              onClick={() => handleRate(star)}
              disabled={hasRated}
              className={`p-1 transition-transform hover:scale-110 ${
                hasRated && star <= rating 
                  ? 'text-amber-500' 
                  : 'text-slate-300 hover:text-amber-400'
              }`}
            >
              <Star className={`h-6 w-6 ${hasRated && star <= rating ? 'fill-amber-500' : ''}`} />
            </button>
          ))}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-3">
        <button 
          onClick={handleLike}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all ${
            isLiked 
              ? 'bg-rose-100 text-rose-600 border border-rose-200' 
              : 'bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-100'
          }`}
        >
          <Heart className={`h-4 w-4 ${isLiked ? 'fill-rose-600' : ''}`} />
          {likes}
        </button>
        
        <button 
          onClick={handleBookmark}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all ${
            isBookmarked 
              ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' 
              : 'bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-100'
          }`}
        >
          <Bookmark className={`h-4 w-4 ${isBookmarked ? 'fill-emerald-700' : ''}`} />
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
