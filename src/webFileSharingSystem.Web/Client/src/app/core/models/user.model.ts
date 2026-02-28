export interface User {
    id: number;
    userName: string;
    email: string;
    usedSpace: number;
    quota: number;
    token: string;
    roles: string[];
}
