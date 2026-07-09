"use client";

import { useState } from "react";
import axios from "axios";

interface FeedbackProps {
  messageId: string;
  userId?: string;
  onSubmitted?: () => void;
}

export default function MessageFeedback({ messageId, userId = "default", onSubmitted }: FeedbackProps) {
  const [rating, setRating] = useState(0);
  const [isExpanded, setIsExpanded] = useState(false);
  const [comment, setComment] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [feedbackTags, setFeedbackTags] = useState<string[]>([]);

  const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

  const handleTagToggle = (tag: string) => {
    setFeedbackTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const handleSubmitFeedback = async () => {
    if (rating === 0) return;

    try {
      await axios.post(`${API_URL}/api/feedback/submit`, {
        user_id: userId,
        message_id: messageId,
        rating,
        comment,
        helpful: rating >= 4,
        tags: feedbackTags,
      });

      setSubmitted(true);
      setRating(0);
      setComment("");
      setFeedbackTags([]);
      setIsExpanded(false);

      if (onSubmitted) onSubmitted();

      setTimeout(() => setSubmitted(false), 3000);
    } catch (error) {
      console.error("Failed to submit feedback:", error);
    }
  };

  return (
    <div className="mt-2 text-xs">
      {submitted ? (
        <div className="text-green-400 text-left">
          ✓ Thank you for your feedback!
        </div>
      ) : (
        <>
          {!isExpanded ? (
            <button
              onClick={() => setIsExpanded(true)}
              className="text-slate-400 hover:text-slate-300 transition-colors text-left"
            >
              💬 Rate this response
            </button>
          ) : (
            <div className="bg-slate-800 rounded-lg p-2.5 border border-slate-700 space-y-2">
              {/* Rating stars */}
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    onClick={() => setRating(star)}
                    className={`text-lg transition-colors ${
                      star <= rating ? "text-yellow-400" : "text-slate-600 hover:text-slate-500"
                    }`}
                  >
                    ★
                  </button>
                ))}
              </div>

              {/* Tags */}
              {rating > 0 && (
                <div className="flex flex-wrap gap-1">
                  {["too_long", "unclear", "helpful", "perfect", "off_topic"].map((tag) => (
                    <button
                      key={tag}
                      onClick={() => handleTagToggle(tag)}
                      className={`px-2 py-0.5 rounded text-xs transition-colors ${
                        feedbackTags.includes(tag)
                          ? "bg-green-600 text-white"
                          : "bg-slate-700 text-slate-300 hover:bg-slate-600"
                      }`}
                    >
                      {tag.replace(/_/g, " ")}
                    </button>
                  ))}
                </div>
              )}

              {/* Comment */}
              {rating > 0 && (
                <textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Add optional comment..."
                  className="w-full px-2 py-1 bg-slate-700 border border-slate-600 rounded text-slate-100 placeholder-slate-400 text-xs focus:outline-none focus:ring-1 focus:ring-green-500 resize-none"
                  rows={2}
                />
              )}

              {/* Submit button */}
              {rating > 0 && (
                <div className="flex gap-1">
                  <button
                    onClick={handleSubmitFeedback}
                    className="flex-1 bg-green-600 hover:bg-green-700 text-white px-2 py-1 rounded text-xs font-medium transition-colors"
                  >
                    Submit
                  </button>
                  <button
                    onClick={() => {
                      setIsExpanded(false);
                      setRating(0);
                      setComment("");
                      setFeedbackTags([]);
                    }}
                    className="px-2 py-1 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded text-xs transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
