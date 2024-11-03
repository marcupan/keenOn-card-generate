import fs from 'fs';
import path from 'node:path';

import { NextFunction, Request, Response } from 'express';
import multer from 'multer';
import sharp from 'sharp';

import uuid from '../utils/uuid';

const multerStorage = multer.memoryStorage();

const IMAGE_WIDTH = 800;
const IMAGE_HEIGHT = 450;
const IMAGE_QUALITY = 90;

const multerFilter = (
	_: Request,
	file: Express.Multer.File,
	cb: multer.FileFilterCallback
) => {
	if (!file.mimetype.startsWith('image')) {
		return cb(new multer.MulterError('LIMIT_UNEXPECTED_FILE'));
	}

	cb(null, true);
};

const upload = multer({
	storage: multerStorage,
	fileFilter: multerFilter,
	limits: {
		fileSize: 5 * 1024 * 1024,
		files: 1,
	},
});

export const uploadCardImage = upload.single('image');

export const resizeCardImage = async (
	req: Request,
	res: Response,
	next: NextFunction
) => {
	try {
		const file = req.file;

		if (!file) {
			return next();
		}

		const userId = res.locals.user.id;
		const folderId = req.body.folderId;

		if (!userId || !folderId) {
			throw new Error('Not Authorized or Folder ID Missing');
		}

		const sanitizedUserId = path.basename(userId);
		const sanitizedFolderId = path.basename(folderId);

		const folderPath = path.resolve(
			__dirname,
			`../../public/${sanitizedUserId}/${sanitizedFolderId}`
		);

		if (!fs.existsSync(folderPath)) {
			fs.mkdirSync(folderPath, { recursive: true });
		}

		const fileName = `post-${uuid()}-${Date.now()}.jpeg`;
		const filePath = path.join(folderPath, fileName);

		await sharp(file.buffer)
			.resize(IMAGE_WIDTH, IMAGE_HEIGHT)
			.toFormat('png')
			.png({ quality: IMAGE_QUALITY })
			.toFile(filePath);

		req.body.image = path.join(
			sanitizedUserId,
			sanitizedFolderId,
			fileName
		);

		next();
	} catch (err: unknown) {
		next(err);
	}
};
