import * as crypto from 'crypto';

import config from 'config';

export class Encryption {
	private static algorithm = 'aes-256-gcm';
	private static encryptionKey: Buffer;
	private static initialized = false;

	public static initialize(): void {
		if (this.initialized) {
			return;
		}

		const key = config.get<string>('encryption.key');
		if (!key) {
			throw new Error('Encryption key is not configured');
		}

		this.encryptionKey = crypto.createHash('sha256').update(key).digest();
		this.initialized = true;
	}

	public static encrypt(text: string): string {
		this.ensureInitialized();

		const iv = crypto.randomBytes(16);
		const cipher = crypto.createCipheriv(
			this.algorithm,
			this.encryptionKey,
			iv
		) as crypto.CipherGCM;

		let encrypted = cipher.update(text, 'utf8', 'base64');
		encrypted += cipher.final('base64');

		const authTag = cipher.getAuthTag();

		if (!iv || !authTag || !encrypted) {
			throw new Error('Encryption failed: Invalid output');
		}

		return `${iv.toString('base64')}:${authTag.toString('base64')}:${encrypted}`;
	}

	public static decrypt(encryptedText: string): string {
		this.ensureInitialized();

		const parts = encryptedText.split(':');
		if (parts.length !== 3) {
			throw new Error('Invalid encrypted text format');
		}

		const [ivBase64, authTagBase64, encryptedData] = parts as [
			string,
			string,
			string,
		];

		const iv = Buffer.from(ivBase64, 'base64');
		const authTag = Buffer.from(authTagBase64, 'base64');

		const decipher = crypto.createDecipheriv(
			this.algorithm,
			this.encryptionKey,
			iv
		) as crypto.DecipherGCM;

		decipher.setAuthTag(authTag);

		if (!encryptedData) {
			throw new Error('Decryption failed: Invalid input');
		}

		let decrypted = decipher.update(encryptedData, 'base64', 'utf8');
		decrypted += decipher.final('utf8');

		return decrypted;
	}

	public static hash(text: string): string {
		return crypto.createHash('sha256').update(text).digest('hex');
	}

	private static ensureInitialized(): void {
		if (!this.initialized) {
			this.initialize();
		}
	}
}
