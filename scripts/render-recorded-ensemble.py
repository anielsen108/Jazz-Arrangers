"""Render whole musical parts, never distribute the MuseSounds sample libraries."""
import base64, json, math, os, subprocess, sys, tempfile, zipfile
import xml.etree.ElementTree as E
from pathlib import Path
import numpy as np

out=Path('output/tooling/ensemble-render'); catalogue=json.loads((out/'catalogue.json').read_text())
dest=Path('public/audio/performances/v1'); dest.mkdir(parents=True,exist_ok=True)
rate=44100
def ff(args, data=None):
    result=subprocess.run(['ffmpeg','-v','error','-y',*args],input=data,capture_output=True,timeout=180)
    if result.returncode: raise RuntimeError(result.stderr.decode())
    return result.stdout
def decode(path):
    return np.frombuffer(ff(['-i',str(path),'-f','f32le','-ar',str(rate),'-ac','2','-']),dtype='<f4').reshape(-1,2).copy()
def save(path, audio, codec='libopus'):
    ff(['-f','f32le','-ar',str(rate),'-ac','2','-i','-', '-c:a',codec,*(['-b:a','112k','-vbr','on'] if codec=='libopus' else []),str(path)],audio.astype('<f4').tobytes())
cache={}
def sample_audio(key,uri):
    if key not in cache:
        with tempfile.NamedTemporaryFile(suffix='.ogg') as temp:
            temp.write(base64.b64decode(uri.split(',',1)[1]));temp.flush();cache[key]=decode(temp.name)
    return cache[key]
def bundled(stem):
    bank=json.loads(Path(f'public/audio/orchestra/{stem["instrument"]}.json').read_text())
    result=np.zeros((math.ceil(catalogue['duration']*rate),2),dtype=np.float32)
    for n in stem['notes']:
        if bank.get('version')==2:
            ids=bank['pitches'][str(n['midi'])]
            layer=next((i for i,v in enumerate(bank['dynamics']) if n['velocity']<=v),len(ids)-1)
            key=ids[layer];sample=bank['samples'][key]
            data=sample_audio((stem['instrument'],key),sample['audio'])
            speed=2**((n['midi']-sample['root']+sample['tune']/100)/12)
            loop=sample.get('loop'); sustain=bank['sustained']
        else:
            data=sample_audio((stem['instrument'],n['midi']),bank[str(n['midi'])]);speed=1;loop=None
            sustain=stem['instrument'] in ('choir_aahs','drawbar_organ','accordion','english_horn')
        length=n['length']+.15; count=round(length*rate)
        positions=np.arange(count)*speed
        if sustain and positions[-1]>=len(data)-1:
            start,end=[int(x*rate) for x in loop] if loop else [int(len(data)*.3),int(len(data)*.72)]
            # Repeat a crossfaded sustain region; the recorded attack occurs once.
            blend=min(round(.04*rate),(end-start)//4)
            data=data.copy(); ramp=np.arange(blend,dtype=np.float32)[:,None]/blend
            data[end-blend:end]=data[end-blend:end]*(1-ramp)+data[start:start+blend]*ramp
            start+=blend
            positions=np.where(positions>=end,start+(positions-end)%(end-start),positions)
        audio=np.column_stack([np.interp(positions,np.arange(len(data)),data[:,ch],right=0) for ch in range(2)])
        fade=min(count,round(.08*rate));audio[-fade:]*=np.linspace(1,0,fade)[:,None]
        audio*=n['velocity'];start=round(n['start']*rate);end=min(len(result),start+len(audio))
        result[start:end]+=audio[:end-start]
    return result, bank.get('source','FluidR3 GM'),bank.get('license','CC-BY-3.0')

def verify_score(source, rendered):
    with zipfile.ZipFile(rendered) as z:
        root=E.fromstring(z.read(next(n for n in z.namelist() if n.endswith('.mscx'))))
    original=E.parse(source).getroot()
    expected=[]
    for measure in original.findall('./part/measure'):
        pitches=[]
        for pitch in measure.findall('.//pitch'):
            pitches.append((int(pitch.findtext('octave'))+1)*12+dict(C=0,D=2,E=4,F=5,G=7,A=9,B=11)[pitch.findtext('step')]+int(pitch.findtext('alter','0')))
        expected.append(sorted(pitches))
    actual=[[] for _ in range(8)]
    for staff in root.findall('./Score/Staff'):
        for i,measure in enumerate(staff.findall('Measure')):
            actual[i]+= [int(n.text) for n in measure.findall('.//Note/pitch')]
    assert [sorted(p) for p in actual]==expected, f'Pitch/measure mismatch: {source}'

def render(shard,shards):
    for i,stem in enumerate(catalogue['stems']):
        if i%shards!=shard:continue
        key=stem['hash'];source='';license='';verified=False
        if stem['muse'] and stem['notes']:
            xml=out/'scores'/f'{key}.musicxml'; wav=out/f'{key}.wav'; score=out/f'{key}.mscz'
            env={**os.environ,'QT_QPA_PLATFORM':'offscreen','MU_QT_QPA_PLATFORM':'offscreen'}
            command=['xvfb-run','-a',os.environ['MSCORE'],'-d','--sound-profile','MuseSounds']
            imported=subprocess.run([*command,'-o',str(score),str(xml)],env=env,capture_output=True,timeout=150)
            assert imported.returncode in (0,139), (key,imported.stderr[-2000:])
            verify_score(xml,score)
            run=subprocess.run([*command,'-o',str(wav),str(score)],env=env,capture_output=True,timeout=150)
            (out/f'{key}.log').write_bytes(run.stdout+run.stderr)
            assert run.returncode in (0,139), (key,run.returncode,run.stderr[-2000:])
            assert wav.is_file() and wav.stat().st_size>100000, key
            log=max((Path.home()/'.local/share/MuseScore/MuseScore4/logs').glob('*.log'),key=lambda p:p.stat().st_mtime)
            verified=log.read_text().count('Start offline mode')>=1
            if stem['instrument'] in ('trumpet','alto_sax','tenor_sax','baritone_sax','trombone','acoustic_grand_piano'):
                assert verified, f'Approved MuseSounds instrument failed: {stem["instrument"]}'
            if verified:audio=decode(wav);source='MuseSounds';license='Rendered musical performance'
        if not verified:audio,source,license=bundled(stem)
        peak=float(np.max(np.abs(audio)))
        assert np.isfinite(peak) and (peak>0 or not stem['notes']),key
        attenuation=min(1,.8/max(peak,.0001))
        save(dest/f'{key}.ogg',audio*attenuation)
        report={'hash':key,'instrument':stem['instrument'],'source':source,'license':license,'restoreGain':1/attenuation,'notes':len(stem['notes']),'museVerified':verified}
        (dest/f'{key}.json').write_text(json.dumps(report))
        print(json.dumps(report),flush=True)

def finalize():
    stems={s['hash']:json.loads((dest/f'{s["hash"]}.json').read_text()) for s in catalogue['stems']}
    decoded={}
    index={}
    for study in catalogue['studies']:
        mix=np.zeros((math.ceil(catalogue['duration']*rate)+rate,2),dtype=np.float32)
        for p in study['parts']:
            key=p['stem']; data=decode(dest/f'{key}.ogg')*stems[key]['restoreGain']
            angle=(p['pan']+1)*math.pi/4
            gains=np.array([math.cos(angle),math.sin(angle)])*math.sqrt(2)*p['level']
            mix[:len(data)]+=data*gains
        wav=out/'level-check.wav';save(wav,mix,'pcm_f32le')
        measured=subprocess.run(['ffmpeg','-hide_banner','-i',str(wav),'-af','loudnorm=print_format=json','-f','null','-'],capture_output=True,text=True,check=True).stderr
        levels=json.loads(measured[measured.rfind('{'):]);loudness=float(levels['input_i']);peak=float(levels['input_tp'])
        assert math.isfinite(loudness) and math.isfinite(peak),study['id']
        gain=min(-20-loudness,-3-peak)
        manifest={'version':1,'id':study['id'],'tempo':104,'gain':10**(gain/20),'loudness':loudness+gain,'peakDb':peak+gain,'parts':[{'id':p['id'],'file':p['stem']+'.ogg',**stems[p['stem']]} for p in study['parts']]}
        (dest/f'{study["id"]}.json').write_text(json.dumps(manifest))
        index[study['id']]={'parts':len(study['parts']),'museParts':sum(stems[p['stem']]['museVerified'] for p in study['parts'])}
        print(study['id'],gain,flush=True)
    (dest/'index.json').write_text(json.dumps(index,indent=2))
    for key in stems:(dest/f'{key}.json').unlink()
    print(json.dumps({'studies':len(index),'stems':len(stems),'bytes':sum(p.stat().st_size for p in dest.iterdir())}))

if sys.argv[1]=='finalize':finalize()
else:render(int(sys.argv[1]),int(sys.argv[2]))
