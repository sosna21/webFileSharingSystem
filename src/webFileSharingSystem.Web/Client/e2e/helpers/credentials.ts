export type Credentials = {
  username: string;
  email: string;
  password: string;
};

export function createCredentials(seed: number = Date.now()): Credentials {
  const unique = seed.toString();
  return {
    username: `e2e_user_${unique}`,
    email: `e2e_${unique}@example.com`,
    password: 'Pass123!',
  };
}
