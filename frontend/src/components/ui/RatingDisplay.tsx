import { Star, ThumbsUp, Heart, Eye } from "lucide-react";

interface RatingDisplayProps {
  rating: number;
  ratingCount: number;
  likeCount: number;
  bookmarkCount: number;
  viewCount: number;
}

export default function RatingDisplay({ rating, ratingCount, likeCount, bookmarkCount, viewCount }: RatingDisplayProps) {
  // Generate 5 stars based on average rating
  const renderStars = () => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      if (i <= rating) {
        stars.push(<Star key={i} className="h-4 w-4 fill-amber-400 text-amber-400" />);
      } else if (i - 0.5 <= rating) {
        // Half star logic (simplified visually using opacity for now)
        stars.push(<Star key={i} className="h-4 w-4 fill-amber-400/50 text-amber-400" />);
      } else {
        stars.push(<Star key={i} className="h-4 w-4 text-slate-300" />);
      }
    }
    return stars;
  };

  return (
    <div className="flex flex-col gap-2 p-3 bg-slate-50 rounded-xl border border-slate-100 w-fit">
      <div className="flex items-center gap-2">
        <div className="flex gap-0.5">
          {renderStars()}
        </div>
        <span className="text-sm font-bold text-slate-700">{rating.toFixed(1)}</span>
        <span className="text-xs text-slate-500">({ratingCount} ulasan)</span>
      </div>
      
      <div className="flex items-center gap-4 text-xs font-medium text-slate-600">
        <div className="flex items-center gap-1">
          <ThumbsUp size={14} className="text-blue-500" /> {likeCount}
        </div>
        <div className="flex items-center gap-1">
          <Heart size={14} className="text-rose-500" /> {bookmarkCount}
        </div>
        <div className="flex items-center gap-1">
          <Eye size={14} className="text-emerald-600" /> {viewCount}
        </div>
      </div>
    </div>
  );
}
