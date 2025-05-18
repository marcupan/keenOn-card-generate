import { NextFunction, Request, Response } from 'express';

import {
	CreateFolderInput,
	DeleteFolderInput,
	GetFolderInput,
	GetFoldersInput,
	UpdateFolderInput,
} from '../schema/folder.schema';
import {
	createFolder,
	findFolders,
	getFolder,
	updateFolder,
	deleteFolder,
} from '../service/folder.service';
import { findUserById } from '../service/user.service';
import { ErrorCode } from '../types/error';
import { AppError } from '../utils/appError';

export const createFolderHandler = async (
	req: Request<
		Record<string, string>,
		Record<string, string>,
		CreateFolderInput
	>,
	res: Response,
	next: NextFunction
) => {
	try {
		const user = await findUserById(res.locals.user.id as string);

		if (user) {
			const folder = await createFolder(req.body, user);

			res.status(201).json({
				status: 'success',
				data: { folder },
			});
		}
	} catch (err: unknown) {
		next(err);
	}
};

export const getFolderHandler = async (
	req: Request<GetFolderInput['params']>,
	res: Response,
	next: NextFunction
) => {
	try {
		const folder = await getFolder(req.params.folderId);

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
};

export const getFoldersHandler = async (
	req: Request<
		Record<string, string>,
		Record<string, string>,
		Record<string, string>,
		GetFoldersInput
	>,
	res: Response,
	next: NextFunction
) => {
	try {
		const { search, skip = 0, take = 10 } = req.query;

		const folders = await findFolders({ search, skip, take });

		res.status(200).json({
			status: 'success',
			data: { folders },
			meta: { skip, take },
		});
	} catch (err: unknown) {
		next(err);
	}
};

export const updateFolderHandler = async (
	req: Request<
		UpdateFolderInput['params'],
		Record<string, string>,
		UpdateFolderInput['body']
	>,
	res: Response,
	next: NextFunction
) => {
	try {
		const folder = await getFolder(req.params.folderId);

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

		const updatedFolder = await updateFolder(folder);

		res.status(200).json({
			status: 'success',
			data: { folder: updatedFolder },
		});
	} catch (err: unknown) {
		next(err);
	}
};

export const deleteFolderHandler = async (
	req: Request<DeleteFolderInput['params']>,
	res: Response,
	next: NextFunction
) => {
	try {
		const folder = await getFolder(req.params.folderId);

		if (!folder) {
			return next(
				new AppError(
					ErrorCode.NOT_FOUND,
					'Folder with that ID not found',
					404
				)
			);
		}

		await deleteFolder(folder);

		res.status(204).json({
			status: 'success',
			data: null,
		});
	} catch (err: unknown) {
		next(err);
	}
};
