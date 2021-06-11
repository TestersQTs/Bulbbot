const Command = require("../../structures/Command");
const { setActive, getLatestMute } = require("../../utils/InfractionUtils");
const { UnmuteManual } = require("../../utils/moderation/actions");
const { NonDigits } = require("../../utils/Regex");
const DatabaseManager = new (require("../../utils/database/DatabaseManager"));

module.exports = class extends Command {
	constructor(...args) {
		super(...args, {
			description: "Unutes the selected user",
			category: "Moderation",
			usage: "!unmute <member> [reason]",
			examples: [
				"unmute 190160914765316096", 
				"unmute 190160914765316096 nice user", 
				"unmute @mrphilip#0001 nice user"],
			argList: ["user:User"],
			minArgs: 1,
			maxArgs: -1,
			clearance: 50,
			clientPerms: ["MANAGE_ROLES"],
		});
	}

	async run(message, args) {
		const targetId = args[0].replace(NonDigits, "");
		const target = message.guild.member(targetId);
		const muteRole = await DatabaseManager.getMuteRole(message.guild);
		let reason = args.slice(1).join(" ");
		let infId = null;

		if (!reason) reason = await this.client.bulbutils.translate("global_no_reason", message.guild.id);
		if (!muteRole) return message.channel.send(await this.client.bulbutils.translate("mute_muterole_not_found", message.guild.id));
		if (!target) return message.channel.send(await this.client.bulbutils.translate("global_user_not_found", message.guild.id));
		if (!target.roles.cache.find(role => role.id === muteRole))
			return message.channel.send(await this.client.bulbutils.translate("mute_not_muted", message.guild.id));

		infId = await UnmuteManual(
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
				reason: reason,
			}),
			reason,
			muteRole,
		);

		message.channel.send(
			await this.client.bulbutils.translate("unmute_success", message.guild.id, {
				target_tag: target.user.tag,
				target_id: target.user.id,
				reason,
				infractionId: infId,
			}),
		);

		const latestMute = await getLatestMute(message.guild.id, target.id);
		// This fails if the target has the mute role but has never been muted, resulting in latestMute = []
		// I'd prefer to change it to return `null` or something instead, if it won't break anything
		if (!(latestMute instanceof Array))
			await setActive(latestMute, "false");
	}
};
