import { create } from 'zustand';
import { Room, RemoteParticipant, RemoteTrack, LocalTrack } from 'livekit-client';

export interface RemoteParticipantInfo {
  participantId: string;
  participant: RemoteParticipant;
  userName: string;
  videoTrack?: RemoteTrack;
  audioTrack?: RemoteTrack;
}

interface RoomState {
  room: Room | null;
  localVideoTrack: LocalTrack | null;
  localAudioTrack: LocalTrack | null;
  remoteParticipants: RemoteParticipantInfo[];
  myUserName: string;
  mySessionId: string;
  isConnected: boolean;
  showWhiteboard: boolean;

  setRoom: (room: Room | null) => void;
  setLocalVideoTrack: (track: LocalTrack | null) => void;
  setLocalAudioTrack: (track: LocalTrack | null) => void;
  setRemoteParticipants: (participants: RemoteParticipantInfo[] | ((prev: RemoteParticipantInfo[]) => RemoteParticipantInfo[])) => void;
  setMyUserName: (name: string) => void;
  setMySessionId: (id: string) => void;
  setIsConnected: (connected: boolean) => void;
  setShowWhiteboard: (show: boolean) => void;
  reset: () => void;
}

const initialState = {
  room: null,
  localVideoTrack: null,
  localAudioTrack: null,
  remoteParticipants: [],
  myUserName: 'User_' + Math.floor(Math.random() * 100),
  mySessionId: 'RoomA',
  isConnected: false,
  showWhiteboard: false,
};

export const useRoomStore = create<RoomState>((set) => ({
  ...initialState,

  setRoom: (room) => set({ room }),
  setLocalVideoTrack: (track) => set({ localVideoTrack: track }),
  setLocalAudioTrack: (track) => set({ localAudioTrack: track }),
  setRemoteParticipants: (participants) => set((state) => ({
    remoteParticipants: typeof participants === 'function' ? participants(state.remoteParticipants) : participants
  })),
  setMyUserName: (name) => set({ myUserName: name }),
  setMySessionId: (id) => set({ mySessionId: id }),
  setIsConnected: (connected) => set({ isConnected: connected }),
  setShowWhiteboard: (show) => set({ showWhiteboard: show }),
  reset: () => set(initialState),
}));
