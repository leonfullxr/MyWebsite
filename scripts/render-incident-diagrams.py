#!/usr/bin/env python3
"""Export the editable incident-response diagrams as transparent SVG theme pairs.

Requires the draw.io desktop CLI and, on a headless Linux host, xvfb-run.
Run from any directory with `python3 scripts/render-incident-diagrams.py`.
"""

import os
import re
import shutil
import subprocess
import tempfile
import xml.etree.ElementTree as ET
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SOURCES = ROOT / 'public/diagrams/incident-response'
OUTPUT = ROOT / 'public/images/blog'
SVG = 'http://www.w3.org/2000/svg'
ET.register_namespace('', SVG)
ET.register_namespace('xlink', 'http://www.w3.org/1999/xlink')

DARK_TEXT = {'#2d3142': '#edecec', '#4f5d75': '#b3b1ac', '#7a8399': '#a19f9a'}
DARK_FILL = {'#ffffff': '#1c1b18', '#e6effc': '#172238', '#005ee3': '#79a8ff', '#2d3142': '#edecec'}
DARK_BORDER = {'#005ee3': '#79a8ff', '#c9cdd6': '#55534f', '#4f5d75': '#8e8c86'}
DARK_LINE = {'#005ee3': '#79a8ff', '#c9cdd6': '#55534f', '#4f5d75': '#a8a6a0'}


def dark_source(xml):
    def cell(match):
        tag = match.group(0)
        edge = 'edge="1"' in tag
        palettes = {'fontColor': DARK_TEXT, 'fillColor': DARK_FILL,
                    'strokeColor': DARK_LINE if edge else DARK_BORDER}

        def color(change):
            role, value = change.groups()
            if value == 'none':
                return change.group(0)
            try:
                return f'{role}={palettes[role][value.lower()]}'
            except KeyError as error:
                raise ValueError(f'Add a dark {role} mapping for {value}') from error

        return re.sub(r'(fontColor|fillColor|strokeColor)=(#[0-9a-fA-F]{6}|none)', color, tag)

    return re.sub(r'<mxCell\b[^>]*>', cell, xml)


def clean_svg(path):
    tree = ET.parse(path)
    root = tree.getroot()
    if 'background: transparent' not in root.get('style', ''):
        raise ValueError(f'{path} does not have a transparent background')
    for parent in root.iter():
        for child in list(parent):
            if child.tag == f'{{{SVG}}}switch':
                text = child.find(f'{{{SVG}}}text')
                if text is not None:
                    index = list(parent).index(child)
                    parent.remove(child)
                    parent.insert(index, text)
                elif 'Text is not SVG' in ''.join(child.itertext()):
                    parent.remove(child)
            elif child.tag == '{http://www.w3.org/1999/xhtml}style' and (
                'MathJax' in (child.text or '') or 'mjx-container' in (child.text or '')
            ):
                parent.remove(child)
    tree.write(path, encoding='unicode', xml_declaration=True)


def main():
    if not shutil.which('drawio'):
        raise SystemExit('Install the draw.io desktop CLI to export these diagrams.')
    prefix = [] if os.environ.get('DISPLAY') else ['xvfb-run', '-a']
    if prefix and not shutil.which('xvfb-run'):
        raise SystemExit('Install xvfb-run or run with DISPLAY set.')
    with tempfile.TemporaryDirectory() as tmp:
        for source in sorted(SOURCES.glob('*.drawio')):
            for dark in (False, True):
                input_file = source
                if dark:
                    input_file = Path(tmp) / source.name
                    input_file.write_text(dark_source(source.read_text()))
                output = OUTPUT / f'{source.stem}{"-dark" if dark else ""}.svg'
                subprocess.run(prefix + ['drawio', '--no-sandbox', '-x', '-f', 'svg',
                               '--embed-svg-fonts', 'false', '--svg-theme', 'light',
                               '-o', str(output), str(input_file)], check=True)
                clean_svg(output)
                print(output.relative_to(ROOT))


if __name__ == '__main__':
    main()
