"use client";

import { useState } from "react";
import { Heart, Bookmark, Share2, Star } from "lucide-react";

interface EngagementBarProps {
  contentId: string;
  initialLikes: number;
  initialBookmarks: number;
  initialRating: number;
}

export function EngagementBar({ contentId, initialLikes, initialBookmarks, initialRating }: EngagementBarProps) {
  const [likes, setLikes] = useState(initialLikes);
  const [isLiked, setIsLiked] = useState(false);
  const [bookmarks, setBookmarks] = useState(initialBookmarks);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [rating, setRating] = useState(initialRating);
  const [hasRated, setHasRated] = useState(false);

  const handleLike = () => {
    // Akan panggil API POST /engagement/like di tahap integrasi
    setIsLiked(!isLiked);
    setLikes(isLiked ? likes - 1 : likes + 1);
  };

  const handleBookmark = () => {
    // Akan panggil API POST /engagement/bookmark
    setIsBookmarked(!isBookmarked);
    setBookmarks(isBookmarked ? bookmarks - 1 : bookmarks + 1);
  };

  const handleRate = (star: number) => {
    if (hasRated) return;
    // Akan panggil API POST /engagement/rating
    setRating(star);
    setHasRated(true);
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

        <button className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-100 transition-all">
          <Share2 className="h-4 w-4" />
          Share
        </button>
      </div>
    </div>
  );
}
