import config from 'config';
import { convert } from 'html-to-text';
import nodemailer from 'nodemailer';
import * as pug from 'pug';

import type { User } from '../entities';

const smtp = config.get<{
	host: string;
	port: number;
	user: string;
	pass: string;
}>('smtp');

export default class Email {
	firstName: string;
	to: string;
	from: string;

	constructor(
		public user: User,
		public url: string
	) {
		this.firstName = user.name.split(' ')[0] ?? '';
		this.to = user.email;
		this.from = `Auth provider ${config.get<string>('emailFrom')}`;
	}

	private newTransport() {
		return nodemailer.createTransport({
			...smtp,
			auth: {
				user: smtp.user,
				pass: smtp.pass,
			},
			connectionTimeout: 10000,
			greetingTimeout: 5000,
			socketTimeout: 10000,
		});
	}

	private async send(template: string, subject: string) {
		try {
			const templatePath = `${__dirname}/../views/${template}.pug`;

			const html = pug.renderFile(templatePath, {
				firstName: this.firstName,
				subject,
				url: this.url,
			});

			const mailOptions = {
				from: this.from,
				to: this.to,
				subject,
				text: convert(html),
				html,
			};

			const transport = this.newTransport();

			const info = await transport.sendMail(mailOptions);

			try {
				if (
					info &&
					typeof nodemailer.getTestMessageUrl === 'function'
				) {
					const url = nodemailer.getTestMessageUrl(info);
					console.log('Email.send - Test message URL:', url);
				}
			} catch {
				/* empty */
			}

			return true;
		} catch {
			return false;
		}
	}

	async sendVerificationCode(): Promise<boolean> {
		try {
			return await this.send(
				'verificationCode',
				'Your account verification code'
			);
		} catch {
			return false;
		}
	}

	async sendPasswordResetToken(): Promise<boolean> {
		try {
			return await this.send(
				'resetPassword',
				'Your password reset token (valid for only 10 minutes)'
			);
		} catch {
			return false;
		}
	}
}
