import apiClient from './apiClient';

export interface Meeting {
  id: string;
  title: string;
  sessionId: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface RoomToken {
  identity: string;
  token: string;
}

export const meetingsApi = {
  createMeeting: async (title: string): Promise<Meeting> => {
    const response = await apiClient.post('/api/meetings', { title });
    return response.data;
  },

  getRoomToken: async (meetingId: string): Promise<RoomToken> => {
    const response = await apiClient.get(`/api/meetings/${meetingId}/room-token`);
    return response.data;
  },
};
