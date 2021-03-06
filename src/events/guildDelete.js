const Event = require("../structures/Event");
const DatabaseManager = new (require("../utils/database/DatabaseManager"))();
const Emote = require("../emotes.json");

module.exports = class extends Event {
	constructor(...args) {
		super(...args, {});
	}

	async run(guild) {
		if (!guild) return;

		await DatabaseManager.deleteGuild(guild.id);

		this.client.channels.cache
			.get(global.config.invite)
			.send(
				`${Emote.other.LEAVE} Left guild: **${guild.name}** \`(${guild.id})\` owned by <@${guild.ownerID}> \`(${guild.ownerID})\`\nMembers: **${guild.memberCount}**`,
			);
	}
};
