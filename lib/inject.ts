import * as cheerio from "cheerio";
import type { Channel } from "@/generated/prisma/enums";

/** Fields the platform adds to every rendered template. Reserved prefix: `__`. */
export const CHANNEL_FIELD = "__channel";
export const VISITOR_FIELD = "__visitor";

/**
 * Client-side submit handler injected into every rendered template (ADR 0007).
 *
 * The iframe has an opaque origin, so it cannot read cookies and its fetches are
 * cross-origin with `Origin: null` — hence the visitor id travels in the body as
 * a hidden field the server put there, not as a cookie.
 */
function submitScript(endpoint: string) {
  return `
(function () {
  var form = document.querySelector('form');
  if (!form) return;

  form.addEventListener('submit', function (event) {
    event.preventDefault();

    var entries = new FormData(form);
    var data = {};
    var meta = {};
    entries.forEach(function (value, key) {
      if (key.indexOf('__') === 0) { meta[key] = String(value); return; }
      data[key] = String(value);
    });

    var button = form.querySelector('[type="submit"], button');
    if (button) { button.disabled = true; }

    fetch(${JSON.stringify(endpoint)}, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        channel: meta[${JSON.stringify(CHANNEL_FIELD)}] || null,
        visitorId: meta[${JSON.stringify(VISITOR_FIELD)}] || null,
        data: data
      })
    })
      .then(function (response) {
        if (!response.ok) { return response.json().catch(function () { return null; }).then(function (body) { throw new Error((body && body.error && body.error.message) || '제출에 실패했습니다'); }); }
        var done = document.createElement('div');
        done.setAttribute('role', 'status');
        done.style.cssText = 'padding:2rem;text-align:center;font:16px/1.6 system-ui,sans-serif';
        done.textContent = '제출이 완료되었습니다. 감사합니다!';
        form.replaceWith(done);
      })
      .catch(function (error) {
        if (button) { button.disabled = false; }
        var alertBox = form.querySelector('[data-platform-error]') || document.createElement('p');
        alertBox.setAttribute('data-platform-error', '');
        alertBox.setAttribute('role', 'alert');
        alertBox.style.cssText = 'color:#b91c1c;font:14px/1.5 system-ui,sans-serif;margin-top:.75rem';
        alertBox.textContent = error.message || '제출에 실패했습니다';
        if (!alertBox.parentNode) { form.appendChild(alertBox); }
      });
  });
})();
`.trim();
}

/**
 * Injects the platform's hidden metadata fields and submit handler into the raw
 * operator HTML. The original markup is otherwise untouched.
 */
export function injectFormRuntime(
  html: string,
  options: { endpoint: string; channel: Channel | null; visitorId: string | null },
): string {
  const $ = cheerio.load(html);
  const form = $("form").first();
  if (form.length === 0) return html;

  const hidden = (name: string, value: string) =>
    `<input type="hidden" name="${name}" value="${$("<div>").text(value).html()}">`;

  if (options.channel) form.append(hidden(CHANNEL_FIELD, options.channel));
  if (options.visitorId) form.append(hidden(VISITOR_FIELD, options.visitorId));

  $("body").append(`<script>${submitScript(options.endpoint)}</script>`);

  return $.html();
}
