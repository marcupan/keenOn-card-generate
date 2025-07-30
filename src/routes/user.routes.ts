import { getUserHandler } from '@controllers/user.controller';
import { twoFactorController } from '@controllers/twoFactor.controller';
import { deserializeUser } from '@middleware/deserializeUser';
import { requireUser } from '@middleware/requireUser';
import express from 'express';

const router = express.Router();

router.use(deserializeUser, requireUser);

router.get('/profile', getUserHandler);

router.post(
	'/2fa/setup',
	twoFactorController.generateSecret.bind(twoFactorController)
);

router.post(
	'/2fa/verify',
	twoFactorController.verifyAndEnable.bind(twoFactorController)
);

router.post(
	'/2fa/validate',
	twoFactorController.verify.bind(twoFactorController)
);

router.post(
	'/2fa/disable',
	twoFactorController.disable.bind(twoFactorController)
);

export default router;
