import config from 'config';
import jwt, { SignOptions } from 'jsonwebtoken';

export const signJwt = (
	payload: Record<string, string>,
	keyName: 'accessTokenPrivateKey' | 'refreshTokenPrivateKey',
	options: SignOptions
) => {
	const privateKey = Buffer.from(
		config.get<string>(keyName),
		'base64'
	).toString('ascii');

	return jwt.sign(payload, privateKey, {
		...(options && options),
		algorithm: 'RS256',
	});
};

export const verifyJwt = <T>(
	token: string,
	keyName: 'accessTokenPublicKey' | 'refreshTokenPublicKey'
): T | null => {
	try {
		const publicKey = Buffer.from(
			config.get<string>(keyName),
			'base64'
		).toString('ascii');

		return jwt.verify(token, publicKey) as T;
	} catch {
		return null;
	}
};
