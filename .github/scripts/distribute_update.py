from __future__ import annotations

import base64
import hashlib
import hmac
import json
import mimetypes
import os
import secrets
import time
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
ARTICLE_PUBLISH = ROOT / 'autopilot-publish.json'
SOCIAL_PUBLISH = ROOT / 'social-publish.json'
USER_AGENT = 'NexusNovaTrafficAutopilot/1.2'
MAX_X_IMAGE_BYTES = 5 * 1024 * 1024


def post_json(url: str, payload: dict, headers: dict[str, str] | None = None) -> dict:
    body = json.dumps(payload).encode()
    req = urllib.request.Request(url, data=body, headers={'Content-Type': 'application/json', 'User-Agent': USER_AGENT, **(headers or {})})
    try:
        with urllib.request.urlopen(req, timeout=25) as response:
            raw = response.read().decode('utf-8', errors='ignore')
            print(url.split('?')[0], response.status)
            return json.loads(raw) if raw else {}
    except urllib.error.HTTPError as exc:
        detail = exc.read().decode('utf-8', errors='ignore')[:500]
        raise RuntimeError(f'HTTP {exc.code}: {detail or exc.reason}') from exc


def post_form(url: str, payload: dict) -> dict:
    body = urllib.parse.urlencode(payload).encode()
    req = urllib.request.Request(url, data=body, headers={'Content-Type': 'application/x-www-form-urlencoded', 'User-Agent': USER_AGENT})
    try:
        with urllib.request.urlopen(req, timeout=25) as response:
            raw = response.read().decode('utf-8', errors='ignore')
            print(url.split('?')[0], response.status)
            return json.loads(raw) if raw else {}
    except urllib.error.HTTPError as exc:
        detail = exc.read().decode('utf-8', errors='ignore')[:500]
        raise RuntimeError(f'HTTP {exc.code}: {detail or exc.reason}') from exc


def post_multipart(
    url: str,
    fields: dict[str, str],
    file_field: str,
    filename: str,
    content_type: str,
    file_bytes: bytes,
    headers: dict[str, str] | None = None,
) -> dict:
    boundary = f'----NexusNova{secrets.token_hex(16)}'
    chunks: list[bytes] = []
    for key, value in fields.items():
        chunks.extend([
            f'--{boundary}\r\n'.encode(),
            f'Content-Disposition: form-data; name="{key}"\r\n\r\n'.encode(),
            str(value).encode(),
            b'\r\n',
        ])
    chunks.extend([
        f'--{boundary}\r\n'.encode(),
        f'Content-Disposition: form-data; name="{file_field}"; filename="{filename}"\r\n'.encode(),
        f'Content-Type: {content_type}\r\n\r\n'.encode(),
        file_bytes,
        b'\r\n',
        f'--{boundary}--\r\n'.encode(),
    ])
    body = b''.join(chunks)
    request_headers = {
        'Content-Type': f'multipart/form-data; boundary={boundary}',
        'User-Agent': USER_AGENT,
        **(headers or {}),
    }
    req = urllib.request.Request(url, data=body, headers=request_headers)
    try:
        with urllib.request.urlopen(req, timeout=40) as response:
            raw = response.read().decode('utf-8', errors='ignore')
            print(url.split('?')[0], response.status)
            return json.loads(raw) if raw else {}
    except urllib.error.HTTPError as exc:
        detail = exc.read().decode('utf-8', errors='ignore')[:500]
        raise RuntimeError(f'HTTP {exc.code}: {detail or exc.reason}') from exc


def get_json(url: str) -> dict:
    req = urllib.request.Request(url, headers={'User-Agent': USER_AGENT})
    with urllib.request.urlopen(req, timeout=25) as response:
        data = json.loads(response.read().decode('utf-8'))
        print(url.split('?')[0], response.status)
        return data


def tracked_url(url: str, source: str, kind: str) -> str:
    url = (url or '').strip()
    if not url:
        return ''
    parts = urllib.parse.urlsplit(url)
    query = dict(urllib.parse.parse_qsl(parts.query, keep_blank_values=True))
    query.update({
        'utm_source': source,
        'utm_medium': 'social',
        'utm_campaign': 'article_launch' if kind == 'article' else 'daily_tool',
    })
    return urllib.parse.urlunsplit((parts.scheme, parts.netloc, parts.path, urllib.parse.urlencode(query), parts.fragment))


def social_image_url(item: dict) -> str:
    for key in ('social_image', 'instagram_image', 'image', 'vertical_image'):
        value = str(item.get(key, '')).strip()
        if value.startswith('https://'):
            return value
    return ''


def wait_for_public_image(url: str, attempts: int = 12, delay: int = 10) -> bool:
    if not url:
        return False
    for attempt in range(1, attempts + 1):
        try:
            req = urllib.request.Request(url, headers={'User-Agent': USER_AGENT})
            with urllib.request.urlopen(req, timeout=20) as response:
                content_type = str(response.headers.get('Content-Type', '')).lower()
                if 200 <= response.status < 300 and ('image/' in content_type or not content_type):
                    print(f'Social image reachable on attempt {attempt}.')
                    return True
        except Exception as exc:
            print(f'Social image not live yet ({attempt}/{attempts}): {exc}')
        if attempt < attempts:
            time.sleep(delay)
    return False


def fetch_image_bytes(url: str) -> tuple[bytes, str, str]:
    if not url.startswith('https://'):
        raise RuntimeError('Social image URL must use HTTPS')
    req = urllib.request.Request(url, headers={'User-Agent': USER_AGENT})
    with urllib.request.urlopen(req, timeout=30) as response:
        content_type = str(response.headers.get('Content-Type', '')).split(';', 1)[0].strip().lower()
        data = response.read(MAX_X_IMAGE_BYTES + 1)
    if len(data) > MAX_X_IMAGE_BYTES:
        raise RuntimeError('Social image exceeds the X 5 MB image limit')
    if not data:
        raise RuntimeError('Social image download returned no data')
    if not content_type.startswith('image/'):
        guessed = mimetypes.guess_type(urllib.parse.urlsplit(url).path)[0] or ''
        content_type = guessed if guessed.startswith('image/') else 'image/jpeg'
    extension = mimetypes.guess_extension(content_type) or '.jpg'
    if extension == '.jpe':
        extension = '.jpg'
    return data, content_type, f'nexusnova-social{extension}'


def oauth1_header(method: str, url: str, api_key: str, api_secret: str, access_token: str, access_secret: str) -> str:
    def enc(value: str) -> str:
        return urllib.parse.quote(str(value), safe='~-._')

    oauth = {
        'oauth_consumer_key': api_key,
        'oauth_nonce': secrets.token_hex(16),
        'oauth_signature_method': 'HMAC-SHA1',
        'oauth_timestamp': str(int(time.time())),
        'oauth_token': access_token,
        'oauth_version': '1.0',
    }
    normalized = '&'.join(f'{enc(key)}={enc(value)}' for key, value in sorted(oauth.items()))
    base_string = '&'.join([method.upper(), enc(url), enc(normalized)])
    signing_key = f'{enc(api_secret)}&{enc(access_secret)}'
    signature = base64.b64encode(hmac.new(signing_key.encode(), base_string.encode(), hashlib.sha1).digest()).decode()
    oauth['oauth_signature'] = signature
    return 'OAuth ' + ', '.join(f'{enc(key)}="{enc(value)}"' for key, value in sorted(oauth.items()))


def upload_x_image(image_url: str, api_key: str, api_secret: str, access_token: str, access_secret: str) -> str:
    image_bytes, content_type, filename = fetch_image_bytes(image_url)
    last_error: Exception | None = None
    for endpoint in (
        'https://upload.x.com/1.1/media/upload.json',
        'https://upload.twitter.com/1.1/media/upload.json',
    ):
        try:
            auth = oauth1_header('POST', endpoint, api_key, api_secret, access_token, access_secret)
            result = post_multipart(
                endpoint,
                {'media_category': 'tweet_image'},
                'media',
                filename,
                content_type,
                image_bytes,
                {'Authorization': auth},
            )
            media_id = str(result.get('media_id_string') or result.get('media_id') or '').strip()
            if not media_id:
                raise RuntimeError('X media upload returned no media ID')
            return media_id
        except Exception as exc:
            last_error = exc
            print(f'X media upload warning via {urllib.parse.urlsplit(endpoint).netloc}: {exc}')
    raise RuntimeError(f'X media upload failed: {last_error}')


def post_x(title: str, url: str, hashtags: list[str] | None = None, image_url: str = '') -> dict:
    api_key = os.getenv('X_API_KEY', '').strip()
    api_secret = os.getenv('X_API_KEY_SECRET', '').strip()
    access_token = os.getenv('X_ACCESS_TOKEN', '').strip()
    access_secret = os.getenv('X_ACCESS_TOKEN_SECRET', '').strip()
    if not all((api_key, api_secret, access_token, access_secret)):
        return {'posted': False, 'image_attached': False}

    endpoint = 'https://api.x.com/2/tweets'
    tag_text = ' '.join(f'#{tag.lstrip("#")}' for tag in (hashtags or [])[:3])
    suffix = f'\n\n{url}' if url else ''
    if tag_text:
        suffix += f'\n{tag_text}'
    available_title = max(0, 275 - len(suffix))
    text = f'{title[:available_title]}{suffix}'[:280]
    payload: dict = {'text': text}
    image_attached = False
    if image_url:
        try:
            media_id = upload_x_image(image_url, api_key, api_secret, access_token, access_secret)
            payload['media'] = {'media_ids': [media_id]}
            image_attached = True
        except Exception as exc:
            print('X image warning; posting text fallback:', exc)

    auth = oauth1_header('POST', endpoint, api_key, api_secret, access_token, access_secret)
    result = post_json(endpoint, payload, {'Authorization': auth})
    return {'posted': True, 'image_attached': image_attached, 'response': result}


def post_telegram(token: str, chat_id: str, message: str, image_url: str = '') -> dict:
    if image_url:
        try:
            result = post_json(
                f'https://api.telegram.org/bot{token}/sendPhoto',
                {
                    'chat_id': chat_id,
                    'photo': image_url,
                    'caption': message[:1024],
                    'show_caption_above_media': False,
                },
            )
            return {'posted': True, 'image_attached': True, 'response': result}
        except Exception as exc:
            print('Telegram image warning; posting text fallback:', exc)
    result = post_json(
        f'https://api.telegram.org/bot{token}/sendMessage',
        {'chat_id': chat_id, 'text': message[:4096], 'disable_web_page_preview': False},
    )
    return {'posted': True, 'image_attached': False, 'response': result}


def resolve_meta_assets(token: str, preferred_page_id: str = '') -> dict:
    query = urllib.parse.urlencode({
        'fields': 'id,name,access_token,instagram_business_account{id,username}',
        'access_token': token,
    })
    data = get_json(f'https://graph.facebook.com/v26.0/me/accounts?{query}')
    rows = data.get('data') if isinstance(data.get('data'), list) else []
    if not rows:
        raise RuntimeError('Meta token returned no Page assets')

    if preferred_page_id:
        chosen = next((row for row in rows if str(row.get('id', '')) == preferred_page_id), None)
        if chosen is None:
            raise RuntimeError('Configured Facebook Page ID is not available to this Meta token')
    else:
        chosen = next((row for row in rows if (row.get('instagram_business_account') or {}).get('id')), rows[0])

    instagram = chosen.get('instagram_business_account') or {}
    return {
        'page_id': str(chosen.get('id', '')).strip(),
        'page_name': str(chosen.get('name', '')).strip(),
        'page_token': str(chosen.get('access_token', '')).strip() or token,
        'instagram_id': str(instagram.get('id', '')).strip(),
        'instagram_username': str(instagram.get('username', '')).strip(),
    }


def post_facebook(assets: dict, message: str, link_url: str, image_url: str = '') -> dict:
    page_id = urllib.parse.quote(str(assets.get('page_id', '')).strip())
    token = str(assets.get('page_token', '')).strip()
    if not page_id or not token:
        raise RuntimeError('Facebook Page asset is incomplete')

    if image_url:
        try:
            caption = f'{message}\n\n{link_url}'.strip()
            result = post_form(
                f'https://graph.facebook.com/v26.0/{page_id}/photos',
                {
                    'url': image_url,
                    'caption': caption,
                    'published': 'true',
                    'access_token': token,
                },
            )
            return {'posted': True, 'image_attached': True, 'response': result}
        except Exception as exc:
            print('Facebook image warning; posting link fallback:', exc)

    result = post_form(
        f'https://graph.facebook.com/v26.0/{page_id}/feed',
        {
            'message': message,
            'link': link_url,
            'access_token': token,
        },
    )
    return {'posted': True, 'image_attached': False, 'response': result}


def post_instagram(item: dict, assets: dict, tracked_article_url: str) -> None:
    ig_id = assets.get('instagram_id', '')
    if not ig_id:
        raise RuntimeError('No connected Instagram professional account found')

    image_url = social_image_url(item)
    if not image_url:
        raise RuntimeError('No Instagram-safe image was prepared')
    if not wait_for_public_image(image_url):
        raise RuntimeError('Instagram image did not become publicly reachable in time')

    title = str(item.get('title', 'NexusNova update')).strip()
    summary = str(item.get('summary', '')).strip()
    hashtags = ' '.join(f'#{tag.lstrip("#")}' for tag in (item.get('hashtags') or ['NexusNova', 'OnlineTools', 'Productivity'])[:5])
    caption = f'{title}\n\n{summary}\n\nExplore: {tracked_article_url}\n\n{hashtags}'.strip()[:2200]
    token = assets.get('page_token', '')

    create = post_form(
        f'https://graph.facebook.com/v26.0/{urllib.parse.quote(ig_id)}/media',
        {'image_url': image_url, 'caption': caption, 'access_token': token},
    )
    creation_id = str(create.get('id', '')).strip()
    if not creation_id:
        raise RuntimeError('Instagram did not return a media container ID')

    finished = False
    for _ in range(10):
        query = urllib.parse.urlencode({'fields': 'status_code,status', 'access_token': token})
        status = get_json(f'https://graph.facebook.com/v26.0/{urllib.parse.quote(creation_id)}?{query}')
        code = str(status.get('status_code', '')).upper()
        if code == 'FINISHED':
            finished = True
            break
        if code in {'ERROR', 'EXPIRED'}:
            raise RuntimeError(f'Instagram media container status: {code}')
        time.sleep(3)
    if not finished:
        raise RuntimeError('Instagram media container did not finish processing in time')

    published = post_form(
        f'https://graph.facebook.com/v26.0/{urllib.parse.quote(ig_id)}/media_publish',
        {'creation_id': creation_id, 'access_token': token},
    )
    if not published.get('id'):
        raise RuntimeError('Instagram media_publish did not return a media ID')


def load_item() -> dict | None:
    if ARTICLE_PUBLISH.exists():
        item = json.loads(ARTICLE_PUBLISH.read_text(encoding='utf-8'))
        item.setdefault('kind', 'article')
        return item
    if SOCIAL_PUBLISH.exists():
        item = json.loads(SOCIAL_PUBLISH.read_text(encoding='utf-8'))
        item.setdefault('kind', 'tool_of_day')
        return item
    return None


def main() -> None:
    item = load_item()
    if not item:
        print('No article or daily social payload this run; social distribution skipped.')
        return

    title = str(item.get('title', 'NexusNova update')).strip()
    summary = str(item.get('summary', '')).strip()
    url = str(item.get('url', '')).strip()
    kind = str(item.get('kind', 'article')).strip() or 'article'
    hashtags = list(item.get('hashtags') or ['NexusNova', 'OnlineTools', 'Productivity'])
    image_url = social_image_url(item)
    if image_url and not wait_for_public_image(image_url, attempts=18, delay=10):
        print('Social image was not public in time; text/link fallbacks remain enabled.')
        image_url = ''

    sent = 0
    tg_token = os.getenv('TELEGRAM_BOT_TOKEN', '').strip()
    tg_chat = os.getenv('TELEGRAM_CHANNEL_ID', '').strip()
    if tg_token and tg_chat:
        try:
            tg_url = tracked_url(url, 'telegram', kind)
            message = f'{title}\n\n{summary}\n\n{tg_url}'.strip()
            result = post_telegram(tg_token, tg_chat, message, image_url)
            print('Telegram media:', 'HD image' if result.get('image_attached') else 'text/link fallback')
            sent += 1
        except Exception as exc:
            print('Telegram warning:', exc)

    if all(os.getenv(name, '').strip() for name in ('X_API_KEY', 'X_API_KEY_SECRET', 'X_ACCESS_TOKEN', 'X_ACCESS_TOKEN_SECRET')):
        try:
            result = post_x(title, tracked_url(url, 'x', kind), hashtags, image_url=image_url)
            print('X media:', 'HD image' if result.get('image_attached') else 'text fallback')
            sent += 1
        except Exception as exc:
            print('X warning:', exc)

    meta_token = os.getenv('FACEBOOK_PAGE_ACCESS_TOKEN', '').strip()
    preferred_page = os.getenv('FACEBOOK_PAGE_ID', '').strip()
    assets = None
    if meta_token:
        try:
            assets = resolve_meta_assets(meta_token, preferred_page)
        except Exception as exc:
            print('Meta asset warning:', exc)

    if assets:
        try:
            fb_url = tracked_url(url, 'facebook', kind)
            fb_tags = ' '.join(f'#{tag.lstrip("#")}' for tag in hashtags[:3])
            fb_message = f'{title}\n\n{summary}\n\n{fb_tags}'.strip()
            result = post_facebook(assets, fb_message, fb_url, image_url)
            print('Facebook media:', 'HD image' if result.get('image_attached') else 'link fallback')
            sent += 1
        except Exception as exc:
            print('Facebook warning:', exc)

        if assets.get('instagram_id') and social_image_url(item):
            try:
                post_instagram(item, assets, tracked_url(url, 'instagram', kind))
                sent += 1
            except Exception as exc:
                print('Instagram warning:', exc)

    webhook = os.getenv('SOCIAL_WEBHOOK_URL', '').strip()
    if webhook:
        try:
            post_json(webhook, item)
            sent += 1
        except Exception as exc:
            print('Social webhook warning:', exc)

    print(f'Social destinations posted: {sent}. HD media is preferred; safe text/link fallbacks remain enabled.')


if __name__ == '__main__':
    main()
