export default class AppError extends Error {
	status: string;
	isOperational: boolean;
	originalError?: unknown;

	constructor(
		public statusCode: number = 500,
		public message: string,
		options?: { originalError?: unknown }
	) {
		super(message);
		this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
		this.isOperational = true;
		this.originalError = options?.originalError;
		Error.captureStackTrace(this, this.constructor);
	}
}
