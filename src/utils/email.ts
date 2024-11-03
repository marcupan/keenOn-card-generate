import config from 'config';
import { convert } from 'html-to-text';
import nodemailer from 'nodemailer';
import * as pug from 'pug';

import { User } from '../entities/user.entity';

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
		this.firstName = user.name.split(' ')[0] || '';
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
		});
	}

	private async send(template: string, subject: string) {
		const html = pug.renderFile(`${__dirname}/../views/${template}.pug`, {
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

		const info = await this.newTransport().sendMail(mailOptions);

		console.log(nodemailer.getTestMessageUrl(info));
	}

	async sendVerificationCode() {
		await this.send('verificationCode', 'Your account verification code');
	}

	async sendPasswordResetToken() {
		await this.send(
			'resetPassword',
			'Your password reset token (valid for only 10 minutes)'
		);
	}
}
