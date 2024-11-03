import express from 'express';

import { getUserHandler } from '../controller/user.controller';
import { deserializeUser } from '../middleware/deserializeUser';
import { requireUser } from '../middleware/requireUser';

const router = express.Router();

router.use(deserializeUser, requireUser);

router.get('/profile', getUserHandler);

export default router;
