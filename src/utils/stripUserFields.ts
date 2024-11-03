/* eslint-disable @typescript-eslint/no-unused-vars */
import { User } from '../entities/user.entity';

const stripUserFields = ({
	password,
	verificationCode,
	...safeProps
}: User): Partial<User> => {
	return safeProps;
};

export default stripUserFields;
