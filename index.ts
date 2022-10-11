import {
	ApplicationCommandType,
	Client,
	codeBlock,
	Collection,
	ComponentType,
	EmbedBuilder,
	GatewayIntentBits,
	InteractionType,
	SlashCommandBuilder,
} from 'discord.js';
import 'dotenv/config';
import path from 'path';
import fs from 'fs';
// import { Player } from 'discord-music-player';
import { Command, MessageCommandType } from './type.js';
// load other features
import { execute, ExecuteChannelCreate } from './other/voicechannel.js';

const client = new Client({
	intents: [
		GatewayIntentBits.GuildMembers,
		GatewayIntentBits.GuildMessages,
		GatewayIntentBits.GuildVoiceStates,
		GatewayIntentBits.Guilds,
	],
});
// const player = new Player(client, {
// 	deafenOnJoin: true,
// 	leaveOnEmpty: true,
// 	leaveOnStop: true,
// 	leaveOnEnd: true,
// });
let commands = new Collection<string, Command>();
let MessageCommands = new Collection<string, MessageCommandType>();
const CommandsPath = path.join('./', 'commands');
const CommandsFiles = fs.readdirSync(CommandsPath);
const MessageCommandsPath = path.join('./', 'MessageCommands');
const MessageCommandsFiles = fs.readdirSync(MessageCommandsPath);
client.on('ready', async () => {
	console.log('ready!');
	await loadcommand();
});

async function loadcommand() {
	const clientcommands = client.application?.commands;
	console.log('Started refreshing application (/) commands.');
	for (const file of CommandsFiles) {
		const filePath = `./commands/${file}`;
		const command = (await import(filePath)) as Command;
		commands.set(command.data.name, command);
	}
	for (const file of MessageCommandsFiles) {
		const filePath = `./MessageCommands/${file}`;
		const command = (await import(filePath)) as MessageCommandType;
		MessageCommands.set(command.data.name, command);
	}
	const AllCommands: SlashCommandBuilder[] = [...commands, ...MessageCommands].map(
		(command) => command[1].data
	);
	await clientcommands?.set(AllCommands);
	console.log('Successfully reloaded application (/) commands.');
}

client.on('interactionCreate', async (i) => {
	if (i.type == InteractionType.ApplicationCommand) {
		if (i.commandType == ApplicationCommandType.ChatInput) {
			const CommandFile = commands.get(i.commandName);

			if (!CommandFile) return;

			try {
				await CommandFile.execute(i);
			} catch (error) {
				console.error(error);
				const errorembed = geterrorembed(error);
				try {
					await i.reply({
						embeds: [errorembed],
						ephemeral: true,
					});
				} catch (err) {
					console.error(err);
					await i.editReply({
						embeds: [errorembed],
					});
				}
			}
		} else if (i.commandType == ApplicationCommandType.Message) {
			const CommandFile = MessageCommands.get(i.commandName);

			if (!CommandFile) return;

			try {
				await CommandFile.execute(i);
			} catch (error) {
				console.error(error);
				const errorembed = geterrorembed(error);
				try {
					await i.reply({
						embeds: [errorembed],
						ephemeral: true,
					});
				} catch (err) {
					console.error(err);
					await i.editReply({
						embeds: [errorembed],
					});
				}
			}
		}
	}
	if (i.type == InteractionType.MessageComponent) {
		const CommandName = i.customId.split('.')[0];
		const CommandFile = commands.get(CommandName);

		if (!CommandFile) return;

		if (i.componentType == ComponentType.Button) {
			try {
				await CommandFile.executeBtn?.(i);
			} catch (error) {
				console.error(error);
				const errorembed = geterrorembed(error);
				try {
					await i.reply({
						embeds: [errorembed],
						ephemeral: true,
					});
				} catch (err) {
					console.error(err);
					await i.editReply({
						embeds: [errorembed],
					});
				}
			}
		} else if (i.componentType == ComponentType.SelectMenu) {
			try {
				await CommandFile.executeMenu?.(i);
			} catch (error) {
				console.error(error);
				const errorembed = geterrorembed(error);
				try {
					await i.reply({
						embeds: [errorembed],
						ephemeral: true,
					});
				} catch (err) {
					console.error(err);
					await i.editReply({
						embeds: [errorembed],
					});
				}
			}
		}
	}
	if (i.type == InteractionType.ModalSubmit) {
		const CommandName = i.customId.split('.')[0];
		const CommandFile = commands.get(CommandName);

		if (!CommandFile) return;

		try {
			await CommandFile.executeModal?.(i);
		} catch (error) {
			console.error(error);
			const errorembed = geterrorembed(error);
			try {
				await i.reply({
					embeds: [errorembed],
					ephemeral: true,
				});
			} catch (err) {
				console.error(err);
				await i.editReply({
					embeds: [errorembed],
				});
			}
		}
	}
	if (i.type == InteractionType.ApplicationCommandAutocomplete) {
		const CommandFile = commands.get(i.commandName);

		if (!CommandFile) return;

		try {
			await CommandFile.executeAutoComplete?.(i);
		} catch (error) {
			console.error(error);
		}
	}
});

client.on('voiceStateUpdate', async (oldvoice, voice) => {
	try {
		await execute(oldvoice, voice);
	} catch (error) {
		console.error(error);
	}
});

client.on('channelCreate', ExecuteChannelCreate);

function geterrorembed(error: any) {
	return new EmbedBuilder()
		.setColor(0xf00000)
		.setTitle('error!')
		.setDescription(codeBlock('js', (error as Error).stack!));
}

client.login(process.env.token);
