const SlashCommand = require("../../utils/slashCommands");

const colors = require("../../GBF/GBFColor.json");
const emojis = require("../../GBF/GBFEmojis.json");
const KickSchema = require("../../schemas/Moderation Schemas/Kick Schema");
const ServerSettings = require("../../schemas/Moderation Schemas/Server Settings");
const CommandLinks = require("../../GBF/GBFCommands.json");

const {
  ApplicationCommandOptionType,
  PermissionFlagsBits,
  EmbedBuilder
} = require("discord.js");
const { getLastDigits } = require("../../utils/Engine");

module.exports = class KickCommand extends SlashCommand {
  constructor(client) {
    super(client, {
      name: "kick",
      description: "Kick a member from this server",

      options: [
        {
          name: "member",
          description: "The member that you want to kick from this server",
          type: ApplicationCommandOptionType.User,
          required: true
        },
        {
          name: "reason",
          description: "The reason for the kick",
          type: ApplicationCommandOptionType.String
        }
      ],

      devOnly: false,
      devBypass: false,
      userPermission: [PermissionFlagsBits.KickMembers],
      botPermission: [PermissionFlagsBits.KickMembers],
      cooldown: 0,
      development: true,
      Partner: false
    });
  }

  async execute({ client, interaction }) {
    const targetMember = interaction.options.getMember("member");
    const kickReason =
      interaction.options.getString("reason") || "No Reason Specified";

    const notInGuild = new EmbedBuilder()
      .setTitle(`${emojis.ERROR} You can't do that`)
      .setColor(colors.ERRORRED)
      .setDescription(`The specified user is not in ${interaction.guild.name}`);

    if (!targetMember)
      return interaction.reply({
        embeds: [notInGuild],
        ephemeral: true
      });

    const ownerKick = new EmbedBuilder()
      .setTitle(`${emojis.ERROR} You can't do that`)
      .setColor(colors.ERRORRED)
      .setDescription(`You can't kick the owner of this server!`);

    if (targetMember.id === interaction.guild.ownerId)
      return interaction.reply({
        embeds: [ownerKick],
        ephemeral: true
      });

    const selfKick = new EmbedBuilder()
      .setTitle(`${emojis.ERROR} You can't do that`)
      .setColor(colors.ERRORRED)
      .setDescription(
        `You cannot kick yourself, if you want to leave, there's a leave button.`
      );

    if (targetMember.id === interaction.user.id)
      return interaction.reply({
        embeds: [selfKick],
        ephemeral: true
      });

    const botKick = new EmbedBuilder()
      .setTitle(`${emojis.ERROR} You can't do that`)
      .setColor(colors.ERRORRED)
      .setDescription(`I can't kick myself from this server!`);

    if (targetMember.id === client.user.id)
      return interaction.reply({
        embeds: [botKick],
        ephemeral: true
      });

    const serverSettingsDocs = await ServerSettings.findOne({
      guildId: interaction.guild.id
    });

    const adminKick = new EmbedBuilder()
      .setTitle(`${emojis.ERROR} You can't do that`)
      .setColor(colors.ERRORRED)
      .setDescription(
        `I can't kick an admin, if you'd like to turn off this feature please change it in the bot server settings using ${CommandLinks.ServerSettings}`
      );

    if (
      (!serverSettingsDocs ||
        (serverSettingsDocs && !serverSettingsDocs.AdminKick)) &&
      targetMember.permissions.has(PermissionFlagsBits.Administrator) &&
      interaction.member.id !== interaction.guild.ownerId
    )
      return interaction.reply({
        embeds: [adminKick],
        ephemeral: true
      });

    const botPosition = interaction.guild.members.me.roles.highest.position;
    const targetPosition = targetMember.roles.highest.position;

    if (interaction.member.id !== interaction.guild.ownerId) {
      const commandAuthorPosition = interaction.member.roles.highest.position;

      const authorLower = new EmbedBuilder()
        .setTitle(`${emojis.ERROR} You can't do that`)
        .setColor(colors.ERRORRED)
        .setDescription(
          `${targetMember.user.username}'s position is higher or equal to yours.`
        );

      if (commandAuthorPosition <= targetPosition)
        return interaction.reply({
          embeds: [authorLower],
          ephemeral: true
        });
    }

    const botLower = new EmbedBuilder()
      .setTitle(`${emojis.ERROR} You can't do that`)
      .setColor(colors.ERRORRED)
      .setDescription(
        `${targetMember.user.username}'s position is higher or equal to mine.`
      );

    if (botPosition <= targetPosition)
      return interaction.reply({
        embeds: [botLower],
        ephemeral: true
      });

    const kickData = await KickSchema.findOne({
      userId: targetMember.id,
      guildId: interaction.guild.id
    });

    const caseIDIdentifier = getLastDigits(interaction.guild.id, 3);

    const userKicked = new EmbedBuilder()
      .setTitle(`${emojis.VERIFY} User Kicked`)
      .setColor(colors.DEFAULT)
      .setFields(
        {
          name: "Moderator:",
          value: `${interaction.user.tag} (${interaction.user.id})`,
          inline: true
        },
        {
          name: "Target:",
          value: `${targetMember.user.tag} (${targetMember.id})`,
          inline: true
        },
        {
          name: "Reason:",
          value: `${kickReason}`,
          inline: true
        },
        {
          name: "Time of Kick:",
          value: `<t:${Math.round(new Date().getTime() / 1000)}:F>`,
          inline: true
        },
        {
          name: "Case ID:",
          value: `#KN${
            kickData ? kickData.TotalCases + 1 : 1
          }GI${caseIDIdentifier}`,
          inline: true
        },
        {
          name: "\u200b",
          value: "\u200b",
          inline: true
        }
      )
      .setFooter({
        text: `${interaction.guild.name} Moderation powered by GBF`,
        iconURL: client.user.displayAvatarURL()
      });

    if (kickData) {
      await interaction.reply({
        embeds: [userKicked]
      });

      kickData.TotalCases += 1;
      kickData.Cases.push(
        `#KN${kickData ? kickData.TotalCases : 1}GI${caseIDIdentifier}`
      );
      kickData.Reasons.push(kickReason);
      await kickData.save();

      return targetMember.kick(kickReason);
    } else {
      const newData = new KickSchema({
        userId: targetMember.id,
        guildId: interaction.guild.id,
        TotalCases: 1,
        Cases: [`#KN1GI${caseIDIdentifier}`],
        Reasons: [`${kickReason}`]
      });

      await newData.save();

      await interaction.reply({
        embeds: [userKicked]
      });

      return targetMember.kick(kickReason);
    }
  }
};
