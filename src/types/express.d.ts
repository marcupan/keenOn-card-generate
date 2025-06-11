declare global {
	namespace Express {
		interface Request {
			user?: {
				id: string;
			};
			featureFlags?: {
				isEnabled: (flagName: string) => boolean;
			};
			apiVersion?: string;
		}
	}
}
