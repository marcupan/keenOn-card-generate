/**
 * API Version Middleware
 *
 * This middleware handles API versioning in requests.
 * It extracts the requested API version from the request headers or URL
 * and validates it against supported versions.
 */

import type { Request, Response, NextFunction } from 'express';

import { ErrorCode } from '../types/error';
import { AppError } from '../utils/appError';
import versionUtils from '../utils/version';

declare global {
	// eslint-disable-next-line @typescript-eslint/no-namespace
	namespace Express {
		interface Request {
			apiVersion: string;
		}
	}
}

class VersionExtractor {
	private static readonly VENDOR = 'keenon';
	private static readonly MIME_PREFIX = 'application/vnd';
	private static readonly VERSION_PATTERN = '\\d+(?:\\.\\d+)*';
	private static readonly FORMAT = 'json';
	private static readonly VERSION_HEADER = 'X-API-Version';
	private static readonly URL_VERSION_PATTERN = /^\/api\/v(\d+(?:\.\d+)*)\//;

	private static readonly ACCEPT_PATTERN = new RegExp(
		`${VersionExtractor.MIME_PREFIX}\\.${VersionExtractor.VENDOR}\\.v(${VersionExtractor.VERSION_PATTERN})\\+${VersionExtractor.FORMAT}`
	);

	static fromAcceptHeader(req: Request): string | null {
		const acceptHeader = req.get('Accept');
		if (!acceptHeader) {
			return null;
		}
		const match = acceptHeader.match(this.ACCEPT_PATTERN);
		return match?.[1] ?? null;
	}

	static fromCustomHeader(req: Request): string | null {
		return req.get(this.VERSION_HEADER) ?? null;
	}

	static fromUrlPath(req: Request): string | null {
		const match = req.path.match(this.URL_VERSION_PATTERN);
		return match?.[1] ?? null;
	}

	static extract(req: Request): string | null {
		return (
			this.fromAcceptHeader(req) ??
			this.fromCustomHeader(req) ??
			this.fromUrlPath(req) ??
			versionUtils.getApiVersion()
		);
	}
}

/**
 * API version middleware
 * Validates the requested API version and adds it to the request object
 */
export const apiVersionMiddleware = (
	req: Request,
	_: Response,
	next: NextFunction
): void => {
	try {
		const requestedVersion = VersionExtractor.extract(req);

		if (!requestedVersion) {
			req.apiVersion = versionUtils.getApiVersion();
			return next();
		}

		if (!versionUtils.isVersionSupported(requestedVersion)) {
			throw new AppError(
				ErrorCode.UNSUPPORTED_API_VERSION,
				`API version ${requestedVersion} is not supported. Current version is ${versionUtils.getApiVersion()}`,
				400
			);
		}

		req.apiVersion = requestedVersion;
		next();
	} catch (error) {
		next(error);
	}
};

export default apiVersionMiddleware;
