import type { TypeOf } from 'zod';
import { object, string, z } from 'zod';

import { RoleEnumType } from '../types/role';

export const createUserSchema = object({
	body: object({
		name: string({
			required_error: 'Name is required',
		}),
		email: string({
			required_error: 'Email address is required',
		}).email('Invalid email address'),
		password: string({ required_error: 'Password is required' })
			.min(8, 'Password must be more than 8 characters')
			.max(32, 'Password must be less than 32 characters')
			.regex(
				/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#])[A-Za-z\d@$!%*?&#]{8,32}$/,
				'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character (e.g. @$!%*?&#)'
			),
		passwordConfirm: string({
			required_error: 'Please confirm your password',
		}),
		role: z.optional(z.nativeEnum(RoleEnumType)),
	}).refine((data) => data.password === data.passwordConfirm, {
		path: ['passwordConfirm'],
		message: 'Passwords do not match',
	}),
});

export const loginUserSchema = object({
	body: object({
		email: string({
			required_error: 'Email address is required',
		}).email('Invalid email address'),
		password: string({
			required_error: 'Password is required',
		}).min(8, 'Invalid email or password'),
	}),
});

export const verifyEmailSchema = object({
	params: object({
		verificationCode: string(),
	}),
});

export type VerifyEmailInput = TypeOf<typeof verifyEmailSchema>['params'];

export type CreateUserInput = Omit<
	TypeOf<typeof createUserSchema>['body'],
	'passwordConfirm'
>;

export type LoginUserInput = TypeOf<typeof loginUserSchema>['body'];
