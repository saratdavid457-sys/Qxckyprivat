const { Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder } = require("discord.js");
const fetch = require("node-fetch");
const crypto = require("crypto");

// TOKENURI
const DISCORD_TOKEN = "MTQ0NjIyMzIxNjc5MDk5OTIxMg.GZu5Fv.f_54G_MxjzILlDUvxOaC-C1oKuet_FzJ3nzsq4";
const GITHUB_TOKEN = "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";
const REPO_OWNER = "saratdavid457-sys";
const REPO_NAME = "Qxckyprivat";
const FILE_PATH = "keys.json";

const OWNER_ID = "1274716958218125435";

// creează key
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

// setup bot
const bot = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages
    ]
});

// încarcă keys.json
async function loadKeys() {
    const res = await fetch(`https://raw.githubusercontent.com/${REPO_OWNER}/${REPO_NAME}/main/${FILE_PATH}`);
    const json = await res.json();
    return json;
}

// salvează keys.json
async function saveKeys(keys) {
    const content = Buffer.from(JSON.stringify(keys, null, 2)).toString("base64");

    const res = await fetch(`https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${FILE_PATH}`, {
        method: "PUT",
        headers: {
            "Authorization": `token ${GITHUB_TOKEN}`,
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            message: "update keys",
            content: content,
            sha: (await (await fetch(`https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${FILE_PATH}`)).json()).sha
        })
    });

    return await res.json();
}

// comenzi
const commands = [
    new SlashCommandBuilder()
        .setName("genkey")
        .setDescription("Generează un key")
        .addUserOption(o => o.setName("owner").setDescription("Cine primește key-ul").setRequired(true))
        .addStringOption(o => o.setName("duration").setDescription("Durata").setRequired(true)
            .addChoices(
                { name: "day", value: "day" },
                { name: "week", value: "week" },
                { name: "month", value: "month" },
                { name: "lifetime", value: "lifetime" }
            ))
];

// deploy commands
bot.once("ready", async () => {
    console.log("Bot online!");

    const rest = new REST({ version: "10" }).setToken(DISCORD_TOKEN);
    await rest.put(
        Routes.applicationCommands(bot.user.id),
        { body: commands }
    );

    console.log("Slash commands registered.");
});

// handler
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

    return interaction.reply({ content: `Key trimis la ${owner.username}`, ephemeral: true });
});

bot.login(DISCORD_TOKEN);
