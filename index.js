process.env.DISCORDJS_VOICE_CODEC = 'opusscript';

const { Client, GatewayIntentBits, ActivityType } = require('discord.js');
const { joinVoiceChannel, createAudioPlayer, createAudioResource, entersState, VoiceConnectionStatus, AudioPlayerStatus, StreamType } = require('@discordjs/voice');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const prism = require('prism-media');

const config = {
    token: 'XXXXXX', // Your bot token here
    musicFolder: './musique',
    bassBoost: 2.0,
    reverbLevel: 0.3,
    volume: 0.25,
    shuffle: true
};

let player;
let currentTrackIndex = 0;
let connection;
let tracks = [];
let playedTracks = [];
let isPlaying = false;

function loadAndShuffleTracks() {
    try {
        tracks = fs.readdirSync(config.musicFolder)
            .filter(file => file.endsWith('.mp3'))
            .map(file => path.join(config.musicFolder, file));
        
        if (config.shuffle) {
            shuffleArray(tracks);
        }
        
        console.log(`Chargement de ${tracks.length} pistes audio (${config.shuffle ? 'aléatoire' : 'ordre normal'}).`);
    } catch (error) {
        console.error('Erreur lors du chargement des pistes:', error);
        tracks = [];
    }
}

function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

function getRandomTrack() {
    if (tracks.length === 0) return null;
    
    if (playedTracks.length >= tracks.length) {
        playedTracks = [];
    }
    
    const availableTracks = tracks.filter(track => !playedTracks.includes(track));
    const randomIndex = Math.floor(Math.random() * availableTracks.length);
    const selectedTrack = availableTracks[randomIndex];
    
    playedTracks.push(selectedTrack);
    currentTrackIndex = tracks.indexOf(selectedTrack);
    
    return selectedTrack;
}

async function createAudioResourceWithEffects(trackPath) {
    const ffmpeg = require('fluent-ffmpeg');
    const { PassThrough } = require('stream');

    const stream = new PassThrough();
    
    return new Promise((resolve, reject) => {
        const command = ffmpeg(trackPath)
            .audioFilters(`volume=${config.volume}`)
            .audioFilters(`equalizer=f=60:width_type=o:width=1:g=${config.bassBoost}`)
            .audioFilters('equalizer=f=150:width_type=o:width=1:g=1.5')
            .audioFilters('equalizer=f=400:width_type=o:width=1:g=0.8')
            .audioFilters('equalizer=f=1000:width_type=o:width=1:g=0.5')
            .audioFilters('equalizer=f=3000:width_type=o:width=1:g=-0.5')
            .audioFilters('equalizer=f=6000:width_type=o:width=1:g=-1')
            .audioFilters('equalizer=f=12000:width_type=o:width=1:g=-1.5')
            .audioFilters(`aecho=0.8:0.9:${config.reverbLevel * 1000}:${config.reverbLevel * 0.5}`)
            .format('opus')
            .on('error', reject)
            .pipe(stream, { end: true });
        
        const resource = createAudioResource(stream, {
            inputType: StreamType.OggOpus,
            inlineVolume: true
        });
        
        resolve(resource);
    });
}

async function playTrack(trackPath) {
    if (!trackPath) {
        console.log('Aucune piste disponible');
        return;
    }

    try {
        const resource = await createAudioResourceWithEffects(trackPath);
        player.play(resource);
        isPlaying = true;
        console.log(`Lecture de: ${path.basename(trackPath)}`);
    } catch (error) {
        console.error('Erreur lors de la lecture:', error);
        playNext();
    }
}

function playNext() {
    const nextTrack = config.shuffle ? getRandomTrack() : tracks[(currentTrackIndex + 1) % tracks.length];
    if (nextTrack) playTrack(nextTrack);
}

function playPrevious() {
    const prevTrack = config.shuffle ? getRandomTrack() : tracks[(currentTrackIndex - 1 + tracks.length) % tracks.length];
    if (prevTrack) playTrack(prevTrack);
}

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

client.once('ready', () => {
    console.log(`Connecté en tant que ${client.user.tag}`);
    loadAndShuffleTracks();

    const statuses = [
        { name: 'r!prev, r!next', type: ActivityType.Streaming },
        { name: 'r!join, r!leave', type: ActivityType.Streaming },
        { name: 'Musique 24/7', type: ActivityType.Streaming },
    ];
    let statusIndex = 0;

    setInterval(() => {
        client.user.setPresence({
            activities: [statuses[statusIndex]],
            status: 'online'
        });
        statusIndex = (statusIndex + 1) % statuses.length;
    }, 2000);

    player = createAudioPlayer();
    
    player.on(AudioPlayerStatus.Idle, () => {
        if (isPlaying) playNext();
    });

    player.on('error', error => {
        console.error('Erreur du lecteur audio:', error);
        playNext();
    });
});

client.on('messageCreate', async message => {
    if (message.author.bot || !message.content.startsWith('r!')) return;

    const args = message.content.slice(2).trim().split(/ +/);
    const command = args.shift().toLowerCase();
    const voiceChannel = message.member?.voice.channel;

    try {
        switch(command) {
            case 'join':
                if (!voiceChannel) {
                    return message.reply('Vous devez être dans un salon vocal!');
                }
                
                if (connection) connection.destroy();
                
                connection = joinVoiceChannel({
                    channelId: voiceChannel.id,
                    guildId: message.guild.id,
                    adapterCreator: message.guild.voiceAdapterCreator,
                });
                
                connection.subscribe(player);
                await entersState(connection, VoiceConnectionStatus.Ready, 5000);
                
                if (tracks.length > 0 && !isPlaying) playNext();
                
                await message.reply('Connecté au salon vocal!');
                break;
                
            case 'leave':
                if (connection) {
                    connection.destroy();
                    connection = null;
                    isPlaying = false;
                    player.stop();
                    await message.reply('Déconnecté du salon vocal.');
                } else {
                    await message.reply('Je ne suis pas dans un salon vocal!');
                }
                break;
                
            case 'next':
                if (isPlaying) {
                    player.stop();
                    await message.reply('Passage à la piste suivante.');
                } else {
                    await message.reply('Aucune piste en cours de lecture!');
                }
                break;
                
            case 'prev':
                if (isPlaying) {
                    playPrevious();
                    await message.reply('Retour à la piste précédente.');
                } else {
                    await message.reply('Aucune piste en cours de lecture!');
                }
                break;
                
            default:
                await message.reply('Commande inconnue! Commandes disponibles: `r!join`, `r!leave`, `r!next`, `r!prev`');
        }
    } catch (error) {
        console.error('Erreur:', error);
        await message.reply('Une erreur est survenue!');
    }
});

client.login(config.token);