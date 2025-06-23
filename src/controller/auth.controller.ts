import {
	incrementFailedLoginAttempts,
	resetFailedLoginAttempts,
} from '@middleware/ipBlocking.middleware';
import type {
	CreateUserInput,
	LoginUserInput,
	VerifyEmailInput,
	VerifyTwoFactorInput,
} from '@schema/user.schema';
import { authService } from '@service/auth.service';
import { userService } from '@service/user.service';
import { ConflictError, ForbiddenError } from '@utils/appError';
import type { NextFunction, Request, Response } from 'express';

export const registerUserHandler = (
	req: Request<
		Record<string, string>,
		Record<string, string>,
		CreateUserInput
	>,
	res: Response,
	next: NextFunction
): void => {
	void (async () => {
		try {
			if (!req.body.password) {
				res.status(400).json({
					status: 'fail',
					errors: [{ message: 'Password is required' }],
				});
			}

			try {
				const existingUser = await userService.findByEmail(
					req.body.email.toLowerCase()
				);

				if (existingUser) {
					res.status(409).json({
						status: 'fail',
						errors: [
							{ message: 'User with that email already exists' },
						],
					});
				}
			} catch {
				/* empty */
			}

			const result = await authService.handleRegistration(req.body);

			if (!res.headersSent) {
				res.status(result.statusCode).json({
					status: result.status,
					message: result.message,
				});
			}
		} catch (err: unknown) {
			if (err instanceof ConflictError) {
				if (res.headersSent) {
					return next(err);
				}

				return res.status(err.statusCode).json(err.toResponse());
			}

			return next(err);
		}
	})();
};

export const loginUserHandler = (
	req: Request<
		Record<string, string>,
		Record<string, string>,
		LoginUserInput
	>,
	res: Response,
	next: NextFunction
): void => {
	void (async () => {
		try {
			const result = await authService.loginUser(req.body);

			if (req.ip) {
				await resetFailedLoginAttempts(req.ip);
			}

			// Check if 2FA is required
			if (result.requiresTwoFactor) {
				if (!res.headersSent) {
					res.status(200).json({
						status: 'success',
						requiresTwoFactor: true,
						twoFactorToken: result.twoFactorToken,
					});
				}
				return;
			}

			// Normal login flow (no 2FA)
			authService.setCookies(
				res,
				result.access_token!,
				result.refresh_token!
			);

			if (res.headersSent) {
				return;
			}

			res.status(200).json({
				status: 'success',
				user: result.user,
			});
		} catch (err: unknown) {
			if (req.ip) {
				await incrementFailedLoginAttempts(req.ip);
			}

			if (res.headersSent) {
				return;
			}

			next(err);
			return;
		}
	})();
};

export const refreshAccessTokenHandler = (
	req: Request,
	res: Response,
	next: NextFunction
): void => {
	void (async () => {
		try {
			const refresh_token = req.cookies['refresh_token'];

			if (!refresh_token) {
				return next(
					new ForbiddenError('Could not refresh access token')
				);
			}

			const access_token =
				await authService.refreshAccessToken(refresh_token);

			const { accessTokenCookieOptions } = authService.getCookieOptions();

			res.cookie('access_token', access_token, accessTokenCookieOptions);
			res.cookie('logged_in', true, {
				...accessTokenCookieOptions,
				httpOnly: false,
			});

			if (res.headersSent) {
				return;
			}

			res.status(200).json({
				status: 'success',
				access_token,
			});
		} catch (err: unknown) {
			if (res.headersSent) {
				return;
			}

			next(err);
		}
	})();
};

export const verifyEmailHandler = (
	req: Request<VerifyEmailInput>,
	res: Response,
	next: NextFunction
): void => {
	void (async () => {
		try {
			const verified = await authService.verifyEmail(
				req.params.verificationCode
			);

			if (verified) {
				if (res.headersSent) {
					return;
				}

				return res.status(200).json({
					status: 'success',
					message: 'Email verified successfully',
				});
			}

			return res.status(400).json({
				status: 'error',
				message: 'Email verification failed',
			});
		} catch (err: unknown) {
			if (res.headersSent) {
				return;
			}

			next(err);
			return;
		}
	})();
};

export const verifyTwoFactorLoginHandler = (
	req: Request<
		Record<string, string>,
		Record<string, string>,
		VerifyTwoFactorInput
	>,
	res: Response,
	next: NextFunction
): void => {
	void (async () => {
		try {
			const { twoFactorToken, verificationCode } = req.body;

			if (!twoFactorToken || !verificationCode) {
				res.status(400).json({
					status: 'error',
					message:
						'Two-factor token and verification code are required',
				});
				return;
			}

			const result = await authService.verifyTwoFactorLogin(
				twoFactorToken,
				verificationCode
			);

			// Set cookies with the new tokens
			authService.setCookies(
				res,
				result.access_token,
				result.refresh_token
			);

			if (res.headersSent) {
				return;
			}

			res.status(200).json({
				status: 'success',
				user: result.user,
			});
		} catch (err: unknown) {
			if (res.headersSent) {
				return;
			}

			next(err);
			return;
		}
	})();
};

export const logoutHandler = (
	_: Request,
	res: Response,
	next: NextFunction
): void => {
	void (async () => {
		try {
			const user = res.locals['user'];

			await authService.logoutUser(user.id);

			authService.clearCookies(res);

			if (res.headersSent) {
				return;
			}

			res.status(200).json({
				status: 'success',
			});
		} catch (err: unknown) {
			if (res.headersSent) {
				return;
			}

			next(err);
		}
	})();
};
