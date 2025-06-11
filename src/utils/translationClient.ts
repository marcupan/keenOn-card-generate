import 'dotenv/config';
import type { ServiceError } from '@grpc/grpc-js';
import * as grpc from '@grpc/grpc-js';
import { Metadata } from '@grpc/grpc-js';
import config from 'config';

import { TranslationServiceClientImpl } from '../../proto/translation';

const grpcConfig = config.get<{
	hostTranslate: string;
	portTranslate: number;
}>('grpcConfig');

interface Rpc {
	request(
		service: string,
		method: string,
		data: Uint8Array
	): Promise<Uint8Array>;
}

const grpcUrl = `${grpcConfig.hostTranslate}:${grpcConfig.portTranslate}`;

class GrpcTransport implements Rpc {
	private readonly client: grpc.Client;

	constructor(address: string) {
		this.client = new grpc.Client(
			address,
			grpc.credentials.createInsecure()
		);
	}

	request(
		service: string,
		method: string,
		data: Uint8Array
	): Promise<Uint8Array> {
		return new Promise((resolve, reject) => {
			const fullMethod = `/${service}/${method}`;

			const serialize: grpc.serialize<Uint8Array> = (arg: Uint8Array) =>
				Buffer.from(arg);
			const deserialize: grpc.deserialize<Uint8Array> = (arg: Buffer) =>
				new Uint8Array(arg);

			this.client.makeUnaryRequest(
				fullMethod,
				serialize,
				deserialize,
				data,
				new Metadata(),
				{},
				(
					err: ServiceError | null,
					response: Uint8Array | null | undefined
				) => {
					if (err) {
						reject(err);
					} else if (response !== undefined && response !== null) {
						resolve(response);
					} else {
						reject(new Error('No response received'));
					}
				}
			);
		});
	}
}

const grpcTransport = new GrpcTransport(grpcUrl);
const translateClient = new TranslationServiceClientImpl(grpcTransport);

export default translateClient;
