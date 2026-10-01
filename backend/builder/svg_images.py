"""SVG uploads.

Pillow cannot open SVG, so the model's image field refused every one, a plain
logo included, while the upload said SVG was allowed. An SVG is checked as what
it is instead: a well-formed document whose root is <svg>.

On a page it only ever shows as an <img>, where scripts do not run, and opened
on its own it is served under a sandboxing CSP (media.py). Anything in it that
could run is still refused, rather than quietly rewritten: rewriting would
change files that are fine, and the person can export the drawing again
without the script.
"""
import re
import xml.etree.ElementTree as ET

from rest_framework import serializers

SVG_TAG = '{http://www.w3.org/2000/svg}svg'
RUNNABLE_TAGS = {'script', 'foreignobject'}
NUMBER = re.compile(r'^\s*([0-9]*\.?[0-9]+)\s*(px)?\s*$')


def is_svg_upload(upload):
    name = (getattr(upload, 'name', '') or '').lower()
    content_type = (getattr(upload, 'content_type', '') or '').lower()
    return name.endswith('.svg') or content_type == 'image/svg+xml'


def _local(name):
    return name.rsplit('}', 1)[-1].lower()


def _size(root):
    """Width and height in px, from the attributes or else the viewBox."""
    width, height = (NUMBER.match(root.get(key, '')) for key in ('width', 'height'))
    if width and height:
        return round(float(width.group(1))), round(float(height.group(1)))
    box = re.split(r'[\s,]+', (root.get('viewBox') or '').strip())
    if len(box) == 4:
        try:
            return round(float(box[2])), round(float(box[3]))
        except ValueError:
            pass
    return None, None


def check_svg(upload, max_bytes):
    """The (width, height) of a safe SVG upload; ValidationError otherwise."""
    if not (getattr(upload, 'name', '') or '').lower().endswith('.svg'):
        raise serializers.ValidationError('An SVG file has to end in .svg.')
    upload.seek(0)
    data = upload.read(max_bytes + 1)
    upload.seek(0)
    if len(data) > max_bytes:
        raise serializers.ValidationError(f'Image too large ({len(data) // 1024} KB). Max 5 MB.')
    lowered = data.lower()
    # Entities are how an XML file grows a billion times over while it is read.
    if b'<!doctype' in lowered or b'<!entity' in lowered:
        raise serializers.ValidationError('This SVG declares a DOCTYPE. Export it again without one.')
    try:
        root = ET.fromstring(data)
    except ET.ParseError:
        raise serializers.ValidationError('This is not a valid SVG file.') from None
    if root.tag != SVG_TAG:
        raise serializers.ValidationError('This is not a valid SVG file.')
    for element in root.iter():
        runnable = _local(element.tag) in RUNNABLE_TAGS or any(
            _local(name).startswith('on') or 'javascript:' in re.sub(r'\s', '', value).lower()
            for name, value in element.attrib.items()
        )
        if runnable:
            raise serializers.ValidationError(
                'This SVG has scripts or event handlers in it. Export it again without them.',
            )
    return _size(root)
