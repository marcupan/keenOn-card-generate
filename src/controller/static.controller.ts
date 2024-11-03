import path from 'node:path';

import { NextFunction, Request, Response } from 'express';

export const getImageHandler = async (
	req: Request,
	res: Response,
	next: NextFunction
) => {
	const imagePath = path.join(__dirname, '../../public/', req.url);

	const allowedExtensions = ['.jpg', '.jpeg', '.png'];

	if (!allowedExtensions.includes(path.extname(imagePath).toLowerCase())) {
		return res.status(403).send('File type not allowed');
	}

	res.sendFile(imagePath, (err) => {
		if (err) {
			next(err);
		}
	});
};
