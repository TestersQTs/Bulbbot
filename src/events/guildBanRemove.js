const Event = require("../structures/Event");
const { SendModAction } = require("../utils/moderation/log");
const { createInfraction } = require("../utils/InfractionUtils");

module.exports = class extends Event {
	constructor(...args) {
		super(...args, {});
	}

	async run(guild, target) {
		// TODO
		// split the message for non audit log unbans
		if (!guild.me.hasPermission("VIEW_AUDIT_LOG")) return;

		const auditLog = await guild.fetchAuditLogs({ limit: 1, type: "MEMBER_BAN_REMOVE" });
		const unbanLog = auditLog.entries.first();
		if (!unbanLog) return;

		let { executor, reason } = unbanLog;
		if (executor.id === this.client.user.id) return;
		if (reason === null) reason = await this.client.bulbutils.translate("global_no_reason", guild.id);

		const infId = await createInfraction(guild.id, "Manual unban", "false", reason, target.tag, target.id, executor.tag, executor.id);
		await SendModAction(this.client, guild, "manually unbanned", target, executor, reason, infId);
	}
};
