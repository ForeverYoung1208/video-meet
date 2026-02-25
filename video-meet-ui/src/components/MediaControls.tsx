import React, { useState, useEffect, useCallback } from 'react';
import { Room } from 'livekit-client';

interface MediaControlsProps {
  room: Room;
}

const MediaControls: React.FC<MediaControlsProps> = ({ room }) => {
  const [audioMuted, setAudioMuted] = useState(false);
  const [videoMuted, setVideoMuted] = useState(false);
  const [audioDevices, setAudioDevices] = useState<MediaDeviceInfo[]>([]);
  const [videoDevices, setVideoDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedAudioDevice, setSelectedAudioDevice] = useState('');
  const [selectedVideoDevice, setSelectedVideoDevice] = useState('');
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => {
    const loadDevices = async () => {
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const audioDev = devices.filter(d => d.kind === 'audioinput');
        const videoDev = devices.filter(d => d.kind === 'videoinput');

        setAudioDevices(audioDev);
        if (audioDev.length > 0 && !selectedAudioDevice) {
          setSelectedAudioDevice(audioDev[0].deviceId);
        }

        setVideoDevices(videoDev);
        if (videoDev.length > 0 && !selectedVideoDevice) {
          setSelectedVideoDevice(videoDev[0].deviceId);
        }
      } catch (error) {
        console.error('Error loading devices:', error);
      }
    };

    loadDevices();
  }, [selectedAudioDevice, selectedVideoDevice]);

  const toggleAudio = useCallback(async () => {
    try {
      await room.localParticipant.setMicrophoneEnabled(!audioMuted);
      setAudioMuted(!audioMuted);
    } catch (error) {
      console.error('Error toggling audio:', error);
    }
  }, [audioMuted, room]);

  const toggleVideo = useCallback(async () => {
    try {
      await room.localParticipant.setCameraEnabled(!videoMuted);
      setVideoMuted(!videoMuted);
    } catch (error) {
      console.error('Error toggling video:', error);
    }
  }, [videoMuted, room]);

  const switchAudioDevice = useCallback(async (deviceId: string) => {
    try {
      setSelectedAudioDevice(deviceId);
      await room.switchActiveDevice('audioinput', deviceId);
    } catch (error) {
      console.error('Error switching audio device:', error);
    }
  }, [room]);

  const switchVideoDevice = useCallback(async (deviceId: string) => {
    try {
      setSelectedVideoDevice(deviceId);
      await room.switchActiveDevice('videoinput', deviceId);
    } catch (error) {
      console.error('Error switching video device:', error);
    }
  }, [room]);

  return (
    <div className="flex items-center gap-3 mb-4">
      <button
        onClick={toggleAudio}
        className={`px-4 py-2 rounded-lg font-medium transition ${
          audioMuted
            ? 'bg-red-600 hover:bg-red-700 text-white'
            : 'bg-gray-700 hover:bg-gray-600 text-white'
        }`}
      >
        {audioMuted ? 'Mic Off' : 'Mic On'}
      </button>

      <button
        onClick={toggleVideo}
        className={`px-4 py-2 rounded-lg font-medium transition ${
          videoMuted
            ? 'bg-red-600 hover:bg-red-700 text-white'
            : 'bg-gray-700 hover:bg-gray-600 text-white'
        }`}
      >
        {videoMuted ? 'Camera Off' : 'Camera On'}
      </button>

      <button
        onClick={() => setShowSettings(!showSettings)}
        className="px-4 py-2 rounded-lg bg-gray-700 hover:bg-gray-600 text-white font-medium transition"
      >
        Settings
      </button>

      {showSettings && (
        <div className="absolute top-20 right-4 bg-gray-800 border border-gray-600 rounded-xl p-4 shadow-lg z-10 w-80">
          <h3 className="text-white text-sm font-semibold mb-3">Devices</h3>

          <div className="mb-3">
            <label className="block text-gray-400 text-xs mb-1">Microphone</label>
            <select
              value={selectedAudioDevice}
              onChange={(e) => switchAudioDevice(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-gray-700 text-white text-sm border border-gray-600 focus:outline-none focus:border-blue-500"
            >
              {audioDevices.map((d) => (
                <option key={d.deviceId} value={d.deviceId}>
                  {d.label || `Microphone ${d.deviceId.slice(0, 8)}`}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-gray-400 text-xs mb-1">Camera</label>
            <select
              value={selectedVideoDevice}
              onChange={(e) => switchVideoDevice(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-gray-700 text-white text-sm border border-gray-600 focus:outline-none focus:border-blue-500"
            >
              {videoDevices.map((d) => (
                <option key={d.deviceId} value={d.deviceId}>
                  {d.label || `Camera ${d.deviceId.slice(0, 8)}`}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}
    </div>
  );
};

export default MediaControls;
