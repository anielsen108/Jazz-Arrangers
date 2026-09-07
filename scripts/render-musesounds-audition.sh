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

python3 - "$out" "$mscore" <<'PY'
import copy, json, os, subprocess, sys, xml.etree.ElementTree as E
from pathlib import Path
out, mscore = Path(sys.argv[1]), sys.argv[2]
source = E.parse(out / 'small-hours.musicxml').getroot()
parts = source.findall('part')
manifest = json.loads((out / 'manifest.json').read_text())
results = []
for i, part in enumerate(parts):
    root = copy.deepcopy(source)
    for p in list(root.findall('part')):
        if p.get('id') != part.get('id'): root.remove(p)
    listing = root.find('part-list')
    for p in list(listing):
        if p.get('id') != part.get('id'): listing.remove(p)
    score = out / ('part-' + str(i) + '.musicxml')
    E.ElementTree(root).write(score, encoding='utf-8', xml_declaration=True)
    wave = score.with_suffix('.wav')
    run = subprocess.run(['xvfb-run','-a',mscore,'-d','--sound-profile','MuseSounds','-o',str(wave),str(score)], timeout=100)
    assert run.returncode in (0,139) and wave.stat().st_size > 100000
    log = max((Path.home()/'.local/share/MuseScore/MuseScore4/logs').glob('*.log'), key=lambda p:p.stat().st_mtime)
    text = log.read_text()
    count = text.count('Start offline mode')
    entry = {'part':manifest['parts'][i]['label'], 'museSamplerVoices':count, 'file':wave.name}
    results.append(entry)
    print(json.dumps(entry),flush=True)
(out / 'part-verification.json').write_text(json.dumps(results,indent=2))
PY
