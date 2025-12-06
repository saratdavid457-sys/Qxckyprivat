require("dotenv").config();
const { Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder } = require("discord.js");
const fetch = require("node-fetch");
const crypto = require("crypto");

// Tokenuri și config din .env
const DISCORD_TOKEN = process.env.DISCORD_TOKEN;
const GITHUB_TOKEN  = process.env.GITHUB_TOKEN;
const REPO_OWNER    = process.env.REPO_OWNER;
const REPO_NAME     = process.env.REPO_NAME;
const OWNER_ID      = process.env.OWNER_ID;
const FILE_PATH     = "keys.json";

// Generare key
function makeKey() {
    const random = crypto.randomBytes(6).toString("hex");
    return "qxcky-" + random;
}

// Durate
const DURATIONS = {
    day: 86400,
    week: 604800,
    month: 2592000,
    lifetime: 0
};

// Setup bot
const bot = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages
    ]
});

// Încarcă key-urile
async function loadKeys() {
    const url = `https://raw.githubusercontent.com/${REPO_OWNER}/${REPO_NAME}/main/${FILE_PATH}`;
    const res = await fetch(url);
    return await res.json();
}

// Salvează key-urile în GitHub
async function saveKeys(keys) {
    const content = Buffer.from(JSON.stringify(keys, null, 2)).toString("base64");

    const getFile = await fetch(`https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${FILE_PATH}`, {
        headers: { Authorization: `token ${GITHUB_TOKEN}` }
    });

    const fileInfo = await getFile.json();

    await fetch(`https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${FILE_PATH}`, {
        method: "PUT",
        headers: {
            "Authorization": `token ${GITHUB_TOKEN}`,
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            message: "update keys",
            content: content,
            sha: fileInfo.sha
        })
    });
}

// Slash command
const commands = [
    new SlashCommandBuilder()
        .setName("genkey")
        .setDescription("Generează un key pentru un utilizator")
        .addUserOption(o => o.setName("owner").setDescription("Userul").setRequired(true))
        .addStringOption(o => o.setName("duration").setDescription("Durata").setRequired(true)
            .addChoices(
                { name: "day", value: "day" },
                { name: "week", value: "week" },
                { name: "month", value: "month" },
                { name: "lifetime", value: "lifetime" }
            ))
];

// Deploy commands
bot.once("ready", async () => {
    console.log("Bot online!");

    const rest = new REST({ version: "10" }).setToken(DISCORD_TOKEN);
    await rest.put(
        Routes.applicationCommands(bot.user.id),
        { body: commands }
    );

    console.log("Slash commands ready!");
});

// Handle commands
bot.on("interactionCreate", async interaction => {
    if (!interaction.isChatInputCommand()) return;
    if (interaction.commandName !== "genkey") return;

    if (interaction.user.id !== OWNER_ID)
        return interaction.reply({ content: "Nu ai permisiune.", ephemeral: true });

    const owner = interaction.options.getUser("owner");
    const duration = interaction.options.getString("duration");

    let keys = await loadKeys();

    const key = makeKey();
    const expiresAt = DURATIONS[duration] ? Date.now() + DURATIONS[duration] * 1000 : null;

    keys[key] = {
        ownerId: owner.id,
        duration: duration,
        expiresAt: expiresAt
    };

    await saveKeys(keys);

    await owner.send(`Key-ul tău:\n\`${key}\`\nDurată: ${duration}`);

    return interaction.reply({ content: `Key trimis la ${owner.username}!`, ephemeral: true });
});

bot.login(DISCORD_TOKEN);

