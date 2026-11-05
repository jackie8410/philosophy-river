import json
import sys
import zipfile
import xml.etree.ElementTree as ET

NS = {"w": "http://schemas.openxmlformats.org/wordprocessingml/2006/main"}
ATTR = "{" + NS["w"] + "}"


def xml(archive, name):
    if archive.getinfo(name).file_size > 16 * 1024 * 1024:
        raise ValueError("DOCX XML too large")
    return ET.fromstring(archive.read(name))


def text(node):
    return "".join(part.text or "" for part in node.findall(".//w:t", NS)).strip()


def roster(document):
    rows = []
    for table in document.findall(".//w:tbl", NS):
        entries = [
            [text(cell) for cell in row.findall("./w:tc", NS)]
            for row in table.findall("./w:tr", NS)
        ]
        if entries and entries[0][:3] == ["编号", "人物", "批次"]:
            rows.extend(entries[1:])
    return [{"id": str(int(row[0])).zfill(3), "name": row[1], "batch": row[2],
             "manifestStatus": row[-1]} for row in rows]


def article(archive, document):
    lines = []
    for paragraph in document.findall("./w:body/w:p", NS):
        value = text(paragraph)
        if not value:
            continue
        style = paragraph.find("./w:pPr/w:pStyle", NS)
        name = style.get(ATTR + "val", "") if style is not None else ""
        prefix = "# " if name == "Title" else "## " if name.lower().startswith("heading") else ""
        refs = [ref.get(ATTR + "id") for ref in paragraph.findall(".//w:footnoteReference", NS)]
        lines.append(prefix + value + "".join(f"〔{ref}〕" for ref in refs))
    if "word/footnotes.xml" in archive.namelist():
        lines.append("## 尾注与来源")
        for note in xml(archive, "word/footnotes.xml").findall("./w:footnote", NS):
            note_id = note.get(ATTR + "id", "")
            if note_id.isdigit() and text(note):
                lines.append(f"[{note_id}] {text(note)}")
    return "\n\n".join(lines)


if __name__ == "__main__":
    sys.stdout.reconfigure(encoding="utf-8")
    with zipfile.ZipFile(sys.argv[2]) as archive:
        document = xml(archive, "word/document.xml")
        result = roster(document) if sys.argv[1] == "roster" else article(archive, document)
    print(json.dumps(result, ensure_ascii=False))
