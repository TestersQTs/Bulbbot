const Command = require("../../structures/Command");
const { Kick } = require("../../utils/moderation/actions");
const { UserMentionAndId, NonDigits } = require("../../utils/Regex");

module.exports = class extends Command {
	constructor(...args) {
		super(...args, {
			description: "Kicks multiple people from a guild",
			category: "Moderation",
			aliases: ["mkick"],
			usage: "!multikick <member> <member2>.... [reason]",
			examples: [
				"multikick @mrphilip#0001 @Kluk##6589",
				"multikick 190160914765316096 439396770695479297 rude user",
				"multikick @mrphilip#0001 @Kluk##6589 rude user",
			],
			argList: ["member:Member"],
			minArgs: 1,
			maxArgs: -1,
			clearance: 50,
			userPerms: ["KICK_MEMBERS"],
			clientPerms: ["KICK_MEMBERS"],
		});
	}

	async run(message, args) {
		const targets = args.slice(0).join(" ").match(UserMentionAndId);
		if (targets === null) return message.channel.send(await this.client.bulbutils.translate("global_user_not_found", message.guild.id));
		let reason = args.slice(targets.length).join(" ").replace(UserMentionAndId, "");

		if (reason === "") reason = await this.client.bulbutils.translate("global_no_reason", message.guild.id);
		let fullList = "";

		message.channel.send(await this.client.bulbutils.translate("global_loading", message.guild.id)).then(msg => {
			msg.delete({ timeout: (args.length - 0.5) * global.config.massCommandSleep });
		});

		for (let i = 0; i < targets.length; i++) {
			if (targets[i] === undefined) continue;
			await this.client.bulbutils.sleep(global.config.massCommandSleep);

			const t = targets[i].replace(NonDigits, "");
			const target = await message.guild.member(t);
			let infId;

			if (!target) {
				message.channel.send(await this.client.bulbutils.translate("global_user_not_found", message.guild.id));
				continue;
			}
			if (await this.client.bulbutils.ResolveUserHandle(message, await this.client.bulbutils.CheckUser(message, target), target.user)) return;

			if (!target.kickable) {
				message.channel.send(
					await this.client.bulbutils.translate("kick_fail", message.guild.id, {
						target_tag: target.user.tag,
						target_id: target.user.id,
					}),
				);
			}

			infId = await Kick(
				this.client,
				message.guild,
				target.user,
				message.author,
				await this.client.bulbutils.translate("global_mod_action_log", message.guild.id, {
					action: "Kicked",
					moderator_tag: message.author.tag,
					moderator_id: message.author.id,
					target_tag: target.user.tag,
					target_id: target.user.id,
					reason,
				}),
				reason,
			);

			fullList += `**${target.user.tag}** \`\`(${target.user.id})\`\` \`\`[#${infId}]\`\` `;
		}

		return message.channel.send(
			await this.client.bulbutils.translate("multikick_success", message.guild.id, {
				full_list: fullList,
				reason,
			}),
		);
	}
};
