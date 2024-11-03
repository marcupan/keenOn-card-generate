import express from 'express';

import {
	createCardHandler,
	deleteCardHandler,
	getCardHandler,
	getCardsHandler,
	updateCardHandler,
} from '../controller/card.controller';
import { deserializeUser } from '../middleware/deserializeUser';
import { requireUser } from '../middleware/requireUser';
import { validate } from '../middleware/validate';
import {
	createCardSchema,
	deleteCardSchema,
	getCardSchema,
	updateCardSchema,
} from '../schema/card.schema';
import {
	resizeCardImage,
	uploadCardImage,
} from '../upload/single-upload-sharp';

const router = express.Router();

router.use(deserializeUser, requireUser);

router.route('/').get(getCardsHandler);

router
	.route('/')
	.post(
		resizeCardImage,
		uploadCardImage,
		validate(createCardSchema),
		createCardHandler
	)
	.get(getCardsHandler);

router.route('/:cardId').get(getCardHandler);

router
	.route('/:cardId')
	.get(validate(getCardSchema), getCardHandler)
	.patch(
		resizeCardImage,
		uploadCardImage,
		validate(updateCardSchema),
		updateCardHandler
	)
	.delete(validate(deleteCardSchema), deleteCardHandler);

export default router;
