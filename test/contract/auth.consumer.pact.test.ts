import { Pact } from '@pact-foundation/pact';
import path from 'path';
import axios from 'axios';
import type { AxiosInstance, AxiosError } from 'axios';

const CONSUMER_NAME = 'KeenOnFrontend';
const PROVIDER_NAME = 'KeenOnCardGenerateAPI';

const provider = new Pact({
	consumer: CONSUMER_NAME,
	provider: PROVIDER_NAME,
	log: path.resolve(process.cwd(), 'logs', 'pact.log'),
	logLevel: 'warn',
	dir: path.resolve(process.cwd(), 'pacts'),
	spec: 2,
	port: 8080,
});

const API_PORT = 8080;
const API_HOST = `http://localhost:${API_PORT}`;

let apiClient: AxiosInstance;

describe('Auth API Contract Tests', () => {
	beforeAll(async () => {
		await provider.setup();

		// Create axios client after provider setup
		apiClient = axios.create({
			baseURL: API_HOST,
			headers: {
				'Content-Type': 'application/json',
			},
			timeout: 10000,
		});
	});

	afterAll(async () => {
		await provider.finalize();
	});

	afterEach(async () => {
		await provider.verify();
	});

	describe('POST /api/auth/register', () => {
		const REGISTER_PATH = '/api/auth/register';
		const validUser = {
			name: 'Test User',
			email: 'test@example.com',
			password: 'Password123!',
			passwordConfirm: 'Password123!',
		};

		test('successfully registers a new user', async () => {
			await provider.addInteraction({
				state: 'no existing user with email test@example.com',
				uponReceiving: 'a request to register a new user',
				withRequest: {
					method: 'POST',
					path: REGISTER_PATH,
					headers: {
						'Content-Type': 'application/json',
					},
					body: validUser,
				},
				willRespondWith: {
					status: 201,
					headers: {
						'Content-Type': 'application/json; charset=utf-8',
					},
					body: {
						status: 'success',
						message:
							'Registration successful. Please check your email to verify your account.',
					},
				},
			});

			const response = await apiClient.post(REGISTER_PATH, validUser);

			expect(response.status).toBe(201);
			expect(response.data.status).toBe('success');
			expect(response.data.message).toContain('Registration successful');
		});

		test('returns 409 when user with email already exists', async () => {
			await provider.addInteraction({
				state: 'existing user with email test@example.com',
				uponReceiving:
					'a request to register a user with an existing email',
				withRequest: {
					method: 'POST',
					path: REGISTER_PATH,
					headers: {
						'Content-Type': 'application/json',
					},
					body: validUser,
				},
				willRespondWith: {
					status: 409,
					headers: {
						'Content-Type': 'application/json; charset=utf-8',
					},
					body: {
						status: 'error',
						message: 'User with that email already exists',
					},
				},
			});

			try {
				await apiClient.post(REGISTER_PATH, validUser);
				// Should not reach here
				expect(true).toBe(false);
			} catch (error) {
				const axiosError = error as AxiosError;
				if (axiosError.response) {
					expect(axiosError.response.status).toBe(409);
					expect(axiosError.response.data).toHaveProperty(
						'status',
						'error'
					);
					expect(axiosError.response.data).toHaveProperty(
						'message',
						'User with that email already exists'
					);
				} else {
					throw error;
				}
			}
		});

		test('returns 400 for invalid input', async () => {
			const invalidUser = {
				name: 'Test User',
				email: 'invalid-email',
				password: 'short',
				passwordConfirm: 'not-matching',
			};

			await provider.addInteraction({
				state: 'no existing user',
				uponReceiving: 'a request to register with invalid data',
				withRequest: {
					method: 'POST',
					path: REGISTER_PATH,
					headers: {
						'Content-Type': 'application/json',
					},
					body: invalidUser,
				},
				willRespondWith: {
					status: 400,
					headers: {
						'Content-Type': 'application/json; charset=utf-8',
					},
					body: {
						status: 'error',
						message: 'Validation failed',
					},
				},
			});

			try {
				await apiClient.post(REGISTER_PATH, invalidUser);
				expect(true).toBe(false);
			} catch (error) {
				const axiosError = error as AxiosError;
				if (axiosError.response) {
					expect(axiosError.response.status).toBe(400);
					expect(axiosError.response.data).toHaveProperty(
						'status',
						'error'
					);
				} else {
					throw error;
				}
			}
		});
	});

	describe('POST /api/auth/login', () => {
		const LOGIN_PATH = '/api/auth/login';
		const validCredentials = {
			email: 'test@example.com',
			password: 'Password123!',
		};
		const invalidCredentials = {
			email: 'test@example.com',
			password: 'WrongPassword',
		};

		test('successfully logs in a user with valid credentials', async () => {
			await provider.addInteraction({
				state: 'user exists with email test@example.com and password Password123!',
				uponReceiving: 'a request to login with valid credentials',
				withRequest: {
					method: 'POST',
					path: LOGIN_PATH,
					headers: {
						'Content-Type': 'application/json',
					},
					body: validCredentials,
				},
				willRespondWith: {
					status: 200,
					headers: {
						'Content-Type': 'application/json; charset=utf-8',
					},
					body: {
						status: 'success',
						data: {
							user: {
								name: 'Test User',
								email: 'test@example.com',
								role: 'USER',
							},
							access_token: 'mock-access-token',
							refresh_token: 'mock-refresh-token',
						},
					},
				},
			});

			const response = await apiClient.post(LOGIN_PATH, validCredentials);

			expect(response.status).toBe(200);
			expect(response.data.status).toBe('success');
			expect(response.data.data.user.name).toBe('Test User');
			expect(response.data.data.user.email).toBe('test@example.com');
			expect(response.data.data.access_token).toBe('mock-access-token');
			expect(response.data.data.refresh_token).toBe('mock-refresh-token');
		});

		test('returns 401 with invalid credentials', async () => {
			await provider.addInteraction({
				state: 'user exists with email test@example.com and password Password123!',
				uponReceiving: 'a request to login with invalid credentials',
				withRequest: {
					method: 'POST',
					path: LOGIN_PATH,
					headers: {
						'Content-Type': 'application/json',
					},
					body: invalidCredentials,
				},
				willRespondWith: {
					status: 401,
					headers: {
						'Content-Type': 'application/json; charset=utf-8',
					},
					body: {
						status: 'error',
						message: 'Invalid email or password',
					},
				},
			});

			try {
				await apiClient.post(LOGIN_PATH, invalidCredentials);
				expect(true).toBe(false);
			} catch (error) {
				const axiosError = error as AxiosError;
				if (axiosError.response) {
					expect(axiosError.response.status).toBe(401);
					expect(axiosError.response.data).toHaveProperty(
						'status',
						'error'
					);
					expect(axiosError.response.data).toHaveProperty(
						'message',
						'Invalid email or password'
					);
				} else {
					throw error;
				}
			}
		});

		test('returns 401 for unverified user', async () => {
			const unverifiedCredentials = {
				email: 'unverified@example.com',
				password: 'Password123!',
			};

			await provider.addInteraction({
				state: 'unverified user exists with email unverified@example.com',
				uponReceiving: 'a request to login with unverified user',
				withRequest: {
					method: 'POST',
					path: LOGIN_PATH,
					headers: {
						'Content-Type': 'application/json',
					},
					body: unverifiedCredentials,
				},
				willRespondWith: {
					status: 401,
					headers: {
						'Content-Type': 'application/json; charset=utf-8',
					},
					body: {
						status: 'error',
						message: 'Please verify your email first',
					},
				},
			});

			try {
				await apiClient.post(LOGIN_PATH, unverifiedCredentials);

				expect(true).toBe(false);
			} catch (error) {
				const axiosError = error as AxiosError;
				if (axiosError.response) {
					expect(axiosError.response.status).toBe(401);
					expect(axiosError.response.data).toHaveProperty(
						'status',
						'error'
					);
				} else {
					throw error;
				}
			}
		});
	});

	describe('GET /api/auth/logout', () => {
		const LOGOUT_PATH = '/api/auth/logout';

		test('successfully logs out a user', async () => {
			await provider.addInteraction({
				state: 'user is authenticated',
				uponReceiving: 'a request to logout',
				withRequest: {
					method: 'GET',
					path: LOGOUT_PATH,
					headers: {
						Authorization: 'Bearer mock-access-token',
					},
				},
				willRespondWith: {
					status: 200,
					headers: {
						'Content-Type': 'application/json; charset=utf-8',
					},
					body: {
						status: 'success',
						message: 'Logged out successfully',
					},
				},
			});

			const response = await apiClient.get(LOGOUT_PATH, {
				headers: {
					Authorization: 'Bearer mock-access-token',
				},
			});

			expect(response.status).toBe(200);
			expect(response.data.status).toBe('success');
		});

		test('returns 401 when not authenticated', async () => {
			await provider.addInteraction({
				state: 'no authenticated user',
				uponReceiving: 'a request to logout without authentication',
				withRequest: {
					method: 'GET',
					path: LOGOUT_PATH,
				},
				willRespondWith: {
					status: 401,
					headers: {
						'Content-Type': 'application/json; charset=utf-8',
					},
					body: {
						status: 'error',
						message: 'You are not logged in',
					},
				},
			});

			try {
				await apiClient.get(LOGOUT_PATH);
				expect(true).toBe(false);
			} catch (error) {
				const axiosError = error as AxiosError;
				if (axiosError.response) {
					expect(axiosError.response.status).toBe(401);
					expect(axiosError.response.data).toHaveProperty(
						'status',
						'error'
					);
					expect(axiosError.response.data).toHaveProperty(
						'message',
						'You are not logged in'
					);
				} else {
					throw error;
				}
			}
		});
	});

	describe('GET /api/auth/refresh', () => {
		const REFRESH_PATH = '/api/auth/refresh';

		test('successfully refreshes access token', async () => {
			await provider.addInteraction({
				state: 'user has valid refresh token',
				uponReceiving: 'a request to refresh access token',
				withRequest: {
					method: 'GET',
					path: REFRESH_PATH,
					headers: {
						Cookie: 'refreshToken=mock-refresh-token',
					},
				},
				willRespondWith: {
					status: 200,
					headers: {
						'Content-Type': 'application/json; charset=utf-8',
					},
					body: {
						status: 'success',
						data: {
							access_token: 'new-mock-access-token',
						},
					},
				},
			});

			const response = await apiClient.get(REFRESH_PATH, {
				headers: {
					Cookie: 'refreshToken=mock-refresh-token',
				},
			});

			expect(response.status).toBe(200);
			expect(response.data.status).toBe('success');
			expect(response.data.data.access_token).toBe(
				'new-mock-access-token'
			);
		});

		test('returns 401 for invalid refresh token', async () => {
			await provider.addInteraction({
				state: 'no valid refresh token',
				uponReceiving: 'a request to refresh with invalid token',
				withRequest: {
					method: 'GET',
					path: REFRESH_PATH,
					headers: {
						Cookie: 'refreshToken=invalid-token',
					},
				},
				willRespondWith: {
					status: 401,
					headers: {
						'Content-Type': 'application/json; charset=utf-8',
					},
					body: {
						status: 'error',
						message: 'Invalid refresh token',
					},
				},
			});

			try {
				await apiClient.get(REFRESH_PATH, {
					headers: {
						Cookie: 'refreshToken=invalid-token',
					},
				});
				expect(true).toBe(false);
			} catch (error) {
				const axiosError = error as AxiosError;
				if (axiosError.response) {
					expect(axiosError.response.status).toBe(401);
					expect(axiosError.response.data).toHaveProperty(
						'status',
						'error'
					);
				} else {
					throw error;
				}
			}
		});
	});
});
