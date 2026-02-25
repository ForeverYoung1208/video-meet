import React, { useRef, useEffect } from 'react';
import { Track } from 'livekit-client';

interface UserVideoComponentProps {
  track: Track;
  participantName: string;
}

const UserVideoComponent: React.FC<UserVideoComponentProps> = ({
  track,
  participantName
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (track && videoRef.current) {
      // Attach the track to the video element
      track.attach(videoRef.current);

      // Cleanup: detach track when component unmounts or track changes
      return () => {
        track.detach(videoRef.current!);
      };
    }
  }, [track]);

  return (
    <div className="relative">
      <video
        autoPlay
        playsInline
        ref={videoRef}
        className="w-full rounded-lg bg-gray-800"
      />
      <p className="absolute bottom-2 left-2 bg-black/60 text-white text-sm px-2 py-1 rounded">
        {participantName}
      </p>
    </div>
  );
};

export default UserVideoComponent;
