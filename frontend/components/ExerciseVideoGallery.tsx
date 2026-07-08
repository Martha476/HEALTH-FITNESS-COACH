"use client";

import React, { useState, useEffect } from "react";

export interface ExerciseVideo {
  youtube_id: string;
  title: string;
  thumbnail: string;
  channel: string;
  description: string;
}

export interface ExerciseVideosResponse {
  videos: ExerciseVideo[];
  query?: string;
  error?: string;
}

export interface ExerciseVideoGalleryProps {
  fitnessGoal?: string;
  exerciseName?: string;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

async function getExerciseVideos(
  goal: string = "general",
  exercise: string = ""
): Promise<ExerciseVideosResponse> {
  const token = localStorage.getItem("authToken");
  if (!token) {
    return { videos: [], error: "Not authenticated" };
  }

  try {
    const params = new URLSearchParams();
    if (goal) params.append("goal", goal);
    if (exercise) params.append("exercise", exercise);

    const res = await fetch(`${API_URL}/api/exercises/videos?${params}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    if (!res.ok) {
      return { videos: [], error: `API error: ${res.status}` };
    }

    return await res.json();
  } catch (error) {
    console.error("Failed to fetch exercise videos:", error);
    return { videos: [], error: String(error) };
  }
}

interface SelectedVideoState {
  id: string | null;
  title: string;
}

export default function ExerciseVideoGallery({
  fitnessGoal = "general",
  exerciseName = "",
}: ExerciseVideoGalleryProps) {
  const [videos, setVideos] = useState<ExerciseVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedVideo, setSelectedVideo] = useState<SelectedVideoState>({
    id: null,
    title: "",
  });
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    const fetchVideos = async () => {
      setLoading(true);
      setError(null);
      const result = await getExerciseVideos(fitnessGoal, exerciseName);
      if (result.error) {
        setError(result.error);
        setVideos([]);
      } else if (result.videos && result.videos.length > 0) {
        setVideos(result.videos);
        setError(null);
      } else {
        setError("No exercise videos found. Try a different exercise or goal.");
        setVideos([]);
      }
      setLoading(false);
    };

    fetchVideos();
  }, [fitnessGoal, exerciseName, retryCount]);

  const handleSelectVideo = (video: ExerciseVideo) => {
    setSelectedVideo({
      id: video.youtube_id,
      title: video.title,
    });
  };

  const handleClosePlayer = () => {
    setSelectedVideo({ id: null, title: "" });
  };

  const handleRetry = () => {
    setRetryCount((prev) => prev + 1);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8 bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-gray-300 border-t-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-700 font-medium">Loading exercise videos...</p>
          <p className="text-sm text-gray-500 mt-1">
            Finding the best tutorials for {exerciseName || fitnessGoal}
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-6">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 mt-0.5">
            <svg
              className="h-5 w-5 text-amber-600"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                clipRule="evenodd"
              />
            </svg>
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-amber-900 mb-1">Videos Unavailable</h3>
            <p className="text-amber-800 text-sm mb-3">{error}</p>
            <button
              onClick={handleRetry}
              className="text-sm font-medium text-amber-700 hover:text-amber-900 underline"
            >
              Try Again →
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (videos.length === 0) {
    return (
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <p className="text-blue-800">No videos found for this search.</p>
        <p className="text-sm text-blue-600 mt-2">
          Try searching with a different exercise or fitness goal.
        </p>
      </div>
    );
  }

  return (
    <div>
      {/* Video Player Modal */}
      {selectedVideo.id && (
        <div className="fixed inset-0 bg-black bg-opacity-75 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-2xl w-full max-w-2xl">
            <div className="flex justify-between items-center p-4 border-b">
              <h3 className="font-semibold text-gray-900 line-clamp-2">
                {selectedVideo.title}
              </h3>
              <button
                onClick={handleClosePlayer}
                className="text-gray-500 hover:text-gray-700 p-1"
              >
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
            <div className="aspect-video bg-black">
              <iframe
                width="100%"
                height="100%"
                src={`https://www.youtube.com/embed/${selectedVideo.id}?autoplay=1&modestbranding=1`}
                title={selectedVideo.title}
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="w-full h-full"
              />
            </div>
            <div className="p-4">
              <button
                onClick={handleClosePlayer}
                className="w-full bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium py-2 rounded transition-colors"
              >
                Close Player
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Video Thumbnails Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {videos.map((video) => (
          <div
            key={video.youtube_id}
            className="group bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow duration-300 overflow-hidden cursor-pointer"
            onClick={() => handleSelectVideo(video)}
          >
            {/* Thumbnail */}
            <div className="relative aspect-video bg-gray-900 overflow-hidden">
              <img
                src={video.thumbnail}
                alt={video.title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                onError={(e) => {
                  (e.target as HTMLImageElement).src =
                    "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 400 300'%3E%3Crect fill='%23333' width='400' height='300'/%3E%3C/svg%3E";
                }}
              />
              {/* Play Button Overlay */}
              <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-40 transition-all flex items-center justify-center">
                <div className="w-16 h-16 bg-red-600 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-lg">
                  <svg
                    className="w-8 h-8 text-white ml-1"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path d="M8 5v14l11-7z" />
                  </svg>
                </div>
              </div>
            </div>

            {/* Video Info */}
            <div className="p-3 bg-white">
              <h3 className="font-semibold text-sm line-clamp-2 text-gray-900 group-hover:text-blue-600 transition-colors">
                {video.title}
              </h3>
              <p className="text-xs text-gray-600 mt-1 line-clamp-1">
                {video.channel}
              </p>
              <p className="text-xs text-gray-500 mt-2 line-clamp-2">
                {video.description || "Exercise tutorial"}
              </p>
              <div className="mt-3 flex items-center justify-between">
                <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                  Watch Demo
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Info Footer */}
      <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
        <p className="text-sm text-blue-800">
          ✓ All videos are verified and embeddable • Click any video to play
        </p>
      </div>
    </div>
  );
}
