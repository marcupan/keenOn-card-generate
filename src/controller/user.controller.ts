import type { NextFunction, Request, Response } from 'express';

import { userService } from '../service/user.service';
import stripUserFields from '../utils/stripUserFields';

export const getUserHandler = (
	_req: Request,
	res: Response,
	next: NextFunction
): void => {
	try {
		const userFromLocals = res.locals['user'];

		const user = stripUserFields(userFromLocals);

		if (res.headersSent) {
			return;
		}

		res.status(200).json({
			status: 'success',
			data: {
				user,
			},
		});
	} catch (err: unknown) {
		if (res.headersSent) {
			return;
		}

		next(err);
	}
};

export const getUsersHandler = (
	req: Request,
	res: Response,
	next: NextFunction
): void => {
	void (async () => {
		try {
			const MAX_TAKE_LIMIT = 100;
			const DEFAULT_TAKE = 10;

			let skip = 0;
			if (req.query['skip'] && typeof req.query['skip'] === 'string') {
				const parsedSkip = parseInt(req.query['skip'], 10);
				if (!isNaN(parsedSkip) && parsedSkip >= 0) {
					skip = parsedSkip;
				}
			}

			let take = DEFAULT_TAKE;
			if (req.query['take'] && typeof req.query['take'] === 'string') {
				const parsedTake = parseInt(req.query['take'], 10);
				if (!isNaN(parsedTake) && parsedTake >= 1) {
					take = Math.min(parsedTake, MAX_TAKE_LIMIT);
				}
			}

			let search: string | undefined;
			if (
				req.query['search'] &&
				typeof req.query['search'] === 'string'
			) {
				search = req.query['search'].trim();
			}

			const [users, total] = await userService.findUsersWithCount({
				skip,
				take,
				search: search ?? '',
			});

			if (res.headersSent) {
				return;
			}

			res.status(200).json({
				status: 'success',
				data: { users },
				meta: {
					skip,
					take,
					total,
					search: search ?? undefined,
				},
			});
		} catch (err) {
			if (!res.headersSent) {
				next(err as Error);
			}
		}
	})();
};
