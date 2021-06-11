const Command = require("../../structures/Command");
const { Mute } = require("../../utils/moderation/actions");
const { UserMentionAndId, NonDigits } = require("../../utils/Regex");
const parse = require("parse-duration");

module.exports = class extends Command {
	constructor(...args) {
		super(...args, {
			description: "Mutes multiple people from a guild",
			category: "Moderation",
			aliases: ["mmute"],
			usage: "!multimute <user> <user2>.... <duration> [reason]",
			examples: [
				"multimute @mrphilip#0001 @Kluk##6589 5m",
				"multimute 190160914765316096 439396770695479297 1h rude user",
				"multimute @mrphilip#0001 @Kluk##6589 24h rude user",
			],
			argList: ["member:Member", "duration:Duration"],
			minArgs: 2,
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
		
		const duration = parse(args.slice(targets.length)[0]);
		if (duration < parse("0s") || duration === null)
			return message.channel.send(await this.client.bulbutils.translate("tempban_invalid_0s", message.guild.id));
		if (duration > parse("1y")) 
			return message.channel.send(await this.client.bulbutils.translate("tempban_invalid_1y", message.guild.id));
		
		let fullList = "";

		for (let i = 0; i < targets.length; i++) {

			if (targets[i] === undefined) continue;

			const t = targets[i].replace(NonDigits, "");
			const target = await message.guild.member(t);

			if(!target)
				return message.channel.send(await this.client.bulbutils.translate("global_user_not_found", message.guild.id));

			if (await this.client.bulbutils.ResolveUserHandle(message, await this.client.bulbutils.CheckUser(message, target), target.user))
				return;

			if (target.roles.cache.find(role => role.id === muteRole))
				return message.channel.send(await this.client.bulbutils.translate("mute_already_muted", message.guild.id));
			
			const muteInfId = await Mute(
				this.client,
				message.guild,
				target,
				message.author,
				await this.client.bulbutils.translate("global_mod_action_log", message.guild.id, {
					action: "Muted",
					moderator_tag: message.author.tag,
					moderator_id: message.author.id,
					target_tag: target.tag,
					target_id: target.id,
					reason,
					until: Date.now() + duration,
				}),
				reason,
				muteRole,
				Date.now() + duration,
			)

			fullList += `**${target.tag}** \`\`(${target.id})\`\` \`\`[#${muteInfId}]\`\` `;
		
			let tempmuteId = await TempmuteCreate(message.guild.id, target.user.tag, target.user.id, reason, Date.now() + duration);

			const client = this.client;
			setTimeout(async function () {
				if ((await getActive(muteInfId)) === "false") return;
				await setActive(muteInfId, "false");
	
				unmuteInfId = await Unmute(
					client,
					message.guild,
					target.user,
					client.user,
					utils.translate("global_mod_action_log", message.guild.id, {
						action: "Unmuted",
						moderator_tag: client.user.tag,
						moderator_id: client.user.id,
						target_tag: target.tag,
						target_id: target.id,
						reason: "Automatic unmute",
					}),
					"Automatic unmute",
					muteRole,
				);
	
				TempmuteDelete(tempmuteId);
			}, duration);
		}

		return message.channel.send(
			await this.client.bulbutils.translate("multimute_success", message.guild.id, {
				full_list: fullList,
				reason,
			}),
		);
	}
};
