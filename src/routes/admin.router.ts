import { getUsersHandler } from '@controllers/user.controller';
import { checkRole } from '@middleware/checkRole';
import { deserializeUser } from '@middleware/deserializeUser';
import { requireUser } from '@middleware/requireUser';
import express from 'express';

import { RoleEnumType } from '../types/role';

const adminRouter = express.Router();

adminRouter.use(deserializeUser, requireUser, checkRole(RoleEnumType.ADMIN));

adminRouter.route('/users').get(getUsersHandler);

export default adminRouter;
