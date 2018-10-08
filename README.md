# HackWeek

Thoughts, experiments, code, fun

## RNN Music Engine

Terraforming Earth exports music parameters every second to `$SAVE_DIR/music.json`, serve this over a simple HTTP server, along with the `music-rnn` directory. The save dir can be found by [this doc](https://love2d.org/wiki/love.filesystem). On macOS it's `"$HOME/Library/Application Support/LOVE/Terraforming-Earth"` if running in dev mode, and `"$HOME/Library/Application Support/Terraforming-Earth"` if running the [production build](http://www.terraforming.earth/play).

    HOME=~
    SAVE_DIR="$HOME/Library/Application Support/LOVE/Terraforming-Earth"
    REPO_DIR=$(pwd)
    ln -s "$REPO_DIR/music-rnn" "$SAVE_DIR/genmusic"
    cd "$SAVE_DIR"
    python -m SimpleHTTPServer &
    open http://localhost:8000/genmusic

Sometimes the simple HTTP server doesn't fetch the fresh `music.json` or something. If the music engine doesn't react to the game, open `music.json` in your browser.

    open http://localhost:8000/music.json

## MusicVAE UI 

You can find a quick fork of https://teampieshop.github.io/latent-loops/ to explore MusicVAE's abilities interpolating between melodies with a nice ui.
Go to [Readme](./latent-loops-ui/README.md) for setup instructions.