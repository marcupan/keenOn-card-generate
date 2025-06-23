import speakeasy from 'speakeasy';
import QRCode from 'qrcode';
import { Service } from 'typedi';

import { userRepository } from '@repository/user.repository';
import { AppError, NotFoundError } from '@utils/appError';
import { ErrorCode } from '../types/error';
import Container from '../utils/container';

import { ITwoFactorService } from './interfaces/twoFactor.service.interface';

/**
 * Service for handling two-factor authentication
 */
@Service()
export class TwoFactorService implements ITwoFactorService {
	/**
	 * Generate a secret for two-factor authentication
	 * @param userId User ID
	 * @returns Object containing the secret and QR code URL
	 */
	async generateSecret(userId: string): Promise<{
		secret: string;
		qrCode: string;
	}> {
		const user = await userRepository.findById(userId);
		if (!user) {
			throw new NotFoundError('User not found');
		}

		const secret = speakeasy.generateSecret({
			name: `KeenOn Card Generate:${user.email}`,
		});

		user.twoFactorSecret = secret.base32;
		user.twoFactorEnabled = false;
		await userRepository.save(user);

		const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url || '');

		return {
			secret: secret.base32,
			qrCode: qrCodeUrl,
		};
	}

	/**
	 * Verify a token and enable two-factor authentication
	 * @param userId User ID
	 * @param token Verification token
	 * @returns Success status
	 */
	async verifyAndEnable(
		userId: string,
		token: string
	): Promise<{
		success: boolean;
	}> {
		const user = await userRepository.findById(userId);
		if (!user) {
			throw new NotFoundError('User not found');
		}

		if (!user.twoFactorSecret) {
			throw new AppError(
				ErrorCode.BAD_REQUEST,
				'Two-factor authentication not set up',
				400
			);
		}

		const verified = speakeasy.totp.verify({
			secret: user.twoFactorSecret,
			encoding: 'base32',
			token,
		});

		if (!verified) {
			throw new AppError(
				ErrorCode.UNAUTHORIZED,
				'Invalid verification code',
				401
			);
		}

		user.twoFactorEnabled = true;
		await userRepository.save(user);

		return { success: true };
	}

	/**
	 * Verify a token for two-factor authentication
	 * @param userId User ID
	 * @param token Verification token
	 * @returns Verification status
	 */
	async verify(
		userId: string,
		token: string
	): Promise<{
		verified: boolean;
	}> {
		const user = await userRepository.findById(userId);
		if (!user) {
			throw new NotFoundError('User not found');
		}

		if (!user.twoFactorEnabled || !user.twoFactorSecret) {
			throw new AppError(
				ErrorCode.BAD_REQUEST,
				'Two-factor authentication not enabled',
				400
			);
		}

		const verified = speakeasy.totp.verify({
			secret: user.twoFactorSecret,
			encoding: 'base32',
			token,
		});

		return { verified };
	}

	/**
	 * Disable two-factor authentication
	 * @param userId User ID
	 * @returns Success status
	 */
	async disable(userId: string): Promise<{
		success: boolean;
	}> {
		const user = await userRepository.findById(userId);
		if (!user) {
			throw new NotFoundError('User not found');
		}

		user.twoFactorEnabled = false;
		user.twoFactorSecret = null;
		await userRepository.save(user);

		return { success: true };
	}
}

// Only create the singleton instance if not in test environment
export const twoFactorService =
	process.env['NODE_ENV'] !== 'test'
		? Container.get(TwoFactorService)
		: (undefined as unknown as TwoFactorService);
