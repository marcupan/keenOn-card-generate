export enum ErrorCode {
	BAD_REQUEST = 'BAD_REQUEST',
	UNAUTHORIZED = 'UNAUTHORIZED',
	FORBIDDEN = 'FORBIDDEN',
	NOT_FOUND = 'NOT_FOUND',
	CONFLICT = 'CONFLICT',
	VALIDATION_ERROR = 'VALIDATION_ERROR',
	INTERNAL_SERVER_ERROR = 'INTERNAL_SERVER_ERROR',
	SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',
	GATEWAY_TIMEOUT = 'GATEWAY_TIMEOUT',
}

export interface ErrorResponse {
	code: ErrorCode;
	message: string;
	details?: Record<string, unknown>;
	stack?: string;
}

export interface ValidationError {
	field: string;
	message: string;
}

export type ErrorType = {
	code?: string;
	message?: string;
};
