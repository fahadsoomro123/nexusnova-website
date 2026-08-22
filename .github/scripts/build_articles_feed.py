from __future__ import annotations

import json
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urljoin

SITE = "https://nexusnovatools.com/"
ROOT = Path(".")
OUTPUT = ROOT / "articles.json"
SKIP_DIRS = {".git", ".github", "node_modules", "vendor"}


class PageParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.title_parts: list[str] = []
        self.in_title = False
        self.meta: dict[str, str] = {}
        self.canonical = ""
        self.jsonld: list[str] = []
        self._jsonld_buffer: list[str] | None = None

    def handle_starttag(self, tag: str, attrs) -> None:
        data = {str(k).lower(): str(v or "") for k, v in attrs}
        name = tag.lower()
        if name == "title":
            self.in_title = True
        elif name == "meta":
            key = (data.get("property") or data.get("name") or "").strip().lower()
            if key:
                self.meta[key] = data.get("content", "").strip()
        elif name == "link" and data.get("rel", "").lower() == "canonical":
            self.canonical = data.get("href", "").strip()
        elif name == "script" and data.get("type", "").lower() == "application/ld+json":
            self._jsonld_buffer = []

    def handle_endtag(self, tag: str) -> None:
        name = tag.lower()
        if name == "title":
            self.in_title = False
        elif name == "script" and self._jsonld_buffer is not None:
            self.jsonld.append("".join(self._jsonld_buffer).strip())
            self._jsonld_buffer = None

    def handle_data(self, data: str) -> None:
        if self.in_title:
            self.title_parts.append(data)
        if self._jsonld_buffer is not None:
            self._jsonld_buffer.append(data)

    @property
    def title(self) -> str:
        return " ".join("".join(self.title_parts).split())


def iter_jsonld_objects(raw: str):
    try:
        value = json.loads(raw)
    except Exception:
        return
    stack = value if isinstance(value, list) else [value]
    while stack:
        current = stack.pop()
        if isinstance(current, dict):
            yield current
            graph = current.get("@graph")
            if isinstance(graph, list):
                stack.extend(graph)
        elif isinstance(current, list):
            stack.extend(current)


def article_jsonld(parser: PageParser) -> dict:
    for raw in parser.jsonld:
        for item in iter_jsonld_objects(raw) or ():
            article_type = item.get("@type", "")
            types = article_type if isinstance(article_type, list) else [article_type]
            if any(str(t).lower().endswith("article") for t in types):
                return item
    return {}


def is_article(parser: PageParser, data: dict) -> bool:
    if parser.meta.get("og:type", "").lower() == "article":
        return True
    article_type = data.get("@type", "")
    types = article_type if isinstance(article_type, list) else [article_type]
    return any(str(t).lower().endswith("article") for t in types)


def clean_title(value: str) -> str:
    title = " ".join(str(value or "").split()).strip()
    for suffix in (" | NexusNova", " — NexusNova", " - NexusNova"):
        if title.endswith(suffix):
            title = title[: -len(suffix)].strip()
    return title[:220]


def clean_text(value: str, limit: int = 420) -> str:
    return " ".join(str(value or "").split()).strip()[:limit]


def page_to_item(path: Path) -> dict | None:
    try:
        html = path.read_text(encoding="utf-8")
    except UnicodeDecodeError:
        return None
    parser = PageParser()
    parser.feed(html)
    data = article_jsonld(parser)
    if not is_article(parser, data):
        return None

    relative = path.as_posix().lstrip("./")
    canonical = parser.canonical or str(data.get("mainEntityOfPage") or "") or urljoin(SITE, relative)
    if isinstance(data.get("mainEntityOfPage"), dict):
        canonical = str(data["mainEntityOfPage"].get("@id") or canonical)
    if not canonical.startswith(SITE):
        canonical = urljoin(SITE, relative)

    title = clean_title(parser.meta.get("og:title") or data.get("headline") or parser.title)
    if not title:
        return None

    description = clean_text(
        parser.meta.get("og:description")
        or parser.meta.get("description")
        or data.get("description")
        or ""
    )
    published = clean_text(data.get("datePublished") or parser.meta.get("article:published_time") or "", 80)
    modified = clean_text(data.get("dateModified") or parser.meta.get("article:modified_time") or published, 80)
    author = data.get("author") or ""
    if isinstance(author, dict):
        author = author.get("name", "")
    elif isinstance(author, list):
        names = [str(item.get("name", "")) for item in author if isinstance(item, dict)]
        author = ", ".join(filter(None, names))
    category = clean_text(parser.meta.get("article:section") or path.parent.name.replace("-", " ").title(), 80)
    image = clean_text(parser.meta.get("og:image") or "", 500)

    return {
        "title": title,
        "description": description,
        "url": canonical,
        "publishedAt": published,
        "modifiedAt": modified,
        "author": clean_text(author or "NexusNova", 120),
        "category": category or "Article",
        "image": image,
    }


def main() -> None:
    items: list[dict] = []
    for path in sorted(ROOT.rglob("*.html")):
        if any(part in SKIP_DIRS for part in path.parts):
            continue
        item = page_to_item(path)
        if item:
            items.append(item)

    items.sort(key=lambda item: (item.get("publishedAt", ""), item.get("title", "")), reverse=True)
    payload = {
        "version": 1,
        "site": SITE,
        "updatedAt": items[0].get("publishedAt", "") if items else "",
        "count": len(items),
        "items": items,
    }
    OUTPUT.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Generated {OUTPUT} with {len(items)} article(s).")


if __name__ == "__main__":
    main()
