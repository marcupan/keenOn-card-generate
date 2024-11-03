import express from 'express';

import {
	createFolderHandler,
	getFolderHandler,
	getFoldersHandler,
	updateFolderHandler,
	deleteFolderHandler,
} from '../controller/folder.controller';
import { deserializeUser } from '../middleware/deserializeUser';
import { requireUser } from '../middleware/requireUser';
import { validate } from '../middleware/validate';
import {
	createFolderSchema,
	getFolderSchema,
	updateFolderSchema,
	deleteFolderSchema,
} from '../schema/folder.schema';

const router = express.Router();

router.use(deserializeUser, requireUser);

router.post('/', validate(createFolderSchema), createFolderHandler);

router.get('/', getFoldersHandler);

router.get('/:folderId', validate(getFolderSchema), getFolderHandler);

router.patch('/:folderId', validate(updateFolderSchema), updateFolderHandler);

router.delete('/:folderId', validate(deleteFolderSchema), deleteFolderHandler);

export default router;
