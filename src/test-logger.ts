import Logger from './utils/logger';

function testLogger() {
	Logger.debug('This is a debug message');
	Logger.http('This is an HTTP message');
	Logger.info('This is an info message');
	Logger.warn('This is a warning message');
	Logger.error('This is an error message');

	Logger.info('This is a message with metadata', {
		user: 'test',
		action: 'login',
	});

	const userLogger = Logger.getLogger('UserService');
	userLogger.info('User created successfully');
	userLogger.error('Failed to update user', {
		userId: '123',
		reason: 'validation error',
	});

	console.log(
		'Logger test completed. Check the logs directory for file output.'
	);
}

testLogger();
