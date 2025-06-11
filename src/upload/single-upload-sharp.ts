import fs from 'fs';
import path from 'node:path';
import { pipeline } from 'stream/promises';

import multer from 'multer';
import sharp from 'sharp';

import type { User } from '@entities/user.entity';
import type { NextFunction, Request, Response } from 'express';

import Logger from '../utils/logger';
import uuid from '../utils/uuid';

interface FileWithLocals extends Express.Multer.File {
	locals?: {
		[key: string]: unknown;
	};
}

const IMAGE_WIDTH = 800;
const IMAGE_HEIGHT = 450;
const IMAGE_QUALITY = 90;
const MAX_FILE_SIZE = 5 * 1024 * 1024;

const getUploadPath = (userId: string, folderId: string) => {
	const sanitizedUserId = path.basename(userId);
	const sanitizedFolderId = path.basename(folderId);

	const folderPath = path.resolve(
		__dirname,
		`../../public/${sanitizedUserId}/${sanitizedFolderId}`
	);

	if (!fs.existsSync(folderPath)) {
		fs.mkdirSync(folderPath, { recursive: true });
	}

	return { folderPath, sanitizedUserId, sanitizedFolderId };
};

const multerStorage = multer.diskStorage({
	destination: (req, res: FileWithLocals, cb) => {
		try {
			const userId =
				req.body.userId ??
				req['user']?.id ??
				(res.locals?.['user'] as User)?.id;
			const folderId = req.body.folderId;

			if (!userId || !folderId) {
				return cb(new Error('User ID or Folder ID missing'), '');
			}

			const { folderPath } = getUploadPath(userId, folderId);
			cb(null, folderPath);
		} catch (error) {
			Logger.error('Error determining upload destination:', error);
			cb(error as Error, '');
		}
	},
	filename: (_, __, cb) => {
		const fileName = `upload-${uuid()}-${Date.now()}.tmp`;
		cb(null, fileName);
	},
});

const multerFilter = (
	_: Request,
	file: FileWithLocals,
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
		fileSize: MAX_FILE_SIZE,
		files: 1,
	},
});

export const uploadCardImage = upload.single('image');

export const resizeCardImage = (
	req: Request,
	res: Response,
	next: NextFunction
): void => {
	void (async () => {
		try {
			const file = req.file;

			if (!file) {
				return next();
			}

			const userId = res.locals['user'].id;
			const folderId = req.body.folderId;

			if (!userId || !folderId) {
				throw new Error('Not Authorized or Folder ID Missing');
			}

			const { folderPath, sanitizedUserId, sanitizedFolderId } =
				getUploadPath(userId, folderId);

			const fileName = `post-${uuid()}-${Date.now()}.png`;
			const finalFilePath = path.join(folderPath, fileName);

			const transformer = sharp()
				.resize(IMAGE_WIDTH, IMAGE_HEIGHT)
				.png({ quality: IMAGE_QUALITY });

			const readStream = fs.createReadStream(file.path);
			const writeStream = fs.createWriteStream(finalFilePath);

			await pipeline(readStream, transformer, writeStream);

			fs.unlink(file.path, (err) => {
				if (err) {
					Logger.error(
						`Error removing temporary file ${file.path}:`,
						err
					);
				}
			});

			req.body.image = path.join(
				sanitizedUserId,
				sanitizedFolderId,
				fileName
			);

			Logger.debug(`Image processed and saved to ${finalFilePath}`);
			next();
		} catch (err: unknown) {
			const filePath = req.file?.path;

			if (filePath && fs.existsSync(filePath)) {
				fs.unlink(filePath, () => {});
			}

			Logger.error('Error processing image upload:', err);
			next(err);
		}
	})();
};
