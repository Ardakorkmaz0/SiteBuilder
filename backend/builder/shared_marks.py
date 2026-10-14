"""Finding a shared block's copies inside HTML, so a takedown reaches them.

A block taken from the library is a component on a canvas page, but on an
HTML page it is part of the document, and on a published site it is part of
the rendered page. In both it is marked: `data-pwb-shared-from="<id>"` on the
element that holds it (the wrapper a take adds to an HTML page, the iframe the
editor writes for an embed). These helpers remove the marked elements.

A real parser is used, not a pattern: an embed's whole document sits inside
its `srcdoc` attribute, angle brackets and closing tags included, and a block
may hold divs and iframes of its own.
"""
from html.parser import HTMLParser

MARK = 'data-pwb-shared-from'

# Elements that never have a closing tag: a marked one ends with its start tag.
_VOID = {'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'source', 'track', 'wbr'}


class _MarkedRanges(HTMLParser):
    def __init__(self, text, component_id):
        super().__init__(convert_charrefs=False)
        self._wanted = str(component_id)
        self._text = text
        self._line_starts = [0]
        for index, char in enumerate(text):
            if char == '\n':
                self._line_starts.append(index + 1)
        self._open = []  # [tag, start offset, marked]
        self.ranges = []

    def _offset(self):
        line, column = self.getpos()
        return self._line_starts[line - 1] + column

    def handle_starttag(self, tag, attrs):
        start = self._offset()
        marked = dict(attrs).get(MARK) == self._wanted
        if tag in _VOID:
            if marked and not self._inside_marked():
                self.ranges.append((start, start + len(self.get_starttag_text() or '')))
            return
        self._open.append([tag, start, marked])

    def handle_startendtag(self, tag, attrs):
        start = self._offset()
        if dict(attrs).get(MARK) == self._wanted and not self._inside_marked():
            self.ranges.append((start, start + len(self.get_starttag_text() or '')))

    def handle_endtag(self, tag):
        # Close back to the matching open tag; anything left open inside it
        # (sloppy markup) closes with it, as a browser would.
        for depth in range(len(self._open) - 1, -1, -1):
            if self._open[depth][0] == tag:
                opened = self._open[depth]
                del self._open[depth:]
                if opened[2] and not self._inside_marked():
                    # The end tag as written ("</div >" too) ends at its '>'.
                    close = self._text.find('>', self._offset())
                    end = close + 1 if close != -1 else len(self._text)
                    self.ranges.append((opened[1], end))
                return

    def _inside_marked(self):
        return any(entry[2] for entry in self._open)


def strip_marked(html, component_id):
    """`html` without the elements marked as copies of `component_id`.
    Returns (html, how many were removed)."""
    text = html if isinstance(html, str) else ''
    if MARK not in text or str(component_id) not in text:
        return text, 0
    parser = _MarkedRanges(text, component_id)
    try:
        parser.feed(text)
        parser.close()
    except Exception:  # noqa: BLE001 - unparseable: leave it rather than cut blindly
        return text, 0
    if not parser.ranges:
        return text, 0
    out = []
    cursor = 0
    for start, end in sorted(parser.ranges):
        if start < cursor:
            continue
        out.append(text[cursor:start])
        cursor = end
    out.append(text[cursor:])
    return ''.join(out), len(parser.ranges)


def wrap_marked(html, component_id):
    """A taken block, wrapped and marked for an HTML page."""
    return f'<div {MARK}="{int(component_id)}">\n{html}\n</div>'


def insert_before_body_end(document, snippet):
    """`snippet` placed at the end of the document's <body> (or appended)."""
    text = document if isinstance(document, str) else ''
    lower = text.lower()
    index = lower.rfind('</body>')
    if index == -1:
        return text + '\n' + snippet
    return text[:index] + snippet + '\n' + text[index:]
