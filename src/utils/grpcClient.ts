import 'dotenv/config';
import * as grpc from '@grpc/grpc-js';
import { Metadata, ServiceError } from '@grpc/grpc-js';
import config from 'config';

const grpcConfig = config.get<{
	host: string;
	port: number;
}>('grpcConfig');

interface Rpc {
	request(
		service: string,
		method: string,
		data: Uint8Array
	): Promise<Uint8Array>;
}

const grpcUrl = `${grpcConfig.host}:${grpcConfig.port}`;

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

// Create a gRPC client using the GreeterClientImpl and custom transport
const grpcTransport = new GrpcTransport(grpcUrl);

export default grpcTransport;
