import type { AnyZodObject } from 'zod';
import { ZodError } from 'zod';

import type { Request, Response, NextFunction } from 'express';

export const validate =
	(schema: AnyZodObject) =>
	(req: Request, res: Response, next: NextFunction) => {
		try {
			schema.parse({
				params: req.params,
				query: req.query,
				body: req.body,
			});

			return next();
		} catch (error) {
			if (error instanceof ZodError) {
				if (res.headersSent) {
					return;
				}

				return res.status(400).json({
					status: 'fail',
					errors: error.errors,
				});
			}

			if (res.headersSent) {
				return;
			}

			return next(error);
		}
	};
