from __future__ import annotations

import json
import os
import urllib.error
import urllib.request

BUFFER_ENDPOINT = "https://api.buffer.com"
USER_AGENT = "NexusNovaBufferPublisher/1.1"


def _graphql_request(api_key: str, query: str) -> dict:
    body = json.dumps({"query": query}).encode("utf-8")
    request = urllib.request.Request(
        BUFFER_ENDPOINT,
        data=body,
        headers={
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
            "User-Agent": USER_AGENT,
        },
    )
    try:
        with urllib.request.urlopen(request, timeout=30) as response:
            payload = json.loads(response.read().decode("utf-8"))
    except urllib.error.HTTPError as exc:
        detail = exc.read().decode("utf-8", errors="ignore")[:500]
        raise RuntimeError(f"Buffer HTTP {exc.code}: {detail or exc.reason}") from exc

    errors = payload.get("errors")
    if errors:
        message = "; ".join(str(row.get("message", row)) for row in errors if isinstance(row, dict))
        raise RuntimeError(f"Buffer GraphQL error: {message or errors}")
    return payload


def _create_post(
    api_key: str,
    channel_id: str,
    text: str,
    image_url: str = "",
    *,
    mode: str = "addToQueue",
    ai_assisted: bool = False,
) -> dict:
    if mode not in {"addToQueue", "shareNow"}:
        raise ValueError(f"Unsupported Buffer share mode: {mode}")

    asset_fragment = ""
    if image_url:
        asset_fragment = f"assets: [{{ image: {{ url: {json.dumps(image_url)} }} }}]"

    query = f"""
    mutation CreatePost {{
      createPost(input: {{
        text: {json.dumps(text, ensure_ascii=False)}
        channelId: {json.dumps(channel_id)}
        schedulingType: automatic
        mode: {mode}
        aiAssisted: {str(bool(ai_assisted)).lower()}
        {asset_fragment}
      }}) {{
        ... on PostActionSuccess {{
          post {{ id text dueAt status assets {{ id mimeType }} }}
        }}
        ... on MutationError {{ message }}
      }}
    }}
    """
    payload = _graphql_request(api_key, query)
    result = (payload.get("data") or {}).get("createPost") or {}
    if result.get("message") and not result.get("post"):
        raise RuntimeError(f"Buffer createPost failed: {result['message']}")
    post = result.get("post")
    if not post:
        raise RuntimeError("Buffer createPost returned no post")
    return post


def _build_text(title: str, url: str, hashtags: list[str] | None = None) -> str:
    tag_text = " ".join(f"#{tag.lstrip('#')}" for tag in (hashtags or [])[:3])
    suffix = f"\n\n{url}" if url else ""
    if tag_text:
        suffix += f"\n{tag_text}"
    available_title = max(0, 275 - len(suffix))
    return f"{title[:available_title]}{suffix}"[:280]


def _post_buffer_x(
    title: str,
    url: str,
    hashtags: list[str] | None,
    image_url: str,
    *,
    mode: str,
    ai_assisted: bool,
) -> dict:
    api_key = os.getenv("BUFFER_API_KEY", "").strip()
    channel_id = os.getenv("BUFFER_X_CHANNEL_ID", "").strip()
    if not api_key or not channel_id:
        return {"posted": False, "image_attached": False, "provider": "buffer"}

    text = _build_text(title, url, hashtags)
    if image_url:
        try:
            post = _create_post(
                api_key,
                channel_id,
                text,
                image_url,
                mode=mode,
                ai_assisted=ai_assisted,
            )
            return {
                "posted": True,
                "image_attached": bool(post.get("assets")),
                "provider": "buffer",
                "response": post,
            }
        except Exception as exc:
            print("Buffer image warning; publishing text/link fallback:", exc)

    post = _create_post(
        api_key,
        channel_id,
        text,
        mode=mode,
        ai_assisted=ai_assisted,
    )
    return {
        "posted": True,
        "image_attached": False,
        "provider": "buffer",
        "response": post,
    }


def post_buffer_x(title: str, url: str, hashtags: list[str] | None = None, image_url: str = "") -> dict:
    """Add an X post to the normal Buffer queue."""
    return _post_buffer_x(
        title,
        url,
        hashtags,
        image_url,
        mode="addToQueue",
        ai_assisted=False,
    )


def post_buffer_x_now(
    title: str,
    url: str,
    hashtags: list[str] | None = None,
    image_url: str = "",
    *,
    ai_assisted: bool = True,
) -> dict:
    """Publish immediately through Buffer so frequent posts do not fill the free-plan queue."""
    return _post_buffer_x(
        title,
        url,
        hashtags,
        image_url,
        mode="shareNow",
        ai_assisted=ai_assisted,
    )
