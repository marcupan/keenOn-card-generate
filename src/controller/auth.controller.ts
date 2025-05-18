import * as crypto from 'crypto';

import config from 'config';
import { CookieOptions, NextFunction, Request, Response } from 'express';

import { DB_UNIQUE_VIOLATION_ERR_CODE } from '../const/code';
import { User } from '../entities';
import {
	CreateUserInput,
	LoginUserInput,
	VerifyEmailInput,
} from '../schema/user.schema';
import {
	createUser,
	findUser,
	findUserByEmail,
	findUserById,
	signTokens,
} from '../service/user.service';
import { ErrorCode, ErrorType } from '../types/error';
import { AppError } from '../utils/appError';
import redisClient from '../utils/connectRedis';
import Email from '../utils/email';
import { signJwt, verifyJwt } from '../utils/jwt';

const cookiesOptions: CookieOptions = {
	httpOnly: true,
	sameSite: 'lax',
};

if (process.env.NODE_ENV === 'production') {
	cookiesOptions.secure = true;
}

const accessTokenCookieOptions: CookieOptions = {
	...cookiesOptions,
	expires: new Date(
		Date.now() + config.get<number>('accessTokenExpiresIn') * 60 * 1000
	),
	maxAge: config.get<number>('accessTokenExpiresIn') * 60 * 1000,
};

const refreshTokenCookieOptions: CookieOptions = {
	...cookiesOptions,
	expires: new Date(
		Date.now() + config.get<number>('refreshTokenExpiresIn') * 60 * 1000
	),
	maxAge: config.get<number>('refreshTokenExpiresIn') * 60 * 1000,
};

export const registerUserHandler = async (
	req: Request<
		Record<string, string>,
		Record<string, string>,
		CreateUserInput
	>,
	res: Response,
	next: NextFunction
) => {
	try {
		const { name, password, email } = req.body;

		const newUser = await createUser({
			name,
			email: email.toLowerCase(),
			password,
		});

		const { hashedVerificationCode, verificationCode } =
			User.createVerificationCode();
		newUser.verificationCode = hashedVerificationCode;

		await newUser.save();

		const emailVerificationUrl = `${config.get<string>(
			'origin'
		)}/verifyemail/${verificationCode}`;

		try {
			await new Email(
				newUser,
				emailVerificationUrl
			).sendVerificationCode();

			res.status(201).json({
				status: 'success',
				message:
					'An email with a verification code has been sent to your email',
			});
		} catch {
			newUser.verificationCode = null;

			await newUser.save();

			return res.status(500).json({
				status: 'error',
				message: 'There was an error sending email, please try again',
			});
		}
	} catch (err: unknown) {
		const error = err as ErrorType;

		if (error.code === DB_UNIQUE_VIOLATION_ERR_CODE) {
			return res.status(409).json({
				status: 'fail',
				message: 'User with that email already exist',
			});
		}

		next(error);
	}
};

export const loginUserHandler = async (
	req: Request<
		Record<string, string>,
		Record<string, string>,
		LoginUserInput
	>,
	res: Response,
	next: NextFunction
) => {
	try {
		const { email, password } = req.body;

		const user = await findUserByEmail({ email });

		if (!user) {
			return next(
				new AppError(
					ErrorCode.BAD_REQUEST,
					'Invalid email or password',
					400
				)
			);
		}

		if (!user.verified) {
			return next(
				new AppError(ErrorCode.BAD_REQUEST, 'You are not verified', 400)
			);
		}

		if (!(await User.comparePasswords(password, user.password))) {
			return next(
				new AppError(
					ErrorCode.BAD_REQUEST,
					'Invalid email or password',
					400
				)
			);
		}

		const { access_token, refresh_token } = await signTokens(user);

		res.cookie('access_token', access_token, accessTokenCookieOptions);
		res.cookie('refresh_token', refresh_token, refreshTokenCookieOptions);
		res.cookie('logged_in', true, {
			...accessTokenCookieOptions,
			httpOnly: false,
		});

		const userData = {
			name: user.name,
			email: user.email,
		};

		res.status(200).json({
			status: 'success',
			user: userData,
		});
	} catch (err: unknown) {
		next(err);
	}
};

export const refreshAccessTokenHandler = async (
	req: Request,
	res: Response,
	next: NextFunction
) => {
	try {
		const refresh_token = req.cookies.refresh_token;

		const message = 'Could not refresh access token';

		if (!refresh_token) {
			return next(new AppError(ErrorCode.FORBIDDEN, message, 403));
		}

		const decoded = verifyJwt<{ sub: string }>(
			refresh_token,
			'refreshTokenPublicKey'
		);

		if (!decoded) {
			return next(new AppError(ErrorCode.FORBIDDEN, message, 403));
		}

		const session = await redisClient.get(decoded.sub);

		if (!session) {
			return next(new AppError(ErrorCode.FORBIDDEN, message, 403));
		}

		const user = await findUserById(JSON.parse(session).id);

		if (!user) {
			return next(new AppError(ErrorCode.FORBIDDEN, message, 403));
		}

		const access_token = signJwt(
			{ sub: user.id },
			'accessTokenPrivateKey',
			{
				expiresIn: `${config.get<number>('accessTokenExpiresIn')}m`,
			}
		);

		res.cookie('access_token', access_token, accessTokenCookieOptions);
		res.cookie('logged_in', true, {
			...accessTokenCookieOptions,
			httpOnly: false,
		});

		res.status(200).json({
			status: 'success',
			access_token,
		});
	} catch (err: unknown) {
		next(err);
	}
};

export const verifyEmailHandler = async (
	req: Request<VerifyEmailInput>,
	res: Response,
	next: NextFunction
) => {
	try {
		const verificationCode = crypto
			.createHash('sha256')
			.update(req.params.verificationCode)
			.digest('hex');

		const user = await findUser({ verificationCode });

		if (!user) {
			return next(
				new AppError(
					ErrorCode.UNAUTHORIZED,
					'Could not verify email',
					401
				)
			);
		}

		user.verified = true;
		user.verificationCode = null;

		await user.save();

		res.status(200).json({
			status: 'success',
			message: 'Email verified successfully',
		});
	} catch (err: unknown) {
		next(err);
	}
};

const logout = (res: Response) => {
	res.cookie('access_token', '', { maxAge: -1 });
	res.cookie('refresh_token', '', { maxAge: -1 });
	res.cookie('logged_in', '', { maxAge: -1 });
};

export const logoutHandler = async (
	_: Request,
	res: Response,
	next: NextFunction
) => {
	try {
		const user = res.locals.user;

		await redisClient.del(user.id);

		logout(res);

		res.status(200).json({
			status: 'success',
		});
	} catch (err: unknown) {
		next(err);
	}
};
