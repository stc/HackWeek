# HackWeek

Thoughts, experiments, code, fun

## RNN Music Engine

Terraforming Earth exports music parameters every second to `$SAVE_DIR/music.json`, serve this over a simple HTTP server, along with the `music-rnn` directory. The save dir can be found by [this doc](https://love2d.org/wiki/love.filesystem). On macOS it's `"~/Library/Application Support/LOVE/Terraforming-Earth"` if running in dev mode, and `"Library/Application Support/Terraforming-Earth"` if running the production build.

    HOME=~
    SAVE_DIR="$HOME/Library/Application Support/LOVE/Terraforming-Earth"
    REPO_DIR=$(pwd)
    ln -s "$REPO_DIR/music-rnn" "$SAVE_DIR/genmusic"
    cd "$SAVE_DIR"
    python -m SimpleHTTPServer &
    open http://localhost:8000/genmusic

