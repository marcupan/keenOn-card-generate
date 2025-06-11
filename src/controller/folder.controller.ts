import type {
	CreateFolderInput,
	DeleteFolderInput,
	GetFolderInput,
	GetFoldersInput,
	UpdateFolderInput,
} from '@schema/folder.schema';
import { folderService } from '@service/folder.service';
import { userService } from '@service/user.service';
import { AppError } from '@utils/appError';
import type { NextFunction, Request, Response } from 'express';

import { ErrorCode } from '../types/error';

export const createFolderHandler = (
	req: Request<
		Record<string, string>,
		Record<string, string>,
		CreateFolderInput
	>,
	res: Response,
	next: NextFunction
): void => {
	void (async () => {
		try {
			const user = await userService.findById(res.locals['user'].id);

			if (user) {
				const folder = await folderService.createFolder(req.body, user);

				res.status(201).json({
					status: 'success',
					data: { folder },
				});
			}
		} catch (err: unknown) {
			next(err);
		}
	})();
};

export const getFolderHandler = (
	req: Request<GetFolderInput['params']>,
	res: Response,
	next: NextFunction
): void => {
	void (async () => {
		try {
			const folder = await folderService.getFolder(req.params.folderId);

			if (!folder) {
				return next(
					new AppError(
						ErrorCode.NOT_FOUND,
						'Folder with that ID not found',
						404
					)
				);
			}

			res.status(200).json({
				status: 'success',
				data: { folder },
			});
		} catch (err: unknown) {
			next(err);
		}
	})();
};

export const getFoldersHandler = (
	req: Request<
		Record<string, string>,
		Record<string, string>,
		Record<string, string>,
		GetFoldersInput
	>,
	res: Response,
	next: NextFunction
): void => {
	void (async () => {
		try {
			const MAX_TAKE_LIMIT = 100;
			const DEFAULT_TAKE = 10;

			const skip = req.query['skip'] ?? 0;
			let take = req.query['take'] ?? DEFAULT_TAKE;
			take = Math.min(take, MAX_TAKE_LIMIT);
			const search = req.query.search;

			const userId = res.locals['user'].id;

			const [folders, total] = await folderService.findFoldersWithCount({
				search: search ?? '',
				skip,
				take,
				userId,
			});

			res.status(200).json({
				status: 'success',
				data: { folders },
				meta: {
					skip,
					take,
					total,
					search: search ?? undefined,
				},
			});
		} catch (err: unknown) {
			next(err);
		}
	})();
};

export const updateFolderHandler = (
	req: Request<
		UpdateFolderInput['params'],
		Record<string, string>,
		UpdateFolderInput['body']
	>,
	res: Response,
	next: NextFunction
): void => {
	void (async () => {
		try {
			const folder = await folderService.getFolder(req.params.folderId);

			if (!folder) {
				return next(
					new AppError(
						ErrorCode.NOT_FOUND,
						'Folder with that ID not found',
						404
					)
				);
			}

			Object.assign(folder, req.body);

			const updatedFolder = await folderService.updateFolder(folder);

			res.status(200).json({
				status: 'success',
				data: { folder: updatedFolder },
			});
		} catch (err: unknown) {
			next(err);
		}
	})();
};

export const deleteFolderHandler = (
	req: Request<DeleteFolderInput['params']>,
	res: Response,
	next: NextFunction
): void => {
	void (async () => {
		try {
			const folder = await folderService.getFolder(req.params.folderId);

			if (!folder) {
				return next(
					new AppError(
						ErrorCode.NOT_FOUND,
						'Folder with that ID not found',
						404
					)
				);
			}

			await folderService.deleteFolder(folder);

			res.status(204).json({
				status: 'success',
				data: null,
			});
		} catch (err: unknown) {
			next(err);
		}
	})();
};
