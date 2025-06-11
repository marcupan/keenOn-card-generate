import path from 'node:path';

import type { NextFunction, Request, Response } from 'express';

export const getImageHandler = (
	req: Request,
	res: Response,
	next: NextFunction
): void => {
	const imagePath = path.join(__dirname, '../../public', req.url);

	const allowedExtensions = ['.jpg', '.jpeg', '.png'];
	const ext = path.extname(imagePath).toLowerCase();

	if (!allowedExtensions.includes(ext)) {
		res.status(403).send('File type not allowed');
		return;
	}

	res.sendFile(imagePath, (err) => {
		if (err) {
			next(err);
		}
	});
};
