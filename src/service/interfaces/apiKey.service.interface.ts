/**
 * Interface for the API Key service
 */
export interface IApiKeyService {
	/**
	 * Create a new API key
	 * @param userId User ID
	 * @param name API key name
	 * @param scopes Optional scopes for the API key
	 * @returns Created API key with unhashed key value
	 */
	createApiKey(
		userId: string,
		name: string,
		scopes?: string[]
	): Promise<{
		id: string;
		name: string;
		key: string;
		scopes?: string[];
		createdAt: Date;
	}>;

	/**
	 * Validate an API key
	 * @param apiKey API key value
	 * @returns API key and associated user
	 */
	validateApiKey(apiKey: string): Promise<{
		apiKey: {
			id: string;
			name: string;
			scopes?: string[];
		};
		user: {
			id: string;
			name: string;
			email: string;
			role: string;
		};
	}>;

	/**
	 * Revoke an API key
	 * @param id API key ID
	 * @param userId User ID
	 * @returns Success status
	 */
	revokeApiKey(
		id: string,
		userId: string
	): Promise<{
		success: boolean;
	}>;

	/**
	 * List API keys for a user
	 * @param userId User ID
	 * @returns List of API keys
	 */
	listApiKeys(userId: string): Promise<
		Array<{
			id: string;
			name: string;
			scopes?: string[];
			created_at: Date;
			updated_at: Date;
		}>
	>;
}
