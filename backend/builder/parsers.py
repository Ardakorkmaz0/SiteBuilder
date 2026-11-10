"""What a JSON request body may be, decided once for every endpoint.

Three bodies used to end in a server error instead of an answer:

- one that is not an object (a list, a string, a number), because a view reads
  `request.data.get(...)`;
- one that holds a NUL character. PostgreSQL stores it in neither text nor
  jsonb, so a save failed whole; SQLite, which the tests run on, stores it, so
  nothing noticed. No text of a site needs the character: it is dropped here,
  before any validation sees the string;
- one nested thousands of levels deep, which runs the JSON reader or a
  sanitizer below it out of stack.
"""
from rest_framework import status
from rest_framework.exceptions import APIException
from rest_framework.parsers import JSONParser

# A site's schema nests about twenty levels (pages, four levels of blocks,
# their props). Python follows a thousand.
MAX_JSON_DEPTH = 100

NOT_AN_OBJECT = 'Expected an object of fields.'
TOO_DEEP = 'The request body is nested too deeply.'


class BodyRefused(APIException):
    status_code = status.HTTP_400_BAD_REQUEST
    default_code = 'validation_error'
    default_detail = NOT_AN_OBJECT


def _without_nul(text):
    return text.replace('\x00', '') if '\x00' in text else text


def _clean(body):
    """Drop NUL from every key and string of a freshly parsed body, in place.

    A loop with its own stack, not recursion: the JSON reader follows nesting
    further than Python code may.
    """
    pending = [(body, 1)]
    while pending:
        node, depth = pending.pop()
        if depth > MAX_JSON_DEPTH:
            raise BodyRefused(TOO_DEEP)
        if isinstance(node, dict):
            for key in [key for key in node if '\x00' in key]:
                node[_without_nul(key)] = node.pop(key)
            entries = node.items()
        else:
            entries = enumerate(node)
        for key, value in entries:
            if isinstance(value, str):
                if '\x00' in value:
                    node[key] = _without_nul(value)
            elif isinstance(value, (dict, list)):
                pending.append((value, depth + 1))


class ObjectJSONParser(JSONParser):
    def parse(self, stream, media_type=None, parser_context=None):
        try:
            body = super().parse(stream, media_type, parser_context)
        except RecursionError:
            raise BodyRefused(TOO_DEEP) from None
        if not isinstance(body, dict):
            raise BodyRefused(NOT_AN_OBJECT)
        _clean(body)
        return body
