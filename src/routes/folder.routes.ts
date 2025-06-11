import {
	createFolderHandler,
	getFolderHandler,
	getFoldersHandler,
	updateFolderHandler,
	deleteFolderHandler,
} from '@controllers/folder.controller';
import { deserializeUser } from '@middleware/deserializeUser';
import { requireUser } from '@middleware/requireUser';
import { validate } from '@middleware/validate';
import {
	createFolderSchema,
	getFolderSchema,
	updateFolderSchema,
	deleteFolderSchema,
} from '@schema/folder.schema';
import express from 'express';

import csrfProtection from '../middleware/csrf.middleware';

const router = express.Router();

router.use(deserializeUser, requireUser);

router.post(
	'/',
	csrfProtection,
	validate(createFolderSchema),
	createFolderHandler
);

router.get('/', getFoldersHandler);

router.get('/:folderId', validate(getFolderSchema), getFolderHandler);

router.patch(
	'/:folderId',
	csrfProtection,
	validate(updateFolderSchema),
	updateFolderHandler
);

router.delete(
	'/:folderId',
	csrfProtection,
	validate(deleteFolderSchema),
	deleteFolderHandler
);

export default router;
