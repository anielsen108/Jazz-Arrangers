"""Mix eight verified MuseSounds stems with the project's CC0 recorded upright bass."""
import base64, json, math, subprocess, sys
from pathlib import Path
out=Path(sys.argv[1]); score=json.loads((out/'mix-score.json').read_text())
bank=json.loads(Path('public/audio/orchestra/acoustic_bass.json').read_text())
assert bank['version']==2 and ('karoryfer' in bank['source'].lower() or 'meatbass' in bank['source'].lower()), bank['source']
verification=json.loads((out/'part-verification.json').read_text())
assert all(p['museSamplerVoices']==1 for p in verification[:8])
def ff(args):
    r=subprocess.run(['ffmpeg','-hide_banner','-y',*args],capture_output=True,text=True,timeout=120)
    if r.returncode: raise RuntimeError(r.stderr)
    return r.stderr
bass=score['parts'][8]; args=[]; filters=[]
for i,note in enumerate(bass['notes']):
    ids=bank['pitches'][str(note['midi'])]
    layer=next((j for j,v in enumerate(bank['dynamics']) if note['velocity']<=v),len(ids)-1)
    sample=bank['samples'][ids[layer]]
    sample_file=out/('bass-sample-'+str(i)+'.ogg')
    sample_file.write_bytes(base64.b64decode(sample['audio'].split(',',1)[1]))
    args+=['-i',str(sample_file)]
    rate=2**((note['midi']-sample['root']+sample['tune']/100)/12)
    length=note['length']+.15
    filters.append(f'[{i}:a]aresample=44100,asetrate={44100*rate:.6f},aresample=44100,atrim=duration={length:.6f},afade=t=out:st={length-.08:.6f}:d=0.08,volume={note["velocity"]:.6f},adelay={round(note["start"]*1000)}:all=1[b{i}]')
filters.append(''.join(f'[b{i}]' for i in range(len(bass['notes'])))+f'amix=inputs={len(bass["notes"])}:normalize=0,apad[bass]')
ff([*args,'-filter_complex',';'.join(filters),'-map','[bass]','-t',str(score['duration']),'-ac','2','-c:a','pcm_f32le',str(out/'upright-recorded.wav')])
inputs=[out/f'part-{i}.wav' for i in range(8)]+[out/'upright-recorded.wav']
args=[]; filters=[]
for i,(file,part) in enumerate(zip(inputs,score['parts'])):
    args+=['-i',str(file)]
    left=math.cos((part['pan']+1)*math.pi/4)*math.sqrt(2)*part['level']
    right=math.sin((part['pan']+1)*math.pi/4)*math.sqrt(2)*part['level']
    filters.append(f'[{i}:a]pan=stereo|c0={left:.6f}*c0|c1={right:.6f}*c1[s{i}]')
filters.append(''.join(f'[s{i}]' for i in range(9))+'amix=inputs=9:normalize=0:duration=longest[mix]')
raw=out/'mixed-raw.wav'
ff([*args,'-filter_complex',';'.join(filters),'-map','[mix]','-c:a','pcm_f32le',str(raw)])
log=ff(['-i',str(raw),'-af','loudnorm=print_format=json','-f','null','-'])
levels=json.loads(log[log.rfind('{'):]); loudness=float(levels['input_i']); peak=float(levels['input_tp'])
assert math.isfinite(loudness) and math.isfinite(peak)
target=min(-20,loudness-2-peak); gain=target-loudness
ff(['-i',str(raw),'-af',f'volume={gain}dB','-c:a','pcm_s16le',str(out/'free-ensemble.wav')])
(out/'mix-verification.json').write_text(json.dumps({'sources':[{'part':p['label'],'source':'MuseSounds' if i<8 else bank['source']} for i,p in enumerate(score['parts'])],'basicSoundParts':0,'targetLUFS':target,'gainDb':gain,'inputPeakDb':peak,'bassLicense':bank['license'],'notes':sum(len(p['notes']) for p in score['parts'])},indent=2))
print((out/'mix-verification.json').read_text(),flush=True)
# Temporary individual sample extractions are not part of the downloadable audition.
for path in out.glob('bass-sample-*.ogg'): path.unlink()
raw.unlink()
