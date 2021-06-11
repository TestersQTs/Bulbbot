const Command = require("./../../structures/Command");
const fs = require("fs");

module.exports = class extends Command {
	constructor(...args) {
		super(...args, {
			description: "Evaluates the provided JavaScript code",
			category: "Admin",
			aliases: ["ev"],
			usage: "!eval <code>",
			examples: ["eval message.channel.send('hi')"],
			minArgs: 1,
			maxArgs: -1,
			argList: ["code:string"],
			devOnly: true,
		});
	}

	async run(message, args) {
		const clean = async text => {
			if (typeof text === "string") return text.replace(/`/g, "`" + String.fromCharCode(8203)).replace(/@/g, "@" + String.fromCharCode(8203));
			else return text;
		};

		try {
			const code = args.join(" ");
			let evaled = eval(code);

			if (typeof evaled !== "string") evaled = require("util").inspect(evaled);
			if (evaled.includes(process.env.TOKEN)) evaled = evaled.replace(process.env.TOKEN, "Y0U.TH0UGHT.1_W0ULD.L34V3_MY_D1SC0RD_T0K3N_H3R3");

			if (evaled.length > 2000) {
				fs.writeFile(`./src/files/eval/${message.guild.id}.txt`, await clean(evaled), function (err) {
					if (err) console.error(err);
				});

				await message.channel.send("The evaled code is more than 2000 charcters so I am giving you a file instead have fun 🙂", {
					files: [`./src/files/eval/${message.guild.id}.txt`],
				});

				return fs.unlinkSync(`./src/files/eval/${message.guild.id}.txt`);
			}

			await message.channel.send(await clean(evaled), { code: "js" });
		} catch (err) {
			message.channel.send(`\`ERROR\` \`\`\`xl\n${await clean(err)}\n\`\`\``);
		}
	}
};
