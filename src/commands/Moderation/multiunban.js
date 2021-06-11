const Command = require("../../structures/Command");
const { Unban } = require("../../utils/moderation/actions");
const { UserMentionAndId, NonDigits } = require("../../utils/Regex");

module.exports = class extends Command {
	constructor(...args) {
		super(...args, {
			description: "Unbans multiple people from a guild",
			category: "Moderation",
			aliases: ["munban"],
			usage: "!multiunban <user> <user2>... [reason]",
			examples: [
				"multiunban @mrphilip#0001 @Kluk##6589",
				"multiunban 190160914765316096 439396770695479297 nice user",
				"multiunban @mrphilip#0001 @Kluk##6589 nice user",
			],
			argList: ["user:User"],
			minArgs: 1,
			maxArgs: -1,
			clearance: 50,
			userPerms: ["BAN_MEMBERS"],
			clientPerms: ["BAN_MEMBERS"],
		});
	}

	async run(message, args) {
		const targets = args.slice(0).join(" ").match(UserMentionAndId);
		let reason = args.slice(targets.length).join(" ").replace(UserMentionAndId, "");

		if (reason === "") reason = await this.client.bulbutils.translate("global_no_reason", message.guild.id);
		let fullList = "";

		message.channel.send(await this.client.bulbutils.translate("global_loading", message.guild.id)).then(msg => {
			msg.delete({ timeout: (args.length - 0.5) * global.config.massCommandSleep });
		});

		for (let i = 0; i < targets.length; i++) {
			if (targets[i] === undefined) continue;
			await this.client.bulbutils.sleep(global.config.massCommandSleep);

			let target;
			let infId = null;
			try {
				target = await this.client.users.fetch(targets[i].replace(NonDigits, ""));
			} catch (error) {
				message.channel.send(await this.client.bulbutils.translate("global_user_not_found", message.guild.id));
			}

			infId = await Unban(
				this.client,
				message.guild,
				target,
				message.author,
				await this.client.bulbutils.translate("global_mod_action_log", message.guild.id, {
					action: "Unban",
					moderator_tag: message.author.tag,
					moderator_id: message.author.id,
					target_tag: target.tag,
					target_id: target.id,
					reason,
				}),
				reason,
			);

			fullList += `**${target.tag}** \`\`(${target.id})\`\` \`\`[#${infId}]\`\` `;
		}

		return message.channel.send(
			await this.client.bulbutils.translate("multiunban_success", message.guild.id, {
				full_list: fullList,
				reason,
			}),
		);
	}
};
