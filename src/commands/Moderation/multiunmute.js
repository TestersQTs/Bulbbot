const Command = require("../../structures/Command");
const { UnmuteManual } = require("../../utils/moderation/actions");
const { UserMentionAndId, NonDigits } = require("../../utils/Regex");

module.exports = class extends Command {
	constructor(...args) {
		super(...args, {
			description: "Unmutes multiple people from a guild",
			category: "Moderation",
			aliases: ["munmute"],
			usage: "!multiunmute <user> <user2>... [reason]",
			examples: [
				"multiunban @mrphilip#0001 @Kluk##6589",
				"multiunban 190160914765316096 439396770695479297 nice user",
				"multiunban @mrphilip#0001 @Kluk##6589 nice user",
			],
			argList: ["user:User"],
			minArgs: 1,
			maxArgs: -1,
			clearance: 50,
			clientPerms: ["MANAGE_ROLES"],
		});
	}

	async run(message, args) {
		const targets = args.slice(0).join(" ").match(UserMentionAndId);
		
		let reason = args.slice(targets.length).join(" ").replace(UserMentionAndId, "");
		if (!reason) 
			reason = await this.client.bulbutils.translate("global_no_reason", message.guild.id);
		
		const muteRole = await DatabaseManager.getMuteRole(message.guild);
		if (!muteRole) 
			return message.channel.send(await this.client.bulbutils.translate("mute_muterole_not_found", message.guild.id));
		
		let fullList = "";

		// TODO: should global_loading message be shown?

		for (let i = 0; i < targets.length; i++) {

			if (targets[i] === undefined) continue;

			const t = targets[i].replace(NonDigits, "");
			const target = await message.guild.member(t);

			if(!target)
				return message.channel.send(await this.client.bulbutils.translate("global_user_not_found", message.guild.id));

			if (await this.client.bulbutils.ResolveUserHandle(message, await this.client.bulbutils.CheckUser(message, target), target.user))
				return;

			if (!target.roles.cache.find(role => role.id === muteRole))
				return message.channel.send(await this.client.bulbutils.translate("mute_not_muted", message.guild.id));
			
			const infId = await UnmuteManual(
				this.client,
				message.guild,
				target,
				message.author,
				await this.client.bulbutils.translate("global_mod_action_log", message.guild.id, {
					action: "Unmuted",
					moderator_tag: message.author.tag,
					moderator_id: message.author.id,
					target_tag: target.tag,
					target_id: target.id,
					reason,
				}),
				reason,
				muteRole
			)

			fullList += `**${target.tag}** \`\`(${target.id})\`\` \`\`[#${infId}]\`\` `;
		
		}

		return message.channel.send(
			await this.client.bulbutils.translate("multiunmute_success", message.guild.id, {
				full_list: fullList,
				reason,
			}),
		);
	}
};
