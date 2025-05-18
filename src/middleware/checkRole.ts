import { Request, Response, NextFunction } from 'express';

import { ErrorCode } from '../types/error';
import { RoleEnumType } from '../types/role';
import { AppError } from '../utils/appError';

export const checkRole = (requiredRole: RoleEnumType) => {
	return (_: Request, res: Response, next: NextFunction) => {
		const userRole = res.locals.user.role;

		if (userRole !== requiredRole) {
			return next(
				new AppError(
					ErrorCode.FORBIDDEN,
					'You do not have permission to perform this action',
					403
				)
			);
		}

		next();
	};
};
