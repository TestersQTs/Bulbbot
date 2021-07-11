import { Guild, GuildMember, Snowflake, User } from "discord.js";
import { sequelize } from "../database/connection";
import { QueryTypes } from "sequelize";
import moment, { MomentInput } from "moment";
import BulbBotClient from "../../structures/BulbBotClient";
import LoggingManager from "./LoggingManager";
import { BanType } from "../types/BanType";
import { MuteType } from "../types/MuteType";

const loggingManager: LoggingManager = new LoggingManager();

export default class {
	async createInfraction(guildID: Snowflake, action: string, active: boolean | number, reason: string, target: User, moderator: User): Promise<void> {
		await sequelize.query(
			'INSERT INTO infractions (action, active, reason, target, "targetId", moderator, "moderatorId", "createdAt", "updatedAt", "guildId") VALUES ($InfAction, $Active, $Reason, $Target, $TargetID, $Moderator, $ModeratorID, $CreatedAt, $UpdatedAt, (SELECT id FROM guilds WHERE "guildId" = $GuildID))',
			{
				bind: {
					GuildID: guildID,
					InfAction: action,
					Active: active,
					Reason: reason,
					Target: target.tag,
					TargetID: target.id,
					Moderator: moderator.tag,
					ModeratorID: moderator.id,
					CreatedAt: moment().format(),
					UpdatedAt: moment().format(),
				},
				type: QueryTypes.INSERT,
			},
		);
	}

	public async deleteInfraction(guildID: Snowflake, infractionID: number): Promise<void> {
		await sequelize.query('DELETE FROM infractions WHERE "guildId" = (SELECT id FROM guilds WHERE "guildId" = $GuildID) AND id = $InfID', {
			bind: { GuildID: guildID, InfID: infractionID },
			type: QueryTypes.DELETE,
		});
	}

	public async getInfraction(guildID: Snowflake, infractionID: number): Promise<Record<string, any> | undefined> {
		const response: Record<string, any> = await sequelize.query('SELECT * FROM infractions WHERE "guildId" = (SELECT id FROM guilds WHERE "guildId" = $GuildID) AND id = $InfID', {
			bind: { GuildID: guildID, InfID: infractionID },
			type: QueryTypes.SELECT,
		});

		return response[0];
	}

	public async getAllInfractions(guildID: Snowflake): Promise<Record<string, any> | undefined> {
		return await sequelize.query('SELECT * FROM infractions WHERE "guildId" = (SELECT id FROM guilds WHERE "guildId" = $GuildID) LIMIT 50', {
			bind: { GuildID: guildID },
			type: QueryTypes.SELECT,
		});
	}

	public async getOffenderInfractions(guildID: Snowflake, targetID: Snowflake): Promise<Record<string, any> | undefined> {
		return await sequelize.query('SELECT * FROM infractions WHERE "guildId" = (SELECT id FROM guilds WHERE "guildId" = $GuildID) AND "targetId" = $TargetID LIMIT 50', {
			bind: { GuildID: guildID, TargetID: targetID },
			type: QueryTypes.SELECT,
		});
	}

	public async getModeratorInfractions(guildID: Snowflake, targetID: Snowflake): Promise<Record<string, any> | undefined> {
		return await sequelize.query('SELECT * FROM infractions WHERE "guildId" = (SELECT id FROM guilds WHERE "guildId" = $GuildID) AND "moderatorId" = $ModeratorID LIMIT 50', {
			bind: { GuildID: guildID, ModeratorID: targetID },
			type: QueryTypes.SELECT,
		});
	}

	public async getAllUserInfractions(guildID: Snowflake, targetID: Snowflake): Promise<Record<string, any> | undefined> {
		return await sequelize.query('SELECT * FROM infractions WHERE "guildId" = (SELECT id FROM guilds WHERE "guildId" = $GuildID) AND "targetId" = $TargetID OR "moderatorId" = $ModeratorID LIMIT 50', {
			bind: { GuildID: guildID, TargetID: targetID, ModeratorID: targetID },
			type: QueryTypes.SELECT,
		});
	}

	public async isActive(guildID: Snowflake, infractionID: number): Promise<boolean | undefined> {
		const response: Record<string, any> = await sequelize.query('SELECT active FROM infractions WHERE "guildId" = (SELECT id FROM guilds WHERE "guildId" = $GuildID) AND id = $InfractionID', {
			bind: { GuildID: guildID, InfractionID: infractionID },
			type: QueryTypes.SELECT,
		});

		return JSON.parse(response[0]["active"]);
	}

	public async setActive(guildID: Snowflake, infractionID: number, active: boolean | number): Promise<void> {
		await sequelize.query('UPDATE infractions SET active = $Active WHERE "guildId" = (SELECT id FROM guilds WHERE "guildId" = $GuildID) AND id = $InfractionID', {
			bind: { GuildID: guildID, InfractionID: infractionID, Active: active },
			type: QueryTypes.UPDATE,
		});
	}

	public async updateModerator(guildID: Snowflake, infractionID: number, moderator: User): Promise<void> {
		await sequelize.query('UPDATE infractions SET (moderator, "moderatorId") = ($ModTag, $ModID) WHERE "guildId" = (SELECT id FROM guilds WHERE "guildId" = $GuildID) AND id = $InfractionID', {
			bind: { ModTag: moderator.tag, ModID: moderator.id, GuildID: guildID, InfractionID: infractionID },
			type: QueryTypes.UPDATE,
		});
	}

	public async updateReason(guildID: Snowflake, infractionID: number, reason: string): Promise<void> {
		await sequelize.query('UPDATE infractions SET reason = $Reason WHERE "guildId" = (SELECT id FROM guilds WHERE "guildId" = $GuildID) AND id = $InfractionID', {
			bind: { Reason: reason, GuildID: guildID, InfractionID: infractionID },
			type: QueryTypes.UPDATE,
		});
	}

	public async getLatestMute(guildID: Snowflake, targetID: Snowflake): Promise<Record<string, any> | undefined> {
		const response: Record<string, any> = await sequelize.query(
			'SELECT * FROM infractions WHERE action = \'Mute\' AND "guildId" = (SELECT id FROM guilds WHERE "guildId" = $GuildID) AND "targetId" = $TargetID AND "active" != \'false\'',
			{
				bind: { GuildID: guildID, TargetID: targetID },
				type: QueryTypes.SELECT,
			},
		);

		return response[response.length - 1];
	}

	async getLatestInfraction(guildID: Snowflake, moderatorID: Snowflake, targetID: Snowflake, action: string): Promise<number> {
		const response: Record<string, any> = await sequelize.query(
			'SELECT id FROM infractions WHERE "guildId" = (SELECT id FROM guilds WHERE "guildId" = $GuildID) AND "targetId" = $TargetID AND "moderatorId" = $ModeratorID AND action = $Action ORDER BY id DESC LIMIT 1',
			{
				bind: { GuildID: guildID, ModeratorID: moderatorID, TargetID: targetID, Action: action },
				type: QueryTypes.SELECT,
			},
		);

		return response[0]["id"];
	}

	public async warn(client: BulbBotClient, guildID: Snowflake, target: GuildMember, moderator: GuildMember, reasonLog: string, reason: string) {
		await this.createInfraction(guildID, "Warn", true, reason, target.user, moderator.user);
		const infID: number = await this.getLatestInfraction(guildID, moderator.id, target.id, "Warn");
		await loggingManager.sendModAction(client, guildID, await client.bulbutils.translate("action_warn", guildID, {}), target.user, moderator.user, reason, infID);

		return infID;
	}

	public async kick(client: BulbBotClient, guildID: Snowflake, target: GuildMember, moderator: GuildMember, reasonLog: string, reason: string) {
		await this.createInfraction(guildID, "Kick", true, reason, target.user, moderator.user);
		await target.kick(reasonLog);
		const infID: number = await this.getLatestInfraction(guildID, moderator.id, target.id, "Kick");
		await loggingManager.sendModAction(client, guildID, await client.bulbutils.translate("action_kick", guildID, {}), target.user, moderator.user, reason, infID);

		return infID;
	}

	public async ban(client: BulbBotClient, guild: Guild, type: BanType, target: User, moderator: GuildMember, reasonLog: string, reason: string) {
		if (type == BanType.FORCE) {
			await this.createInfraction(guild.id, "Force-ban", true, reason, target, moderator.user);
			await guild.members.ban(target, { reason: reasonLog });
			const infID: number = await this.getLatestInfraction(guild.id, moderator.user.id, target.id, "Force-ban");
			await loggingManager.sendModAction(client, guild.id, await client.bulbutils.translate("action_ban_force", guild.id, {}), target, moderator.user, reason, infID);

			return infID;
		} else if (type == BanType.CLEAN) {
			await this.createInfraction(guild.id, "Ban", true, reason, target, moderator.user);
			await guild.members.ban(target, { reason: reasonLog, days: 7 });
			const infID: number = await this.getLatestInfraction(guild.id, moderator.user.id, target.id, "Ban");
			await loggingManager.sendModAction(client, guild.id, await client.bulbutils.translate("action_ban", guild.id, {}), target, moderator.user, reason, infID);

			return infID;
		} else if (type == BanType.SOFT) {
			await this.createInfraction(guild.id, "Soft-ban", true, reason, target, moderator.user);
			await guild.members.ban(target, { reason: reasonLog, days: 7 });
			await guild.members.unban(target);
			const infID: number = await this.getLatestInfraction(guild.id, moderator.user.id, target.id, "Soft-ban");
			await loggingManager.sendModAction(client, guild.id, await client.bulbutils.translate("action_ban_soft", guild.id, {}), target, moderator.user, reason, infID);

			return infID;
		} else {
			await this.createInfraction(guild.id, "Ban", true, reason, target, moderator.user);
			await guild.member(target.id)?.ban({ reason: reasonLog });
			const infID: number = await this.getLatestInfraction(guild.id, moderator.user.id, target.id, "Ban");
			await loggingManager.sendModAction(client, guild.id, await client.bulbutils.translate("action_ban", guild.id, {}), target, moderator.user, reason, infID);

			return infID;
		}
	}

	public async mute(client: BulbBotClient, guild: Guild, target: GuildMember, moderator: GuildMember, reasonLog: string, reason: string, muteRole: Snowflake, until: MomentInput) {
		await target.roles.add(<Snowflake>muteRole);
		await this.createInfraction(guild.id, "Mute", <number>until, reason, target.user, moderator.user);
		const infID: number = await this.getLatestInfraction(guild.id, moderator.user.id, target.user.id, "Mute");
		await loggingManager.sendModActionTemp(client, guild, await client.bulbutils.translate("action_mute", guild.id, {}), target.user, moderator.user, reason, infID, until);

		return infID;
	}

	public async unmute(client: BulbBotClient, guild: Guild, type: MuteType, target: GuildMember, moderator: User, reasonLog: string, reason: string, muteRole: Snowflake) {
		await target.roles.remove(muteRole);
		await this.createInfraction(guild.id, "Unmute", true, reason, target.user, moderator);
		const infID: number = await this.getLatestInfraction(guild.id, moderator.id, target.user.id, "Unmute");
		if (type == MuteType.MANUAL) {
			await loggingManager.sendAutoUnban(client, guild, await client.bulbutils.translate("action_unmute", guild.id, {}), target.user, moderator, reason, infID);
		} else if (type == MuteType.AUTO) {
			await loggingManager.sendAutoUnban(client, guild, await client.bulbutils.translate("action_unmute_auto", guild.id, {}), target.user, moderator, reason, infID);
		}

		return infID;
	}

	public async unban(client: BulbBotClient, guild: Guild, target: User, moderator: GuildMember, reasonLog: string, reason: string) {
		await guild.members.unban(target, reasonLog);
		await this.createInfraction(guild.id, "Unban", true, reason, target, moderator.user);
		const infID: number = await this.getLatestInfraction(guild.id, moderator.user.id, target.id, "Unban");
		await loggingManager.sendModAction(client, guild.id, await client.bulbutils.translate("action_unban", guild.id), target, moderator.user, reason, infID);

		return infID;
	}

	public async deafen(client: BulbBotClient, guild: Guild, target: GuildMember, moderator: GuildMember, reasonLog: string, reason: string) {
		await target.voice.setDeaf(true, reason);
		await this.createInfraction(guild.id, "Deafen", true, reason, target.user, moderator.user);
		const infID: number = await this.getLatestInfraction(guild.id, moderator.user.id, target.id, "Deafen");
		await loggingManager.sendModAction(client, guild.id, await client.bulbutils.translate("action_deafen", guild.id), target.user, moderator.user, reason, infID);

		return infID;
	}

	public async undeafen(client: BulbBotClient, guild: Guild, target: GuildMember, moderator: GuildMember, reasonLog: string, reason: string) {
		await target.voice.setDeaf(false, reason);
		await this.createInfraction(guild.id, "Undeafen", true, reason, target.user, moderator.user);
		const infID: number = await this.getLatestInfraction(guild.id, moderator.user.id, target.id, "Undeafen");
		await loggingManager.sendModAction(client, guild.id, await client.bulbutils.translate("action_undeafen", guild.id), target.user, moderator.user, reason, infID);

		return infID;
	}

	public async nickname(client: BulbBotClient, guild: Guild, target: GuildMember, moderator: GuildMember, reasonLog: string, reason: string, nickOld: string, nickNew: string) {
		await target.setNickname(nickNew, reason);
		await this.createInfraction(guild.id, "Nickname", true, reason, target.user, moderator.user);
		const infID: number = await this.getLatestInfraction(guild.id, moderator.user.id, target.id, "Nickname");
		await loggingManager.sendModActionPreformatted(
			client,
			guild,
			await client.bulbutils.translate(nickNew ? "change_nick_mod_action_log" : "remove_nick_mod_action_log", guild.id, {
				action: await client.bulbutils.translate(nickNew ? "action_change_nick" : "action_remove_nick", guild.id, { client: client }),
				target_tag: target.user.tag,
				user_id: target.user.id,
				nick_old: nickOld,
				nick_new: nickNew,
				moderator_tag: moderator.user.tag,
				moderator_id: moderator.user.id,
				reason: reason,
				infractionId: infID,
				client: client,
			}),
		);

		return infID;
	}
}