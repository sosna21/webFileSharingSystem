export interface User {
    id: number;
    username: string;
    email: string;
    UsedSpace: number;
    quota: number;
    token: string;
    roles: string[];
}
