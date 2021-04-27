const { TranslatorException } = require("./../structures/exceptions/TranslatorException");
const Emotes = require("./../Emotes.json");
const moment = require("moment");
const sequelize = require("./database/connection");
const Discord = require("discord.js");
const Sentry = require("@sentry/node");
const Tracing = require("@sentry/tracing");

const MessageFormat = require("@messageformat/core");

module.exports = class BulbBotUtils {
	constructor(client) {
		this.client = client;
	}

	/**
	 * Translates the provided translatable resolvable
	 *
	 * @throws TranslatorException
	 * @param string    		Translatable string from the lang file
	 * @param key       		Values that should be replaced by the function
	 * @param guildId   		Guild id
	 * @returns {string}		Resolved translated string
	 */
	async translate(string, guildId = "742094927403679816", key = {}) {
		let response;
		let lang;

		const db = await sequelize.models.guild.findOne({
			where: { guildId },
			include: [{ model: sequelize.models.guildConfiguration }],
		});
		if (db === null || db["guildConfiguration"] === null) lang = require(`./../languages/en-US.json`);
		else lang = require(`./../languages/${db["guildConfiguration"].language}.json`);

		try {
			response = JSON.parse(JSON.stringify(lang))[string].toString();
		} catch (err) {
			if (!this.client && key.client) this.client = key.client;
			this.client.channels.cache
				.get(global.config.translation)
				.send(`${Emotes.actions.WARN} Untranslated string \`${string}\` found in \`${db["guildConfiguration"].language}\``);

			lang = require(`./../languages/en-US.json`);
			try {
				response = JSON.parse(JSON.stringify(lang))[string].toString();
			} catch (anotherErr) {
				throw new TranslatorException(`"${string}" is not a valid translatable string`);
			}
		}

		response = response.replace(/({latency_bot})/g, key.latency_bot);
		response = response.replace(/({latency_ws})/g, key.latency_ws);

		response = response.replace(/({uptime})/g, key.uptime);
		response = response.replace(/({timestamp})/g, key.timestamp);
		response = response.replace(/({zone})/g, key.zone);
		response = response.replace(/({until})/g, key.until);

		response = response.replace(/({days_value})/g, key.days_value);
		response = response.replace(/({hours_value})/g, key.hours_value);
		response = response.replace(/({mins_value})/g, key.mins_value);
		response = response.replace(/({secs_value})/g, key.secs_value);
		response = response.replace(/({days_text})/g, key.days_text);
		response = response.replace(/({hours_text})/g, key.hours_text);
		response = response.replace(/({mins_text})/g, key.mins_text);
		response = response.replace(/({secs_text})/g, key.secs_text);

		response = response.replace(/({nick_old})/g, key.nick_old);
		response = response.replace(/({nick_new})/g, key.nick_new);
		response = response.replace(/({nick_length})/g, key.nick_length);
		response = response.replace(/({role})/g, key.role);

		response = response.replace(/({missing})/g, key.missing);

		response = response.replace(/({user_id})/g, key.user_id);
		response = response.replace(/({user_name})/g, key.user_name);
		response = response.replace(/({user_nickname})/g, key.user_nickname);
		response = response.replace(/({user_discriminator})/g, key.user_discriminator);
		response = response.replace(/({user_avatar})/g, key.user_avatar);
		response = response.replace(/({user_bot})/g, key.user_bot);
		response = response.replace(/({user_age})/g, this.formatDays(key.user_age));
		response = response.replace(/({user_premium})/g, this.formatDays(key.user_premium));
		response = response.replace(/({user_joined})/g, this.formatDays(key.user_joined));
		response = response.replace(/({user_roles})/g, key.user_roles);
		response = response.replace(/({user_infractions})/g, key.user_infractions);
		if (key.user_infractions !== undefined) {
			if (key.user_infractions <= 1) response = response.replace(/({emote_inf})/g, Emotes.status.ONLINE);
			if (key.user_infractions === 2) response = response.replace(/({emote_inf})/g, Emotes.other.INF1);
			if (key.user_infractions > 2) response = response.replace(/({emote_inf})/g, Emotes.other.INF2);
		}

		response = response.replace(/({moderator_id})/g, key.moderator_id);
		response = response.replace(/({moderator_tag})/g, key.moderator_tag);
		response = response.replace(/({target_id})/g, key.target_id);
		response = response.replace(/({target_tag})/g, key.target_tag);
		response = response.replace(/({action})/g, key.action);
		response = response.replace(/({emoji})/g, key.emoji);

		response = response.replace(/({part})/g, key.part);
		response = response.replace(/({prefix})/g, key.prefix);
		response = response.replace(/({language})/g, key.language);
		response = response.replace(/({languages})/g, key.languages);
		response = response.replace(/({clearance})/g, key.clearance);
		response = response.replace(/({command})/g, key.command);

		response = response.replace(/({infractionId})/g, key.infractionId);

		if (key.guild) {
			response = response.replace(/({guild_owner_name})/g, key.guild.ownerID);
			response = response.replace(/({guild_owner_id})/g, key.guild.owner.id);
			response = response.replace(/({guild_features})/g, this.guildFeatures(key.guild.features));
			response = response.replace(/({guild_region})/g, this.guildRegion(key.guild.region));
			response = response.replace(/({guild_verification})/g, key.guild.verificationLevel);
			response = response.replace(/({guild_age})/g, this.formatDays(key.guild.createdTimestamp));
			response = response.replace(/({guild_members})/g, key.guild.memberCount);

			response = response.replace(/({guild_max})/g, key.guild.maximumMembers);
			response = response.replace(/({guild_online})/g, key.guild.members.cache.filter(m => m.presence.status === "online").size);
			response = response.replace(/({guild_idle})/g, key.guild.members.cache.filter(m => m.presence.status === "idle").size);
			response = response.replace(/({guild_dnd})/g, key.guild.members.cache.filter(m => m.presence.status === "dnd").size);
			response = response.replace(
				/({guild_offline})/g,
				key.guild.memberCount -
					key.guild.members.cache.filter(m => m.presence.status === "dnd").size -
					key.guild.members.cache.filter(m => m.presence.status === "idle").size -
					key.guild.members.cache.filter(m => m.presence.status === "online").size,
			);

			response = response.replace(/({guild_voice})/g, key.guild.channels.cache.filter(m => m.type === "voice").size);
			response = response.replace(/({guild_text})/g, key.guild.channels.cache.filter(m => m.type === "category").size);
			response = response.replace(/({guild_category})/g, key.guild.channels.cache.filter(m => m.type === "text").size);

			response = response.replace(/({guild_booster_tier})/g, key.guild.premiumTier);
			response = response.replace(/({guild_booster_boosters})/g, key.guild.premiumSubscriptionCount);
		}

		if (key.channel) response = response.replace(/({channel})/g, key.channel);

		response = response.replace(/({user_tag})/g, key.user_tag);

		response = response.replace(/({before})/g, key.before);
		response = response.replace(/({after})/g, key.after);
		response = response.replace(/({after_channel_id})/g, key.after_channel_id);
		response = response.replace(/({after_id})/g, key.after_id);

		response = response.replace(/({content})/g, key.content);
		response = response.replace(/({attachment})/g, key.attachment);
		response = response.replace(/({embed})/g, key.embed);

		response = response.replace(/({channel_id})/g, key.channel_id);
		response = response.replace(/({channel_type})/g, key.channel_type);
		response = response.replace(/({channel_name})/g, key.channel_name);
		response = response.replace(/({channel_topic})/g, key.channel_topic);
		response = response.replace(/({oldchannel_topic})/g, key.oldchannel_topic);
		response = response.replace(/({newchannel_topic})/g, key.newchannel_topic);
		response = response.replace(/({oldchannel_name})/g, key.oldchannel_name);
		response = response.replace(/({newchannel_name})/g, key.newchannel_name);
		response = response.replace(/({oldchannel_type})/g, key.oldchannel_type);
		response = response.replace(/({newchannel_type})/g, key.newchannel_type);

		response = response.replace(/({slowmode})/g, key.slowmode);

		response = response.replace(/({guild_amount_roles})/g, key.guild_amount_roles);
		response = response.replace(/({guild_amount_emotes})/g, key.guild_amount_emotes);
		response = response.replace(/({guild_roles_left})/g, key.guild_roles_left);
		response = response.replace(/({guild_emotes_left})/g, key.guild_emotes_left);

		response = response.replace(/({arg})/g, key.arg);
		response = response.replace(/({arg_expected})/g, key.arg_expected);
		response = response.replace(/({arg_provided})/g, key.arg_provided);
		response = response.replace(/({usage})/g, key.usage);

		response = response.replace(/({reason})/g, key.reason);

		response = response.replace(/({snowflake})/g, key.snowflake);

		response = response.replace(/({level})/g, key.level);
		response = response.replace(/({count})/g, key.count);

		response = response.replace(/({item})/g, key.item);
		response = response.replace(/({part})/g, key.part);
		response = response.replace(/({punishment})/g, key.punishment);
		response = response.replace(/({limit})/g, key.limit);

		response = response.replace(/({bot_invite})/g, key.bot_invite);
		response = response.replace(/({support_guild})/g, key.support_guild);

		response = response.replace(/({emote_warn})/g, Emotes.actions.WARN);
		response = response.replace(/({emote_wrench})/g, Emotes.actions.WRENCH);
		response = response.replace(/({emote_github})/g, Emotes.other.GITHUB);
		response = response.replace(/({emote_owner})/g, Emotes.other.GUILD_OWNER);
		response = response.replace(/({emote_online})/g, Emotes.status.ONLINE);
		response = response.replace(/({emote_idle})/g, Emotes.status.IDLE);
		response = response.replace(/({emote_dnd})/g, Emotes.status.DND);
		response = response.replace(/({emote_offline})/g, Emotes.status.OFFLINE);
		response = response.replace(/({emote_loading})/g, Emotes.other.LOADING);
		response = response.replace(/({emote_join})/g, Emotes.other.JOIN);
		response = response.replace(/({emote_leave})/g, Emotes.other.LEAVE);
		response = response.replace(/({emote_success})/g, Emotes.other.SUCCESS);
		response = response.replace(/({emote_trash})/g, Emotes.other.TRASH);
		response = response.replace(/({emote_edit})/g, Emotes.other.EDIT);

		response = response.replace(/({emote_ban})/g, Emotes.actions.BAN);
		response = response.replace(/({emote_unban})/g, Emotes.actions.UNBAN);
		response = response.replace(/({emote_kick})/g, Emotes.actions.KICK);
		response = response.replace(/({emote_mute})/g, Emotes.actions.MUTE);

		response = response.replace(/({full_list})/g, key.full_list);

		if (key.user_infractions !== undefined) {
			const mf = new MessageFormat("en");
			const output = mf.compile(response);

			response = output({ infractions: key.user_infractions });
		}

		return response;
	}

	/**
	 * Formats the bitfield returned by the {@link User} object into an array of badge emojis
	 *
	 * @param bitfield        Bitfield provided by the {@link User} object
	 * @returns {string}    Returned array of badges
	 */
	badges(bitfield) {
		let badges = [];

		const staff = 1 << 0;
		const partner = 1 << 1;
		const hypesquad_events = 1 << 2;
		const bughunter_green = 1 << 3;
		const hypesquad_bravery = 1 << 6;
		const hypesquad_brilliance = 1 << 7;
		const hypesquad_balance = 1 << 8;
		const earlysupport = 1 << 9;
		const bughunter_gold = 1 << 14;
		const botdeveloper = 1 << 17;

		if ((bitfield & staff) === staff) badges.push(Emotes.flags.DISCORD_EMPLOYEE);
		if ((bitfield & partner) === partner) badges.push(Emotes.flags.PARTNERED_SERVER_OWNER);
		if ((bitfield & hypesquad_events) === hypesquad_events) badges.push(Emotes.flags.HYPESQUAD_EVENTS);
		if ((bitfield & hypesquad_bravery) === hypesquad_bravery) badges.push(Emotes.flags.HOUSE_BRAVERY);
		if ((bitfield & hypesquad_brilliance) === hypesquad_brilliance) badges.push(Emotes.flags.HOUSE_BRILLIANCE);
		if ((bitfield & hypesquad_balance) === hypesquad_balance) badges.push(Emotes.flags.HOUSE_BALANCE);
		if ((bitfield & bughunter_green) === bughunter_green) badges.push(Emotes.flags.BUGHUNTER_LEVEL_1);
		if ((bitfield & bughunter_gold) === bughunter_gold) badges.push(Emotes.flags.BUGHUNTER_LEVEL_2);
		if ((bitfield & botdeveloper) === botdeveloper) badges.push(Emotes.flags.EARLY_VERIFIED_DEVELOPER);
		if ((bitfield & earlysupport) === earlysupport) badges.push(Emotes.flags.EARLY_SUPPORTER);

		return badges.map(i => `${i}`).join(" ");
	}

	guildFeatures(guildFeatures) {
		let features = [];

		guildFeatures.forEach(feature => {
			let f;
			let desc;

			if (feature === "ANIMATED_ICON") {
				f = Emotes.features.ANIMATED_ICON;
				desc = "Adds the ability to upload a animated icon to the guild";
			} else if (feature === "BANNER") {
				f = Emotes.features.BANNER;
				desc = "Adds the ability to set a banner image for the guild that will display above the channel list";
			} else if (feature === "COMMERCE") {
				f = Emotes.features.COMMERCE;
				desc = "Adds the ability to create store channels";
			} else if (feature === "COMMUNITY") {
				f = Emotes.features.COMMUNITY;
				desc = "Gives access to the Server Discovery, Insights, Community Server News and Announcement Channels";
			} else if (feature === "DISCOVERABLE") {
				f = Emotes.features.DISCOVERABLE;
				desc = "Makes guild visible in Sever Discovery";
			} else if (feature === "ENABLED_DISCOVERABLE_BEFORE") {
				f = Emotes.features.ENABLED_DISCOVERABLE_BEFORE;
				desc = "Enabled Sever Discovery before the Discovery Checklist was launched";
			} else if (feature === "FORCE_RELAY") {
				f = Emotes.features.FORCE_RELAY;
				desc = "Shard the guild connections to different nodes that relay information between each other.";
			} else if (feature === "INVITE_SPLASH") {
				f = Emotes.features.INVITE_SPLASH;
				desc = "Adds the ability to set a background image that will display on the invite links";
			} else if (feature === "MEMBER_LIST_DISABLED") {
				f = Emotes.features.MEMBER_LIST_DISABLED;
				desc = "Hides the member list";
			} else if (feature === "MEMBER_VERIFICATION_GATE_ENABLED") {
				f = Emotes.features.MEMBER_VERIFICATION_GATE_ENABLED;
				desc = "Has member verification gate enabled, which requirers new users to pass verification gate before accessing the guild";
			} else if (feature === "MORE_EMOJI") {
				f = Emotes.features.MORE_EMOJI;
				desc = "Adds 150 extra emote slots in each category (normal and animated)";
			} else if (feature === "NEWS") {
				f = Emotes.features.NEWS;
				desc = "Adds the ability to create announcement channels";
			} else if (feature === "PARTNERED") {
				f = Emotes.features.PARTNERED;
				desc = "Shows the partner badge next to the server name";
			} else if (feature === "PREVIEW_ENABLED") {
				f = Emotes.features.PREVIEW_ENABLED;
				desc = "Enables lurking in the guild";
			} else if (feature === "RELAY_ENABLED" || feature === "RELAY_DISABLED") {
				f = Emotes.features.RELAY_ENABLED;
				desc = "Shard the guild connections to different nodes that relay information between each other.";
			} else if (feature === "VANITY_URL") {
				f = Emotes.features.VANITY_URL;
				desc = "Adds the ability to set a custom invite link (discord.gg/CUSTOM_VANITY)";
			} else if (feature === "VERIFIED") {
				f = Emotes.features.VERIFIED;
				desc = "Shows the verfied checkmark next to the server name";
			} else if (feature === "WELCOME_SCREEN_ENABLED") {
				f = Emotes.features.WELCOME_SCREEN_ENABLED;
				desc = "Has the welcome screen enabled enabled, which will show a model when new users join the guild";
			} else if (feature === "FEATURABLE") {
				f = Emotes.features.FEATURABLE;
				desc = "Deprecated";
			} else if (feature === "VIP_REGIONS") {
				f = Emotes.features.VIP_REGIONS;
				desc = "Adds the ability to create voice channels with 384kbps max bitrate";
			}

			if (features.length <= 10) f += `[\`${feature}\`](https://bulbbot.mrphilip.xyz '${desc}')`;
			else f += `\`${feature}\``;

			features.push(f);
		});

		features.sort();

		return features.map(i => `${i}`).join("\n");
	}

	guildRegion(region) {
		region = region.charAt(0).toUpperCase() + region.slice(1);
		switch (region) {
			case "Brazil":
				region = `:flag_br: ${region}`;
				break;
			case "Eu-central":
			case "Europe":
				region = `:flag_eu: ${region}`;
				break;
			case "Hongkong":
				region = `:flag_hk: ${region}`;
				break;
			case "India":
				region = `:flag_in: ${region}`;
				break;
			case "Japan":
				region = `:flag_jp: ${region}`;
				break;
			case "Russia":
				region = `:flag_ru: ${region}`;
				break;
			case "Singapore":
				region = `:flag_sg: ${region}`;
				break;
			case "Southafrica":
				region = `:flag_za: ${region}`;
				break;
			case "Sydney":
				region = `:flag_au: ${region}`;
				break;
			case "Us-central":
			case "Us-east":
			case "Us-south":
			case "Us-west":
				region = `:flag_us: ${region}`;
				break;
			default:
				break;
		}

		return region;
	}

	/**
	 * Creates a global user object
	 *
	 * @param isGuildMember         Is a guild member object
	 * @param userObject            The user object
	 * @returns {UserObject}
	 */
	userObject(isGuildMember, userObject) {
		let user;

		if (isGuildMember) {
			user = {
				id: userObject.user.id,
				flags: userObject.user.flags,
				username: userObject.user.username,
				discriminator: userObject.user.discriminator,
				avatar: userObject.user.avatar,
				avatarUrl: userObject.user.avatarURL({ dynamic: true, size: 4096 }),
				bot: userObject.user.bot,

				roles: userObject.roles,
				nickname: userObject.nickname,
				premiumSinceTimestamp: userObject.premiumSinceTimestamp,
				joinedTimestamp: userObject.joinedTimestamp,
				createdAt: userObject.user.createdAt,
			};
		} else {
			user = {
				id: userObject.id,
				flags: userObject.flags,
				username: userObject.username,
				discriminator: userObject.discriminator,
				avatar: userObject.avatar,
				avatarUrl: userObject.avatarURL({ dynamic: true, size: 4096 }),
				bot: userObject.bot,
				createdAt: userObject.createdAt,
				nickname: null,
			};
		}
		if (user.avatarUrl === null) user.avatarUrl = `https://cdn.discordapp.com/embed/avatars/${user.discriminator % 5}.png`;

		return user;
	}

	formatDays(start) {
		const end = moment.utc().format("YYYY-MM-DD");
		const date = moment(moment.utc(start).format("YYYY-MM-DD"));
		const days = moment.duration(date.diff(end)).asDays();

		return `${moment.utc(start).format("MMMM, Do YYYY @ hh:mm:ss a")} \`\`(${Math.floor(days).toString().replace("-", "")} days ago)\`\``;
	}

	prettify(action) {
		let finalString = "";
		switch (action) {
			case "Ban":
				finalString = `${Emotes.actions.BAN} Ban`;
				break;
			case "Forceban":
				finalString = `${Emotes.actions.BAN} Forceban`;
				break;
			case "Kick":
				finalString = `${Emotes.actions.KICK} Kick`;
				break;
			case "Mute":
				finalString = `${Emotes.actions.MUTE} Mute`;
				break;
			case "Warn":
				finalString = `${Emotes.actions.WARN} Warn`;
				break;
			case "Unmute":
				finalString = `${Emotes.actions.UNBAN} Unmute`;
				break;
			case "Unban":
				finalString = `${Emotes.actions.UNBAN} Unban`;
				break;
			case "true":
				finalString = `${Emotes.status.ONLINE} True`;
				break;
			case "false":
				finalString = `${Emotes.other.INF2} False`;
				break;
		}

		return finalString;
	}

	/**
	 * CANNOT_ACTION_SELF 1
	 * CANNOT_ACTION_OWNER 2
	 * CANNOT_ACTION_ROLE_EQUAL 3
	 * CANNOT_ACTION_BOT_SELF 4
	 * CANNOT_ACTION_ROLE_HIGHER 5
	 * CANNOT_ACTION_USER_ROLE_EQUAL_BOT 6
	 * CANNOT_ACTION_USER_ROLE_HIGHER_BOT 7
	 */
	async CheckUser(message, user) {
		if (user.id === message.author.id) return 1;

		if (message.guild.owner.id === user.id) return 2;

		if (message.member.roles.highest.id === user.roles.highest.id) return 3;

		if (user.id === this.client.user.id) return 4;

		if (user.roles.highest.rawPosition >= message.member.roles.highest.rawPosition) return 5;

		if (message.guild.me.roles.highest.id === user.roles.highest.id) return 6;

		if (user.roles.highest.rawPosition >= message.guild.me.roles.highest.rawPosition) return 7;

		return 0;
	}

	async ResolveUserHandle(message, handle, user) {
		switch (handle) {
			case 1:
				message.channel.send(await this.translate("global_cannot_action_self", message.guild.id));
				return true;

			case 2:
				message.channel.send(await this.translate("global_cannot_action_owner", message.guild.id));
				return true;

			case 3:
				message.channel.send(await this.translate("global_cannot_action_role_equal", message.guild.id, { user_tag: user.tag }));
				return true;

			case 4:
				message.channel.send(await this.translate("global_cannot_action_bot_self", message.guild.id));
				return true;

			case 5:
				message.channel.send(await this.translate("global_cannot_action_role_higher", message.guild.id, { user_tag: user.tag }));
				return true;

			case 6:
				message.channel.send(await this.translate("global_cannot_action_role_equal_bot", message.guild.id, { user_tag: user.tag }));
				return true;

			case 7:
				message.channel.send(await this.translate("global_cannot_action_role_higher_bot", message.guild.id, { user_tag: user.tag }));
				return true;

			case 0:
				return false;

			default:
				return false;
		}
	}

	async sleep(ms) {
		return new Promise(resolve => setTimeout(resolve, ms));
	}

	async log(err, message, channel = global.config.error) {
		if (message) message.channel.send(await this.client.bulbutils.translate("global_unknown_error", message.guild.id));

		if (process.env.ENVIRONMENT === "dev") return console.error(err);
		Sentry.captureException(err);

		const embed = new Discord.MessageEmbed()
			.setColor("RED")
			.setTitle(`New error | ${err.name}`)
			.addField("Name", err.name, true)
			.addField("Message", err.message, true)
			.addField("String", err.toString(), true)
			.setDescription(
				`
				**Stack Trace**
				\`\`\`
				${err.stack}\`\`\`		
					`,
			)
			.setTimestamp();

		if (message) {
			embed
				.addField("Guild Id", message.guild.id, true)
				.addField("User", `${message.author.tag} \`(${message.author.id})\``, true)
				.addField("Message Content", message.content, true);
		}
		this.client.channels.cache.get(channel).send(embed);
	}

	timezones = {
		ANAT: "Asia/Anadyr",
		AEDT: "Australia/Melbourne",
		AEST: "Australia/Brisbane",
		JST: "Asia/Tokyo",
		AWST: "Asia/Shanghai",
		WIB: "Asia/Jakarta",
		BTT: "Asia/Dhaka",
		UZT: "Asia/Tashkent",
		GST: "Asia/Dubai",
		MSK: "Europe/Moscow",
		CEST: "Europe/Brussels",
		BST: "Europe/London",
		GMT: "Africa/Accra",
		CVT: "Atlantic/Cape_Verde",
		WGST: "America/Nuuk",
		ART: "America/Buenos_Aires",
		EDT: "America/New_York",
		CDT: "America/Chicago",
		CST: "America/Mexico_City",
		PDT: "America/Los_Angeles",
		AKDT: "America/Anchorage",
		HDT: "America/Adak",
		HST: "Pacific/Honolulu",
		NUT: "Pacific/Fiji",
		AoE: "Pacific/Wallis",
		UTC: "UTC",
	};
};
