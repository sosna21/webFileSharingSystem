import { APIRequestContext, expect } from '@playwright/test';

type LoginResponse = {
  user: {
    id: number;
    userName: string | null;
    emailAddress: string | null;
    photoUrl: string | null;
    photoMimeType: string | null;
    photoSize: number | null;
    photoUpdatedAt: string | null;
  };
  tokens: {
    token: string;
    refreshToken: string;
  };
};

export type SeededUser = {
  id: number;
  userName: string;
  email: string;
  token: string;
  roles: string[];
  photoUrl: string | null;
  photoMimeType: string | null;
  photoSize: number | null;
  photoUpdatedAt: string | null;
};

const apiBaseUrl = process.env.E2E_API_URL ?? 'https://localhost:5001/api';

export async function registerAndLogin(request: APIRequestContext, credentials: {
  username: string;
  password: string;
  email: string;
}): Promise<SeededUser> {
  const registerResponse = await request.post(`${apiBaseUrl}/Auth/Register`, {
    data: {
      username: credentials.username,
      password: credentials.password,
      email: credentials.email,
    }
  });

  if (!registerResponse.ok()) {
    const body = await registerResponse.text();
    throw new Error(`Register failed: ${registerResponse.status()} ${body}`);
  }

  const loginResponse = await request.post(`${apiBaseUrl}/Auth/Login`, {
    data: {
      username: credentials.username,
      password: credentials.password,
    }
  });

  expect(loginResponse.ok()).toBeTruthy();
  const payload = await loginResponse.json() as LoginResponse;

  return {
    id: payload.user.id,
    userName: payload.user.userName ?? credentials.username,
    email: payload.user.emailAddress ?? credentials.email,
    token: payload.tokens.token,
    roles: [],
    photoUrl: payload.user.photoUrl ?? null,
    photoMimeType: payload.user.photoMimeType ?? null,
    photoSize: payload.user.photoSize ?? null,
    photoUpdatedAt: payload.user.photoUpdatedAt ?? null,
  };
}

export async function registerUser(request: APIRequestContext, credentials: {
  username: string;
  password: string;
  email: string;
}): Promise<void> {
  const registerResponse = await request.post(`${apiBaseUrl}/Auth/Register`, {
    data: {
      username: credentials.username,
      password: credentials.password,
      email: credentials.email,
    },
  });

  if (!registerResponse.ok()) {
    const body = await registerResponse.text();
    throw new Error(`Register failed: ${registerResponse.status()} ${body}`);
  }
}

export async function createDirectory(request: APIRequestContext, token: string, name: string, parentId?: number): Promise<number> {
  const url = parentId === undefined
    ? `${apiBaseUrl}/File/CreateDir/${encodeURIComponent(name)}`
    : `${apiBaseUrl}/File/CreateDir/${encodeURIComponent(name)}?parentId=${parentId}`;

  const response = await request.post(url, {
    headers: {
      Authorization: `Bearer ${token}`,
    }
  });

  expect(response.ok()).toBeTruthy();
  const payload = await response.json() as { id: number };
  return payload.id;
}
