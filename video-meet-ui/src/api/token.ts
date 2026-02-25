// Get LiveKit token from OpenVidu Meet API
export async function getOpenViduMeetToken(roomName: string, participantName: string): Promise<{ token: string; url: string }> {
  try {
    // First, login to get access token
    const loginResponse = await fetch('https://for-test.click/internal-api/v1/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        username: 'admin',
        password: 'tutortest'
      })
    });

    if (!loginResponse.ok) {
      throw new Error('Failed to login');
    }

    const { accessToken } = await loginResponse.json();

    // Try to get room token (room might not exist, that's ok)
    const tokenResponse = await fetch(`https://for-test.click/internal-api/v1/rooms/${roomName}/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`
      },
      body: JSON.stringify({
        participantName: participantName,
      })
    });

    if (tokenResponse.ok) {
      const data = await tokenResponse.json();
      return {
        token: data.token,
        url: data.livekitUrl || 'wss://for-test.click/rtc'
      };
    }

    // If room doesn't exist, fall back to direct LiveKit token generation
    throw new Error('Room does not exist. Please create room first.');
  } catch (error) {
    console.error('Error getting token:', error);
    throw error;
  }
}
