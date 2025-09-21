interface Video {
  id: string;
  title: string;
  description: string;
  youtube_url: string;
  thumbnail_url?: string;
  artist_id?: string;
  is_featured: boolean;
}

interface VideoCardProps {
  video: Video;
}

export const VideoCard = ({ video }: VideoCardProps) => {
  const isYouTubeUrl = video.youtube_url.includes('youtube.com') || video.youtube_url.includes('youtu.be');
  
  const openVideo = () => {
    if (isYouTubeUrl) {
      window.open(video.youtube_url, '_blank');
    }
  };

  const getYouTubeEmbedUrl = (url: string) => {
    if (url.includes('youtube.com/watch?v=')) {
      const videoId = url.split('v=')[1]?.split('&')[0];
      return `https://www.youtube.com/embed/${videoId}`;
    } else if (url.includes('youtu.be/')) {
      const videoId = url.split('youtu.be/')[1]?.split('?')[0];
      return `https://www.youtube.com/embed/${videoId}`;
    }
    return url;
  };

  return (
    <div className="group cursor-pointer">
      <div className="aspect-video overflow-hidden mb-3 bg-zinc-800 rounded relative">
        {isYouTubeUrl ? (
          // YouTube embed
          <div onClick={openVideo}>
            {video.thumbnail_url ? (
              <img 
                src={video.thumbnail_url} 
                alt={`${video.title} thumbnail`}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              />
            ) : (
              <iframe
                src={getYouTubeEmbedUrl(video.youtube_url)}
                title={video.title}
                className="w-full h-full border-0"
                allowFullScreen
              />
            )}
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm">
                <div className="w-0 h-0 border-l-[12px] border-l-white border-t-[9px] border-t-transparent border-b-[9px] border-b-transparent ml-1"></div>
              </div>
            </div>
          </div>
        ) : (
          // Direct video file
          <video 
            src={video.youtube_url}
            poster={video.thumbnail_url}
            controls
            className="w-full h-full object-cover"
          >
            Your browser does not support the video tag.
          </video>
        )}
        
        {isYouTubeUrl && !video.thumbnail_url && (
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
            <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm">
              <div className="w-0 h-0 border-l-[12px] border-l-white border-t-[9px] border-t-transparent border-b-[9px] border-b-transparent ml-1"></div>
            </div>
          </div>
        )}
      </div>
      <h3 className="font-semibold text-sm mb-1 group-hover:text-gold transition-colors">
        {video.title}
      </h3>
      {video.description && (
        <p className="text-xs text-zinc-400 line-clamp-2">{video.description}</p>
      )}
    </div>
  );
};