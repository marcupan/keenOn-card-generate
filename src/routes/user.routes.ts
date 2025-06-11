import { getUserHandler } from '@controllers/user.controller';
import { deserializeUser } from '@middleware/deserializeUser';
import { requireUser } from '@middleware/requireUser';
import express from 'express';

const router = express.Router();

router.use(deserializeUser, requireUser);

router.get('/profile', getUserHandler);

export default router;
