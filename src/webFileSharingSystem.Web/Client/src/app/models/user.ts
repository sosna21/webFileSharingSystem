export interface User {
    id: number;
    username: string;
    email: string;
    usedSpace: number;
    quota: number;
    token: string;
    roles: string[];
}
