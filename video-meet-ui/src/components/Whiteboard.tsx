import React, { useEffect, useState, useCallback, useRef } from 'react';
import { Excalidraw, MainMenu } from '@excalidraw/excalidraw';
import type { ExcalidrawImperativeAPI, Collaborator, SocketId } from '@excalidraw/excalidraw/types';
import type { ExcalidrawElement } from '@excalidraw/excalidraw/element/types';
import '@excalidraw/excalidraw/index.css';
import { RoomEvent, DataPacket_Kind, RemoteParticipant } from 'livekit-client';
import { useRoomStore } from '../store/useRoomStore';

const WHITEBOARD_TOPIC = 'whiteboard';
const CURSOR_TOPIC = 'cursor';

const stringToColor = (str: string): string => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = hash % 360;
  return `hsl(${hue}, 70%, 50%)`;
};

const Whiteboard: React.FC = () => {
  const { room, myUserName } = useRoomStore();
  const [excalidrawAPI, setExcalidrawAPI] = useState<ExcalidrawImperativeAPI | null>(null);
  const isRemoteUpdate = useRef(false);
  const lastSentData = useRef<string>('');
  const collaboratorsRef = useRef<Map<SocketId, Collaborator>>(new Map());

  useEffect(() => {
    if (!room || !excalidrawAPI) return;

    const handleDataReceived = (
      payload: Uint8Array,
      participant?: RemoteParticipant
    ) => {
      if (!participant) return;

      try {
        const decoder = new TextDecoder();
        const message = decoder.decode(payload);
        const data = JSON.parse(message);

        // In v1.x, topic is embedded in the payload
        if (data.topic === WHITEBOARD_TOPIC && data.elements) {
          isRemoteUpdate.current = true;
          excalidrawAPI.updateScene({ elements: data.elements });
          setTimeout(() => {
            isRemoteUpdate.current = false;
          }, 100);
        } else if (data.topic === CURSOR_TOPIC && data.pointer) {
          const participantId = participant.sid;
          const color = stringToColor(participantId);

          collaboratorsRef.current.set(participantId as SocketId, {
            pointer: { ...data.pointer, tool: 'pointer' as const },
            button: data.button,
            username: participant.identity || participantId,
            color: { background: color, stroke: color },
          });

          excalidrawAPI.updateScene({
            collaborators: collaboratorsRef.current,
          });
        }
      } catch (e) {
        console.error('Failed to parse data message:', e);
      }
    };

    const handleParticipantDisconnected = (participant: RemoteParticipant) => {
      collaboratorsRef.current.delete(participant.sid as SocketId);
      excalidrawAPI.updateScene({
        collaborators: collaboratorsRef.current,
      });
    };

    room.on(RoomEvent.DataReceived, handleDataReceived);
    room.on(RoomEvent.ParticipantDisconnected, handleParticipantDisconnected);

    return () => {
      room.off(RoomEvent.DataReceived, handleDataReceived);
      room.off(RoomEvent.ParticipantDisconnected, handleParticipantDisconnected);
    };
  }, [room, excalidrawAPI]);

  const handleChange = useCallback(
    (elements: readonly ExcalidrawElement[]) => {
      if (!room || isRemoteUpdate.current) return;

      const data = JSON.stringify({ topic: WHITEBOARD_TOPIC, elements });
      if (data === lastSentData.current) return;
      lastSentData.current = data;

      const encoder = new TextEncoder();
      const payload = encoder.encode(data);

      // Use reliable delivery for drawing elements (v1.x API)
      room.localParticipant.publishData(payload, DataPacket_Kind.RELIABLE).catch(error => {
        console.error('Error sending whiteboard data:', error);
      });
    },
    [room]
  );

  const handlePointerUpdate = useCallback(
    (payload: { pointer: { x: number; y: number; tool: 'pointer' | 'laser' }; button: 'down' | 'up' }) => {
      if (!room) return;

      const data = JSON.stringify({
        topic: CURSOR_TOPIC,
        pointer: payload.pointer,
        button: payload.button,
      });

      const encoder = new TextEncoder();
      const dataPayload = encoder.encode(data);

      // Use unreliable delivery for cursor updates (lower latency, v1.x API)
      room.localParticipant.publishData(dataPayload, DataPacket_Kind.LOSSY).catch(() => {
        // Ignore errors for cursor updates
      });
    },
    [room]
  );

  return (
    <div style={{ width: '100%', height: '100%', background: '#fff' }}>
      <style>{`
        .excalidraw .layer-ui__wrapper .layer-ui__wrapper__top-right .library-button,
        .excalidraw .App-menu .App-menu_bottom,
        .excalidraw [class*="library"],
        .excalidraw button[title*="Library"],
        .excalidraw .default-sidebar,
        .excalidraw .layer-ui__wrapper__footer-left {
          display: none !important;
        }
      `}</style>
      <Excalidraw
        excalidrawAPI={(api) => setExcalidrawAPI(api)}
        onChange={handleChange}
        onPointerUpdate={handlePointerUpdate}
        theme="light"
        name={myUserName}
        UIOptions={{
          canvasActions: {
            loadScene: false,
            saveToActiveFile: false,
            export: false,
            saveAsImage: false,
          },
          tools: {
            image: false,
          },
        }}
      >
        <MainMenu />
      </Excalidraw>
    </div>
  );
};

export default Whiteboard;
