import {
	createCardHandler,
	deleteCardHandler,
	generateCardHandler,
	getCardHandler,
	getCardsHandler,
	updateCardHandler,
} from '@controllers/card.controller';
import { deserializeUser } from '@middleware/deserializeUser';
import { requireUser } from '@middleware/requireUser';
import { validate } from '@middleware/validate';
import {
	createCardSchema,
	deleteCardSchema,
	generateCardSchema,
	getCardSchema,
	updateCardSchema,
} from '@schema/card.schema';
import { resizeCardImage, uploadCardImage } from '@upload/single-upload-sharp';
import express from 'express';

import csrfProtection from '../middleware/csrf.middleware';

const router = express.Router();

router.use(deserializeUser, requireUser);

router.route('/').get(getCardsHandler);

router
	.route('/')
	.post(
		csrfProtection,
		resizeCardImage,
		uploadCardImage,
		validate(createCardSchema),
		createCardHandler
	);

router
	.route('/generate')
	.post(csrfProtection, validate(generateCardSchema), generateCardHandler);

router.route('/:cardId').get(getCardHandler);

router
	.route('/:cardId')
	.get(validate(getCardSchema), getCardHandler)
	.patch(
		csrfProtection,
		resizeCardImage,
		uploadCardImage,
		validate(updateCardSchema),
		updateCardHandler
	)
	.delete(csrfProtection, validate(deleteCardSchema), deleteCardHandler);

export default router;
