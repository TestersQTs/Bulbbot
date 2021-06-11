const Command = require("../../structures/Command");
const { Voicekick } = require("../../utils/moderation/actions");
const { NonDigits, UserMentionAndId } = require("../../utils/Regex");

module.exports = class extends Command {
	constructor(...args) {
		super(...args, {
			description: "Kicks multiple members from the Voice Channel they're connected to",
			category: "Moderation",
			usage: "!multivoicekick <member> <member2>... [reason]",
			examples: [
				"multivoicekick @mrphilip#0001 @Kluk##6589",
				"multivoicekick 190160914765316096 439396770695479297 rude user",
				"multivoicekick @mrphilip#0001 @Kluk##6589 rude user",
			],
			aliases: ["mvckick"],
			argList: ["member:Member"],
			minArgs: 1,
			maxArgs: -1,
			clearance: 50,
			userPerms: ["MOVE_MEMBERS"],
			clientPerms: ["MOVE_MEMBERS"],
		});
	}

	async run(message, args) {
		const targets = args.slice(0).join(" ").match(UserMentionAndId);
		let reason = args.slice(targets.length).join(" ").replace(UserMentionAndId, "");

		if (reason == "") reason = await this.client.bulbutils.translate("global_no_reason", message.guild.id);
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
			if (await this.client.bulbutils.ResolveUserHandle(message, await this.client.bulbutils.CheckUser(message, target), target.user)) continue;
			if (!target.voice.channel) {
				message.channel.send(await this.client.bulbutils.translate("global_not_in_voice", message.guild.id));
				continue;
			}

			infId = await Voicekick(
				this.client,
				message.guild,
				target,
				message.author,
				await this.client.bulbutils.translate("global_mod_action_log", message.guild.id, {
					action: "Voice-kicked",
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
			await this.client.bulbutils.translate("multivoicekick_success", message.guild.id, {
				full_list: fullList,
				reason,
			}),
		);
	}
};
