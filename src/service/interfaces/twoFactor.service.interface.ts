/**
 * Interface for the Two-Factor Authentication service
 */
export interface ITwoFactorService {
	/**
	 * Generate a secret for two-factor authentication
	 * @param userId User ID
	 * @returns Object containing the secret and QR code URL
	 */
	generateSecret(userId: string): Promise<{
		secret: string;
		qrCode: string;
	}>;

	/**
	 * Verify a token and enable two-factor authentication
	 * @param userId User ID
	 * @param token Verification token
	 * @returns Success status
	 */
	verifyAndEnable(
		userId: string,
		token: string
	): Promise<{
		success: boolean;
	}>;

	/**
	 * Verify a token for two-factor authentication
	 * @param userId User ID
	 * @param token Verification token
	 * @returns Verification status
	 */
	verify(
		userId: string,
		token: string
	): Promise<{
		verified: boolean;
	}>;

	/**
	 * Disable two-factor authentication
	 * @param userId User ID
	 * @returns Success status
	 */
	disable(userId: string): Promise<{
		success: boolean;
	}>;
}
