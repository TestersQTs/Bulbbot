const Command = require("../../structures/Command");
const { Ban, ForceBan } = require("../../utils/moderation/actions");
const { UserMentionAndId, NonDigits } = require("../../utils/Regex");

module.exports = class extends Command {
	constructor(...args) {
		super(...args, {
			description: "Bans or forcebans multiple people from a guild",
			category: "Moderation",
			aliases: ["mban"],
			usage: "!multiban <user> <user2>.... [reason]",
			examples: [
				"multiban @mrphilip#0001 @Kluk##6589",
				"multiban 190160914765316096 439396770695479297 rude user",
				"multiban @mrphilip#0001 @Kluk##6589 rude user",
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

			const t = targets[i].replace(NonDigits, "");
			let infId;
			let target = await message.guild.member(t);
			const notInGuild = !target;

			if (!notInGuild) {
				if (await this.client.bulbutils.ResolveUserHandle(message, await this.client.bulbutils.CheckUser(message, target), target.user)) return;
			}

			if (notInGuild) {
				try {
					target = await this.client.users.fetch(t);
				} catch (error) {
					message.channel.send(await this.client.bulbutils.translate("global_user_not_found", message.guild.id));
					continue;
				}
				infId = await ForceBan(
					this.client,
					message.guild,
					target,
					message.author,
					await this.client.bulbutils.translate("global_mod_action_log", message.guild.id, {
						action: "Forcebanned",
						moderator_tag: message.author.tag,
						moderator_id: message.author.id,
						target_tag: target.tag,
						target_id: target.id,
						reason,
					}),
					reason,
				);
			} else {
				if (!target.bannable) {
					return message.channel.send(
						await this.client.bulbutils.translate("ban_fail", message.guild.id, {
							target_tag: target.user.tag,
							target_id: target.user.id,
						}),
					);
				}
				target = target.user;
				infId = await Ban(
					this.client,
					message.guild,
					target,
					message.author,
					await this.client.bulbutils.translate("global_mod_action_log", message.guild.id, {
						action: "Banned",
						moderator_tag: message.author.tag,
						moderator_id: message.author.id,
						target_tag: target.tag,
						target_id: target.id,
						reason,
					}),
					reason,
				);
			}

			fullList += `**${target.tag}** \`\`(${target.id})\`\` \`\`[#${infId}]\`\` `;
		}

		return message.channel.send(
			await this.client.bulbutils.translate("multiban_success", message.guild.id, {
				full_list: fullList,
				reason,
			}),
		);
	}
};
