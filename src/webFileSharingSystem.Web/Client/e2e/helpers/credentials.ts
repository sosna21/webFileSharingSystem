import { randomUUID } from 'crypto';

export type Credentials = {
  username: string;
  email: string;
  password: string;
};

export function createCredentials(): Credentials {
  const id = randomUUID();

  return {
    username: `e2e_user_${id}`,
    email: `e2e_${id}@example.com`,
    password: 'Pass123!',
  };
}
