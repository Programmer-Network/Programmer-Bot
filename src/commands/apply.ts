import { Prisma } from '@prisma/client'
import { Client, GuildMember, SlashCommandBuilder } from 'discord.js'
import { z } from 'zod'
import prisma from '../lib/db.js'
import { roleName, channelName } from './config.js'

const Apply = {
  data: new SlashCommandBuilder()
    .setName('apply')
    .setDescription('Apply to be an early adopter of Programmer Network!')
    .addStringOption((option) =>
      option
        .setName('email')
        .setDescription('Your email address')
        .setRequired(true)
    ),
  execute: async (client: Client, interaction) => {
    if (!interaction.guild) return

    let email = interaction.options.getString('email')

    try {
      email = z.string().email().parse(email)
    } catch (error) {
      email = null
      return interaction.reply({
        content: `Please provide a valid email address.`,
        ephemeral: true
      })
    }
    if (!email) return

    const role = await interaction.guild.roles.cache.find(
      (role) => role.name == roleName
    )
    if (!role)
      return interaction.reply({
        content: `Role \`${roleName}\` could not be found.`,
        ephemeral: true
      })

    const channel =
      (await interaction.guild.channels.cache
        .find((channel) => channel.name === channelName)
        ?.toString()) || null

    const member = interaction.member as GuildMember
    if (member.roles.cache.has(role.id)) {
      const message = `You already have the \`${roleName}\` role!`
      if (!channel)
        return interaction.reply({
          content: `${message} (Error: Unable to find channel #${channelName})`
        })

      return interaction.reply({
        content: `${message} Please use ${channel} to share any suggestions, bug reports, feature requests, and discussions.`,
        ephemeral: true
      })
    }

    const guildID = parseInt(interaction.guild.id)
    const { id, username, discriminator } = interaction.user
    const userID = parseInt(id)
    const tag = `${username}#${discriminator}`

    try {
      await prisma.waitlist.create({
        data: {
          guildID,
          userID,
          tag,
          email
        }
      })
    } catch (error) {
      console.log('Error:', error)
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          const targets = (error.meta?.target as string[]) ?? []
          if (targets.includes('guildID') && targets.includes('userID')) {
            return interaction.reply({
              content: `You are already on the waitlist!`,
              ephemeral: true
            })
          }
        }
      }

      return interaction.reply({
        content: `An error occurred while adding you to the waitlist.`,
        ephemeral: true
      })
    }

    return interaction.reply({
      content: `${interaction.user} has been added to the \`${roleName}\` waitlist!`
    })
  }
}

export default Apply
