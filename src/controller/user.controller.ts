import { NextFunction, Request, Response } from 'express';

import { findUsers } from '../service/user.service';
import stripUserFields from '../utils/stripUserFields';

export const getUserHandler = async (
	_: Request,
	res: Response,
	next: NextFunction
) => {
	try {
		const user = stripUserFields(res.locals.user);

		res.status(200).json({
			status: 'success',
			data: {
				user,
			},
		});
	} catch (err: unknown) {
		next(err);
	}
};

export const getUsersHandler = async (
	_: Request,
	res: Response,
	next: NextFunction
) => {
	try {
		const users = await findUsers({});

		res.status(200).json({
			status: 'success',
			data: {
				users,
			},
		});
	} catch (err: unknown) {
		next(err);
	}
};
