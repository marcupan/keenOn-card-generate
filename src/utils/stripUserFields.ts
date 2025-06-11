import type { User } from '../entities';

const stripUserFields = ({
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	password,
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	verificationCode,
	...safeProps
}: User): Partial<User> => {
	return safeProps;
};

export default stripUserFields;
