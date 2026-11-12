from pypdf import PdfReader, PdfWriter
from pypdf.generic import ContentStream, ByteStringObject, TextStringObject, ArrayObject
import re
reader=PdfReader('frontend/public/bases.pdf')
writer=PdfWriter()
for page_index in (7,8):
    page=writer.add_page(reader.pages[page_index])
    stream=ContentStream(page.get_contents(), writer)
    def clean(value):
        if isinstance(value, ArrayObject):
            return ArrayObject([clean(x) for x in value])
        if isinstance(value,(TextStringObject,ByteStringObject)):
            raw=value.original_bytes if isinstance(value,TextStringObject) else bytes(value)
            # Remove only placeholder dot runs; preserve text positioning and watermark.
            updated=re.sub(rb'\.{2,}',lambda m:b' '*len(m[0]),raw)
            updated=re.sub(rb'(?:\x00\xab){2,}(?:\x00\x11)?', lambda m: b'\x00\x03'*(len(m[0])//2), updated)
            if raw==b'.': updated=b' '
            if updated!=raw:return ByteStringObject(updated)
        return value
    for operands,operator in stream.operations:
        if operator in (b'Tj',b'TJ',b"'",b'"'):
            for i,value in enumerate(operands):operands[i]=clean(value)
    page.replace_contents(stream)

with open('backend/assets/ficha-base.pdf','wb') as output:writer.write(output)


