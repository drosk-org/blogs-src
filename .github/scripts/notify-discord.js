#!/usr/bin/env node
/**
 * Usage:
 *   node notify-discord.js <filePath> <webhookUrl> <repo> <branch> <sha>
 *
 * We parse frontmatter (if present) using gray-matter, otherwise fall back to H1 and first paragraph.
 * Build a Discord embed and POST it to the webhook.
 */

const fs = require('fs');
const path = require('path');
const matter = require('gray-matter');

async function main() {
  const [filePath, webhookUrl, repo, branch, sha] = process.argv.slice(2);
  if (!filePath || !webhookUrl) {
    console.error('Usage: notify-discord.js <filePath> <webhookUrl> <repo> <branch> <sha>');
    process.exit(2);
  }
  if (!fs.existsSync(filePath)) {
    console.error('File not found:', filePath);
    process.exit(1);
  }
  const raw = fs.readFileSync(filePath, 'utf8');
  let data = {};
  let content = raw;
  try {
    const parsed = matter(raw);
    data = parsed.data || {};
    content = parsed.content || parsed._content || parsed;
  } catch (e) {
    content = raw;
  }
  let title = data.title || extractH1(content) || path.basename(filePath);
  let summary = data.description || data.excerpt || extractFirstParagraph(content) || '';
  summary = summary.trim().replace(/\r?\n+/g, ' ');
  if (summary.length > 300) summary = summary.slice(0, 297) + '...';
  const safeBranch = branch || 'main';
  const url = `https://github.com/${repo}/blob/${safeBranch}/${filePath}`;

  const payload = {
    username: 'Blog Notifier',
    embeds: [
      {
        title: title,
        description: summary || 'A new blog post was published — check it out!',
        url: url,
        timestamp: new Date().toISOString(),
        footer: {
          text: `Repository: ${repo}`
        }
      }
    ]
  };

  // Use native fetch (Node 18+). Fallback to require('node-fetch') if needed.
  let fetchFn = globalThis.fetch;
  if (!fetchFn) {
    try {
      fetchFn = require('node-fetch');
    } catch (e) {
      console.error('No fetch available in this Node runtime. Node 18+ recommended.');
      process.exit(1);
    }
  }

  try {
    const res = await fetchFn(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      console.error('Failed to post webhook:', res.status, res.statusText, text);
      process.exit(1);
    } else {
      console.log('Sent webhook for', filePath);
    }
  } catch (err) {
    console.error('Error sending webhook:', err);
    process.exit(1);
  }
}

function extractH1(content) {
  // look for lines like "# Title"
  const lines = content.split(/\r?\n/);
  for (const line of lines) {
    const m = line.match(/^#\s+(.*)/);
    if (m) return m[1].trim();
  }
  return null;
}

function extractFirstParagraph(content) {
  // split by blank lines, ignore headings
  const blocks = content.split(/\r?\n\r?\n/);
  for (const b of blocks) {
    const trimmed = b.trim();
    if (!trimmed) continue;
    if (/^#/.test(trimmed)) continue;
    if (/^\!\[.*\]\(.*\)$/.test(trimmed)) continue;
    return trimmed.replace(/\r?\n/g, ' ').replace(/\s+/g, ' ').trim();
  }
  return null;
}

main();
