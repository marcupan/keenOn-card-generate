import {
	loginUserHandler,
	logoutHandler,
	refreshAccessTokenHandler,
	registerUserHandler,
	verifyEmailHandler,
	verifyTwoFactorLoginHandler,
} from '@controllers/auth.controller';
import {
	authRateLimiter,
	emailVerificationRateLimiter,
} from '@middleware/authRateLimit.middleware';
import { deserializeUser } from '@middleware/deserializeUser';
import { trackFailedLoginAttempts } from '@middleware/ipBlocking.middleware';
import { requireUser } from '@middleware/requireUser';
import { validate } from '@middleware/validate';
import {
	createUserSchema,
	loginUserSchema,
	verifyEmailSchema,
	verifyTwoFactorSchema,
} from '@schema/user.schema';
import express from 'express';

import csrfProtection, {
	generateCsrfToken,
	setCsrfToken,
} from '../middleware/csrf.middleware';

const router = express.Router();

router.post(
	'/register',
	authRateLimiter,
	csrfProtection,
	validate(createUserSchema),
	registerUserHandler
);

router.post(
	'/login',
	authRateLimiter,
	trackFailedLoginAttempts,
	validate(loginUserSchema),
	loginUserHandler
);

router.post(
	'/verify-2fa',
	authRateLimiter,
	validate(verifyTwoFactorSchema),
	verifyTwoFactorLoginHandler
);

router.get(
	'/logout',
	deserializeUser,
	requireUser,
	csrfProtection,
	logoutHandler
);

router.get('/csrf-token', generateCsrfToken, setCsrfToken);

router.get('/refresh', refreshAccessTokenHandler);

router.get(
	'/verifyemail/:verificationCode',
	emailVerificationRateLimiter,
	validate(verifyEmailSchema),
	verifyEmailHandler
);

export default router;
