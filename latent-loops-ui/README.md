
A quick fork of https://teampieshop.github.io/latent-loops/ to explore MusicVAE's abilities interpolating between melodies with a nice ui.

Further integration with the game could just strip back to https://tensorflow.github.io/magenta-js/music/classes/_music_vae_model_.musicvae.html#interpolate  and tone.js similar to other demos.

## Setup

1. Run `cd latent-loops-ui && yarn` to install deps. Choose `tonal-scale@2.0.0` if asked.

## Running

1. Run `yarn dev` to start the webpack dev server. Enjoy hot reloading on changes.
1. Run the game. Consult https://bitbucket.org/andrascsibi/terraform-earth/ on setup.
1. Run `yarn game-server` to start hosting the game data.

## Differences in this version

1. Using a different model checkpoint. See [generate.js](./src/generate.js) for details
1. Playing continues from the same note when switching between melodies. See [app.js](./src/app.js#L1046)
1. Game data is loaded on init. See [app.js](./src/app.js#L127)

## TODO / Ideas

- [ ] Poll for game data on an interval
- [ ] Interpolate on mood/intensity changes for new game data, with `app.playSequence(0, gridIndex)`, where `gridIndex` is an int between 0-35 choosing a melody from the grid.
- [ ] Change tempo with `app.on_settings_change('bpm', bpm)` using the game data.
- [ ] Refactor `app.js` and run multiple instances