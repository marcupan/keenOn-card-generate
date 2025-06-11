/**
 * Utility functions for handling null and undefined values safely
 */

/**
 * Returns the value if it's not null or undefined, otherwise returns the default value
 * @param value The value to check
 * @param defaultValue The default value to return if value is null or undefined
 * @returns The value or the default value
 */
export function withDefault<T>(
	value: T | null | undefined,
	defaultValue: T
): T {
	return value ?? defaultValue;
}

/**
 * Returns true if the value is not null and not undefined
 * @param value The value to check
 * @returns True if the value is not null and not undefined
 */
export function isPresent<T>(value: T | null | undefined): value is T {
	return value !== null && value !== undefined;
}

/**
 * Returns true if the value is null or undefined
 * @param value The value to check
 * @returns True if the value is null or undefined
 */
export function isNullish<T>(
	value: T | null | undefined
): value is null | undefined {
	return value === null || value === undefined;
}

/**
 * Maps a value if it's not null or undefined, otherwise returns null
 * @param value The value to map
 * @param mapper The mapping function
 * @returns The mapped value or null
 */
export function mapIfPresent<T, R>(
	value: T | null | undefined,
	mapper: (value: T) => R
): R | null {
	return isPresent(value) ? mapper(value) : null;
}

/**
 * Throws an error if the value is null or undefined
 * @param value The value to check
 * @param errorMessage The error message to throw
 * @returns The value if it's not null or undefined
 * @throws Error if the value is null or undefined
 */
export function requireNonNullish<T>(
	value: T | null | undefined,
	errorMessage = 'Value cannot be null or undefined'
): T {
	if (isNullish(value)) {
		throw new Error(errorMessage);
	}
	return value;
}

/**
 * Safely accesses a property of an object that might be null or undefined
 * @param obj The object to access
 * @param accessor A function that accesses a property of the object
 * @param defaultValue The default value to return if the object or property is null or undefined
 * @returns The property value or the default value
 */
export function safeAccess<T, R>(
	obj: T | null | undefined,
	accessor: (obj: T) => R,
	defaultValue: R
): R {
	try {
		return isPresent(obj) ? accessor(obj) : defaultValue;
	} catch {
		return defaultValue;
	}
}

/**
 * Safely calls a function with the provided arguments, returning a default value if an error occurs
 * @param fn The function to call
 * @param args The arguments to pass to the function
 * @param defaultValue The default value to return if an error occurs
 * @returns The result of the function call or the default value
 */
export function safeCall<T, Args extends unknown[]>(
	fn: (...args: Args) => T,
	args: Args,
	defaultValue: T
): T {
	try {
		return fn(...args);
	} catch {
		return defaultValue;
	}
}
