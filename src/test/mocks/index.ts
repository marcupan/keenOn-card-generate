import { User } from '../../entities';

interface MockResponse {
	status: jest.Mock;
	json: jest.Mock;
	cookie: jest.Mock;
	clearCookie: jest.Mock;
}

// Mock user data
export const mockUser: Partial<User> = {
	id: '1',
	name: 'Test User',
	email: 'test@example.com',
	password: '$2a$12$abcdefghijklmnopqrstuvwxyz123456',
	verified: true,
	verificationCode: null,
	created_at: new Date(),
	updated_at: new Date(),
};

// Mock user repository
export const mockUserRepository = () => ({
	findOne: jest.fn(),
	findByEmail: jest.fn(),
	findById: jest.fn(),
	create: jest.fn(),
	save: jest.fn(),
});

// Mock redis service
export const mockRedisService = () => ({
	get: jest.fn(),
	set: jest.fn(),
	del: jest.fn(),
	ping: jest.fn(),
});

// Mock email service
export const mockEmailService = () => ({
	sendVerificationCode: jest.fn(),
	sendPasswordResetToken: jest.fn(),
});

// Mock JWT functions
export const mockJwtFunctions = {
	signJwt: jest.fn(),
	verifyJwt: jest.fn(),
};

// Helper function to create a mock response object
export const mockResponse = (): MockResponse => {
	const res = {} as MockResponse;

	res.status = jest.fn().mockReturnValue(res);
	res.json = jest.fn().mockReturnValue(res);
	res.cookie = jest.fn().mockReturnValue(res);
	res.clearCookie = jest.fn().mockReturnValue(res);

	return res;
};

// Helper function to create a mock request object
export const mockRequest = (overrides = {}) => {
	return {
		body: {},
		params: {},
		query: {},
		headers: {},
		cookies: {},
		user: null,
		...overrides,
	};
};
