# Authentication Integration Guide

## Overview

Система авторизации и регистрации реализована на фронтенде с использованием:
- **JWT токены** (Access + Refresh)
- **Axios** с автоматическим обновлением токенов
- **Zustand** для state management
- **React Router v6** с защищенными маршрутами
- **shadcn/ui** + Tailwind CSS для UI

## Quick Start

### 1. Configuration

Создайте файл `.env` на основе `.env.example`:

```bash
cp .env.example .env
```

Настройте URL вашего backend API:

```env
VITE_API_URL=http://localhost:3000
```

### 2. Install Dependencies

Зависимости уже установлены. Если нужно переустановить:

```bash
npm install
```

### 3. Run Development Server

```bash
npm run dev
```

Приложение будет доступно на `http://localhost:5173` (или другом порту, указанном Vite).

## Backend Requirements

### Required API Endpoints

Backend должен реализовать следующие endpoints:

| Endpoint | Method | Auth Required | Description |
|----------|--------|---------------|-------------|
| `/auth/register` | POST | No | Регистрация нового пользователя |
| `/auth/login` | POST | No | Аутентификация пользователя |
| `/auth/me` | GET | Yes | Получение информации о текущем пользователе |
| `/auth/tokens` | POST | No (refresh token) | Обновление access токена |
| `/auth/logout` | POST | Yes | Выход из системы |
| `/auth/change-password` | POST | Yes | Смена пароля |
| `/auth/password-recovery` | POST | No | Отправка email для восстановления |
| `/auth/password-reset` | POST | No (email token) | Сброс пароля по токену |

### Request/Response Formats

#### POST /auth/register

**Request:**
```json
{
  "email": "user@example.com",
  "password": "securepassword",
  "username": "optional_username"
}
```

**Response (200):**
```json
{
  "accessToken": "eyJhbGc...",
  "refreshToken": "eyJhbGc...",
  "user": {
    "id": "user-uuid",
    "email": "user@example.com",
    "username": "optional_username",
    "createdAt": "2026-02-06T12:00:00Z"
  }
}
```

#### POST /auth/login

**Request:**
```json
{
  "email": "user@example.com",
  "password": "securepassword"
}
```

**Response (200):**
```json
{
  "accessToken": "eyJhbGc...",
  "refreshToken": "eyJhbGc...",
  "user": {
    "id": "user-uuid",
    "email": "user@example.com",
    "username": "username"
  }
}
```

**Error (401):**
```json
{
  "message": "Invalid credentials"
}
```

#### GET /auth/me

**Headers:**
```
Access-Token: Bearer <access_token>
```

**Response (200):**
```json
{
  "id": "user-uuid",
  "email": "user@example.com",
  "username": "username",
  "createdAt": "2026-02-06T12:00:00Z"
}
```

**Error (401):**
```json
{
  "message": "Unauthorized"
}
```

#### POST /auth/tokens

**Request:**
```json
{
  "refreshToken": "eyJhbGc..."
}
```

**Response (200):**
```json
{
  "accessToken": "eyJhbGc...",
  "refreshToken": "eyJhbGc..."
}
```

**Error (401):**
```json
{
  "message": "Invalid or expired refresh token"
}
```

#### POST /auth/logout

**Headers:**
```
Access-Token: Bearer <access_token>
```

**Response (200):**
```json
{
  "message": "Logged out successfully"
}
```

## Authentication Flow

### Login Flow

1. User enters credentials on `/login` page
2. Frontend sends POST request to `/auth/login`
3. Backend validates credentials and returns tokens + user data
4. Frontend stores tokens in localStorage
5. Frontend redirects to home page (VideoCall)

### Token Refresh Flow

1. User makes authenticated request (e.g., GET `/auth/me`)
2. Frontend adds `Access-Token: Bearer <token>` header
3. If access token is expired (401 response):
   - Frontend pauses the request
   - Sends refresh token to `/auth/tokens`
   - Receives new access + refresh tokens
   - Retries original request with new access token
4. If refresh token is expired:
   - Frontend clears tokens
   - Redirects to `/login`

### Protected Routes

All routes except `/login` and `/register` are protected:
- User must be authenticated to access
- Unauthenticated users are redirected to `/login`
- After successful login, user is redirected back to the original page

## Token Storage

Tokens are stored in **localStorage**:
- `access_token` - Short-lived JWT for API requests
- `refresh_token` - Long-lived JWT for token refresh

### Security Considerations

**Pros of localStorage:**
- Persists across page refreshes
- Easy to implement
- Works well with SPAs

**Cons of localStorage:**
- Vulnerable to XSS attacks
- Not secure if app has XSS vulnerabilities

**Alternative: sessionStorage**
To use sessionStorage instead, modify `src/api/apiClient.ts`:

```typescript
// Change localStorage to sessionStorage
export const tokenService = {
  getAccessToken: (): string | null => {
    return sessionStorage.getItem('access_token'); // was localStorage
  },
  // ... other methods
};
```

## Testing Without Backend

### Test Login Form Validation

1. Go to `http://localhost:5173/login`
2. Try submitting empty form - should show validation error
3. Try invalid email - should show validation error
4. Enter valid email/password - will fail with API error (expected)

### Test Protected Routes

1. Clear localStorage in DevTools
2. Try to access `http://localhost:5173/` - should redirect to `/login`
3. Login successfully - should redirect back to `/`

### Test Logout

1. Login successfully
2. Click "Logout" button in header
3. Should clear tokens and redirect to `/login`

## Project Structure

```
openvidu-app/src/
├── api/
│   ├── apiClient.ts        # Axios instance with interceptors
│   └── authApi.ts          # Auth API methods
├── store/
│   └── useAuthStore.ts     # Zustand auth state management
├── components/
│   ├── Login.tsx           # Login page
│   ├── Register.tsx        # Registration page
│   ├── Header.tsx          # Header with user info and logout
│   ├── ProtectedRoute.tsx  # HOC for protected routes
│   └── VideoCall.tsx       # Main video call component (protected)
└── App.tsx                 # Router configuration
```

## Common Issues

### CORS Errors

If you see CORS errors in browser console:

1. **Backend must allow CORS** from frontend origin
2. Add these headers in backend:
   ```
   Access-Control-Allow-Origin: http://localhost:5173
   Access-Control-Allow-Headers: Content-Type, Access-Token
   Access-Control-Allow-Methods: GET, POST, PUT, DELETE
   ```

### Token Expiration

**Access Token:** Should expire in 15-30 minutes (recommended)
**Refresh Token:** Should expire in 7-30 days (recommended)

### 401 Loops

If you experience infinite redirect loops:
1. Check that `/auth/tokens` endpoint works correctly
2. Verify refresh token is valid and not expired
3. Check backend token validation logic

## Next Steps

1. **Backend Integration:**
   - Implement all required API endpoints
   - Test with real backend server
   - Adjust token expiration times

2. **Optional Features:**
   - Add Password Recovery UI
   - Add Change Password UI
   - Add "Remember Me" checkbox
   - Improve error messages
   - Add toast notifications
   - Add loading skeletons

3. **Production:**
   - Set up proper environment variables
   - Configure CORS for production domain
   - Consider using HTTP-only cookies instead of localStorage
   - Add rate limiting
   - Add CSRF protection

## Support

For issues or questions, refer to:
- `CLAUDE.md` - Project documentation
- `.memory/currentWork.md` - Implementation details
- Source code comments
