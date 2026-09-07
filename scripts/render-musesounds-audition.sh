#!/usr/bin/env bash
set -euo pipefail
out="$PWD/output/tooling/musesounds-audition"
tools_dir="$RUNNER_TEMP/musesounds-tools"
mkdir -p "$out" "$tools_dir"
sudo apt-get update -qq
sudo apt-get install -y --no-install-recommends xvfb xauth ffmpeg libasound2t64 libegl1 libopengl0 libnss3 libpipewire-0.3-0 libxcb-cursor0 libxcb-xinerama0 libxkbcommon-x11-0 libicu74 xdg-utils
curl --fail --location --retry 3 https://github.com/musescore/MuseScore/releases/download/v4.7.4/MuseScore-Studio-4.7.4.260706075-x86_64.AppImage -o "$tools_dir/MuseScore.AppImage"
chmod +x "$tools_dir/MuseScore.AppImage"
(cd "$tools_dir" && ./MuseScore.AppImage --appimage-extract > /dev/null)
curl --fail --location --retry 3 https://muse-cdn.com/Muse_Sounds_Manager_x64.deb -o "$tools_dir/manager.deb"
sudo apt-get install -y "$tools_dir/manager.deb"
# Public free products only: brass, woodwinds, keys, strings (pizzicato bass).
# IDs are passed to the official installer, which enforces product access.
timeout 900 /opt/muse-sounds-manager/muse-sounds-manager --headless --install-musesounds=fbd15858-9185-41ed-918b-8e360a698dbe,f2fbf84c-06da-45c9-be57-f2722d9fd363,d6353666-c534-4c48-833e-c86f0926656f,0013e17f-55dd-42fb-bba3-110337a64849 2>&1 | tee "$out/install.log"
mscore="$tools_dir/squashfs-root/bin/mscore4portable"
export QT_QPA_PLATFORM=offscreen
export MU_QT_QPA_PLATFORM=offscreen
timeout 240 xvfb-run -a "$mscore" --sound-profile MuseSounds -o "$out/small-hours.mscz" "$out/small-hours.musicxml" 2>&1 | tee "$out/import.log"
timeout 300 xvfb-run -a "$mscore" --sound-profile MuseSounds -o "$out/musesounds.wav" "$out/small-hours.mscz" 2>&1 | tee "$out/render.log"
ffprobe -v error -show_format -show_streams -of json "$out/musesounds.wav" > "$out/audio-info.json"
ffmpeg -hide_banner -i "$out/musesounds.wav" -af loudnorm=print_format=json -f null - 2> "$out/levels.log"
