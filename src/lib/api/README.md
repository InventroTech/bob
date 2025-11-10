# API Module Documentation

This directory contains the centralized API client and services for making backend API calls.

## Structure

```
lib/api/
├── client.ts          # Axios instance with interceptors
├── config.ts          # API configuration & base URLs
├── interceptors.ts    # Request/response interceptors
├── errors.ts          # Custom error classes
├── types.ts           # API response types
├── index.ts           # Central export point
└── services/          # Domain-specific API services
    └── auth.ts        # Authentication API calls
```

## Usage

### Basic Usage - Using Services

```typescript
import { authService } from '@/lib/api/services/auth';

// Link user UID after login
const result = await authService.linkUserUid(
  { uid: user.id, email: user.email },
  'tenant-slug' // optional
);
```

### Direct Client Usage

```typescript
import { apiClient } from '@/lib/api';

// Make API calls directly
const response = await apiClient.get('/some-endpoint/');
const data = response.data;
```

### Error Handling

```typescript
import { authService } from '@/lib/api/services/auth';
import { ApiError, AuthenticationError } from '@/lib/api';

try {
  await authService.linkUserUid(data);
} catch (error) {
  if (error instanceof AuthenticationError) {
    // Handle 401
  } else if (error instanceof ApiError) {
    // Handle other API errors
  }
}
```

## Features

-  Automatic authentication token injection
-  Automatic tenant slug header injection
-  Centralized error handling
-  TypeScript types for all requests/responses
-  Backward compatibility with legacy fetch calls

## Migration Guide

### Old Way (Legacy)
```typescript
const response = await fetch(`${baseUrl}/accounts/link-user-uid/`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
    'X-Tenant-Slug': 'tenant-slug'
  },
  body: JSON.stringify({ uid, email })
});
```

### New Way (Recommended)
```typescript
import { authService } from '@/lib/api/services/auth';

const result = await authService.linkUserUid(
  { uid, email },
  'tenant-slug'
);
```


