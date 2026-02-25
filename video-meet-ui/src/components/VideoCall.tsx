import React, { useState } from 'react';
import { LiveKitRoom, VideoConference, useParticipants } from "@livekit/components-react";
import Whiteboard from './Whiteboard';
import { Button } from './ui/button';
import { Card, CardHeader, CardTitle, CardContent } from './ui/card';
import { Input } from './ui/input';
import { VideoPresets } from "livekit-client";
import { Header } from './Header';

const LIVEKIT_URL = 'wss://for-test.click';
const TOKEN = 'eyJhbGciOiJIUzI1NiJ9.eyJtZXRhZGF0YSI6IntcImxpdmVraXRVcmxcIjpcIndzczovL2Zvci10ZXN0LmNsaWNrOjQ0My9cIixcInJvbGVcIjpcIm1vZGVyYXRvclwiLFwicGVybWlzc2lvbnNcIjp7XCJjYW5SZWNvcmRcIjp0cnVlLFwiY2FuUmV0cmlldmVSZWNvcmRpbmdzXCI6dHJ1ZSxcImNhbkRlbGV0ZVJlY29yZGluZ3NcIjp0cnVlLFwiY2FuQ2hhdFwiOnRydWUsXCJjYW5DaGFuZ2VWaXJ0dWFsQmFja2dyb3VuZFwiOnRydWV9fSIsIm5hbWUiOiJhZG1pbiIsInZpZGVvIjp7InJvb21Kb2luIjp0cnVlLCJyb29tIjoic3luY19tZWV0LTNncWV3cjZrdzg0MHNrciIsImNhblB1Ymxpc2giOnRydWUsImNhblN1YnNjcmliZSI6dHJ1ZSwiY2FuUHVibGlzaERhdGEiOnRydWUsImNhblVwZGF0ZU93bk1ldGFkYXRhIjp0cnVlfSwiaXNzIjoiQVBJbk92MTlQV2VTc1dOIiwiZXhwIjoxNzcwMjI3MzMxLCJuYmYiOjAsInN1YiI6ImFkbWluLXQzYXBybWpicHhxcGVjMCJ9.nvxLPg79esCBnwk6DL2as0E6XL7cAVF7MYXEN8tX9NY'

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
  const [myUserName, setMyUserName] = useState('User-' + Math.random().toString(36).substring(7));
  const [mySessionId, setMySessionId] = useState('RoomA');

  const joinSession = () => {
    setIsConnected(true);
  };

  const leaveSession = () => {
    setIsConnected(false);
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
                <label className="block text-gray-300 text-sm mb-1">Username</label>
                <Input
                  type="text"
                  value={myUserName}
                  onChange={(e) => setMyUserName(e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="block text-gray-300 text-sm mb-1">Room ID</label>
                <Input
                  type="text"
                  value={mySessionId}
                  onChange={(e) => setMySessionId(e.target.value)}
                  required
                />
              </div>
              <Button type="submit" className="w-full">
                Join
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <LiveKitRoom
      token={TOKEN}
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

/* ==================== OLD CUSTOM IMPLEMENTATION (COMMENTED OUT) ==================== */

/*
import { useCallback, useEffect, useRef } from 'react';
import { Room, RoomEvent, Track, RemoteTrack, RemoteParticipant } from 'livekit-client';
import UserVideoComponent from './UserVideoComponent';
import MediaControls from './MediaControls';
import { useRoomStore } from '../store/useRoomStore';

const LIVEKIT_API_KEY = 'APInOv19PMeSwN';
const LIVEKIT_API_SECRET = 'rY3XNaSDwO0dIekne89kGMeRbz2wbHC5CsLhcn';

// Generate JWT token for LiveKit using Web Crypto API
const generateToken = async (roomName: string, participantName: string): Promise<string> => {
  const encoder = new TextEncoder();

  // Create JWT header
  const header = {
    alg: 'HS256',
    typ: 'JWT'
  };

  // Create JWT payload with LiveKit required claims
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    exp: now + 3600, // Token expires in 1 hour
    iss: LIVEKIT_API_KEY,
    nbf: now,
    sub: participantName,
    name: participantName,
    video: {
      room: roomName,
      roomJoin: true,
      canPublish: true,
      canSubscribe: true
    }
  };

  // Encode header and payload
  const base64UrlEncode = (str: string) => {
    return btoa(str)
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');
  };

  const headerB64 = base64UrlEncode(JSON.stringify(header));
  const payloadB64 = base64UrlEncode(JSON.stringify(payload));
  const message = `${headerB64}.${payloadB64}`;

  // Sign with HMAC-SHA256
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(LIVEKIT_API_SECRET),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signature = await crypto.subtle.sign(
    'HMAC',
    key,
    encoder.encode(message)
  );

  // Convert signature to base64url
  const signatureB64 = base64UrlEncode(
    String.fromCharCode(...new Uint8Array(signature))
  );

  return `${message}.${signatureB64}`;
};

// OLD COMPONENT LOGIC
const VideoCallOld: React.FC = () => {
  const {
    room,
    localVideoTrack,
    localAudioTrack,
    remoteParticipants,
    myUserName,
    mySessionId,
    isConnected,
    showWhiteboard,
    setRoom,
    setLocalVideoTrack,
    setLocalAudioTrack,
    setRemoteParticipants,
    setMyUserName,
    setMySessionId,
    setIsConnected,
    setShowWhiteboard,
    reset,
  } = useRoomStore();

  const roomRef = useRef<Room | null>(null);

  useEffect(() => {
    const handleBeforeUnload = () => leaveSession();
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      if (roomRef.current) {
        roomRef.current.disconnect();
      }
    };
  }, []);

  const joinSession = useCallback(async () => {
    try {
      // Generate LiveKit token
      const token = await generateToken(mySessionId, myUserName);

      // Create Room instance
      const newRoom = new Room();
      roomRef.current = newRoom;

      // Set up event listeners
      newRoom.on(RoomEvent.TrackSubscribed, (track: RemoteTrack, publication, participant: RemoteParticipant) => {
        console.log('Track subscribed:', track.kind, participant.identity);

        setRemoteParticipants(prev => {
          const existing = prev.find(p => p.participantId === participant.sid);
          if (existing) {
            // Update existing participant
            return prev.map(p =>
              p.participantId === participant.sid
                ? {
                    ...p,
                    videoTrack: track.kind === Track.Kind.Video ? track : p.videoTrack,
                    audioTrack: track.kind === Track.Kind.Audio ? track : p.audioTrack,
                  }
                : p
            );
          } else {
            // Add new participant
            return [
              ...prev,
              {
                participantId: participant.sid,
                participant,
                userName: participant.identity,
                videoTrack: track.kind === Track.Kind.Video ? track : undefined,
                audioTrack: track.kind === Track.Kind.Audio ? track : undefined,
              }
            ];
          }
        });
      });

      newRoom.on(RoomEvent.TrackUnsubscribed, (track: RemoteTrack, publication, participant: RemoteParticipant) => {
        console.log('Track unsubscribed:', track.kind, participant.identity);

        setRemoteParticipants(prev =>
          prev.map(p =>
            p.participantId === participant.sid
              ? {
                  ...p,
                  videoTrack: track.kind === Track.Kind.Video ? undefined : p.videoTrack,
                  audioTrack: track.kind === Track.Kind.Audio ? undefined : p.audioTrack,
                }
              : p
          ).filter(p => p.videoTrack || p.audioTrack) // Remove if no tracks
        );
      });

      newRoom.on(RoomEvent.ParticipantConnected, (participant: RemoteParticipant) => {
        console.log('Participant connected:', participant.identity);
      });

      newRoom.on(RoomEvent.ParticipantDisconnected, (participant: RemoteParticipant) => {
        console.log('Participant disconnected:', participant.identity);
        setRemoteParticipants(prev =>
          prev.filter(p => p.participantId !== participant.sid)
        );
      });

      newRoom.on(RoomEvent.Disconnected, () => {
        console.log('Disconnected from room');
        reset();
        roomRef.current = null;
      });

      // Connect to room
      console.log('Connecting to room with token:', TOKEN);
      console.log(LIVEKIT_URL);

      // Connect with hardcoded token
      await newRoom.connect(LIVEKIT_URL, TOKEN);
      console.log('Connected to room:', mySessionId);

      // Enable local video and audio
      await newRoom.localParticipant.enableCameraAndMicrophone();

      // Get local tracks (LiveKit v1.x API)
      const videoPublications = Array.from(newRoom.localParticipant.videoTracks.values());
      const audioPublications = Array.from(newRoom.localParticipant.audioTracks.values());
      const videoTrack = videoPublications[0]?.track;
      const audioTrack = audioPublications[0]?.track;

      setRoom(newRoom);
      setLocalVideoTrack(videoTrack || null);
      setLocalAudioTrack(audioTrack || null);
      setIsConnected(true);

    } catch (error) {
      console.error('Error connecting to session:', error);
      if (roomRef.current) {
        roomRef.current.disconnect();
      }
    }
  }, [mySessionId, myUserName, setRoom, setLocalVideoTrack, setLocalAudioTrack, setRemoteParticipants, setIsConnected, reset]);

  const leaveSession = useCallback(() => {
    if (roomRef.current) {
      roomRef.current.disconnect();
    }
    reset();
    roomRef.current = null;
  }, [reset]);

  // OLD RENDER
  return (
    <div className="h-screen bg-gray-900 flex flex-col">
      <div className="flex items-center justify-between p-4 border-b border-gray-700">
        <h2 className="text-white text-xl font-semibold">
          Room: {mySessionId}
        </h2>
        <div className="flex gap-2">
          <Button
            variant={showWhiteboard ? "default" : "secondary"}
            onClick={() => setShowWhiteboard(!showWhiteboard)}
          >
            {showWhiteboard ? 'Hide Whiteboard' : 'Show Whiteboard'}
          </Button>
          <Button variant="destructive" onClick={leaveSession}>
            Leave Room
          </Button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        <div className={`${showWhiteboard ? 'w-80' : 'flex-1'} flex flex-col p-4 overflow-y-auto border-r border-gray-700`}>
          {room && (
            <MediaControls room={room} />
          )}

          {localVideoTrack && (
            <div className="mb-4">
              <h3 className="text-gray-400 text-sm mb-2">You ({myUserName})</h3>
              <UserVideoComponent track={localVideoTrack} participantName={myUserName} />
            </div>
          )}

          {remoteParticipants.length > 0 && (
            <div>
              <h3 className="text-gray-400 text-sm mb-2">Participants</h3>
              <div className={`grid gap-2 ${showWhiteboard ? 'grid-cols-1' : 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4'}`}>
                {remoteParticipants.map((participant) => (
                  participant.videoTrack && (
                    <div key={participant.participantId}>
                      <UserVideoComponent
                        track={participant.videoTrack}
                        participantName={participant.userName}
                      />
                    </div>
                  )
                ))}
              </div>
            </div>
          )}
        </div>

        {showWhiteboard && (
          <div className="flex-1">
            <Whiteboard />
          </div>
        )}
      </div>
    </div>
  );
};
*/
