export interface ToastInfo {
    id: number;
    header: string;
    body: string;
    type?: MessageSeverity;
    delay?: number;
}

export enum MessageSeverity {
    default = 'default',
    info = 'info',
    success = 'success',
    error = 'error'
}