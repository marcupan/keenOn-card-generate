import request from 'supertest';
import type { Application } from 'express';
import { AppDataSource } from '../../src/utils/dataSource';
import { createTestApp } from '../../src/testApp';
import { User } from '../../src/entities/user.entity';
import { Repository } from 'typeorm';

describe('Auth API Integration Tests', () => {
	let app: Application;
	let userRepository: Repository<User>;

	beforeAll(async () => {
		if (!AppDataSource.isInitialized) {
			await AppDataSource.initialize();
		}

		app = await createTestApp();
		userRepository = AppDataSource.getRepository(User);
	});

	afterAll(async () => {
		if (AppDataSource.isInitialized) {
			await AppDataSource.destroy();
		}
	});

	beforeEach(async () => {
		await userRepository.clear();
	});

	describe('POST /api/auth/register', () => {
		it('should register a new user', async () => {
			const response = await request(app)
				.post('/api/auth/register')
				.send({
					name: 'Test User',
					email: 'test@example.com',
					password: 'Password123!',
					passwordConfirm: 'Password123!',
				});

			expect(response.status).toBe(201);
			expect(response.body).toHaveProperty('status', 'success');
			expect(response.body).toHaveProperty('message');

			const user = await userRepository.findOne({
				where: { email: 'test@example.com' },
			});
			expect(user).toBeDefined();
			expect(user?.name).toBe('Test User');
			expect(user?.verified).toBe(false);
		});

		it('should return 400 for invalid input', async () => {
			const response = await request(app)
				.post('/api/auth/register')
				.send({
					name: 'Test User',
					email: 'invalid-email',
					password: 'short',
					passwordConfirm: 'not-matching',
				});

			expect(response.status).toBe(400);
			expect(response.body).toHaveProperty('status', 'error');
		});

		it('should return 409 for duplicate email', async () => {
			await request(app).post('/api/auth/register').send({
				name: 'Test User',
				email: 'duplicate@example.com',
				password: 'Password123!',
				passwordConfirm: 'Password123!',
			});

			const response = await request(app)
				.post('/api/auth/register')
				.send({
					name: 'Another User',
					email: 'duplicate@example.com',
					password: 'Password123!',
					passwordConfirm: 'Password123!',
				});

			expect(response.status).toBe(409);
			expect(response.body).toHaveProperty('status', 'error');
			expect(response.body).toHaveProperty(
				'message',
				'User with that email already exists'
			);
		});
	});

	describe('POST /api/auth/login', () => {
		beforeEach(async () => {
			await request(app).post('/api/auth/register').send({
				name: 'Login Test User',
				email: 'login@example.com',
				password: 'Password123!',
				passwordConfirm: 'Password123!',
			});

			const user = await userRepository.findOne({
				where: { email: 'login@example.com' },
			});

			if (user) {
				user.verified = true;
				await userRepository.save(user);
			}
		});

		it('should login a user with valid credentials', async () => {
			const response = await request(app).post('/api/auth/login').send({
				email: 'login@example.com',
				password: 'Password123!',
			});

			expect(response.status).toBe(200);
			expect(response.body).toHaveProperty('status', 'success');
			expect(response.body.data).toHaveProperty('user');
			expect(response.body.data).toHaveProperty(
				response.body.data.accessToken ? 'accessToken' : 'access_token'
			);
			expect(response.body.data).toHaveProperty(
				response.body.data.refreshToken
					? 'refreshToken'
					: 'refresh_token'
			);
		});

		it('should return 401 for invalid credentials', async () => {
			const response = await request(app).post('/api/auth/login').send({
				email: 'login@example.com',
				password: 'WrongPassword123!',
			});

			expect(response.status).toBe(401);
			expect(response.body).toHaveProperty('status', 'error');
			expect(response.body).toHaveProperty(
				'message',
				'Invalid email or password'
			);
		});

		it('should return 401 for unverified user', async () => {
			await request(app).post('/api/auth/register').send({
				name: 'Unverified User',
				email: 'unverified@example.com',
				password: 'Password123!',
				passwordConfirm: 'Password123!',
			});

			const response = await request(app).post('/api/auth/login').send({
				email: 'unverified@example.com',
				password: 'Password123!',
			});

			expect(response.status).toBe(401);
			expect(response.body).toHaveProperty('status', 'error');
		});
	});

	describe('GET /api/auth/logout', () => {
		let accessToken: string;

		beforeEach(async () => {
			await request(app).post('/api/auth/register').send({
				name: 'Logout Test User',
				email: 'logout@example.com',
				password: 'Password123!',
				passwordConfirm: 'Password123!',
			});

			const user = await userRepository.findOne({
				where: { email: 'logout@example.com' },
			});
			if (user) {
				user.verified = true;
				await userRepository.save(user);
			}

			const loginResponse = await request(app)
				.post('/api/auth/login')
				.send({
					email: 'logout@example.com',
					password: 'Password123!',
				});

			accessToken =
				loginResponse.body.data.accessToken ||
				loginResponse.body.data.access_token;
		});

		it('should logout a user', async () => {
			const response = await request(app)
				.get('/api/auth/logout')
				.set('Authorization', `Bearer ${accessToken}`);

			expect(response.status).toBe(200);
			expect(response.body).toHaveProperty('status', 'success');
		});

		it('should return 401 for unauthorized logout attempt', async () => {
			const response = await request(app).get('/api/auth/logout');

			expect(response.status).toBe(401);
			expect(response.body).toHaveProperty('status', 'error');
		});
	});

	describe('GET /api/auth/refresh', () => {
		let refreshToken: string;

		beforeEach(async () => {
			await request(app).post('/api/auth/register').send({
				name: 'Refresh Test User',
				email: 'refresh@example.com',
				password: 'Password123!',
				passwordConfirm: 'Password123!',
			});

			const user = await userRepository.findOne({
				where: { email: 'refresh@example.com' },
			});

			if (user) {
				user.verified = true;
				await userRepository.save(user);
			}

			const loginResponse = await request(app)
				.post('/api/auth/login')
				.send({
					email: 'refresh@example.com',
					password: 'Password123!',
				});

			refreshToken =
				loginResponse.body.data.refreshToken ||
				loginResponse.body.data.refresh_token;
		});

		it('should refresh access token with valid refresh token', async () => {
			const response = await request(app)
				.get('/api/auth/refresh')
				.set('Cookie', [`refreshToken=${refreshToken}`]);

			expect(response.status).toBe(200);
			expect(response.body).toHaveProperty('status', 'success');
			expect(response.body.data).toHaveProperty(
				response.body.data.accessToken ? 'accessToken' : 'access_token'
			);
		});

		it('should return 401 for invalid refresh token', async () => {
			const response = await request(app)
				.get('/api/auth/refresh')
				.set('Cookie', ['refreshToken=invalid-token']);

			expect(response.status).toBe(401);
			expect(response.body).toHaveProperty('status', 'error');
		});
	});
});
