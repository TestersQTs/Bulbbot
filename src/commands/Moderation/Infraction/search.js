const { ReasonImage } = require("../../../utils/Regex");
const { getAllUserInfractions } = require("../../../utils/InfractionUtils");
const { NonDigits } = require("../../../utils/Regex");

const Emotes = require("../../../emotes.json");

const Discord = require("discord.js");
const moment = require("moment");
const embedPagination = require("discord.js-pagination");

module.exports = {
	Call: async (client, message, args) => {
		let pages = [];

		if (args.length < 2)
			return message.channel.send(
				await client.bulbutils.translate("event_message_args_missing", message.guild.id, {
					arg: "user:User",
					arg_expected: 2,
					arg_provided: 1,
					usage: "!infraction search <user>",
				}),
			);

		const targetId = args[1].replace(NonDigits, "");
		let user;
		try {
			user = await client.users.fetch(targetId);
		} catch (err) {
			return message.channel.send(await client.bulbutils.translate("global_user_not_found", message.guild.id));
		}

		let infs = await getAllUserInfractions(message.guild.id, user.id, user.id);

		for (let i = 0; i < 50; i++) {
			if (infs[i] === undefined) continue;

			let description = "";
			description += await client.bulbutils.translate("infraction_info_inf_id", message.guild.id, { infractionId: infs[i].id });
			description += await client.bulbutils.translate("infraction_info_target", message.guild.id, {
				target_tag: infs[i].target,
				target_id: infs[i].targetId,
			});
			description += await client.bulbutils.translate("infraction_info_moderator", message.guild.id, {
				moderator_tag: infs[i].moderator,
				moderator_id: infs[i].moderatorId,
			});
			description += await client.bulbutils.translate("infraction_info_created", message.guild.id, {
				timestamp: moment(Date.parse(infs[i].createdAt)).format("MMM Do YYYY, h:mm:ss a"),
			});

			if (infs[i].active !== "false" && infs[i].active !== "true") {
				description += await client.bulbutils.translate("infraction_info_expires", message.guild.id, {
					timestamp: `${Emotes.status.ONLINE} ${moment(parseInt(infs[i].active)).format("MMM Do YYYY, h:mm:ss a")}`,
				});
			} else {
				description += await client.bulbutils.translate("infraction_info_active", message.guild.id, {
					emoji: client.bulbutils.prettify(infs[i].active),
				});
			}

			description += await client.bulbutils.translate("infraction_info_reason", message.guild.id, {
				reason: infs[i].reason,
			});

			const image = infs[i].reason.match(ReasonImage);

			const embed = new Discord.MessageEmbed()
				.setTitle(client.bulbutils.prettify(infs[i].action))
				.setDescription(description)
				.setColor(process.env.EMBED_COLOR)
				.setImage(image ? image[0] : null)
				.setTimestamp();

			pages.push(embed);
		}

		if (pages.length === 0) return message.channel.send(await client.bulbutils.translate("infraction_search_not_found", message.guild.id));

		await embedPagination(message, pages, ["⏪", "⏩"], 120000);
	},
};
