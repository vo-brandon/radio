# Simple Music Player Discord Bot

A simple Discord bot to play local MP3 music in a voice channel, with audio effects like bass boost and reverb.  
**Author:** Brandon

## Features

- Plays MP3 files from a local folder
- Built-in bass boost, reverb, and equalizer
- Simple commands: `r!join`, `r!leave`, `r!next`, `r!prev`
- Optional shuffle mode
- Volume control

## Requirements

- Node.js v18 or higher
- A Discord server where you can add bots
- [ffmpeg](https://ffmpeg.org/download.html) installed on your machine

## Installation

1. Clone the repository:

2. Install dependencies: "npm install"


3. Add your MP3 files:
- Place your `.mp3` files inside the `musique` folder (create it if it doesn't exist).

4. Configure your bot token:
- Replace `'XXXXXX'` in `index.js` with your Discord bot token.

5. Start the bot:


## Commands

- `r!join`: Bot joins your voice channel and starts playing music.
- `r!leave`: Bot leaves the voice channel.
- `r!next`: Skip to the next track.
- `r!prev`: Go back to the previous track.

*Type commands in a text channel where the bot has access.*

## Configuration

You can customize settings in `index.js`:


## Notes

- The bot only supports `.mp3` files placed in the `musique` folder.
- To add or modify audio effects, edit the filters in the `createAudioResourceWithEffects` function.

---

Enjoy your music! 🎵  
**Author:** Brandon
