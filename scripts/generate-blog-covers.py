from pathlib import Path
import subprocess
out=Path('public/images/blog/covers')
# Abstract illustrations are distinct visual metaphors, not miniaturized article diagrams.
arts={
'credentials': '<path d="M250 315 H440 M760 315 H950 M600 170 V225 M600 405 V480"/><rect x="440" y="225" width="320" height="180" rx="24"/><path d="M545 315 v-35 a55 55 0 0 1 110 0 v35 M530 315 h140 v85 h-140z"/><circle cx="250" cy="315" r="56"/><circle cx="950" cy="315" r="56"/>',
'local-models': '<circle cx="600" cy="315" r="180"/><path d="M600 135 C760 135 800 215 780 300 M780 300 l-45 -24 M780 300 l35 -36 M600 495 C440 495 400 415 420 330 M420 330 l45 24 M420 330 l-35 36"/><rect x="512" y="250" width="176" height="130" rx="20"/><path d="M550 290 h100 M550 325 h100 M550 360 h70"/>',
'soc': '<path d="M250 315 H440 M760 315 H950"/><path d="M600 115 L760 180 V300 C760 410 680 475 600 520 C520 475 440 410 440 300 V180 Z"/><circle cx="590" cy="290" r="70"/><path d="M640 340 L700 400 M555 290 l25 25 50 -60"/>',
'incident': '<path d="M180 315 H320 l50 -100 65 200 70 -160 55 60 H1020"/><circle cx="320" cy="315" r="18"/><circle cx="560" cy="315" r="18"/><circle cx="1020" cy="315" r="18"/><path d="M220 150 h760 M220 480 h760"/>',
'maturity': '<path d="M220 490 H370 V415 H520 V340 H670 V265 H820 V190 H970"/><circle cx="370" cy="415" r="20"/><circle cx="520" cy="340" r="20"/><circle cx="670" cy="265" r="20"/><circle cx="820" cy="190" r="20"/><path d="M220 530 H990"/>',
for key,art in arts.items():
 svg=f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 630"><rect width="1200" height="630" fill="#131e2b"/><path d="M0 575 H1200" stroke="#314254" stroke-width="2"/><g fill="none" stroke="#ef8396" stroke-width="8" stroke-linecap="round" stroke-linejoin="round">{art}</g><circle cx="90" cy="80" r="9" fill="#ef8396"/><path d="M112 80 H280" stroke="#6b7f92" stroke-width="3"/><path d="M920 550 H1110" stroke="#6b7f92" stroke-width="3"/></svg>'''
 (out/f'{key}.svg').write_text(svg)

for svg in out.glob('*.svg'):
 subprocess.run(['convert', '-depth', '8', str(svg), str(svg.with_suffix('.png'))], check=True)
