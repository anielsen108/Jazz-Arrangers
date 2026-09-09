#!/usr/bin/env bash
set -euo pipefail
tools_dir="$RUNNER_TEMP/musesounds-tools"
mkdir -p "$tools_dir"
sudo apt-get update -qq
sudo apt-get install -y --no-install-recommends xvfb xauth ffmpeg libasound2t64 libegl1 libopengl0 libnss3 libpipewire-0.3-0 libxcb-cursor0 libxcb-xinerama0 libxkbcommon-x11-0 libicu74 xdg-utils
curl --fail --location --retry 3 https://github.com/musescore/MuseScore/releases/download/v4.7.4/MuseScore-Studio-4.7.4.260706075-x86_64.AppImage -o "$tools_dir/MuseScore.AppImage"
chmod +x "$tools_dir/MuseScore.AppImage"
(cd "$tools_dir" && ./MuseScore.AppImage --appimage-extract > /dev/null)
curl --fail --location --retry 3 https://muse-cdn.com/Muse_Sounds_Manager_x64.deb -o "$tools_dir/manager.deb"
sudo apt-get install -y "$tools_dir/manager.deb"
timeout 900 /opt/muse-sounds-manager/muse-sounds-manager --headless --install-musesounds=fbd15858-9185-41ed-918b-8e360a698dbe,f2fbf84c-06da-45c9-be57-f2722d9fd363,d6353666-c534-4c48-833e-c86f0926656f,0013e17f-55dd-42fb-bba3-110337a64849
echo "MSCORE=$tools_dir/squashfs-root/bin/mscore4portable" >> "$GITHUB_ENV"
