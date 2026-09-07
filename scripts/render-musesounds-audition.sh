#!/usr/bin/env bash
set -euo pipefail
out="$PWD/output/tooling/musesounds-audition"
tools_dir="$RUNNER_TEMP/musesounds-tools"
mkdir -p "$out" "$tools_dir"
collect_logs() {
  mkdir -p "$out/diagnostics"
  find "$HOME/.local/share/MuseScore" -type f -name '*.log' -exec cp {} "$out/diagnostics/" \; 2>/dev/null || true
}
trap collect_logs EXIT
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
python3 - "$out" <<'PY'
import ctypes as C, json, sys
from pathlib import Path
lib = C.CDLL(str(Path.home() / '.local/share/MuseSampler/lib/libMuseSamplerCoreLib.so'))
lib.ms_init_2.restype = C.c_int
assert lib.ms_init_2() == 0
lib.ms_get_instrument_list.restype = C.c_void_p
lib.ms_InstrumentList_get_next.argtypes = [C.c_void_p]
lib.ms_InstrumentList_get_next.restype = C.c_void_p
lib.ms_Instrument_get_id.argtypes = [C.c_void_p]
lib.ms_Instrument_get_id.restype = C.c_int
fields = ['name','category','pack_name','musicxml_sound','mpe_sound']
for field in fields:
    f = getattr(lib, 'ms_Instrument_get_' + field)
    f.argtypes, f.restype = [C.c_void_p], C.c_char_p
items = []; handle = lib.ms_get_instrument_list()
while instrument := lib.ms_InstrumentList_get_next(handle):
    item = {'id':lib.ms_Instrument_get_id(instrument)}
    for field in fields:
        item[field] = (getattr(lib,'ms_Instrument_get_' + field)(instrument) or b'').decode()
    items.append(item)
(Path(sys.argv[1]) / 'installed-instruments.json').write_text(json.dumps(items, indent=2))
lib.ms_deinit()
PY
export QT_QPA_PLATFORM=offscreen
export MU_QT_QPA_PLATFORM=offscreen
set +e
timeout 240 xvfb-run -a "$mscore" -d --sound-profile MuseSounds -o "$out/small-hours.mscz" "$out/small-hours.musicxml" 2>&1 | tee "$out/import.log"
import_status=${PIPESTATUS[0]}
set -e
# 4.7.4 can crash during shutdown after writing the complete score. Check the
# artifact independently before proceeding; all other failures remain fatal.
if [[ "$import_status" != 0 && "$import_status" != 139 ]]; then exit "$import_status"; fi
unzip -t "$out/small-hours.mscz"
set +e
printf '[{"in":"%s/small-hours.mscz","out":["%s/musesounds.wav","%s/rendered.mscz","%s/rendered.mid"]}]' "$out" "$out" "$out" "$out" > "$out/job.json"
timeout 300 xvfb-run -a "$mscore" -d --sound-profile MuseSounds -j "$out/job.json" 2>&1 | tee "$out/render.log"
render_status=${PIPESTATUS[0]}
set -e
printf '{"importExit":%s,"renderExit":%s}\n' "$import_status" "$render_status" > "$out/process-status.json"
if [[ "$render_status" != 0 && "$render_status" != 139 ]]; then exit "$render_status"; fi
ffprobe -v error -show_format -show_streams -of json "$out/musesounds.wav" > "$out/audio-info.json"
ffmpeg -hide_banner -i "$out/musesounds.wav" -af loudnorm=print_format=json -f null - 2> "$out/levels.log"
python3 - "$out" <<'PY'
import json, sys, zipfile, xml.etree.ElementTree as E
from pathlib import Path
out = Path(sys.argv[1])
with zipfile.ZipFile(out / 'rendered.mscz') as z:
    settings = json.loads(z.read('audiosettings.json'))
    score = E.fromstring(z.read(next(n for n in z.namelist() if n.endswith('.mscx'))))
identities = [i.get('id') for i in score.findall('.//Instrument')]
expected = ['c-trumpet','alto-saxophone','alto-saxophone','tenor-saxophone','tenor-saxophone','baritone-saxophone','trombone','piano','contrabass']
report = {'identities':identities, 'noteCount':len(score.findall('.//Note')), 'audioSettings':settings}
(out / 'verification.json').write_text(json.dumps(report, indent=2))
assert identities == expected, identities
assert report['noteCount'] == 274, report['noteCount']
print(json.dumps(report, indent=2))
PY
