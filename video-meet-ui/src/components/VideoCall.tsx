import React, { useState } from 'react';
import { LiveKitRoom, VideoConference, useParticipants } from "@livekit/components-react";
import Whiteboard from './Whiteboard';
import { Button } from './ui/button';
import { Card, CardHeader, CardTitle, CardContent } from './ui/card';
import { Input } from './ui/input';
import { VideoPresets } from "livekit-client";
import { Header } from './Header';
import { meetingsApi } from '../api/meetingsApi';

const LIVEKIT_URL = import.meta.env.VITE_LIVEKIT_URL || 'ws://localhost:7880';

// Custom component inside LiveKitRoom to access room state
const VideoCallContent: React.FC<{ onLeave: () => void }> = ({ onLeave }) => {
  const [showWhiteboard, setShowWhiteboard] = useState(false);
  const participants = useParticipants();

  return (
    <div className="h-screen bg-gray-900 flex flex-col">
      <Header />
      <div className="flex items-center justify-between p-4 border-b border-gray-700">
        <h2 className="text-white text-xl font-semibold">
          LiveKit Video Conference ({participants.length} participants)
        </h2>
        <div className="flex gap-2">
          <Button
            variant={showWhiteboard ? "default" : "secondary"}
            onClick={() => setShowWhiteboard(!showWhiteboard)}
          >
            {showWhiteboard ? 'Hide Whiteboard' : 'Show Whiteboard'}
          </Button>
          <Button variant="destructive" onClick={onLeave}>
            Leave Room
          </Button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        <div className={`${showWhiteboard ? 'w-2/3' : 'flex-1'} flex flex-col overflow-hidden`}>
          <VideoConference />
        </div>

        {showWhiteboard && (
          <div className="flex-1 border-l border-gray-700">
            <Whiteboard />
          </div>
        )}
      </div>
    </div>
  );
};

const VideoCall: React.FC = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [roomTitle, setRoomTitle] = useState('');
  const [token, setToken] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const joinSession = async () => {
    if (!roomTitle.trim()) {
      setError('Please enter a room title');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      // Create meeting
      const meeting = await meetingsApi.createMeeting(roomTitle);
      console.log('Meeting created:', meeting);

      // Get room token
      const roomToken = await meetingsApi.getRoomToken(meeting.id);
      console.log('Room token obtained:', roomToken);

      setToken(roomToken.token);
      setIsConnected(true);
    } catch (err: any) {
      console.error('Failed to join session:', err);
      setError(err.response?.data?.message || 'Failed to join session');
    } finally {
      setIsLoading(false);
    }
  };

  const leaveSession = () => {
    setIsConnected(false);
    setToken('');
    setRoomTitle('');
  };

  if (!isConnected) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-2xl text-center">LiveKit Video Call</CardTitle>
          </CardHeader>
          <CardContent>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                joinSession();
              }}
              className="space-y-4"
            >
              <div>
                <label className="block text-gray-300 text-sm mb-1">Room Title</label>
                <Input
                  type="text"
                  value={roomTitle}
                  onChange={(e) => setRoomTitle(e.target.value)}
                  placeholder="Enter room title"
                  required
                  disabled={isLoading}
                />
              </div>
              {error && (
                <div className="text-red-500 text-sm">{error}</div>
              )}
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? 'Joining...' : 'Join'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <LiveKitRoom
      token={token}
      serverUrl={LIVEKIT_URL}
      connect={true}
      audio={true}
      onDisconnected={leaveSession}
      video={{
        resolution: VideoPresets.h360,
        facingMode: 'user',
      }}

      options={{
        videoCaptureDefaults: {
          resolution: VideoPresets.h360,
        },
        publishDefaults: {
          videoCodec: 'vp9',
          videoEncoding: {
            maxBitrate: 2500000,
            maxFramerate: 30,
          },
          simulcast: true,
        },
        adaptiveStream: true,
        dynacast: true,
      }}
    >
      <VideoCallContent onLeave={leaveSession} />
    </LiveKitRoom>
  );
};

export default VideoCall;