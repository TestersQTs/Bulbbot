const Command = require("../../structures/Command");
const Discord = require("discord.js");
const moment = require("moment");

module.exports = class extends Command {
	constructor(...args) {
		super(...args, {
			description: "Return the current uptime of the bot",
			category: "Bot",
			usage: "!uptime",
			clientPerms: ["EMBED_LINKS"],
		});
	}

	async run(message, args) {
		const time = moment.duration(this.client.uptime, "milliseconds");
		const days = Math.floor(time.asDays());
		const hours = Math.floor(time.asHours() - days * 24);
		const mins = Math.floor(time.asMinutes() - days * 24 * 60 - hours * 60);
		const secs = Math.floor(time.asSeconds() - days * 24 * 60 * 60 - hours * 60 * 60 - mins * 60);

		const timeStrings = [];
		if (days > 0)
			timeStrings.push(await message.client.bulbutils.translate("uptime_days", message.guild.id, {
				days_text: days == 1 ? await message.client.bulbutils.translate("days_single") : await message.client.bulbutils.translate("days_multi"),
				days_value: days.toString(),
			}));
		if (hours > 0)
			timeStrings.push(await message.client.bulbutils.translate("uptime_hours", message.guild.id, {
				hours_text: hours == 1 ? await message.client.bulbutils.translate("hours_single") : await message.client.bulbutils.translate("hours_multi"),
				hours_value: hours.toString(),
			}));
		if (mins > 0)
			timeStrings.push(await message.client.bulbutils.translate("uptime_mins", message.guild.id, {
				mins_text: mins == 1 ? await message.client.bulbutils.translate("mins_single") : await message.client.bulbutils.translate("mins_multi"),
				mins_value: mins.toString(),
			}));
		if (secs > 0)
			timeStrings.push(await message.client.bulbutils.translate("uptime_secs", message.guild.id, {
				secs_text: secs == 1 ? await message.client.bulbutils.translate("secs_single") : await message.client.bulbutils.translate("secs_multi"),
				secs_value: secs.toString(),
			}));

		if (timeStrings.length === 0)
			timeStrings.push(await message.client.bulbutils.translate("uptime_secs", message.guild.id, {
				secs_text: await message.client.bulbutils.translate("secs_multi"),
				secs_value: (0).toString(),
			}));

		const uptime = await (async () => { // Dynamic assignment
			const last = timeStrings.pop();
			if(timeStrings.length > 1)
				return `${timeStrings.join(", ")},  ${await message.client.bulbutils.translate("and", message.guild.id)} ${last}`;
			else
				timeStrings.push(last);
				return timeStrings.join(` ${await message.client.bulbutils.translate("and", message.guild.id)} `);
		})();
		const embed = new Discord.MessageEmbed()
			.setColor(global.config.embedColor)
			.setDescription(await this.client.bulbutils.translate("uptime_uptime", message.guild.id, { uptime }))
			.setFooter(
				await this.client.bulbutils.translate("global_executed_by", message.guild.id, {
					user_name: await this.client.bulbutils.userObject(true, message.member).username,
					user_discriminator: await this.client.bulbutils.userObject(true, message.member).discriminator,
				}),
				await this.client.bulbutils.userObject(true, message.member).avatarUrl,
			)
			.setTimestamp();

		return message.channel.send(embed);
	}
};
